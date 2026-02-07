"""
Application Constants

Centralised location for all magic values, default limits,
and static look-up tables used across the application.
"""

# ---------------------------------------------------------------------------
# API Versioning
# ---------------------------------------------------------------------------
API_V1_PREFIX = "/api/v1"
API_LEGACY_PREFIX = "/api"

# ---------------------------------------------------------------------------
# Pagination Defaults
# ---------------------------------------------------------------------------
DEFAULT_PAGE_SIZE = 50
MAX_PAGE_SIZE = 200
MIN_PAGE_SIZE = 1

# ---------------------------------------------------------------------------
# Rate Limiting Defaults
# ---------------------------------------------------------------------------
DEFAULT_RATE_LIMIT_PER_MINUTE = 60
RATE_LIMIT_WINDOW_SECONDS = 60

# ---------------------------------------------------------------------------
# Cache TTL (seconds)
# ---------------------------------------------------------------------------
WEATHER_CACHE_TTL_SECONDS = 6 * 3600   # 6 hours
MANDI_CACHE_TTL_SECONDS = 24 * 3600    # 24 hours

# ---------------------------------------------------------------------------
# External API Timeouts (seconds)
# ---------------------------------------------------------------------------
EXTERNAL_API_TIMEOUT = 10
EXTERNAL_API_MAX_RETRIES = 2

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
LOG_DATE_FORMAT = "%Y-%m-%d %H:%M:%S"
LOG_FORMAT = (
    "%(asctime)s | %(levelname)-8s | %(name)s | "
    "request_id=%(request_id)s | %(message)s"
)
LOG_FORMAT_SIMPLE = (
    "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
)

# ---------------------------------------------------------------------------
# Indian Pincode Constraints
# ---------------------------------------------------------------------------
PINCODE_LENGTH = 6
PINCODE_PATTERN = r"^\d{6}$"

# ---------------------------------------------------------------------------
# Supported Crop Types
# ---------------------------------------------------------------------------
SUPPORTED_CROPS = [
    "Paddy",
    "Wheat",
    "Cotton",
    "Sugarcane",
    "Tomato",
    "Potato",
    "Onion",
    "Chilli",
    "Maize",
    "Pulses",
    "Oilseeds",
    "Millets",
]

# ---------------------------------------------------------------------------
# Alert Severity Levels (ordered low -> high)
# ---------------------------------------------------------------------------
SEVERITY_LEVELS = {
    "info": 0,
    "warning": 1,
    "danger": 2,
}

# ---------------------------------------------------------------------------
# Response Envelope Keys
# ---------------------------------------------------------------------------
RESPONSE_KEY_SUCCESS = "success"
RESPONSE_KEY_DATA = "data"
RESPONSE_KEY_ERROR = "error"
RESPONSE_KEY_META = "meta"
RESPONSE_KEY_REQUEST_ID = "request_id"

# ---------------------------------------------------------------------------
# Health Check
# ---------------------------------------------------------------------------
HEALTH_STATUS_HEALTHY = "healthy"
HEALTH_STATUS_DEGRADED = "degraded"
HEALTH_STATUS_UNHEALTHY = "unhealthy"
