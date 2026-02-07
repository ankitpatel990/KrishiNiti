"""
Unit tests for the Weather API endpoints.

All tests mock the external Open-Meteo API and pincode resolution
so that no real HTTP calls are made.
"""

import pytest


class TestWeatherForecast:
    """Tests for GET /api/weather/forecast"""

    def test_forecast_success(self, client, mock_weather_api):
        resp = client.get("/api/weather/forecast?pincode=110001")
        assert resp.status_code == 200
        body = resp.json()
        assert body["pincode"] == "110001"
        assert "forecast" in body
        assert "location" in body
        assert body["location"]["city"] == "New Delhi"
        assert "response_time_ms" in body

    def test_forecast_cached(self, client, mock_weather_cached):
        resp = client.get("/api/weather/forecast?pincode=110001")
        assert resp.status_code == 200
        body = resp.json()
        assert body["cached"] is True
        assert body["cached_at"] is not None

    def test_forecast_invalid_pincode_short(self, client):
        resp = client.get("/api/weather/forecast?pincode=1100")
        assert resp.status_code == 422

    def test_forecast_invalid_pincode_letters(self, client):
        resp = client.get("/api/weather/forecast?pincode=abcdef")
        assert resp.status_code == 422

    def test_forecast_missing_pincode(self, client):
        resp = client.get("/api/weather/forecast")
        assert resp.status_code == 422

    def test_forecast_unknown_pincode(self, client, mock_weather_api):
        """Pincode not in mock data should return 404."""
        resp = client.get("/api/weather/forecast?pincode=999999")
        assert resp.status_code == 404

    def test_forecast_has_request_id_header(self, client, mock_weather_api):
        resp = client.get("/api/weather/forecast?pincode=110001")
        assert "x-request-id" in resp.headers


class TestWeatherAlerts:
    """Tests for GET /api/weather/alerts"""

    def test_alerts_success(self, client, mock_weather_api):
        resp = client.get("/api/weather/alerts?pincode=110001")
        assert resp.status_code == 200
        body = resp.json()
        assert body["pincode"] == "110001"
        assert "alerts" in body
        assert "alert_count" in body
        assert "severity" in body
        assert isinstance(body["alerts"], list)

    def test_alerts_with_crop_type(self, client, mock_weather_api):
        resp = client.get("/api/weather/alerts?pincode=110001&crop_type=Paddy")
        assert resp.status_code == 200
        body = resp.json()
        assert body["crop_type"] == "Paddy"

    def test_alerts_unknown_pincode(self, client, mock_weather_api):
        resp = client.get("/api/weather/alerts?pincode=999999")
        assert resp.status_code == 404

    def test_alerts_invalid_pincode(self, client):
        resp = client.get("/api/weather/alerts?pincode=abc")
        assert resp.status_code == 422


class TestWeatherAnalyze:
    """Tests for POST /api/weather/analyze"""

    def test_analyze_success(self, client, mock_weather_api):
        resp = client.post(
            "/api/weather/analyze",
            json={"pincode": "110001", "crop_type": "Wheat"},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["pincode"] == "110001"
        assert body["crop_type"] == "Wheat"
        assert "forecast_summary" in body
        assert "crop_suitability" in body
        assert body["crop_suitability"] in ("excellent", "good", "moderate", "poor")
        assert "alerts" in body
        assert "recommendations" in body
        assert "crop_profile" in body

    def test_analyze_paddy(self, client, mock_weather_api):
        resp = client.post(
            "/api/weather/analyze",
            json={"pincode": "400001", "crop_type": "Paddy"},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["crop_type"] == "Paddy"
        assert "irrigation" in body["recommendations"]
        assert "spraying" in body["recommendations"]
        assert "harvesting" in body["recommendations"]
        assert "general" in body["recommendations"]

    def test_analyze_unsupported_crop(self, client, mock_weather_api):
        resp = client.post(
            "/api/weather/analyze",
            json={"pincode": "110001", "crop_type": "Mango"},
        )
        assert resp.status_code == 400
        assert "Unsupported crop type" in resp.json()["detail"]

    def test_analyze_invalid_pincode(self, client):
        resp = client.post(
            "/api/weather/analyze",
            json={"pincode": "12345", "crop_type": "Wheat"},
        )
        assert resp.status_code == 422

    def test_analyze_missing_crop_type(self, client):
        resp = client.post(
            "/api/weather/analyze",
            json={"pincode": "110001"},
        )
        assert resp.status_code == 422


class TestWeatherCrops:
    """Tests for GET /api/weather/crops"""

    def test_list_crops(self, client):
        resp = client.get("/api/weather/crops")
        assert resp.status_code == 200
        body = resp.json()
        assert "total" in body
        assert "crops" in body
        assert body["total"] >= 10
        crop_names = [c["crop_type"] for c in body["crops"]]
        assert "Paddy" in crop_names
        assert "Wheat" in crop_names

    def test_crop_fields(self, client):
        resp = client.get("/api/weather/crops")
        body = resp.json()
        for crop in body["crops"]:
            assert "crop_type" in crop
            assert "optimal_temp_range" in crop
            assert "water_need" in crop
            assert "growth_season" in crop


class TestWeatherV1Routes:
    """Verify v1-prefixed routes also work."""

    def test_v1_forecast(self, client, mock_weather_api):
        resp = client.get("/api/v1/weather/forecast?pincode=110001")
        assert resp.status_code == 200
        assert resp.json()["pincode"] == "110001"

    def test_v1_crops(self, client):
        resp = client.get("/api/v1/weather/crops")
        assert resp.status_code == 200
        assert resp.json()["total"] >= 10
