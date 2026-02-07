"""
Tests for middleware and system-level endpoints.

Covers:
- Root endpoint
- Health check
- Request ID injection
- Response timing header
- Error handling (404, 422 envelopes)
- API versioning (v1 prefix)
"""

import pytest


class TestRootEndpoint:
    """Tests for GET /"""

    def test_root(self, client):
        resp = client.get("/")
        assert resp.status_code == 200
        body = resp.json()
        assert body["status"] == "running"
        assert "version" in body
        assert "docs" in body
        assert "v1" in body["api_versions"]


class TestHealthCheck:
    """Tests for GET /health"""

    def test_health_check(self, client):
        resp = client.get("/health")
        assert resp.status_code == 200
        body = resp.json()
        assert body["status"] in ("healthy", "degraded")
        assert "service" in body
        assert "version" in body
        assert "timestamp" in body
        assert "database" in body
        assert body["database"] in ("connected", "disconnected")

    def test_health_components(self, client):
        resp = client.get("/health")
        body = resp.json()
        assert "components" in body
        assert "database" in body["components"]
        assert "api" in body["components"]
        assert body["components"]["api"]["status"] == "operational"


class TestRequestIDMiddleware:
    """Verify the X-Request-ID header is present on all responses."""

    def test_request_id_generated(self, client):
        resp = client.get("/")
        rid = resp.headers.get("x-request-id")
        assert rid is not None
        assert len(rid) >= 10

    def test_request_id_varies(self, client):
        r1 = client.get("/")
        r2 = client.get("/")
        assert r1.headers["x-request-id"] != r2.headers["x-request-id"]

    def test_client_supplied_request_id(self, client):
        resp = client.get("/", headers={"X-Request-ID": "my-custom-id"})
        assert resp.headers.get("x-request-id") == "my-custom-id"


class TestResponseTimingHeader:
    """Verify the X-Response-Time-Ms header is present."""

    def test_timing_header(self, client):
        resp = client.get("/health")
        time_ms = resp.headers.get("x-response-time-ms")
        assert time_ms is not None
        assert float(time_ms) >= 0


class TestErrorHandling:
    """Verify error envelope structure."""

    def test_404_has_detail(self, client):
        resp = client.get("/api/disease/99999")
        assert resp.status_code == 404
        body = resp.json()
        assert "detail" in body

    def test_404_has_error_envelope(self, client):
        resp = client.get("/api/disease/99999")
        body = resp.json()
        assert body["success"] is False
        assert "error" in body
        assert body["error"]["status_code"] == 404

    def test_unknown_route_404(self, client):
        resp = client.get("/api/nonexistent/endpoint")
        assert resp.status_code == 404

    def test_validation_error_422(self, client):
        resp = client.get("/api/weather/forecast?pincode=abc")
        assert resp.status_code == 422
        body = resp.json()
        assert "detail" in body


class TestAPIVersioning:
    """Verify both legacy and v1 prefixed routes are reachable."""

    def test_legacy_disease_list(self, client):
        resp = client.get("/api/disease/list")
        assert resp.status_code == 200

    def test_v1_disease_list(self, client):
        resp = client.get("/api/v1/disease/list")
        assert resp.status_code == 200

    def test_v1_and_legacy_same_data(self, client):
        r_legacy = client.get("/api/disease/list")
        r_v1 = client.get("/api/v1/disease/list")
        assert r_legacy.json()["total"] == r_v1.json()["total"]
