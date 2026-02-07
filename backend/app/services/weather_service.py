"""
Weather Service - Business Logic

Provides Open-Meteo API integration, taluka-to-coordinate resolution,
forecast caching (DB-backed), alert generation, crop-specific weather
analysis with enriched Gujarat crop profiles, LLM-powered advisory,
historical weather comparison, and soil moisture data.
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
from app.services.historical_weather_service import get_historical_comparison
from app.services.llm_advisory_service import generate_llm_advisory
from app.services.soil_data_service import fetch_crop_soil_advisory, fetch_soil_moisture

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
# Crop Profiles: loaded from enriched Gujarat-specific JSON
# ---------------------------------------------------------------------------
_crop_profiles: Optional[Dict[str, Dict[str, Any]]] = None
_crop_profiles_lock = threading.Lock()


def _load_crop_profiles() -> Dict[str, Dict[str, Any]]:
    """Load enriched Gujarat crop profiles from JSON (lazy, thread-safe)."""
    global _crop_profiles
    if _crop_profiles is not None:
        return _crop_profiles

    with _crop_profiles_lock:
        if _crop_profiles is not None:
            return _crop_profiles
        file_path = DATA_DIR / "gujarat_crop_profiles.json"
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                raw = json.load(f)
            for profile in raw.values():
                rain = profile.get("optimal_rainfall_weekly_mm")
                if isinstance(rain, list) and len(rain) == 2:
                    profile["optimal_rainfall_weekly_mm"] = tuple(rain)
            _crop_profiles = raw
            logger.info(
                "Loaded %d enriched crop profiles from %s",
                len(_crop_profiles), file_path,
            )
        except FileNotFoundError:
            logger.error("Gujarat crop profiles not found: %s", file_path)
            _crop_profiles = {}
        except json.JSONDecodeError as exc:
            logger.error("Invalid JSON in crop profiles: %s", exc)
            _crop_profiles = {}
    return _crop_profiles


# Module-level reference populated on first access
CROP_PROFILES: Dict[str, Dict[str, Any]] = {}


def _ensure_profiles_loaded() -> Dict[str, Dict[str, Any]]:
    """Ensure crop profiles are loaded and return them."""
    global CROP_PROFILES
    if not CROP_PROFILES:
        CROP_PROFILES.update(_load_crop_profiles())
    return CROP_PROFILES


# ---------------------------------------------------------------------------
# Module-Level Singletons (lazy-loaded, thread-safe)
# ---------------------------------------------------------------------------
_taluka_data: Optional[Dict[str, Dict]] = None
_taluka_lock = threading.Lock()

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
# Taluka Resolution
# ---------------------------------------------------------------------------

def _load_taluka_data() -> Dict[str, Dict]:
    """Load taluka coordinate mapping from JSON (lazy, thread-safe)."""
    global _taluka_data
    if _taluka_data is not None:
        return _taluka_data

    with _taluka_lock:
        if _taluka_data is not None:
            return _taluka_data
        file_path = DATA_DIR / "taluka_coordinates.json"
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                _taluka_data = json.load(f)
            logger.info("Loaded taluka data from %s", file_path)
        except FileNotFoundError:
            logger.error("Taluka data file not found: %s", file_path)
            _taluka_data = {}
        except json.JSONDecodeError as exc:
            logger.error("Invalid JSON in taluka data file: %s", exc)
            _taluka_data = {}
    return _taluka_data


def get_location_hierarchy() -> Dict[str, Any]:
    """Return the full location hierarchy for the frontend."""
    data = _load_taluka_data()
    hierarchy: Dict[str, Any] = {}
    for state_name, districts in data.items():
        hierarchy[state_name] = {}
        for district_name, talukas in districts.items():
            hierarchy[state_name][district_name] = sorted(talukas.keys())
    return hierarchy


def resolve_taluka(
    state: str, district: str, taluka: str
) -> Optional[Dict[str, Any]]:
    """Resolve a state/district/taluka to geographic coordinates and metadata."""
    data = _load_taluka_data()
    state_data = data.get(state)
    if state_data is None:
        return None
    district_data = state_data.get(district)
    if district_data is None:
        return None
    coords = district_data.get(taluka)
    if coords is None:
        return None
    return {
        "lat": coords["lat"],
        "lon": coords["lon"],
        "state": state,
        "district": district,
        "taluka": taluka,
        "soil_type": coords.get("soil_type", "unknown"),
        "elevation_m": coords.get("elevation_m"),
    }


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
    db: Session, taluka: str
) -> Optional[Tuple[Dict, datetime]]:
    now = datetime.now(timezone.utc)
    try:
        entry = (
            db.query(WeatherCache)
            .filter(
                WeatherCache.taluka == taluka,
                WeatherCache.expires_at > now,
            )
            .order_by(WeatherCache.cached_at.desc())
            .first()
        )
        if entry:
            forecast = json.loads(entry.forecast_data)
            return forecast, entry.cached_at
    except Exception as exc:
        logger.warning("Cache read failed for taluka %s: %s", taluka, exc)
    return None


def store_forecast_cache(
    db: Session,
    taluka: str,
    latitude: float,
    longitude: float,
    forecast_data: Dict,
) -> None:
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(hours=settings.WEATHER_CACHE_HOURS)
    try:
        entry = WeatherCache(
            taluka=taluka,
            latitude=latitude,
            longitude=longitude,
            forecast_data=json.dumps(forecast_data),
            cached_at=now,
            expires_at=expires_at,
        )
        db.add(entry)
        db.commit()
        logger.info("Cached forecast for taluka %s (expires %s)", taluka, expires_at)
    except Exception as exc:
        logger.warning("Cache write failed for taluka %s: %s", taluka, exc)
        db.rollback()


def cleanup_expired_cache(db: Session) -> int:
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
        latitude, longitude,
    )

    try:
        async with httpx.AsyncClient(timeout=API_TIMEOUT_SECONDS) as client:
            response = await client.get(settings.OPEN_METEO_API_URL, params=params)
            response.raise_for_status()
            data = response.json()
            logger.info("Open-Meteo response received (status %d)", response.status_code)
            return data
    except httpx.TimeoutException:
        logger.error("Open-Meteo API timed out (lat=%.4f, lon=%.4f)", latitude, longitude)
        raise RuntimeError("Weather API request timed out. Please try again.")
    except httpx.HTTPStatusError as exc:
        logger.error("Open-Meteo HTTP error %d: %s", exc.response.status_code, exc.response.text[:200])
        raise RuntimeError(f"Weather API returned status {exc.response.status_code}")
    except httpx.RequestError as exc:
        logger.error("Open-Meteo request failed: %s", exc)
        raise RuntimeError("Failed to connect to weather API. Please try again later.")


# ---------------------------------------------------------------------------
# Orchestrated Forecast Retrieval (cache-first)
# ---------------------------------------------------------------------------

async def get_forecast(
    db: Session, state: str, district: str, taluka: str
) -> Dict[str, Any]:
    location = resolve_taluka(state, district, taluka)
    if location is None:
        raise ValueError(
            f"Unknown location: {taluka}, {district}, {state}. "
            "Only mapped talukas are currently supported."
        )

    lat = location["lat"]
    lon = location["lon"]
    loc_info = {
        "taluka": taluka,
        "district": district,
        "state": state,
    }

    cached = get_cached_forecast(db, taluka)
    if cached is not None:
        forecast_data, cached_at = cached
        logger.info("Serving cached forecast for taluka %s", taluka)
        return {
            "taluka": taluka,
            "latitude": lat,
            "longitude": lon,
            "location": loc_info,
            "forecast": forecast_data,
            "cached": True,
            "cached_at": cached_at.isoformat() if cached_at else None,
        }

    forecast_data = await fetch_forecast_from_api(lat, lon)
    store_forecast_cache(db, taluka, lat, lon, forecast_data)

    return {
        "taluka": taluka,
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
    daily = forecast_data.get("daily", {})
    temps_max = daily.get("temperature_2m_max", [])
    temps_min = daily.get("temperature_2m_min", [])
    precip = daily.get("precipitation_sum", [])
    wind = daily.get("windspeed_10m_max", [])
    humidity = daily.get("relative_humidity_2m_max", [])
    dates = daily.get("time", [])

    alerts: List[Dict] = []

    if precip and len(precip) >= ALERT_DRY_SPELL_DAYS:
        dry_days = sum(1 for p in precip if p < ALERT_DRY_SPELL_PRECIP_MM)
        if dry_days >= ALERT_DRY_SPELL_DAYS:
            total_precip = sum(precip)
            alerts.append(
                _build_alert("dry_spell", "warning",
                    f"No significant rainfall expected for the next {dry_days} days. Total expected: {total_precip:.1f}mm.",
                    "Schedule irrigation immediately. Use drip or sprinkler systems to conserve water."))

    if precip:
        heavy_days = [(_safe_date(dates, i), p) for i, p in enumerate(precip) if p > ALERT_HEAVY_RAIN_MM]
        if heavy_days:
            worst = max(heavy_days, key=lambda x: x[1])
            alerts.append(
                _build_alert("heavy_rain", "danger",
                    f"Heavy rainfall expected: {worst[1]:.1f}mm on {worst[0]}. {len(heavy_days)} day(s) with >{ALERT_HEAVY_RAIN_MM:.0f}mm rain.",
                    "Ensure drainage. Harvest mature crops. Protect stored grains from moisture."))

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
                _build_alert("heat_stress", "warning",
                    f"Heat stress: temperature above {ALERT_HEAT_STRESS_TEMP_C:.0f}C for {max_consecutive} consecutive days. Peak: {peak_temp:.1f}C.",
                    "Increase irrigation. Apply mulch. Avoid field work 11 AM - 4 PM."))

    if temps_min:
        cold_days = [(_safe_date(dates, i), t) for i, t in enumerate(temps_min) if t < ALERT_COLD_WAVE_TEMP_C]
        if cold_days:
            coldest = min(cold_days, key=lambda x: x[1])
            if coldest[1] >= ALERT_FROST_RISK_TEMP_C:
                alerts.append(
                    _build_alert("cold_wave", "warning",
                        f"Cold wave: minimum temperature {coldest[1]:.1f}C expected on {coldest[0]}. {len(cold_days)} cold day(s) in forecast.",
                        "Cover sensitive crops. Use smoke/fogging. Irrigate in evening for frost protection."))

    if temps_min:
        frost_days = [(_safe_date(dates, i), t) for i, t in enumerate(temps_min) if t < ALERT_FROST_RISK_TEMP_C]
        if frost_days:
            coldest = min(frost_days, key=lambda x: x[1])
            alerts.append(
                _build_alert("frost_risk", "danger",
                    f"Frost risk: minimum temperature {coldest[1]:.1f}C expected on {coldest[0]}. {len(frost_days)} frost-risk day(s).",
                    "Immediate action: cover crops with plastic. Use heaters in orchards. Harvest mature crops."))

    if humidity:
        humid_days = sum(1 for h in humidity if h > ALERT_HIGH_HUMIDITY_PCT)
        if humid_days >= ALERT_HIGH_HUMIDITY_DAYS:
            peak_humidity = max(humidity)
            alerts.append(
                _build_alert("high_humidity", "info",
                    f"High humidity (>{ALERT_HIGH_HUMIDITY_PCT}%) expected for {humid_days} days. Peak: {peak_humidity:.0f}%. Increased fungal disease risk.",
                    "Apply preventive fungicides. Ensure air circulation. Avoid overhead irrigation."))

    if wind:
        windy_days = [(_safe_date(dates, i), w) for i, w in enumerate(wind) if w > ALERT_STRONG_WIND_KMH]
        if windy_days:
            worst = max(windy_days, key=lambda x: x[1])
            alerts.append(
                _build_alert("strong_winds", "warning",
                    f"Strong winds expected: {worst[1]:.1f} km/h on {worst[0]}. {len(windy_days)} windy day(s).",
                    "Support tall crops with stakes. Secure greenhouses. Avoid spraying."))

    if crop_type:
        templates = _load_alert_templates()
        filtered = []
        for alert in alerts:
            template = templates.get(alert["type"], {})
            affected = template.get("affected_crops", ["All"])
            if "All" in affected or crop_type in affected:
                filtered.append(alert)
        alerts = filtered

    alerts.sort(key=lambda a: SEVERITY_ORDER.get(a["severity"], 0), reverse=True)
    return alerts


def _safe_date(dates: List[str], index: int) -> str:
    if index < len(dates):
        return dates[index]
    return f"Day {index + 1}"


def determine_overall_severity(alerts: List[Dict]) -> str:
    if not alerts:
        return "info"
    max_val = max(SEVERITY_ORDER.get(a.get("severity", "info"), 0) for a in alerts)
    for name, val in SEVERITY_ORDER.items():
        if val == max_val:
            return name
    return "info"


# ---------------------------------------------------------------------------
# Crop Weather Analysis
# ---------------------------------------------------------------------------

def _compute_forecast_summary(forecast_data: Dict) -> Dict[str, Any]:
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
    issues = 0
    critical = 0

    temp_avg_max = summary["temperature"]["avg_max"] or 0
    temp_avg_min = summary["temperature"]["avg_min"] or 0
    total_rain = summary["rainfall"]["total_mm"]

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
    """Generate rule-based farming recommendations (fallback if LLM unavailable)."""
    recommendations: Dict[str, str] = {}

    total_rain = summary["rainfall"]["total_mm"]
    rain_min, rain_max = profile["optimal_rainfall_weekly_mm"]
    temp_avg_max = summary["temperature"]["avg_max"] or 0
    temp_avg_min = summary["temperature"]["avg_min"] or 0
    rainy_days = summary["rainfall"]["rainy_days"]
    max_wind = summary["wind"]["max_speed_kmh"] or 0
    avg_humidity = summary["humidity"]["avg_percent"] or 0

    if total_rain < rain_min:
        deficit = rain_min - total_rain
        if profile["water_need"] in ("high", "very_high"):
            recommendations["irrigation"] = (
                f"Rainfall deficit of {deficit:.0f}mm expected this week. "
                f"{crop_type} requires {profile['water_need'].replace('_', ' ')} water input. "
                "Schedule irrigation every 2-3 days using flood or drip irrigation."
            )
        else:
            recommendations["irrigation"] = (
                f"Rainfall deficit of {deficit:.0f}mm expected. "
                "Light irrigation recommended every 3-4 days. Consider drip irrigation for water efficiency."
            )
    elif total_rain > rain_max:
        recommendations["irrigation"] = (
            f"Excess rainfall ({total_rain:.0f}mm) expected. "
            "No irrigation needed. Ensure proper drainage to prevent waterlogging."
        )
    else:
        recommendations["irrigation"] = (
            f"Expected rainfall ({total_rain:.0f}mm) is within the optimal range for {crop_type}. "
            "Monitor soil moisture and irrigate only if needed."
        )

    if rainy_days > 0 and max_wind > 15:
        suitable_days = 7 - rainy_days
        recommendations["spraying"] = (
            "Avoid pesticide/herbicide spraying on rainy and windy days. "
            f"Best window: dry days with wind below 15 km/h. {suitable_days} suitable day(s) in forecast."
        )
    elif rainy_days > 0:
        recommendations["spraying"] = (
            f"Rain expected on {rainy_days} day(s). Plan spraying for dry days. "
            "Apply systemic pesticides that are rain-fast within 2 hours."
        )
    elif avg_humidity > 70 and profile.get("humidity_sensitive"):
        recommendations["spraying"] = (
            f"High humidity ({avg_humidity:.0f}%) increases fungal disease risk for {crop_type}. "
            "Apply preventive fungicide spray. Best time: early morning."
        )
    else:
        recommendations["spraying"] = (
            "Weather conditions are suitable for spraying. "
            "Best time: early morning (6-9 AM) or late afternoon (4-6 PM) when wind is calm."
        )

    alert_types = {a["type"] for a in alerts}
    if "heavy_rain" in alert_types:
        recommendations["harvesting"] = (
            "Heavy rain expected. If crop is mature, harvest immediately before rain. "
            "Ensure harvested produce is stored in dry, covered areas."
        )
    elif rainy_days == 0 and temp_avg_max < profile.get("critical_temp_max", 42):
        recommendations["harvesting"] = (
            "Dry weather expected for the forecast period. Excellent conditions for harvesting. "
            "Plan harvest operations during morning hours for best grain quality."
        )
    elif rainy_days <= 2:
        recommendations["harvesting"] = (
            f"Mostly dry weather with {rainy_days} rainy day(s). "
            "Harvest on dry days. Allow harvested produce to dry properly before storage."
        )
    else:
        recommendations["harvesting"] = (
            f"Frequent rain expected ({rainy_days} days). Delay harvesting if possible. "
            "If harvesting is necessary, ensure proper drying and ventilated storage."
        )

    general_parts = []
    if temp_avg_max > profile["optimal_temp_max"]:
        general_parts.append(
            f"Daytime temperature ({temp_avg_max:.1f}C) is above optimal for {crop_type}. "
            "Consider mulching and providing shade for young plants."
        )
    if temp_avg_min < profile["optimal_temp_min"]:
        general_parts.append(
            f"Night temperature ({temp_avg_min:.1f}C) is below optimal for {crop_type}. "
            "Protect young plants from cold."
        )
    if not general_parts:
        general_parts.append(
            f"Weather conditions are generally favorable for {crop_type} cultivation this week."
        )

    # Add Gujarat-specific pest/disease info
    pests = profile.get("common_pests_gujarat", [])
    diseases = profile.get("common_diseases_gujarat", [])
    if pests or diseases:
        pest_parts = []
        if avg_humidity > 70 and diseases:
            pest_parts.append(
                f"High humidity increases risk of: {', '.join(diseases[:3])}. "
                "Apply preventive fungicide."
            )
        if temp_avg_max > 35 and pests:
            pest_parts.append(
                f"Warm conditions favor: {', '.join(pests[:3])}. "
                "Monitor fields and apply IPM measures."
            )
        if pest_parts:
            recommendations["pest_disease"] = " ".join(pest_parts)

    recommendations["general"] = " ".join(general_parts)

    return recommendations


# ---------------------------------------------------------------------------
# Comprehensive Crop Weather Analysis (main orchestrator)
# ---------------------------------------------------------------------------

async def analyze_crop_weather(
    db: Session,
    state: str,
    district: str,
    taluka: str,
    crop_type: str,
) -> Dict[str, Any]:
    """
    Comprehensive crop-weather analysis combining:
    - Live 7-day forecast from Open-Meteo
    - Enriched Gujarat crop profiles with growth stages
    - LLM-powered contextual advisory (Groq)
    - Historical weather comparison (5-year)
    - Soil moisture data (NASA POWER)
    - Government crop/soil advisory (data.gov.in)
    """
    profiles = _ensure_profiles_loaded()
    profile = profiles.get(crop_type)
    if profile is None:
        supported = ", ".join(sorted(profiles.keys()))
        raise ValueError(
            f"Unsupported crop type: '{crop_type}'. Supported: {supported}"
        )

    # 1. Get forecast
    forecast_result = await get_forecast(db, state, district, taluka)
    forecast_data = forecast_result["forecast"]
    location = resolve_taluka(state, district, taluka)

    # 2. Compute summary and rule-based analysis
    summary = _compute_forecast_summary(forecast_data)
    alerts = generate_alerts(forecast_data, crop_type=crop_type)
    suitability = _assess_crop_suitability(summary, profile)
    rule_recommendations = _generate_farming_recommendations(
        summary, profile, crop_type, alerts
    )

    # 3. Fetch enrichment data in parallel (best-effort, failures are non-fatal)
    lat = location["lat"] if location else 0
    lon = location["lon"] if location else 0

    historical = None
    soil_data = None
    govt_advisory = None
    ai_advisory = None

    try:
        historical = await get_historical_comparison(lat, lon, summary)
    except Exception as exc:
        logger.warning("Historical comparison failed: %s", exc)

    try:
        soil_data = await fetch_soil_moisture(lat, lon)
    except Exception as exc:
        logger.warning("Soil moisture fetch failed: %s", exc)

    try:
        govt_advisory = await fetch_crop_soil_advisory(district)
    except Exception as exc:
        logger.warning("Govt advisory fetch failed: %s", exc)

    # 4. Generate LLM advisory (uses all collected data)
    try:
        ai_advisory = await generate_llm_advisory(
            location=location or {"taluka": taluka, "district": district, "state": state},
            forecast_summary=summary,
            crop_type=crop_type,
            crop_profile=profile,
            alerts=alerts,
            soil_data=soil_data,
            historical_comparison=historical,
        )
    except Exception as exc:
        logger.warning("LLM advisory generation failed: %s", exc)

    # 5. Build enriched crop profile for response
    enriched_profile = {
        "optimal_temp_range": f"{profile['optimal_temp_min']}-{profile['optimal_temp_max']}C",
        "water_need": profile["water_need"],
        "growth_season": profile["growth_season"],
        "gujarat_varieties": profile.get("gujarat_varieties", []),
        "soil_types_suitable": profile.get("soil_types_suitable", []),
        "sowing_months": profile.get("sowing_months", []),
        "harvest_months": profile.get("harvest_months", []),
        "common_pests": profile.get("common_pests_gujarat", []),
        "common_diseases": profile.get("common_diseases_gujarat", []),
    }

    # Include growth stages summary
    growth_stages = profile.get("growth_stages", {})
    if growth_stages:
        enriched_profile["growth_stages"] = {
            name: {
                "duration_days": info["duration_days"],
                "temp_range": f"{info['temp_min']}-{info['temp_max']}C",
                "water_per_week": f"{info['water_mm_per_week']}mm",
                "key_activity": info["key_activity"],
            }
            for name, info in growth_stages.items()
        }

    # Use AI advisory as primary recommendations if available,
    # fall back to rule-based
    final_recommendations = rule_recommendations
    if ai_advisory:
        final_recommendations = ai_advisory

    return {
        "taluka": taluka,
        "district": district,
        "state": state,
        "crop_type": crop_type,
        "location": forecast_result["location"],
        "forecast_summary": summary,
        "crop_suitability": suitability,
        "alerts": alerts,
        "overall_severity": determine_overall_severity(alerts),
        "recommendations": final_recommendations,
        "crop_profile": enriched_profile,
        "historical_comparison": historical,
        "soil_data": soil_data,
        "govt_advisory": govt_advisory,
        "ai_powered": ai_advisory is not None,
        "cached": forecast_result["cached"],
    }
