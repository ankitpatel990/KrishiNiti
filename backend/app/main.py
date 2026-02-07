"""
FastAPI Application Entry Point

Wires together middleware, error handlers, routers, structured logging,
and the application lifespan (startup / shutdown).
"""

import logging
import logging.handlers
import sys
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.config import settings
from app.database import check_db_connection, init_db
from app.middleware.cors_middleware import configure_cors
from app.middleware.error_handler import register_error_handlers
from app.middleware.logging_middleware import RequestLoggingMiddleware
from app.middleware.rate_limiter import RateLimitMiddleware
from app.middleware.request_id import RequestIDMiddleware
from app.routes import disease, weather, apmc, schemes, voice
from app.utils.constants import (
    API_LEGACY_PREFIX,
    API_V1_PREFIX,
    HEALTH_STATUS_DEGRADED,
    HEALTH_STATUS_HEALTHY,
)
from app.utils.helpers import utc_now, format_iso


# ---------------------------------------------------------------------------
# Structured Logging Setup
# ---------------------------------------------------------------------------

def _configure_logging() -> None:
    """
    Set up structured logging to both console and a rotating log file.
    Log directory is created automatically if it does not exist.
    """
    log_level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)

    # Ensure log directory exists
    log_dir = Path(settings.LOG_FILE).parent
    log_dir.mkdir(parents=True, exist_ok=True)

    # Formatter
    fmt = (
        "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
    )
    date_fmt = "%Y-%m-%d %H:%M:%S"
    formatter = logging.Formatter(fmt, datefmt=date_fmt)

    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(log_level)
    console_handler.setFormatter(formatter)

    # Rotating file handler (5 MB per file, keep 5 backups)
    file_handler = logging.handlers.RotatingFileHandler(
        settings.LOG_FILE,
        maxBytes=5 * 1024 * 1024,
        backupCount=5,
        encoding="utf-8",
    )
    file_handler.setLevel(log_level)
    file_handler.setFormatter(formatter)

    # Root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)
    # Avoid duplicate handlers on reload
    root_logger.handlers.clear()
    root_logger.addHandler(console_handler)
    root_logger.addHandler(file_handler)

    # Quieten noisy third-party loggers
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(
        logging.INFO if settings.DEBUG else logging.WARNING
    )


# ---------------------------------------------------------------------------
# Application Lifespan
# ---------------------------------------------------------------------------

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: startup and shutdown logic."""
    _configure_logging()

    logger.info("Initializing database tables...")
    init_db()
    logger.info(
        "Farm Help API started | env=%s version=%s",
        settings.ENVIRONMENT,
        settings.APP_VERSION,
    )

    yield

    logger.info("Farm Help API shutting down")


# ---------------------------------------------------------------------------
# Application Factory
# ---------------------------------------------------------------------------

app = FastAPI(
    title=settings.APP_NAME,
    description=(
        "AI-Powered Farm Decision Support System for Indian Smallholder Farmers. "
        "Provides disease treatment recommendations, weather forecasts, "
        "APMC price intelligence, and farming advisories."
    ),
    version=settings.APP_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# Middleware
# ---------------------------------------------------------------------------
# In Starlette the *last* middleware added via add_middleware becomes the
# outermost layer (first to execute on a request, last on a response).
# We therefore add them in inner -> outer order.

# 1. CORS (innermost middleware layer)
configure_cors(app)

# 2. Rate limiting
app.add_middleware(
    RateLimitMiddleware,
    max_requests=settings.RATE_LIMIT_PER_MINUTE,
    window_seconds=60,
    exclude_paths=("/docs", "/redoc", "/openapi.json", "/health"),
)

# 3. Request/response logging
app.add_middleware(RequestLoggingMiddleware)

# 4. Request ID injection (outermost so all subsequent layers see it)
app.add_middleware(RequestIDMiddleware)

# ---------------------------------------------------------------------------
# Error Handlers
# ---------------------------------------------------------------------------

register_error_handlers(app)

# ---------------------------------------------------------------------------
# API Versioning
# ---------------------------------------------------------------------------

# Current version routers (v1)
app.include_router(disease.router, prefix=API_V1_PREFIX, tags=["v1 - Disease"])
app.include_router(weather.router, prefix=API_V1_PREFIX, tags=["v1 - Weather"])
app.include_router(apmc.router, prefix=API_V1_PREFIX, tags=["v1 - APMC"])
app.include_router(schemes.router, prefix=API_V1_PREFIX, tags=["v1 - Schemes"])
app.include_router(voice.router, prefix=API_V1_PREFIX, tags=["v1 - Voice"])

# Legacy (unversioned) routes for backward compatibility
app.include_router(disease.router, prefix=API_LEGACY_PREFIX)
app.include_router(weather.router, prefix=API_LEGACY_PREFIX)
app.include_router(apmc.router, prefix=API_LEGACY_PREFIX)
app.include_router(schemes.router, prefix=API_LEGACY_PREFIX)
app.include_router(voice.router, prefix=API_LEGACY_PREFIX)


# ---------------------------------------------------------------------------
# Root & Health Endpoints
# ---------------------------------------------------------------------------

@app.get("/", tags=["System"])
async def root():
    """Root: serve SPA index when STATIC_DIR is set, else API metadata."""
    static_dir = settings.STATIC_DIR and Path(settings.STATIC_DIR)
    if static_dir and (static_dir / "index.html").exists():
        return FileResponse(static_dir / "index.html")
    return {
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "status": "running",
        "docs": "/docs",
        "api_versions": ["v1"],
    }


@app.get("/health", tags=["System"])
async def health_check(request: Request):
    """
    Health check endpoint with component-level status.

    Returns database connectivity status, uptime metadata,
    and the current request ID for traceability.
    """
    db_connected = check_db_connection()
    overall = HEALTH_STATUS_HEALTHY if db_connected else HEALTH_STATUS_DEGRADED

    request_id = getattr(request.state, "request_id", None)

    db_label = "connected" if db_connected else "disconnected"

    return {
        "status": overall,
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "timestamp": format_iso(utc_now()),
        "request_id": request_id,
        "database": db_label,
        "components": {
            "database": {
                "status": db_label,
            },
            "api": {
                "status": "operational",
            },
        },
    }


# ---------------------------------------------------------------------------
# Static files and SPA fallback (production / Hugging Face)
# ---------------------------------------------------------------------------

_static_dir = settings.STATIC_DIR and Path(settings.STATIC_DIR)
if _static_dir and _static_dir.exists():
    _assets_dir = _static_dir / "assets"
    if _assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(_assets_dir)), name="assets")

    @app.get("/{full_path:path}", tags=["System"], include_in_schema=False)
    async def serve_spa(full_path: str):
        """Serve SPA index.html for non-API routes (client-side routing)."""
        if full_path.startswith("api/") or full_path == "api":
            raise HTTPException(status_code=404, detail="Not Found")
        index_file = _static_dir / "index.html"
        if index_file.exists():
            return FileResponse(index_file)
        raise HTTPException(status_code=404, detail="Not Found")
