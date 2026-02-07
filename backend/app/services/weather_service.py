"""
Weather Service - Business Logic

Provides Open-Meteo API integration, pincode-to-coordinate resolution,
forecast caching (DB-backed), alert generation, and crop-specific
weather analysis with farming recommendations.
"""

import json
import logging
import threading
import time
from collections import deque
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import httpx
from sqlalchemy.orm import Session

from app.config import settings
from app.models import WeatherCache

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Path Constants
# ---------------------------------------------------------------------------
DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"

# ---------------------------------------------------------------------------
# Open-Meteo API Constants
# ---------------------------------------------------------------------------
OPEN_METEO_DAILY_PARAMS = (
    "temperature_2m_max,"
    "temperature_2m_min,"
    "precipitation_sum,"
    "windspeed_10m_max,"
    "relative_humidity_2m_max,"
    "weathercode"
)
OPEN_METEO_TIMEZONE = "Asia/Kolkata"
FORECAST_DAYS = 7
API_TIMEOUT_SECONDS = 15.0

# ---------------------------------------------------------------------------
# Alert Thresholds
# ---------------------------------------------------------------------------
ALERT_DRY_SPELL_DAYS = 7
ALERT_DRY_SPELL_PRECIP_MM = 1.0
ALERT_HEAVY_RAIN_MM = 50.0
ALERT_HEAT_STRESS_TEMP_C = 40.0
ALERT_HEAT_STRESS_DAYS = 3
ALERT_COLD_WAVE_TEMP_C = 10.0
ALERT_FROST_RISK_TEMP_C = 5.0
ALERT_HIGH_HUMIDITY_PCT = 80
ALERT_HIGH_HUMIDITY_DAYS = 3
ALERT_STRONG_WIND_KMH = 40.0

SEVERITY_ORDER: Dict[str, int] = {"info": 0, "warning": 1, "danger": 2}

# ---------------------------------------------------------------------------
# Crop Profiles: optimal and critical ranges per crop
# ---------------------------------------------------------------------------
CROP_PROFILES: Dict[str, Dict[str, Any]] = {
    "Paddy": {
        "optimal_temp_min": 20, "optimal_temp_max": 35,
        "critical_temp_min": 10, "critical_temp_max": 42,
        "water_need": "high",
        "optimal_rainfall_weekly_mm": (30, 100),
        "humidity_sensitive": True,
        "wind_sensitive": False,
        "growth_season": "Kharif",
    },
    "Wheat": {
        "optimal_temp_min": 10, "optimal_temp_max": 25,
        "critical_temp_min": 0, "critical_temp_max": 35,
        "water_need": "moderate",
        "optimal_rainfall_weekly_mm": (10, 40),
        "humidity_sensitive": True,
        "wind_sensitive": False,
        "growth_season": "Rabi",
    },
    "Cotton": {
        "optimal_temp_min": 21, "optimal_temp_max": 35,
        "critical_temp_min": 10, "critical_temp_max": 42,
        "water_need": "moderate",
        "optimal_rainfall_weekly_mm": (15, 50),
        "humidity_sensitive": True,
        "wind_sensitive": True,
        "growth_season": "Kharif",
    },
    "Sugarcane": {
        "optimal_temp_min": 20, "optimal_temp_max": 35,
        "critical_temp_min": 5, "critical_temp_max": 42,
        "water_need": "very_high",
        "optimal_rainfall_weekly_mm": (40, 120),
        "humidity_sensitive": False,
        "wind_sensitive": True,
        "growth_season": "Annual",
    },
    "Tomato": {
        "optimal_temp_min": 18, "optimal_temp_max": 30,
        "critical_temp_min": 5, "critical_temp_max": 38,
        "water_need": "moderate",
        "optimal_rainfall_weekly_mm": (15, 40),
        "humidity_sensitive": True,
        "wind_sensitive": False,
        "growth_season": "Rabi",
    },
    "Potato": {
        "optimal_temp_min": 15, "optimal_temp_max": 25,
        "critical_temp_min": 2, "critical_temp_max": 32,
        "water_need": "moderate",
        "optimal_rainfall_weekly_mm": (15, 40),
        "humidity_sensitive": True,
        "wind_sensitive": False,
        "growth_season": "Rabi",
    },
    "Onion": {
        "optimal_temp_min": 13, "optimal_temp_max": 24,
        "critical_temp_min": 2, "critical_temp_max": 35,
        "water_need": "low",
        "optimal_rainfall_weekly_mm": (5, 25),
        "humidity_sensitive": True,
        "wind_sensitive": False,
        "growth_season": "Rabi",
    },
    "Chilli": {
        "optimal_temp_min": 20, "optimal_temp_max": 30,
        "critical_temp_min": 10, "critical_temp_max": 38,
        "water_need": "moderate",
        "optimal_rainfall_weekly_mm": (10, 35),
        "humidity_sensitive": True,
        "wind_sensitive": False,
        "growth_season": "Kharif",
    },
    "Maize": {
        "optimal_temp_min": 18, "optimal_temp_max": 32,
        "critical_temp_min": 8, "critical_temp_max": 40,
        "water_need": "moderate",
        "optimal_rainfall_weekly_mm": (15, 50),
        "humidity_sensitive": False,
        "wind_sensitive": True,
        "growth_season": "Kharif",
    },
    "Pulses": {
        "optimal_temp_min": 15, "optimal_temp_max": 30,
        "critical_temp_min": 5, "critical_temp_max": 38,
        "water_need": "low",
        "optimal_rainfall_weekly_mm": (5, 30),
        "humidity_sensitive": True,
        "wind_sensitive": False,
        "growth_season": "Rabi",
    },
    "Oilseeds": {
        "optimal_temp_min": 15, "optimal_temp_max": 30,
        "critical_temp_min": 5, "critical_temp_max": 40,
        "water_need": "low",
        "optimal_rainfall_weekly_mm": (5, 30),
        "humidity_sensitive": False,
        "wind_sensitive": False,
        "growth_season": "Rabi",
    },
    "Millets": {
        "optimal_temp_min": 20, "optimal_temp_max": 35,
        "critical_temp_min": 10, "critical_temp_max": 42,
        "water_need": "low",
        "optimal_rainfall_weekly_mm": (5, 25),
        "humidity_sensitive": False,
        "wind_sensitive": False,
        "growth_season": "Kharif",
    },
}

# ---------------------------------------------------------------------------
# Module-Level Singletons (lazy-loaded, thread-safe)
# ---------------------------------------------------------------------------
_pincode_data: Optional[Dict[str, Dict]] = None
_pincode_lock = threading.Lock()

_alert_templates: Optional[Dict[str, Dict]] = None
_alert_templates_lock = threading.Lock()


class _RateLimiter:
    """In-memory token-bucket rate limiter for external API calls."""

    def __init__(self, max_calls: int, period_seconds: float):
        self._max_calls = max_calls
        self._period = period_seconds
        self._calls: deque = deque()
        self._lock = threading.Lock()

    def acquire(self) -> bool:
        """Attempt to acquire a token. Returns False if limit is exceeded."""
        with self._lock:
            now = time.monotonic()
            while self._calls and (now - self._calls[0]) > self._period:
                self._calls.popleft()
            if len(self._calls) >= self._max_calls:
                return False
            self._calls.append(now)
            return True

    @property
    def remaining(self) -> int:
        with self._lock:
            now = time.monotonic()
            while self._calls and (now - self._calls[0]) > self._period:
                self._calls.popleft()
            return max(0, self._max_calls - len(self._calls))


_api_rate_limiter = _RateLimiter(
    max_calls=settings.RATE_LIMIT_PER_MINUTE,
    period_seconds=60.0,
)


# ---------------------------------------------------------------------------
# Pincode Resolution
# ---------------------------------------------------------------------------

def _load_pincode_data() -> Dict[str, Dict]:
    """Load pincode coordinate mapping from JSON (lazy, thread-safe)."""
    global _pincode_data
    if _pincode_data is not None:
        return _pincode_data

    with _pincode_lock:
        if _pincode_data is not None:
            return _pincode_data
        file_path = DATA_DIR / "pincode_coordinates.json"
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                _pincode_data = json.load(f)
            logger.info(
                "Loaded %d pincode entries from %s", len(_pincode_data), file_path
            )
        except FileNotFoundError:
            logger.error("Pincode data file not found: %s", file_path)
            _pincode_data = {}
        except json.JSONDecodeError as exc:
            logger.error("Invalid JSON in pincode data file: %s", exc)
            _pincode_data = {}
    return _pincode_data


def resolve_pincode(pincode: str) -> Optional[Dict[str, Any]]:
    """
    Resolve a 6-digit Indian pincode to geographic coordinates.

    Returns:
        Dict with lat, lon, city, state; or None if the pincode is unknown.
    """
    data = _load_pincode_data()
    return data.get(pincode)


# ---------------------------------------------------------------------------
# Alert Templates
# ---------------------------------------------------------------------------

def _load_alert_templates() -> Dict[str, Dict]:
    """Load alert templates from weather_alerts.json (lazy, thread-safe)."""
    global _alert_templates
    if _alert_templates is not None:
        return _alert_templates

    with _alert_templates_lock:
        if _alert_templates is not None:
            return _alert_templates
        file_path = DATA_DIR / "weather_alerts.json"
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                raw = json.load(f)
            _alert_templates = {item["alert_type"]: item for item in raw}
            logger.info("Loaded %d alert templates", len(_alert_templates))
        except Exception as exc:
            logger.error("Failed to load alert templates: %s", exc)
            _alert_templates = {}
    return _alert_templates


def _build_alert(
    alert_type: str,
    severity: str,
    message: str,
    fallback_recommendation: str,
) -> Dict[str, str]:
    """Build an alert dict, enriching with template data when available."""
    templates = _load_alert_templates()
    template = templates.get(alert_type, {})
    return {
        "type": alert_type,
        "severity": severity,
        "title": template.get("title", alert_type.replace("_", " ").title()),
        "title_hindi": template.get("title_hindi", ""),
        "message": message,
        "recommendation": template.get("recommendation", fallback_recommendation),
        "recommendation_hindi": template.get("recommendation_hindi", ""),
    }


# ---------------------------------------------------------------------------
# Cache Management (DB-backed via WeatherCache model)
# ---------------------------------------------------------------------------

def get_cached_forecast(
    db: Session, pincode: str
) -> Optional[Tuple[Dict, datetime]]:
    """
    Retrieve a valid (non-expired) cached forecast for the given pincode.

    Returns:
        (forecast_dict, cached_at) if a valid entry exists, else None.
    """
    now = datetime.now(timezone.utc)
    try:
        entry = (
            db.query(WeatherCache)
            .filter(
                WeatherCache.pincode == pincode,
                WeatherCache.expires_at > now,
            )
            .order_by(WeatherCache.cached_at.desc())
            .first()
        )
        if entry:
            forecast = json.loads(entry.forecast_data)
            return forecast, entry.cached_at
    except Exception as exc:
        logger.warning("Cache read failed for pincode %s: %s", pincode, exc)
    return None


def store_forecast_cache(
    db: Session,
    pincode: str,
    latitude: float,
    longitude: float,
    forecast_data: Dict,
) -> None:
    """Persist forecast data in the database cache."""
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(hours=settings.WEATHER_CACHE_HOURS)
    try:
        entry = WeatherCache(
            pincode=pincode,
            latitude=latitude,
            longitude=longitude,
            forecast_data=json.dumps(forecast_data),
            cached_at=now,
            expires_at=expires_at,
        )
        db.add(entry)
        db.commit()
        logger.info(
            "Cached forecast for pincode %s (expires %s)", pincode, expires_at
        )
    except Exception as exc:
        logger.warning("Cache write failed for pincode %s: %s", pincode, exc)
        db.rollback()


def cleanup_expired_cache(db: Session) -> int:
    """Remove expired cache entries. Returns count of deleted rows."""
    now = datetime.now(timezone.utc)
    try:
        count = (
            db.query(WeatherCache)
            .filter(WeatherCache.expires_at <= now)
            .delete()
        )
        db.commit()
        if count:
            logger.info("Cleaned up %d expired weather cache entries", count)
        return count
    except Exception as exc:
        logger.warning("Cache cleanup failed: %s", exc)
        db.rollback()
        return 0


# ---------------------------------------------------------------------------
# Open-Meteo API Integration
# ---------------------------------------------------------------------------

async def fetch_forecast_from_api(
    latitude: float, longitude: float
) -> Dict:
    """
    Fetch a 7-day weather forecast from the Open-Meteo API.

    Raises:
        RuntimeError: On rate-limit breach, timeout, or HTTP error.
    """
    if not _api_rate_limiter.acquire():
        raise RuntimeError(
            "External API rate limit exceeded. Please retry after a short wait."
        )

    params = {
        "latitude": latitude,
        "longitude": longitude,
        "daily": OPEN_METEO_DAILY_PARAMS,
        "timezone": OPEN_METEO_TIMEZONE,
        "forecast_days": FORECAST_DAYS,
    }

    logger.info(
        "Fetching forecast from Open-Meteo | lat=%.4f lon=%.4f",
        latitude,
        longitude,
    )

    try:
        async with httpx.AsyncClient(timeout=API_TIMEOUT_SECONDS) as client:
            response = await client.get(
                settings.OPEN_METEO_API_URL, params=params
            )
            response.raise_for_status()
            data = response.json()
            logger.info(
                "Open-Meteo response received (status %d)", response.status_code
            )
            return data
    except httpx.TimeoutException:
        logger.error(
            "Open-Meteo API timed out (lat=%.4f, lon=%.4f)",
            latitude,
            longitude,
        )
        raise RuntimeError("Weather API request timed out. Please try again.")
    except httpx.HTTPStatusError as exc:
        logger.error(
            "Open-Meteo HTTP error %d: %s",
            exc.response.status_code,
            exc.response.text[:200],
        )
        raise RuntimeError(
            f"Weather API returned status {exc.response.status_code}"
        )
    except httpx.RequestError as exc:
        logger.error("Open-Meteo request failed: %s", exc)
        raise RuntimeError(
            "Failed to connect to weather API. Please try again later."
        )


# ---------------------------------------------------------------------------
# Orchestrated Forecast Retrieval (cache-first)
# ---------------------------------------------------------------------------

async def get_forecast(db: Session, pincode: str) -> Dict[str, Any]:
    """
    Get a 7-day weather forecast for the given pincode.
    Checks cache first; on miss, calls the API and caches the result.

    Returns:
        Dict with pincode, latitude, longitude, location, forecast,
        cached flag, and cached_at timestamp.

    Raises:
        ValueError: If the pincode is not in the mapping.
        RuntimeError: If the external API call fails.
    """
    location = resolve_pincode(pincode)
    if location is None:
        raise ValueError(
            f"Unknown pincode: {pincode}. "
            "Only mapped Indian pincodes are currently supported."
        )

    lat = location["lat"]
    lon = location["lon"]
    loc_info = {"city": location["city"], "state": location["state"]}

    # Check cache
    cached = get_cached_forecast(db, pincode)
    if cached is not None:
        forecast_data, cached_at = cached
        logger.info("Serving cached forecast for pincode %s", pincode)
        return {
            "pincode": pincode,
            "latitude": lat,
            "longitude": lon,
            "location": loc_info,
            "forecast": forecast_data,
            "cached": True,
            "cached_at": cached_at.isoformat() if cached_at else None,
        }

    # Fetch from API
    forecast_data = await fetch_forecast_from_api(lat, lon)

    # Store in cache (best-effort)
    store_forecast_cache(db, pincode, lat, lon, forecast_data)

    return {
        "pincode": pincode,
        "latitude": lat,
        "longitude": lon,
        "location": loc_info,
        "forecast": forecast_data,
        "cached": False,
        "cached_at": None,
    }


# ---------------------------------------------------------------------------
# Alert Generation
# ---------------------------------------------------------------------------

def generate_alerts(
    forecast_data: Dict,
    crop_type: Optional[str] = None,
) -> List[Dict]:
    """
    Analyze forecast data and generate weather alerts.

    Args:
        forecast_data: Raw Open-Meteo API response.
        crop_type: Optional crop for crop-specific filtering.

    Returns:
        Sorted list of alert dicts (highest severity first).
    """
    daily = forecast_data.get("daily", {})
    temps_max = daily.get("temperature_2m_max", [])
    temps_min = daily.get("temperature_2m_min", [])
    precip = daily.get("precipitation_sum", [])
    wind = daily.get("windspeed_10m_max", [])
    humidity = daily.get("relative_humidity_2m_max", [])
    dates = daily.get("time", [])

    alerts: List[Dict] = []

    # -- Dry spell: no significant rain for all forecast days ----------------
    if precip and len(precip) >= ALERT_DRY_SPELL_DAYS:
        dry_days = sum(1 for p in precip if p < ALERT_DRY_SPELL_PRECIP_MM)
        if dry_days >= ALERT_DRY_SPELL_DAYS:
            total_precip = sum(precip)
            alerts.append(
                _build_alert(
                    alert_type="dry_spell",
                    severity="warning",
                    message=(
                        f"No significant rainfall expected for the next "
                        f"{dry_days} days. Total expected: {total_precip:.1f}mm."
                    ),
                    fallback_recommendation=(
                        "Schedule irrigation immediately. "
                        "Use drip or sprinkler systems to conserve water."
                    ),
                )
            )

    # -- Heavy rain: >50mm in any single day ---------------------------------
    if precip:
        heavy_days = [
            (_safe_date(dates, i), p)
            for i, p in enumerate(precip)
            if p > ALERT_HEAVY_RAIN_MM
        ]
        if heavy_days:
            worst = max(heavy_days, key=lambda x: x[1])
            alerts.append(
                _build_alert(
                    alert_type="heavy_rain",
                    severity="danger",
                    message=(
                        f"Heavy rainfall expected: {worst[1]:.1f}mm on "
                        f"{worst[0]}. {len(heavy_days)} day(s) with "
                        f">{ALERT_HEAVY_RAIN_MM:.0f}mm rain."
                    ),
                    fallback_recommendation=(
                        "Ensure drainage. Harvest mature crops. "
                        "Protect stored grains from moisture."
                    ),
                )
            )

    # -- Heat stress: >40C for 3+ consecutive days ---------------------------
    if temps_max:
        consecutive = 0
        max_consecutive = 0
        peak_temp = 0.0
        for t in temps_max:
            if t > ALERT_HEAT_STRESS_TEMP_C:
                consecutive += 1
                peak_temp = max(peak_temp, t)
                max_consecutive = max(max_consecutive, consecutive)
            else:
                consecutive = 0
        if max_consecutive >= ALERT_HEAT_STRESS_DAYS:
            alerts.append(
                _build_alert(
                    alert_type="heat_stress",
                    severity="warning",
                    message=(
                        f"Heat stress: temperature above "
                        f"{ALERT_HEAT_STRESS_TEMP_C:.0f}C for "
                        f"{max_consecutive} consecutive days. "
                        f"Peak: {peak_temp:.1f}C."
                    ),
                    fallback_recommendation=(
                        "Increase irrigation. Apply mulch. "
                        "Avoid field work 11 AM - 4 PM."
                    ),
                )
            )

    # -- Cold wave: min temp < 10C -------------------------------------------
    if temps_min:
        cold_days = [
            (_safe_date(dates, i), t)
            for i, t in enumerate(temps_min)
            if t < ALERT_COLD_WAVE_TEMP_C
        ]
        if cold_days:
            coldest = min(cold_days, key=lambda x: x[1])
            # Issue cold wave only if not already in frost territory
            if coldest[1] >= ALERT_FROST_RISK_TEMP_C:
                alerts.append(
                    _build_alert(
                        alert_type="cold_wave",
                        severity="warning",
                        message=(
                            f"Cold wave: minimum temperature "
                            f"{coldest[1]:.1f}C expected on {coldest[0]}. "
                            f"{len(cold_days)} cold day(s) in forecast."
                        ),
                        fallback_recommendation=(
                            "Cover sensitive crops. Use smoke/fogging. "
                            "Irrigate in evening for frost protection."
                        ),
                    )
                )

    # -- Frost risk: min temp < 5C -------------------------------------------
    if temps_min:
        frost_days = [
            (_safe_date(dates, i), t)
            for i, t in enumerate(temps_min)
            if t < ALERT_FROST_RISK_TEMP_C
        ]
        if frost_days:
            coldest = min(frost_days, key=lambda x: x[1])
            alerts.append(
                _build_alert(
                    alert_type="frost_risk",
                    severity="danger",
                    message=(
                        f"Frost risk: minimum temperature "
                        f"{coldest[1]:.1f}C expected on {coldest[0]}. "
                        f"{len(frost_days)} frost-risk day(s)."
                    ),
                    fallback_recommendation=(
                        "Immediate action: cover crops with plastic. "
                        "Use heaters in orchards. Harvest mature crops."
                    ),
                )
            )

    # -- High humidity: fungal disease risk ----------------------------------
    if humidity:
        humid_days = sum(
            1 for h in humidity if h > ALERT_HIGH_HUMIDITY_PCT
        )
        if humid_days >= ALERT_HIGH_HUMIDITY_DAYS:
            peak_humidity = max(humidity)
            alerts.append(
                _build_alert(
                    alert_type="high_humidity",
                    severity="info",
                    message=(
                        f"High humidity (>{ALERT_HIGH_HUMIDITY_PCT}%) "
                        f"expected for {humid_days} days. "
                        f"Peak: {peak_humidity:.0f}%. "
                        "Increased fungal disease risk."
                    ),
                    fallback_recommendation=(
                        "Apply preventive fungicides. "
                        "Ensure air circulation. "
                        "Avoid overhead irrigation."
                    ),
                )
            )

    # -- Strong winds --------------------------------------------------------
    if wind:
        windy_days = [
            (_safe_date(dates, i), w)
            for i, w in enumerate(wind)
            if w > ALERT_STRONG_WIND_KMH
        ]
        if windy_days:
            worst = max(windy_days, key=lambda x: x[1])
            alerts.append(
                _build_alert(
                    alert_type="strong_winds",
                    severity="warning",
                    message=(
                        f"Strong winds expected: {worst[1]:.1f} km/h on "
                        f"{worst[0]}. {len(windy_days)} windy day(s)."
                    ),
                    fallback_recommendation=(
                        "Support tall crops with stakes. "
                        "Secure greenhouses. Avoid spraying."
                    ),
                )
            )

    # -- Filter by crop if specified -----------------------------------------
    if crop_type:
        templates = _load_alert_templates()
        filtered = []
        for alert in alerts:
            template = templates.get(alert["type"], {})
            affected = template.get("affected_crops", ["All"])
            if "All" in affected or crop_type in affected:
                filtered.append(alert)
        alerts = filtered

    # Sort by severity (danger first)
    alerts.sort(
        key=lambda a: SEVERITY_ORDER.get(a["severity"], 0), reverse=True
    )
    return alerts


def _safe_date(dates: List[str], index: int) -> str:
    """Return date string at index, or a fallback label."""
    if index < len(dates):
        return dates[index]
    return f"Day {index + 1}"


def determine_overall_severity(alerts: List[Dict]) -> str:
    """Return the highest severity level present in the alerts list."""
    if not alerts:
        return "info"
    max_val = max(
        SEVERITY_ORDER.get(a.get("severity", "info"), 0) for a in alerts
    )
    for name, val in SEVERITY_ORDER.items():
        if val == max_val:
            return name
    return "info"


# ---------------------------------------------------------------------------
# Crop Weather Analysis
# ---------------------------------------------------------------------------

def _compute_forecast_summary(forecast_data: Dict) -> Dict[str, Any]:
    """Compute summary statistics from the raw Open-Meteo response."""
    daily = forecast_data.get("daily", {})
    temps_max = daily.get("temperature_2m_max", [])
    temps_min = daily.get("temperature_2m_min", [])
    precip = daily.get("precipitation_sum", [])
    wind = daily.get("windspeed_10m_max", [])
    humidity = daily.get("relative_humidity_2m_max", [])
    dates = daily.get("time", [])

    def _avg(vals: list) -> Optional[float]:
        return round(sum(vals) / len(vals), 1) if vals else None

    def _peak(vals: list) -> Optional[float]:
        return round(max(vals), 1) if vals else None

    def _low(vals: list) -> Optional[float]:
        return round(min(vals), 1) if vals else None

    return {
        "period_start": dates[0] if dates else None,
        "period_end": dates[-1] if dates else None,
        "days": len(dates),
        "temperature": {
            "avg_max": _avg(temps_max),
            "avg_min": _avg(temps_min),
            "peak_max": _peak(temps_max),
            "lowest_min": _low(temps_min),
        },
        "rainfall": {
            "total_mm": round(sum(precip), 1) if precip else 0,
            "max_daily_mm": _peak(precip),
            "rainy_days": sum(1 for p in precip if p >= 1.0),
        },
        "wind": {
            "avg_speed_kmh": _avg(wind),
            "max_speed_kmh": _peak(wind),
        },
        "humidity": {
            "avg_percent": _avg(humidity),
            "max_percent": _peak(humidity),
        },
    }


def _assess_crop_suitability(
    summary: Dict[str, Any], profile: Dict[str, Any]
) -> str:
    """
    Assess crop suitability based on forecast summary vs crop profile.
    Returns: 'excellent', 'good', 'moderate', or 'poor'.
    """
    issues = 0
    critical = 0

    temp_avg_max = summary["temperature"]["avg_max"] or 0
    temp_avg_min = summary["temperature"]["avg_min"] or 0
    total_rain = summary["rainfall"]["total_mm"]

    # Temperature assessment
    if (
        temp_avg_max > profile["critical_temp_max"]
        or temp_avg_min < profile["critical_temp_min"]
    ):
        critical += 1
    elif (
        temp_avg_max > profile["optimal_temp_max"]
        or temp_avg_min < profile["optimal_temp_min"]
    ):
        issues += 1

    # Rainfall assessment
    rain_min, rain_max = profile["optimal_rainfall_weekly_mm"]
    if total_rain < rain_min * 0.3 or total_rain > rain_max * 2.5:
        critical += 1
    elif total_rain < rain_min or total_rain > rain_max:
        issues += 1

    if critical > 0:
        return "poor"
    if issues > 1:
        return "moderate"
    if issues == 1:
        return "good"
    return "excellent"


def _generate_farming_recommendations(
    summary: Dict[str, Any],
    profile: Dict[str, Any],
    crop_type: str,
    alerts: List[Dict],
) -> Dict[str, str]:
    """Generate crop-specific farming recommendations."""
    recommendations: Dict[str, str] = {}

    total_rain = summary["rainfall"]["total_mm"]
    rain_min, rain_max = profile["optimal_rainfall_weekly_mm"]
    temp_avg_max = summary["temperature"]["avg_max"] or 0
    temp_avg_min = summary["temperature"]["avg_min"] or 0
    rainy_days = summary["rainfall"]["rainy_days"]
    max_wind = summary["wind"]["max_speed_kmh"] or 0
    avg_humidity = summary["humidity"]["avg_percent"] or 0

    # --- Irrigation ---
    if total_rain < rain_min:
        deficit = rain_min - total_rain
        if profile["water_need"] in ("high", "very_high"):
            recommendations["irrigation"] = (
                f"Rainfall deficit of {deficit:.0f}mm expected this week. "
                f"{crop_type} requires {profile['water_need'].replace('_', ' ')} "
                "water input. Schedule irrigation every 2-3 days using "
                "flood or drip irrigation."
            )
        else:
            recommendations["irrigation"] = (
                f"Rainfall deficit of {deficit:.0f}mm expected. "
                "Light irrigation recommended every 3-4 days. "
                "Consider drip irrigation for water efficiency."
            )
    elif total_rain > rain_max:
        recommendations["irrigation"] = (
            f"Excess rainfall ({total_rain:.0f}mm) expected. "
            "No irrigation needed. Ensure proper drainage to prevent "
            "waterlogging."
        )
    else:
        recommendations["irrigation"] = (
            f"Expected rainfall ({total_rain:.0f}mm) is within the optimal "
            f"range for {crop_type}. Monitor soil moisture and irrigate "
            "only if needed."
        )

    # --- Spraying ---
    if rainy_days > 0 and max_wind > 15:
        suitable_days = 7 - rainy_days
        recommendations["spraying"] = (
            "Avoid pesticide/herbicide spraying on rainy and windy days. "
            f"Best window: dry days with wind below 15 km/h. "
            f"{suitable_days} suitable day(s) in forecast."
        )
    elif rainy_days > 0:
        recommendations["spraying"] = (
            f"Rain expected on {rainy_days} day(s). Plan spraying for dry "
            "days. Apply systemic pesticides that are rain-fast within "
            "2 hours."
        )
    elif avg_humidity > 70 and profile.get("humidity_sensitive"):
        recommendations["spraying"] = (
            f"High humidity ({avg_humidity:.0f}%) increases fungal disease "
            f"risk for {crop_type}. Apply preventive fungicide spray. "
            "Best time: early morning."
        )
    else:
        recommendations["spraying"] = (
            "Weather conditions are suitable for spraying. "
            "Best time: early morning (6-9 AM) or late afternoon "
            "(4-6 PM) when wind is calm."
        )

    # --- Harvesting ---
    alert_types = {a["type"] for a in alerts}
    if "heavy_rain" in alert_types:
        recommendations["harvesting"] = (
            "Heavy rain expected. If crop is mature, harvest immediately "
            "before rain. Ensure harvested produce is stored in dry, "
            "covered areas."
        )
    elif rainy_days == 0 and temp_avg_max < profile.get("critical_temp_max", 42):
        recommendations["harvesting"] = (
            "Dry weather expected for the forecast period. Excellent "
            "conditions for harvesting. Plan harvest operations during "
            "morning hours for best grain quality."
        )
    elif rainy_days <= 2:
        recommendations["harvesting"] = (
            f"Mostly dry weather with {rainy_days} rainy day(s). "
            "Harvest on dry days. Allow harvested produce to dry "
            "properly before storage."
        )
    else:
        recommendations["harvesting"] = (
            f"Frequent rain expected ({rainy_days} days). Delay harvesting "
            "if possible. If harvesting is necessary, ensure proper drying "
            "and ventilated storage."
        )

    # --- General ---
    general_parts = []
    if temp_avg_max > profile["optimal_temp_max"]:
        general_parts.append(
            f"Daytime temperature ({temp_avg_max:.1f}C) is above optimal "
            f"for {crop_type}. Consider mulching and providing shade for "
            "young plants."
        )
    if temp_avg_min < profile["optimal_temp_min"]:
        general_parts.append(
            f"Night temperature ({temp_avg_min:.1f}C) is below optimal "
            f"for {crop_type}. Protect young plants from cold."
        )
    if not general_parts:
        general_parts.append(
            f"Weather conditions are generally favorable for {crop_type} "
            "cultivation this week."
        )
    recommendations["general"] = " ".join(general_parts)

    return recommendations


async def analyze_crop_weather(
    db: Session,
    pincode: str,
    crop_type: str,
) -> Dict[str, Any]:
    """
    Comprehensive crop-weather analysis combining forecast data,
    suitability assessment, alerts, and farming recommendations.

    Args:
        db: Database session.
        pincode: 6-digit Indian pincode.
        crop_type: Crop name (must exist in CROP_PROFILES).

    Returns:
        Full analysis dict.

    Raises:
        ValueError: If pincode or crop_type is invalid.
        RuntimeError: If the external API call fails.
    """
    profile = CROP_PROFILES.get(crop_type)
    if profile is None:
        supported = ", ".join(sorted(CROP_PROFILES.keys()))
        raise ValueError(
            f"Unsupported crop type: '{crop_type}'. Supported: {supported}"
        )

    forecast_result = await get_forecast(db, pincode)
    forecast_data = forecast_result["forecast"]

    summary = _compute_forecast_summary(forecast_data)
    alerts = generate_alerts(forecast_data, crop_type=crop_type)
    suitability = _assess_crop_suitability(summary, profile)
    recommendations = _generate_farming_recommendations(
        summary, profile, crop_type, alerts
    )

    return {
        "pincode": pincode,
        "crop_type": crop_type,
        "location": forecast_result["location"],
        "forecast_summary": summary,
        "crop_suitability": suitability,
        "alerts": alerts,
        "overall_severity": determine_overall_severity(alerts),
        "recommendations": recommendations,
        "crop_profile": {
            "optimal_temp_range": (
                f"{profile['optimal_temp_min']}-"
                f"{profile['optimal_temp_max']}C"
            ),
            "water_need": profile["water_need"],
            "growth_season": profile["growth_season"],
        },
        "cached": forecast_result["cached"],
    }
