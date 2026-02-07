"""
Shared test fixtures for the Farm Help API test suite.

Provides:
- In-memory SQLite test database with seeded data (diseases + mandi prices)
- FastAPI TestClient configured with dependency overrides
- Reusable mock fixtures for external API calls
"""

import json
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool

# Ensure the backend package is importable
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.database import Base, get_db
from app.main import app
from app.models import DiseaseTreatment, MandiPrice, WeatherCache


# ---------------------------------------------------------------------------
# Test Database Setup
# ---------------------------------------------------------------------------

TEST_DATABASE_URL = "sqlite:///./test_farmhelp.db"

engine = create_engine(
    TEST_DATABASE_URL,
    poolclass=NullPool,
    connect_args={"check_same_thread": False},
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


# ---------------------------------------------------------------------------
# Session-Scoped Database Lifecycle
# ---------------------------------------------------------------------------

@pytest.fixture(scope="session", autouse=True)
def setup_database():
    """Create tables once for the entire test session."""
    Base.metadata.create_all(bind=engine)
    _seed_disease_data()
    _seed_mandi_data()

    # Warm up middleware stack and raise the rate limit so the
    # 126+ tests in a single session are never throttled.
    from app.middleware.rate_limiter import RateLimitMiddleware

    with TestClient(app) as warmup_client:
        warmup_client.get("/")

    stack = app.middleware_stack
    while stack is not None:
        if isinstance(stack, RateLimitMiddleware):
            stack.max_requests = 999_999
            stack._requests.clear()
            break
        stack = getattr(stack, "app", None)

    yield
    Base.metadata.drop_all(bind=engine)
    db_file = Path("test_farmhelp.db")
    if db_file.exists():
        db_file.unlink()


# ---------------------------------------------------------------------------
# Client Fixture
# ---------------------------------------------------------------------------

@pytest.fixture()
def client():
    """Return a TestClient for the FastAPI app."""
    return TestClient(app)


@pytest.fixture()
def db_session():
    """Return a raw database session for direct DB assertions."""
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Mock Weather Forecast Data
# ---------------------------------------------------------------------------

MOCK_FORECAST_DATA = {
    "daily": {
        "time": [
            "2026-02-07",
            "2026-02-08",
            "2026-02-09",
            "2026-02-10",
            "2026-02-11",
            "2026-02-12",
            "2026-02-13",
        ],
        "temperature_2m_max": [28.5, 29.0, 30.2, 31.0, 29.5, 28.0, 27.5],
        "temperature_2m_min": [18.0, 17.5, 19.0, 20.0, 18.5, 17.0, 16.5],
        "precipitation_sum": [0.0, 2.5, 0.0, 0.0, 5.0, 0.0, 0.0],
        "windspeed_10m_max": [12.0, 15.0, 10.0, 8.0, 20.0, 14.0, 11.0],
        "relative_humidity_2m_max": [65, 70, 60, 55, 75, 68, 62],
        "weathercode": [1, 3, 0, 0, 61, 2, 1],
    },
    "daily_units": {
        "temperature_2m_max": "C",
        "temperature_2m_min": "C",
        "precipitation_sum": "mm",
        "windspeed_10m_max": "km/h",
    },
}


MOCK_PINCODE_DATA = {
    "110001": {
        "lat": 28.6139,
        "lon": 77.2090,
        "city": "New Delhi",
        "state": "Delhi",
    },
    "400001": {
        "lat": 18.9388,
        "lon": 72.8354,
        "city": "Mumbai",
        "state": "Maharashtra",
    },
}


@pytest.fixture()
def mock_weather_api():
    """
    Patch the weather service to avoid real HTTP calls.

    Mocks:
    - Pincode resolution (returns MOCK_PINCODE_DATA)
    - Open-Meteo API call (returns MOCK_FORECAST_DATA)
    - Weather cache read (returns None so API path is exercised)
    - Weather cache write (no-op)
    """
    with (
        patch(
            "app.services.weather_service._load_pincode_data",
            return_value=MOCK_PINCODE_DATA,
        ),
        patch(
            "app.services.weather_service.fetch_forecast_from_api",
            new_callable=AsyncMock,
            return_value=MOCK_FORECAST_DATA,
        ),
        patch(
            "app.services.weather_service.get_cached_forecast",
            return_value=None,
        ),
        patch(
            "app.services.weather_service.store_forecast_cache",
        ),
    ):
        yield


@pytest.fixture()
def mock_weather_cached():
    """
    Patch weather service to return cached data (cache-hit path).
    """
    cached_at = datetime.now(timezone.utc) - timedelta(hours=1)
    with (
        patch(
            "app.services.weather_service._load_pincode_data",
            return_value=MOCK_PINCODE_DATA,
        ),
        patch(
            "app.services.weather_service.get_cached_forecast",
            return_value=(MOCK_FORECAST_DATA, cached_at),
        ),
    ):
        yield


# ---------------------------------------------------------------------------
# Seed Helpers
# ---------------------------------------------------------------------------

def _seed_disease_data():
    """Insert a minimal set of diseases for testing."""
    db = TestingSessionLocal()
    try:
        if db.query(DiseaseTreatment).count() > 0:
            return

        diseases = [
            DiseaseTreatment(
                disease_name="Paddy Blast",
                disease_name_hindi="धान का ब्लास्ट",
                crop_type="Paddy",
                symptoms="Spindle-shaped lesions on leaves with brown centers and gray margins.",
                treatment_chemical="Tricyclazole 75% WP @ 0.6g/l",
                treatment_organic="Neem oil spray, proper drainage",
                dosage="0.6g per liter of water",
                cost_per_acre=500.0,
                prevention_tips="Use resistant varieties, avoid excess nitrogen",
                affected_stages="Tillering, Flowering",
            ),
            DiseaseTreatment(
                disease_name="Brown Spot of Paddy",
                disease_name_hindi="धान का भूरा धब्बा",
                crop_type="Paddy",
                symptoms="Small, circular to oval brown spots on leaves with yellow halos.",
                treatment_chemical="Mancozeb 75% WP @ 2g/l",
                treatment_organic="Neem seed kernel extract (5%)",
                dosage="2g per liter of water",
                cost_per_acre=450.0,
                prevention_tips="Use certified seeds",
                affected_stages="Seedling, Tillering, Flowering",
            ),
            DiseaseTreatment(
                disease_name="Rust of Wheat",
                disease_name_hindi="गेहूं का रस्ट",
                crop_type="Wheat",
                symptoms="Orange to brown pustules on leaves, stems, and heads.",
                treatment_chemical="Propiconazole 25% EC @ 0.5ml/l",
                treatment_organic="Use resistant varieties, proper crop rotation",
                dosage="0.5ml per liter of water",
                cost_per_acre=600.0,
                prevention_tips="Use resistant varieties",
                affected_stages="Tillering, Booting, Heading",
            ),
            DiseaseTreatment(
                disease_name="Early Blight of Tomato",
                disease_name_hindi="टमाटर का अर्ली ब्लाइट",
                crop_type="Tomato",
                symptoms="Dark brown to black spots on leaves with concentric rings.",
                treatment_chemical="Mancozeb 75% WP @ 2g/l",
                treatment_organic="Neem oil spray, copper-based fungicides",
                dosage="2g per liter of water",
                cost_per_acre=650.0,
                prevention_tips="Use resistant varieties, maintain proper spacing",
                affected_stages="Vegetative, Flowering, Fruiting",
            ),
        ]
        db.add_all(diseases)
        db.commit()
    finally:
        db.close()


def _seed_mandi_data():
    """Insert mandi price records for testing."""
    db = TestingSessionLocal()
    try:
        if db.query(MandiPrice).count() > 0:
            return

        now = datetime.now(timezone.utc)
        prices = [
            MandiPrice(
                commodity="Wheat",
                mandi_name="Azadpur Mandi",
                state="Delhi",
                district="North Delhi",
                price_per_quintal=2200.0,
                min_price=2100.0,
                max_price=2300.0,
                modal_price=2200.0,
                arrival_date=now - timedelta(days=1),
            ),
            MandiPrice(
                commodity="Wheat",
                mandi_name="Khanna Mandi",
                state="Punjab",
                district="Ludhiana",
                price_per_quintal=2350.0,
                min_price=2200.0,
                max_price=2500.0,
                modal_price=2350.0,
                arrival_date=now - timedelta(days=1),
            ),
            MandiPrice(
                commodity="Wheat",
                mandi_name="Karnal Mandi",
                state="Haryana",
                district="Karnal",
                price_per_quintal=2280.0,
                min_price=2150.0,
                max_price=2400.0,
                modal_price=2280.0,
                arrival_date=now - timedelta(days=2),
            ),
            MandiPrice(
                commodity="Rice",
                mandi_name="Azadpur Mandi",
                state="Delhi",
                district="North Delhi",
                price_per_quintal=3200.0,
                min_price=3000.0,
                max_price=3400.0,
                modal_price=3200.0,
                arrival_date=now - timedelta(days=1),
            ),
            MandiPrice(
                commodity="Rice",
                mandi_name="Khanna Mandi",
                state="Punjab",
                district="Ludhiana",
                price_per_quintal=3100.0,
                min_price=2900.0,
                max_price=3300.0,
                modal_price=3100.0,
                arrival_date=now - timedelta(days=1),
            ),
            MandiPrice(
                commodity="Wheat",
                mandi_name="Azadpur Mandi",
                state="Delhi",
                district="North Delhi",
                price_per_quintal=2150.0,
                min_price=2050.0,
                max_price=2250.0,
                modal_price=2150.0,
                arrival_date=now - timedelta(days=5),
            ),
            MandiPrice(
                commodity="Wheat",
                mandi_name="Azadpur Mandi",
                state="Delhi",
                district="North Delhi",
                price_per_quintal=2100.0,
                min_price=2000.0,
                max_price=2200.0,
                modal_price=2100.0,
                arrival_date=now - timedelta(days=10),
            ),
            MandiPrice(
                commodity="Onion",
                mandi_name="Lasalgaon Mandi",
                state="Maharashtra",
                district="Nashik",
                price_per_quintal=1800.0,
                min_price=1600.0,
                max_price=2000.0,
                modal_price=1800.0,
                arrival_date=now - timedelta(days=1),
            ),
        ]
        db.add_all(prices)
        db.commit()
    finally:
        db.close()
