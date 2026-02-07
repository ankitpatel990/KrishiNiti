"""
Common Helper Functions

Utility functions shared across the application:
- API response envelope builder
- Date/time helpers
- String sanitisers
- Distance calculator (Haversine)
"""

import math
import re
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional


# ---------------------------------------------------------------------------
# API Response Envelope
# ---------------------------------------------------------------------------

def build_success_response(
    data: Any,
    message: str = "Request completed successfully.",
    meta: Optional[Dict[str, Any]] = None,
    request_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Build a standardised success response envelope.

    Args:
        data: Payload to include under the ``data`` key.
        message: Human-readable status message.
        meta: Optional metadata (pagination, timing, etc.).
        request_id: Unique request identifier for traceability.

    Returns:
        Dict with ``success``, ``message``, ``data``, ``meta``, and
        ``request_id`` keys.
    """
    response: Dict[str, Any] = {
        "success": True,
        "message": message,
        "data": data,
    }
    if meta is not None:
        response["meta"] = meta
    if request_id is not None:
        response["request_id"] = request_id
    return response


def build_error_response(
    error_code: str,
    message: str,
    status_code: int = 500,
    detail: Optional[str] = None,
    request_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Build a standardised error response envelope.
    """
    response: Dict[str, Any] = {
        "success": False,
        "error": {
            "error_code": error_code,
            "message": message,
            "status_code": status_code,
        },
    }
    if detail:
        response["error"]["detail"] = detail
    if request_id:
        response["request_id"] = request_id
    return response


# ---------------------------------------------------------------------------
# Pagination Helper
# ---------------------------------------------------------------------------

def build_pagination_meta(
    total: int,
    limit: int,
    offset: int,
) -> Dict[str, Any]:
    """
    Build pagination metadata for list endpoints.
    """
    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "has_more": (offset + limit) < total,
    }


# ---------------------------------------------------------------------------
# Request ID
# ---------------------------------------------------------------------------

def generate_request_id() -> str:
    """Generate a unique request identifier (UUID4 hex, truncated to 12 chars)."""
    return uuid.uuid4().hex[:12]


# ---------------------------------------------------------------------------
# Date/Time Helpers
# ---------------------------------------------------------------------------

def utc_now() -> datetime:
    """Return the current UTC datetime (timezone-aware)."""
    return datetime.now(timezone.utc)


def format_iso(dt: Optional[datetime]) -> Optional[str]:
    """Format a datetime as ISO-8601 string, or return None."""
    if dt is None:
        return None
    return dt.isoformat()


# ---------------------------------------------------------------------------
# String Sanitisation
# ---------------------------------------------------------------------------

_MULTI_SPACE = re.compile(r"\s+")


def sanitize_string(value: str) -> str:
    """Strip and collapse multiple whitespace characters."""
    return _MULTI_SPACE.sub(" ", value.strip())


def sanitize_query(value: str) -> str:
    """
    Sanitise a search query: strip, collapse whitespace,
    and remove characters that could break LIKE clauses.
    """
    cleaned = sanitize_string(value)
    cleaned = cleaned.replace("%", "").replace("_", "")
    return cleaned


# ---------------------------------------------------------------------------
# Distance Calculation (Haversine)
# ---------------------------------------------------------------------------

_EARTH_RADIUS_KM = 6371.0


def haversine_distance(
    lat1: float,
    lon1: float,
    lat2: float,
    lon2: float,
) -> float:
    """
    Calculate the great-circle distance between two points on Earth
    using the Haversine formula.

    Args:
        lat1, lon1: Latitude and longitude of point 1 (degrees).
        lat2, lon2: Latitude and longitude of point 2 (degrees).

    Returns:
        Distance in kilometres.
    """
    lat1_r, lon1_r = math.radians(lat1), math.radians(lon1)
    lat2_r, lon2_r = math.radians(lat2), math.radians(lon2)

    dlat = lat2_r - lat1_r
    dlon = lon2_r - lon1_r

    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(lat1_r) * math.cos(lat2_r) * math.sin(dlon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return _EARTH_RADIUS_KM * c


# ---------------------------------------------------------------------------
# Miscellaneous
# ---------------------------------------------------------------------------

def clamp(value: float, min_val: float, max_val: float) -> float:
    """Clamp a numeric value between min_val and max_val."""
    return max(min_val, min(value, max_val))


def safe_float(value: Any, default: float = 0.0) -> float:
    """Safely convert a value to float, returning *default* on failure."""
    try:
        return float(value)
    except (ValueError, TypeError):
        return default


def chunk_list(items: List[Any], size: int) -> List[List[Any]]:
    """Split a list into chunks of the given size."""
    return [items[i : i + size] for i in range(0, len(items), size)]
