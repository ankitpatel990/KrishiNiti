"""
Unit tests for the Mandi Price API endpoints.

Test data is seeded via conftest.py:
- 3 Wheat records (Azadpur, Khanna, Karnal) + 2 older Azadpur records
- 2 Rice records (Azadpur, Khanna)
- 1 Onion record (Lasalgaon)
"""

import pytest


class TestMandiHealth:
    """Tests for GET /api/mandi/health"""

    def test_health(self, client):
        resp = client.get("/api/mandi/health")
        assert resp.status_code == 200
        body = resp.json()
        assert body["status"] == "healthy"


class TestMandiCommodities:
    """Tests for GET /api/mandi/commodities"""

    def test_list_commodities(self, client):
        resp = client.get("/api/mandi/commodities")
        assert resp.status_code == 200
        body = resp.json()
        assert body["total"] >= 3
        names = [c["commodity"] for c in body["commodities"]]
        assert "Wheat" in names
        assert "Rice" in names
        assert "Onion" in names

    def test_commodity_fields(self, client):
        resp = client.get("/api/mandi/commodities")
        body = resp.json()
        for c in body["commodities"]:
            assert "commodity" in c
            assert "record_count" in c
            assert "avg_price_per_quintal" in c
            assert "min_price_per_quintal" in c
            assert "max_price_per_quintal" in c
            assert "mandi_count" in c


class TestMandiPrices:
    """Tests for GET /api/mandi/prices"""

    def test_all_prices(self, client):
        resp = client.get("/api/mandi/prices")
        assert resp.status_code == 200
        body = resp.json()
        assert body["total"] >= 8
        assert "prices" in body

    def test_filter_by_commodity(self, client):
        resp = client.get("/api/mandi/prices?commodity=Wheat")
        assert resp.status_code == 200
        body = resp.json()
        assert body["total"] >= 3
        for p in body["prices"]:
            assert p["commodity"].lower() == "wheat"

    def test_filter_by_state(self, client):
        resp = client.get("/api/mandi/prices?state=Punjab")
        assert resp.status_code == 200
        body = resp.json()
        for p in body["prices"]:
            assert p["state"].lower() == "punjab"

    def test_filter_by_commodity_and_state(self, client):
        resp = client.get("/api/mandi/prices?commodity=Wheat&state=Delhi")
        assert resp.status_code == 200
        body = resp.json()
        for p in body["prices"]:
            assert p["commodity"].lower() == "wheat"
            assert p["state"].lower() == "delhi"

    def test_filter_by_price_range(self, client):
        resp = client.get("/api/mandi/prices?min_price=2000&max_price=2500")
        assert resp.status_code == 200
        body = resp.json()
        for p in body["prices"]:
            assert p["price_per_quintal"] >= 2000
            assert p["price_per_quintal"] <= 2500

    def test_pagination(self, client):
        resp = client.get("/api/mandi/prices?limit=2&offset=0")
        assert resp.status_code == 200
        body = resp.json()
        assert len(body["prices"]) <= 2
        assert body["limit"] == 2
        assert body["offset"] == 0

    def test_no_results(self, client):
        resp = client.get("/api/mandi/prices?commodity=Saffron")
        assert resp.status_code == 200
        body = resp.json()
        assert body["total"] == 0
        assert body["prices"] == []

    def test_price_fields(self, client):
        resp = client.get("/api/mandi/prices?limit=1")
        body = resp.json()
        if body["prices"]:
            p = body["prices"][0]
            assert "id" in p
            assert "commodity" in p
            assert "mandi_name" in p
            assert "state" in p
            assert "price_per_quintal" in p
            assert "arrival_date" in p


class TestMandiCompare:
    """Tests for GET /api/mandi/compare"""

    def test_compare_wheat(self, client):
        resp = client.get("/api/mandi/compare?commodity=Wheat")
        assert resp.status_code == 200
        body = resp.json()
        assert body["commodity"] == "Wheat"
        assert body["total_mandis"] >= 2
        assert "mandis" in body
        assert "analytics" in body

    def test_compare_analytics_fields(self, client):
        resp = client.get("/api/mandi/compare?commodity=Wheat")
        body = resp.json()
        analytics = body["analytics"]
        assert "average_price" in analytics
        assert "price_range" in analytics
        assert "price_spread" in analytics
        assert "best_mandi" in analytics
        assert "worst_mandi" in analytics

    def test_compare_specific_mandis(self, client):
        resp = client.get(
            "/api/mandi/compare?commodity=Wheat&mandis=Azadpur Mandi,Khanna Mandi"
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["total_mandis"] == 2

    def test_compare_with_state_filter(self, client):
        resp = client.get("/api/mandi/compare?commodity=Wheat&state=Delhi")
        assert resp.status_code == 200
        body = resp.json()
        for m in body["mandis"]:
            assert m["state"].lower() == "delhi"

    def test_compare_no_results(self, client):
        resp = client.get("/api/mandi/compare?commodity=Saffron")
        assert resp.status_code == 200
        body = resp.json()
        assert body["total_mandis"] == 0
        assert body["analytics"] is None


class TestMandiBest:
    """Tests for GET /api/mandi/best"""

    def test_best_mandi_no_location(self, client):
        resp = client.get("/api/mandi/best?commodity=Wheat")
        assert resp.status_code == 200
        body = resp.json()
        assert body["commodity"] == "Wheat"
        assert body["total_mandis"] >= 2
        assert "recommendations" in body

    def test_best_mandi_with_location(self, client):
        resp = client.get(
            "/api/mandi/best?commodity=Wheat"
            "&latitude=28.7&longitude=77.1&max_distance_km=500"
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["user_location"] is not None
        for rec in body["recommendations"]:
            assert "distance_km" in rec
            assert "transport_cost_per_quintal" in rec
            assert "net_price_per_quintal" in rec
            assert rec["rank"] >= 1

    def test_best_mandi_ranking_order(self, client):
        resp = client.get("/api/mandi/best?commodity=Wheat")
        body = resp.json()
        recs = body["recommendations"]
        if len(recs) >= 2:
            for i in range(len(recs) - 1):
                assert (
                    recs[i]["net_price_per_quintal"]
                    >= recs[i + 1]["net_price_per_quintal"]
                )

    def test_best_mandi_no_results(self, client):
        resp = client.get("/api/mandi/best?commodity=Saffron")
        assert resp.status_code == 200
        body = resp.json()
        assert body["total_mandis"] == 0


class TestMandiTrends:
    """Tests for GET /api/mandi/trends"""

    def test_trends_wheat(self, client):
        resp = client.get("/api/mandi/trends?commodity=Wheat&days=30")
        assert resp.status_code == 200
        body = resp.json()
        assert body["commodity"] == "Wheat"
        assert body["data_points"] >= 3
        assert "trend" in body
        assert "price_history" in body
        assert "statistics" in body

    def test_trends_statistics_fields(self, client):
        resp = client.get("/api/mandi/trends?commodity=Wheat&days=30")
        body = resp.json()
        stats = body["statistics"]
        assert "count" in stats
        assert "mean" in stats
        assert "median" in stats
        assert "min" in stats
        assert "max" in stats
        assert "std_dev" in stats

    def test_trends_with_state_filter(self, client):
        resp = client.get("/api/mandi/trends?commodity=Wheat&state=Delhi&days=30")
        assert resp.status_code == 200
        body = resp.json()
        assert body["state"] == "Delhi"

    def test_trends_price_history_sorted(self, client):
        resp = client.get("/api/mandi/trends?commodity=Wheat&days=30")
        body = resp.json()
        dates = [h["date"] for h in body["price_history"]]
        assert dates == sorted(dates)

    def test_trends_no_data(self, client):
        resp = client.get("/api/mandi/trends?commodity=Saffron")
        assert resp.status_code == 200
        body = resp.json()
        assert body["data_points"] == 0
        assert "No price data" in body.get("message", "")

    def test_trends_highest_lowest(self, client):
        resp = client.get("/api/mandi/trends?commodity=Wheat&days=30")
        body = resp.json()
        if body["data_points"] > 0:
            assert "highest_price_mandi" in body
            assert "lowest_price_mandi" in body
            assert (
                body["highest_price_mandi"]["price"]
                >= body["lowest_price_mandi"]["price"]
            )


class TestMandiV1Routes:
    """Verify v1-prefixed routes also work."""

    def test_v1_commodities(self, client):
        resp = client.get("/api/v1/mandi/commodities")
        assert resp.status_code == 200
        assert resp.json()["total"] >= 3

    def test_v1_prices(self, client):
        resp = client.get("/api/v1/mandi/prices?commodity=Wheat")
        assert resp.status_code == 200
        assert resp.json()["total"] >= 3
