"""
CORS Configuration Helper

Extracts CORS setup into a reusable function so that ``main.py``
remains clean and the allowed origins / methods / headers are
easy to audit in one place.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings


def configure_cors(app: FastAPI) -> None:
    """
    Apply CORS middleware to the FastAPI application.

    Origins are read from ``settings.CORS_ORIGINS``.  In development
    mode (``settings.DEBUG``), all origins are allowed.
    """
    origins = settings.CORS_ORIGINS

    if settings.DEBUG:
        origins = ["*"]

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allow_headers=[
            "Authorization",
            "Content-Type",
            "Accept",
            "X-Request-ID",
            "X-Requested-With",
        ],
        expose_headers=[
            "X-Request-ID",
            "X-Response-Time-Ms",
            "X-RateLimit-Limit",
            "X-RateLimit-Remaining",
            "X-RateLimit-Reset",
            "Retry-After",
        ],
        max_age=600,
    )
