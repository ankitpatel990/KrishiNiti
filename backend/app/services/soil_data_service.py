"""
Soil Data Service - NASA POWER + data.gov.in Integration

Fetches soil moisture data from NASA POWER API and crop/soil
advisory data from data.gov.in for the specified talukas.
"""

import logging
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# NASA POWER API (soil moisture - free, no key needed)
# ---------------------------------------------------------------------------
NASA_POWER_URL = "https://power.larc.nasa.gov/api/temporal/daily/point"
NASA_POWER_TIMEOUT = 20.0
NASA_POWER_PARAMS = "GWETROOT,GWETPROF,EVPTRNS,T2M_MAX,T2M_MIN,PRECTOTCORR"

# ---------------------------------------------------------------------------
# data.gov.in Crop & Soil Advisory
# ---------------------------------------------------------------------------
DATA_GOV_RESOURCE_ID = "4554a3c8-74e3-4f93-8727-8fd92161e345"
DATA_GOV_TIMEOUT = 15.0


async def fetch_soil_moisture(
    latitude: float, longitude: float
) -> Optional[Dict[str, Any]]:
    """
    Fetch recent soil moisture data from NASA POWER API.

    Returns soil wetness indices:
    - GWETROOT: Root Zone Soil Wetness (0=dry to 1=saturated)
    - GWETPROF: Profile Soil Moisture (0=dry to 1=saturated)
    - EVPTRNS: Evapotranspiration (mm/day)

    Returns:
        Dict with soil moisture metrics, or None on failure.
    """
    end_date = datetime.utcnow() - timedelta(days=3)
    start_date = end_date - timedelta(days=6)

    params = {
        "parameters": NASA_POWER_PARAMS,
        "community": "AG",
        "longitude": longitude,
        "latitude": latitude,
        "start": start_date.strftime("%Y%m%d"),
        "end": end_date.strftime("%Y%m%d"),
        "format": "JSON",
    }

    try:
        async with httpx.AsyncClient(timeout=NASA_POWER_TIMEOUT) as client:
            response = await client.get(NASA_POWER_URL, params=params)
            response.raise_for_status()
            data = response.json()

        properties = data.get("properties", {}).get("parameter", {})

        gwetroot_values = properties.get("GWETROOT", {})
        gwetprof_values = properties.get("GWETPROF", {})
        evptrns_values = properties.get("EVPTRNS", {})

        def _avg_valid(values_dict: dict) -> Optional[float]:
            vals = [v for v in values_dict.values() if v is not None and v >= 0]
            if not vals:
                return None
            return round(sum(vals) / len(vals), 3)

        root_moisture = _avg_valid(gwetroot_values)
        profile_moisture = _avg_valid(gwetprof_values)
        evapotranspiration = _avg_valid(evptrns_values)

        # Interpret moisture levels
        interpretation = _interpret_soil_moisture(root_moisture)

        result = {
            "root_zone_moisture": root_moisture,
            "profile_moisture": profile_moisture,
            "evapotranspiration_mm_day": evapotranspiration,
            "data_period": {
                "start": start_date.strftime("%Y-%m-%d"),
                "end": end_date.strftime("%Y-%m-%d"),
            },
            "interpretation": interpretation,
            "source": "NASA POWER (Prediction Of Worldwide Energy Resources)",
        }

        logger.info(
            "Soil moisture fetched: root=%.3f, profile=%.3f, ET=%.2f (lat=%.4f, lon=%.4f)",
            root_moisture or 0,
            profile_moisture or 0,
            evapotranspiration or 0,
            latitude,
            longitude,
        )

        return result

    except httpx.TimeoutException:
        logger.error("NASA POWER API timed out (lat=%.4f, lon=%.4f)", latitude, longitude)
    except httpx.HTTPStatusError as exc:
        logger.error(
            "NASA POWER API HTTP error %d: %s",
            exc.response.status_code,
            exc.response.text[:200],
        )
    except Exception as exc:
        logger.error("NASA POWER fetch failed: %s", exc)

    return None


def _interpret_soil_moisture(root_moisture: Optional[float]) -> str:
    """Provide a human-readable interpretation of soil moisture level."""
    if root_moisture is None:
        return "Soil moisture data unavailable."
    if root_moisture < 0.15:
        return (
            "Soil is very dry. Immediate irrigation is critical for most crops. "
            "Consider deep watering to reach root zone."
        )
    if root_moisture < 0.3:
        return (
            "Soil moisture is below optimal for most crops. "
            "Schedule irrigation within the next 1-2 days."
        )
    if root_moisture < 0.5:
        return (
            "Soil moisture is adequate for most crops. "
            "Monitor and irrigate if no rain is expected in the next 3-4 days."
        )
    if root_moisture < 0.7:
        return (
            "Soil moisture is good. No immediate irrigation needed. "
            "Favorable for field operations."
        )
    if root_moisture < 0.85:
        return (
            "Soil is well-saturated. Avoid irrigation. "
            "Ensure drainage channels are clear to prevent waterlogging."
        )
    return (
        "Soil is near saturation. Risk of waterlogging. "
        "Do not irrigate. Ensure drainage is functioning. "
        "Avoid heavy machinery on fields."
    )


async def fetch_crop_soil_advisory(
    district: str,
) -> Optional[Dict[str, Any]]:
    """
    Fetch crop and soil advisory data from data.gov.in API.

    Args:
        district: District name for filtering.

    Returns:
        Dict with advisory records, or None on failure.
    """
    api_key = settings.DATA_GOV_IN_API_KEY
    if not api_key:
        logger.warning("DATA_GOV_IN_API_KEY not configured; skipping advisory fetch")
        return None

    url = f"{settings.DATA_GOV_IN_API_URL}/{DATA_GOV_RESOURCE_ID}"
    params = {
        "api-key": api_key,
        "format": "json",
        "limit": 10,
        "filters[district]": district,
    }

    try:
        async with httpx.AsyncClient(timeout=DATA_GOV_TIMEOUT) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()

        records = data.get("records", [])
        total = data.get("total", 0)

        if not records:
            logger.info(
                "No crop/soil advisory records found for district: %s", district
            )
            return {
                "total_records": 0,
                "advisories": [],
                "source": "data.gov.in - Crop & Soil Advisory",
                "district": district,
            }

        advisories = []
        for record in records[:5]:
            advisory = {}
            for key, value in record.items():
                if key.startswith("_") or key in ("id",):
                    continue
                if value and str(value).strip():
                    clean_key = key.strip().lower().replace(" ", "_")
                    advisory[clean_key] = str(value).strip()
            if advisory:
                advisories.append(advisory)

        result = {
            "total_records": total,
            "advisories": advisories,
            "source": "data.gov.in - Crop & Soil Advisory",
            "district": district,
        }

        logger.info(
            "Fetched %d crop/soil advisories for district %s (total: %d)",
            len(advisories),
            district,
            total,
        )

        return result

    except httpx.TimeoutException:
        logger.error("data.gov.in API timed out for district %s", district)
    except httpx.HTTPStatusError as exc:
        logger.error(
            "data.gov.in API HTTP error %d: %s",
            exc.response.status_code,
            exc.response.text[:200],
        )
    except Exception as exc:
        logger.error("data.gov.in advisory fetch failed: %s", exc)

    return None
