"""
Historical Weather Service - Open-Meteo Archive API

Fetches historical weather data for the same calendar week over
the past 5 years and computes a comparison against the current
7-day forecast.
"""

import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import httpx

logger = logging.getLogger(__name__)

ARCHIVE_API_URL = "https://archive-api.open-meteo.com/v1/archive"
ARCHIVE_TIMEOUT_SECONDS = 15.0
YEARS_BACK = 5

ARCHIVE_DAILY_PARAMS = (
    "temperature_2m_max,"
    "temperature_2m_min,"
    "precipitation_sum,"
    "windspeed_10m_max"
)


async def _fetch_historical_year(
    latitude: float,
    longitude: float,
    start_date: str,
    end_date: str,
) -> Optional[Dict]:
    """Fetch one year's historical data from Open-Meteo Archive API."""
    params = {
        "latitude": latitude,
        "longitude": longitude,
        "start_date": start_date,
        "end_date": end_date,
        "daily": ARCHIVE_DAILY_PARAMS,
        "timezone": "Asia/Kolkata",
    }
    try:
        async with httpx.AsyncClient(timeout=ARCHIVE_TIMEOUT_SECONDS) as client:
            response = await client.get(ARCHIVE_API_URL, params=params)
            response.raise_for_status()
            return response.json()
    except Exception as exc:
        logger.warning(
            "Historical fetch failed for %s to %s: %s",
            start_date, end_date, exc,
        )
        return None


def _safe_avg(values: List) -> Optional[float]:
    """Compute average of non-None values."""
    clean = [v for v in values if v is not None]
    if not clean:
        return None
    return round(sum(clean) / len(clean), 1)


async def get_historical_comparison(
    latitude: float,
    longitude: float,
    current_summary: Dict[str, Any],
) -> Optional[Dict[str, Any]]:
    """
    Compare the current 7-day forecast with the same calendar week
    averaged over the past 5 years.

    Args:
        latitude: Taluka latitude.
        longitude: Taluka longitude.
        current_summary: The _compute_forecast_summary() output.

    Returns:
        Dict with temperature, rainfall, and wind comparisons,
        or None on failure.
    """
    period_start = current_summary.get("period_start")
    if not period_start:
        return None

    try:
        start_dt = datetime.strptime(period_start, "%Y-%m-%d")
    except (ValueError, TypeError):
        return None

    # Collect historical data for the same week across past years
    all_temps_max: List[float] = []
    all_temps_min: List[float] = []
    all_precip: List[float] = []
    all_wind: List[float] = []

    for years_ago in range(1, YEARS_BACK + 1):
        hist_start = start_dt.replace(year=start_dt.year - years_ago)
        hist_end = hist_start + timedelta(days=6)

        data = await _fetch_historical_year(
            latitude,
            longitude,
            hist_start.strftime("%Y-%m-%d"),
            hist_end.strftime("%Y-%m-%d"),
        )
        if not data or "daily" not in data:
            continue

        daily = data["daily"]
        temps_max = daily.get("temperature_2m_max", [])
        temps_min = daily.get("temperature_2m_min", [])
        precip = daily.get("precipitation_sum", [])
        wind = daily.get("windspeed_10m_max", [])

        if temps_max:
            avg_max = _safe_avg(temps_max)
            if avg_max is not None:
                all_temps_max.append(avg_max)
        if temps_min:
            avg_min = _safe_avg(temps_min)
            if avg_min is not None:
                all_temps_min.append(avg_min)
        if precip:
            total = sum(p for p in precip if p is not None)
            all_precip.append(round(total, 1))
        if wind:
            avg_w = _safe_avg(wind)
            if avg_w is not None:
                all_wind.append(avg_w)

    if not all_temps_max:
        logger.warning("No historical data retrieved for comparison")
        return None

    # Compute historical averages
    hist_avg_max = _safe_avg(all_temps_max)
    hist_avg_min = _safe_avg(all_temps_min)
    hist_avg_rain = _safe_avg(all_precip)
    hist_avg_wind = _safe_avg(all_wind)

    # Current values
    curr_avg_max = current_summary["temperature"]["avg_max"]
    curr_avg_min = current_summary["temperature"]["avg_min"]
    curr_rain = current_summary["rainfall"]["total_mm"]
    curr_wind = current_summary["wind"]["avg_speed_kmh"]

    # Deviations
    temp_dev_max = round(curr_avg_max - hist_avg_max, 1) if curr_avg_max and hist_avg_max else None
    temp_dev_min = round(curr_avg_min - hist_avg_min, 1) if curr_avg_min and hist_avg_min else None

    rain_dev_pct = None
    if hist_avg_rain and hist_avg_rain > 0:
        rain_dev_pct = round(((curr_rain - hist_avg_rain) / hist_avg_rain) * 100, 0)
    elif curr_rain > 0:
        rain_dev_pct = 100.0

    result = {
        "years_compared": len(all_temps_max),
        "temperature": {
            "hist_avg_max": hist_avg_max,
            "hist_avg_min": hist_avg_min,
            "current_avg_max": curr_avg_max,
            "current_avg_min": curr_avg_min,
            "deviation_max": temp_dev_max,
            "deviation_min": temp_dev_min,
        },
        "rainfall": {
            "hist_avg_mm": hist_avg_rain,
            "current_mm": curr_rain,
            "deviation_pct": rain_dev_pct,
        },
        "wind": {
            "hist_avg_kmh": hist_avg_wind,
            "current_avg_kmh": curr_wind,
        },
    }

    # Add interpretation
    interpretations = []
    if temp_dev_max is not None:
        if temp_dev_max > 2:
            interpretations.append(
                f"Temperatures are {temp_dev_max}C above the 5-year average for this week. "
                "Heat stress may affect sensitive crops."
            )
        elif temp_dev_max < -2:
            interpretations.append(
                f"Temperatures are {abs(temp_dev_max)}C below the 5-year average. "
                "Cooler conditions may slow crop growth."
            )
        else:
            interpretations.append("Temperatures are near the historical average for this week.")

    if rain_dev_pct is not None:
        if rain_dev_pct > 50:
            interpretations.append(
                f"Expected rainfall is {rain_dev_pct:.0f}% above the historical average. "
                "Ensure proper drainage and delay field operations if needed."
            )
        elif rain_dev_pct < -50:
            interpretations.append(
                f"Expected rainfall is {abs(rain_dev_pct):.0f}% below the historical average. "
                "Plan supplemental irrigation."
            )
        else:
            interpretations.append("Rainfall is within the normal range for this period.")

    result["interpretation"] = " ".join(interpretations)

    logger.info(
        "Historical comparison computed: %d years, temp dev=%.1fC, rain dev=%s%%",
        len(all_temps_max),
        temp_dev_max or 0,
        rain_dev_pct if rain_dev_pct is not None else "N/A",
    )

    return result
