"""
Unit tests for the Disease Treatment API endpoints.
"""

import pytest


class TestListDiseases:
    """Tests for GET /api/disease/list"""

    def test_list_all(self, client):
        resp = client.get("/api/disease/list")
        assert resp.status_code == 200
        body = resp.json()
        assert "total" in body
        assert "diseases" in body
        assert body["total"] >= 4

    def test_list_filter_by_crop_type(self, client):
        resp = client.get("/api/disease/list?crop_type=Paddy")
        assert resp.status_code == 200
        body = resp.json()
        assert body["total"] >= 2
        for disease in body["diseases"]:
            assert disease["crop_type"].lower() == "paddy"

    def test_list_filter_no_results(self, client):
        resp = client.get("/api/disease/list?crop_type=Mango")
        assert resp.status_code == 200
        body = resp.json()
        assert body["total"] == 0
        assert body["diseases"] == []

    def test_list_pagination(self, client):
        resp = client.get("/api/disease/list?limit=2&offset=0")
        assert resp.status_code == 200
        body = resp.json()
        assert len(body["diseases"]) <= 2


class TestGetDiseaseById:
    """Tests for GET /api/disease/{id}"""

    def test_get_existing(self, client):
        # First fetch the list to get a valid id
        list_resp = client.get("/api/disease/list?limit=1")
        disease_id = list_resp.json()["diseases"][0]["id"]

        resp = client.get(f"/api/disease/{disease_id}")
        assert resp.status_code == 200
        body = resp.json()
        assert body["id"] == disease_id
        assert "disease_name" in body

    def test_get_not_found(self, client):
        resp = client.get("/api/disease/99999")
        assert resp.status_code == 404
        assert "not found" in resp.json()["detail"].lower()


class TestGetTreatment:
    """Tests for POST /api/disease/treatment"""

    def test_exact_match_english(self, client):
        resp = client.post("/api/disease/treatment?disease_name=Paddy Blast")
        assert resp.status_code == 200
        body = resp.json()
        assert body["disease_name"] == "Paddy Blast"
        assert body["match_score"] == 1.0
        assert "treatment" in body
        assert "cost_estimate" in body

    def test_exact_match_hindi(self, client):
        resp = client.post(
            "/api/disease/treatment",
            params={"disease_name": "धान का ब्लास्ट"},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["disease_name"] == "Paddy Blast"
        assert body["match_score"] == 1.0

    def test_fuzzy_match(self, client):
        resp = client.post("/api/disease/treatment?disease_name=Paddy Blst")
        assert resp.status_code == 200
        body = resp.json()
        # Should still find Paddy Blast via fuzzy match
        assert body["disease_name"] == "Paddy Blast"
        assert body["match_score"] < 1.0

    def test_substring_match(self, client):
        resp = client.post("/api/disease/treatment?disease_name=Blast")
        assert resp.status_code == 200
        body = resp.json()
        assert "Blast" in body["disease_name"]

    def test_crop_type_filter(self, client):
        resp = client.post(
            "/api/disease/treatment?disease_name=Rust&crop_type=Wheat"
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["crop_type"] == "Wheat"

    def test_cost_estimation(self, client):
        resp = client.post(
            "/api/disease/treatment?disease_name=Paddy Blast&acres=5"
        )
        assert resp.status_code == 200
        body = resp.json()
        cost = body["cost_estimate"]
        assert cost["acres"] == 5
        assert cost["total_estimated_cost"] == 2500.0

    def test_not_found(self, client):
        resp = client.post(
            "/api/disease/treatment?disease_name=CompletelyNonexistent"
        )
        assert resp.status_code == 404

    def test_empty_name_rejected(self, client):
        resp = client.post("/api/disease/treatment?disease_name=")
        assert resp.status_code == 422  # validation error


class TestDetectDisease:
    """Tests for POST /api/disease/detect"""

    def test_detect_paddy(self, client):
        resp = client.post("/api/disease/detect?crop_type=Paddy")
        assert resp.status_code == 200
        body = resp.json()
        assert body["status"] == "simulated"
        assert body["crop_type"] == "Paddy"
        assert len(body["predictions"]) > 0

    def test_detect_unknown_crop(self, client):
        resp = client.post("/api/disease/detect?crop_type=Mango")
        assert resp.status_code == 404
