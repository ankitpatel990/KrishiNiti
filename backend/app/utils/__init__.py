"""
Utility Functions Package

Exposes commonly used helpers, constants, and custom exceptions
so callers can import directly from ``app.utils``.
"""

from app.utils.helpers import (
    build_success_response,
    build_error_response,
    build_pagination_meta,
    generate_request_id,
    utc_now,
    format_iso,
    sanitize_string,
    sanitize_query,
    haversine_distance,
)
from app.utils.exceptions import (
    AppException,
    NotFoundError,
    ValidationError,
    ExternalAPIError,
    RateLimitError,
    DatabaseError,
)

__all__ = [
    # helpers
    "build_success_response",
    "build_error_response",
    "build_pagination_meta",
    "generate_request_id",
    "utc_now",
    "format_iso",
    "sanitize_string",
    "sanitize_query",
    "haversine_distance",
    # exceptions
    "AppException",
    "NotFoundError",
    "ValidationError",
    "ExternalAPIError",
    "RateLimitError",
    "DatabaseError",
]
