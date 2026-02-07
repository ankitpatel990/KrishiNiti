"""
Global Error Handler

Registers exception handlers on the FastAPI application so that:

1. Custom ``AppException`` subclasses are serialised into a consistent
   JSON envelope with the correct HTTP status code.
2. Pydantic ``RequestValidationError`` returns a 422 with field-level
   error details.
3. All unhandled exceptions are caught, logged with a stack trace, and
   returned as a generic 500 response (no internal details leak).
"""

import logging
import traceback

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.utils.exceptions import AppException
from app.utils.helpers import build_error_response

logger = logging.getLogger("farmhelp.errors")


def register_error_handlers(app: FastAPI) -> None:
    """Attach all exception handlers to the FastAPI application."""

    # ------------------------------------------------------------------
    # Custom application exceptions
    # ------------------------------------------------------------------
    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException):
        request_id = getattr(request.state, "request_id", None)

        logger.warning(
            "AppException | request_id=%s code=%s message=%s detail=%s",
            request_id,
            exc.error_code,
            exc.message,
            exc.detail,
        )

        body = build_error_response(
            error_code=exc.error_code,
            message=exc.message,
            status_code=exc.status_code,
            detail=exc.detail,
            request_id=request_id,
        )
        return JSONResponse(status_code=exc.status_code, content=body)

    # ------------------------------------------------------------------
    # FastAPI / Starlette HTTP exceptions
    # ------------------------------------------------------------------
    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(
        request: Request, exc: StarletteHTTPException
    ):
        request_id = getattr(request.state, "request_id", None)

        logger.warning(
            "HTTPException | request_id=%s status=%s detail=%s",
            request_id,
            exc.status_code,
            exc.detail,
        )

        detail_str = str(exc.detail) if exc.detail else "HTTP error"
        body = build_error_response(
            error_code="HTTP_ERROR",
            message=detail_str,
            status_code=exc.status_code,
            request_id=request_id,
        )
        # Preserve top-level "detail" for backward compatibility with
        # code that reads response.json()["detail"] directly.
        body["detail"] = detail_str
        return JSONResponse(status_code=exc.status_code, content=body)

    # ------------------------------------------------------------------
    # Pydantic validation errors
    # ------------------------------------------------------------------
    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request, exc: RequestValidationError
    ):
        request_id = getattr(request.state, "request_id", None)
        errors = exc.errors()

        field_errors = []
        for err in errors:
            field_errors.append(
                {
                    "field": " -> ".join(str(loc) for loc in err.get("loc", [])),
                    "message": err.get("msg", ""),
                    "type": err.get("type", ""),
                }
            )

        logger.warning(
            "ValidationError | request_id=%s errors=%s",
            request_id,
            field_errors,
        )

        body = build_error_response(
            error_code="VALIDATION_ERROR",
            message="Request validation failed.",
            status_code=422,
            detail=str(field_errors),
            request_id=request_id,
        )
        body["validation_errors"] = field_errors
        # Preserve top-level "detail" for backward compatibility.
        body["detail"] = field_errors
        return JSONResponse(status_code=422, content=body)

    # ------------------------------------------------------------------
    # Catch-all for unhandled exceptions
    # ------------------------------------------------------------------
    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        request_id = getattr(request.state, "request_id", None)

        logger.error(
            "UnhandledException | request_id=%s type=%s message=%s\n%s",
            request_id,
            type(exc).__name__,
            str(exc),
            traceback.format_exc(),
        )

        body = build_error_response(
            error_code="INTERNAL_ERROR",
            message="An unexpected error occurred. Please try again later.",
            status_code=500,
            request_id=request_id,
        )
        return JSONResponse(status_code=500, content=body)
