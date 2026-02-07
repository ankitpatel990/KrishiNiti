"""
Unit tests for utility functions, custom exceptions, and constants.
"""

import math
from datetime import datetime, timezone

import pytest

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
    clamp,
    safe_float,
    chunk_list,
)
from app.utils.exceptions import (
    AppException,
    NotFoundError,
    ValidationError,
    ExternalAPIError,
    RateLimitError,
    DatabaseError,
)
from app.utils.constants import (
    API_V1_PREFIX,
    API_LEGACY_PREFIX,
    DEFAULT_PAGE_SIZE,
    MAX_PAGE_SIZE,
    HEALTH_STATUS_HEALTHY,
    HEALTH_STATUS_DEGRADED,
)


# ---------------------------------------------------------------------------
# Response Envelope Tests
# ---------------------------------------------------------------------------

class TestBuildSuccessResponse:

    def test_basic(self):
        resp = build_success_response(data={"key": "value"})
        assert resp["success"] is True
        assert resp["data"] == {"key": "value"}
        assert "message" in resp

    def test_custom_message(self):
        resp = build_success_response(data=None, message="Done")
        assert resp["message"] == "Done"

    def test_with_meta(self):
        meta = {"page": 1}
        resp = build_success_response(data=[], meta=meta)
        assert resp["meta"] == meta

    def test_with_request_id(self):
        resp = build_success_response(data=[], request_id="abc123")
        assert resp["request_id"] == "abc123"

    def test_without_optional_fields(self):
        resp = build_success_response(data=[])
        assert "meta" not in resp
        assert "request_id" not in resp


class TestBuildErrorResponse:

    def test_basic(self):
        resp = build_error_response(
            error_code="TEST_ERROR", message="Something went wrong"
        )
        assert resp["success"] is False
        assert resp["error"]["error_code"] == "TEST_ERROR"
        assert resp["error"]["message"] == "Something went wrong"
        assert resp["error"]["status_code"] == 500

    def test_with_detail(self):
        resp = build_error_response(
            error_code="E", message="M", detail="extra info"
        )
        assert resp["error"]["detail"] == "extra info"

    def test_with_request_id(self):
        resp = build_error_response(
            error_code="E", message="M", request_id="rid-123"
        )
        assert resp["request_id"] == "rid-123"


class TestBuildPaginationMeta:

    def test_has_more(self):
        meta = build_pagination_meta(total=100, limit=10, offset=0)
        assert meta["total"] == 100
        assert meta["limit"] == 10
        assert meta["has_more"] is True

    def test_no_more(self):
        meta = build_pagination_meta(total=5, limit=10, offset=0)
        assert meta["has_more"] is False

    def test_exact_boundary(self):
        meta = build_pagination_meta(total=10, limit=10, offset=0)
        assert meta["has_more"] is False


# ---------------------------------------------------------------------------
# Request ID Tests
# ---------------------------------------------------------------------------

class TestGenerateRequestId:

    def test_length(self):
        rid = generate_request_id()
        assert len(rid) == 12

    def test_unique(self):
        ids = {generate_request_id() for _ in range(100)}
        assert len(ids) == 100

    def test_hex_characters(self):
        rid = generate_request_id()
        assert all(c in "0123456789abcdef" for c in rid)


# ---------------------------------------------------------------------------
# Date / Time Tests
# ---------------------------------------------------------------------------

class TestDateTimeHelpers:

    def test_utc_now_is_utc(self):
        now = utc_now()
        assert now.tzinfo is not None
        assert now.tzinfo == timezone.utc

    def test_format_iso(self):
        dt = datetime(2026, 1, 15, 12, 0, 0, tzinfo=timezone.utc)
        result = format_iso(dt)
        assert "2026-01-15" in result
        assert "12:00:00" in result

    def test_format_iso_none(self):
        assert format_iso(None) is None


# ---------------------------------------------------------------------------
# String Sanitisation Tests
# ---------------------------------------------------------------------------

class TestSanitizeString:

    def test_collapse_whitespace(self):
        assert sanitize_string("  hello   world  ") == "hello world"

    def test_strip(self):
        assert sanitize_string("  test  ") == "test"

    def test_tabs_and_newlines(self):
        assert sanitize_string("a\t\nb") == "a b"


class TestSanitizeQuery:

    def test_removes_wildcards(self):
        result = sanitize_query("test%value_here")
        assert "%" not in result
        assert "_" not in result

    def test_preserves_valid_chars(self):
        assert sanitize_query("Paddy Blast") == "Paddy Blast"


# ---------------------------------------------------------------------------
# Haversine Distance Tests
# ---------------------------------------------------------------------------

class TestHaversineDistance:

    def test_same_point(self):
        dist = haversine_distance(28.6, 77.2, 28.6, 77.2)
        assert dist == pytest.approx(0.0, abs=0.01)

    def test_known_distance(self):
        # Delhi to Mumbai approx 1150 km
        dist = haversine_distance(28.6139, 77.2090, 18.9388, 72.8354)
        assert 1100 < dist < 1200

    def test_symmetry(self):
        d1 = haversine_distance(28.6, 77.2, 18.9, 72.8)
        d2 = haversine_distance(18.9, 72.8, 28.6, 77.2)
        assert d1 == pytest.approx(d2, abs=0.01)


# ---------------------------------------------------------------------------
# Miscellaneous Helpers
# ---------------------------------------------------------------------------

class TestClamp:

    def test_within_range(self):
        assert clamp(5.0, 0.0, 10.0) == 5.0

    def test_below_min(self):
        assert clamp(-1.0, 0.0, 10.0) == 0.0

    def test_above_max(self):
        assert clamp(15.0, 0.0, 10.0) == 10.0


class TestSafeFloat:

    def test_valid_string(self):
        assert safe_float("3.14") == pytest.approx(3.14)

    def test_integer(self):
        assert safe_float(42) == 42.0

    def test_invalid(self):
        assert safe_float("abc") == 0.0

    def test_none(self):
        assert safe_float(None, default=-1.0) == -1.0


class TestChunkList:

    def test_even_split(self):
        result = chunk_list([1, 2, 3, 4], 2)
        assert result == [[1, 2], [3, 4]]

    def test_uneven_split(self):
        result = chunk_list([1, 2, 3, 4, 5], 2)
        assert result == [[1, 2], [3, 4], [5]]

    def test_empty(self):
        assert chunk_list([], 3) == []


# ---------------------------------------------------------------------------
# Custom Exception Tests
# ---------------------------------------------------------------------------

class TestAppException:

    def test_defaults(self):
        exc = AppException()
        assert exc.status_code == 500
        assert exc.error_code == "INTERNAL_ERROR"

    def test_custom(self):
        exc = AppException(
            status_code=400,
            error_code="BAD_REQUEST",
            message="Invalid data",
            detail="Field X is required",
        )
        assert exc.status_code == 400
        assert exc.error_code == "BAD_REQUEST"
        assert exc.message == "Invalid data"
        assert exc.detail == "Field X is required"

    def test_to_dict(self):
        exc = AppException(
            status_code=403,
            error_code="FORBIDDEN",
            message="Access denied",
        )
        d = exc.to_dict()
        assert d["error_code"] == "FORBIDDEN"
        assert d["status_code"] == 403
        assert "detail" not in d

    def test_to_dict_with_detail(self):
        exc = AppException(detail="extra")
        d = exc.to_dict()
        assert d["detail"] == "extra"


class TestNotFoundError:

    def test_defaults(self):
        exc = NotFoundError()
        assert exc.status_code == 404
        assert exc.error_code == "NOT_FOUND"

    def test_custom_message(self):
        exc = NotFoundError(message="Item missing")
        assert "Item missing" in str(exc)


class TestValidationError:

    def test_defaults(self):
        exc = ValidationError()
        assert exc.status_code == 422
        assert exc.error_code == "VALIDATION_ERROR"


class TestExternalAPIError:

    def test_defaults(self):
        exc = ExternalAPIError()
        assert exc.status_code == 503
        assert exc.error_code == "EXTERNAL_API_ERROR"


class TestRateLimitError:

    def test_defaults(self):
        exc = RateLimitError()
        assert exc.status_code == 429


class TestDatabaseError:

    def test_defaults(self):
        exc = DatabaseError()
        assert exc.status_code == 500
        assert exc.error_code == "DATABASE_ERROR"


# ---------------------------------------------------------------------------
# Constants Tests
# ---------------------------------------------------------------------------

class TestConstants:

    def test_api_prefixes(self):
        assert API_V1_PREFIX == "/api/v1"
        assert API_LEGACY_PREFIX == "/api"

    def test_pagination_defaults(self):
        assert DEFAULT_PAGE_SIZE == 50
        assert MAX_PAGE_SIZE == 200

    def test_health_statuses(self):
        assert HEALTH_STATUS_HEALTHY == "healthy"
        assert HEALTH_STATUS_DEGRADED == "degraded"
