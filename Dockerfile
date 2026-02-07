# FarmHelp - Hugging Face Spaces Docker
# Multi-stage: build frontend, then run backend + static SPA on port 7860

# ---------------------------------------------------------------------------
# Stage 1: Frontend build (Vite + React)
# ---------------------------------------------------------------------------
FROM node:20-alpine AS frontend

WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./

# Same-origin API in production (backend serves both API and static)
ENV VITE_API_BASE_URL=""
RUN npm run build

# ---------------------------------------------------------------------------
# Stage 2: Backend + static files
# ---------------------------------------------------------------------------
FROM python:3.10-slim

WORKDIR /app/backend

# System deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Python dependencies
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Backend application
COPY backend/ ./

# Frontend build from stage 1
COPY --from=frontend /app/frontend/dist /app/static

# ---------------------------------------------------------------------------
# Environment variables (Hugging Face / production)
# Override via HF Space Secrets or Docker run -e if needed.
# ---------------------------------------------------------------------------
ENV PORT=7860
ENV ENVIRONMENT=production
ENV STATIC_DIR=/app/static
ENV DATABASE_URL=sqlite:///./farmhelp.db
ENV LOG_LEVEL=INFO
ENV LOG_FILE=logs/app.log
ENV RATE_LIMIT_PER_MINUTE=60
ENV WEATHER_CACHE_HOURS=6
ENV MANDI_CACHE_HOURS=24
ENV CORS_ORIGINS='["*"]'
ENV OPEN_METEO_API_URL=https://api.open-meteo.com/v1/forecast
ENV DATA_GOV_IN_API_URL=https://api.data.gov.in/resource
ENV DATA_GOV_IN_API_KEY=""
ENV DEBUG=false
ENV APP_NAME="Farm Help API"
ENV APP_VERSION=1.0.0

EXPOSE 7860

# Init DB from JSON data, then start server (PORT set by HF Spaces, default 7860)
CMD ["sh", "-c", "python init_db.py && (python seed_data.py || true) && exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-7860}"]
