"""
Weather API Routes

Endpoints:
    GET  /api/weather/locations - Get available location hierarchy
    GET  /api/weather/forecast  - Get 7-day weather forecast by taluka
    GET  /api/weather/alerts    - Get farming alerts based on weather
    POST /api/weather/analyze   - Analyze weather for specific crop
    GET  /api/weather/crops     - List supported crop types
"""

import logging
import time
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import CropWeatherAnalysisRequest, ErrorResponse
from app.services.weather_service import (
    _ensure_profiles_loaded,
    analyze_crop_weather,
    determine_overall_severity,
    generate_alerts,
    get_forecast,
    get_location_hierarchy,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/weather", tags=["Weather"])


def _validate_location_params(state: str, district: str, taluka: str) -> None:
    """Validate that state, district, and taluka are non-empty strings."""
    if not state or not state.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="State is required.",
        )
    if not district or not district.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="District is required.",
        )
    if not taluka or not taluka.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Taluka is required.",
        )


# ---------------------------------------------------------------------------
# GET /api/weather/locations
# ---------------------------------------------------------------------------
@router.get(
    "/locations",
    summary="Get available location hierarchy",
    description=(
        "Returns the available states, districts, and talukas "
        "for weather forecast lookup."
    ),
    responses={
        200: {"description": "Location hierarchy retrieved"},
    },
)
async def get_locations():
    hierarchy = get_location_hierarchy()
    return {"locations": hierarchy}


# ---------------------------------------------------------------------------
# GET /api/weather/forecast
# ---------------------------------------------------------------------------
@router.get(
    "/forecast",
    summary="Get 7-day weather forecast by taluka",
    description=(
        "Returns a 7-day weather forecast for the given taluka. "
        "Data is sourced from Open-Meteo and cached for 6 hours."
    ),
    responses={
        200: {"description": "Forecast data retrieved"},
        400: {"model": ErrorResponse, "description": "Invalid location"},
        404: {"model": ErrorResponse, "description": "Location not found"},
        503: {"model": ErrorResponse, "description": "Weather API unavailable"},
    },
)
async def weather_forecast(
    state: str = Query(
        ...,
        min_length=1,
        max_length=100,
        description="Indian state name",
        examples=["Gujarat"],
    ),
    district: str = Query(
        ...,
        min_length=1,
        max_length=100,
        description="District name",
        examples=["Rajkot", "Junagadh", "Amreli"],
    ),
    taluka: str = Query(
        ...,
        min_length=1,
        max_length=100,
        description="Taluka name",
        examples=["Jetpur", "Gondal", "Keshod"],
    ),
    db: Session = Depends(get_db),
):
    start = time.perf_counter()
    _validate_location_params(state, district, taluka)

    logger.info(
        "Forecast request | state=%s district=%s taluka=%s",
        state, district, taluka,
    )

    try:
        result = await get_forecast(db, state.strip(), district.strip(), taluka.strip())
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)
        )
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)
        )

    elapsed = round((time.perf_counter() - start) * 1000, 2)
    logger.info(
        "Forecast response | taluka=%s cached=%s time=%sms",
        taluka,
        result["cached"],
        elapsed,
    )
    result["response_time_ms"] = elapsed
    return result


# ---------------------------------------------------------------------------
# GET /api/weather/alerts
# ---------------------------------------------------------------------------
@router.get(
    "/alerts",
    summary="Get farming alerts based on weather",
    description=(
        "Analyze the 7-day forecast for a taluka and return weather alerts "
        "relevant to farming. Optionally filter for a specific crop type."
    ),
    responses={
        200: {"description": "Weather alerts generated"},
        400: {"model": ErrorResponse, "description": "Invalid input"},
        404: {"model": ErrorResponse, "description": "Location not found"},
        503: {"model": ErrorResponse, "description": "Weather API unavailable"},
    },
)
async def weather_alerts(
    state: str = Query(
        ...,
        min_length=1,
        max_length=100,
        description="Indian state name",
        examples=["Gujarat"],
    ),
    district: str = Query(
        ...,
        min_length=1,
        max_length=100,
        description="District name",
        examples=["Rajkot"],
    ),
    taluka: str = Query(
        ...,
        min_length=1,
        max_length=100,
        description="Taluka name",
        examples=["Jetpur"],
    ),
    crop_type: Optional[str] = Query(
        None,
        max_length=100,
        description="Optional crop type to filter alerts",
        examples=["Paddy", "Wheat", "Cotton"],
    ),
    db: Session = Depends(get_db),
):
    start = time.perf_counter()
    _validate_location_params(state, district, taluka)

    logger.info(
        "Alert request | taluka=%s crop_type=%s", taluka, crop_type
    )

    try:
        forecast_result = await get_forecast(
            db, state.strip(), district.strip(), taluka.strip()
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)
        )
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)
        )

    forecast_data = forecast_result["forecast"]
    alerts = generate_alerts(forecast_data, crop_type=crop_type)
    severity = determine_overall_severity(alerts)

    elapsed = round((time.perf_counter() - start) * 1000, 2)
    logger.info(
        "Alert response | taluka=%s alerts=%d severity=%s time=%sms",
        taluka,
        len(alerts),
        severity,
        elapsed,
    )

    return {
        "taluka": taluka,
        "district": district,
        "state": state,
        "location": forecast_result["location"],
        "alerts": alerts,
        "alert_count": len(alerts),
        "severity": severity,
        "crop_type": crop_type,
        "response_time_ms": elapsed,
    }


# ---------------------------------------------------------------------------
# POST /api/weather/analyze
# ---------------------------------------------------------------------------
@router.post(
    "/analyze",
    summary="Analyze weather for a specific crop",
    description=(
        "Comprehensive weather analysis for a specific crop and taluka. "
        "Returns forecast summary, crop suitability assessment, alerts, "
        "and farming recommendations (irrigation, spraying, harvesting)."
    ),
    responses={
        200: {"description": "Crop weather analysis completed"},
        400: {"model": ErrorResponse, "description": "Invalid input"},
        404: {"model": ErrorResponse, "description": "Location not found"},
        503: {"model": ErrorResponse, "description": "Weather API unavailable"},
    },
)
async def analyze_weather(
    request: CropWeatherAnalysisRequest,
    db: Session = Depends(get_db),
):
    start = time.perf_counter()

    logger.info(
        "Crop analysis request | taluka=%s crop=%s",
        request.taluka,
        request.crop_type,
    )

    try:
        result = await analyze_crop_weather(
            db,
            request.state,
            request.district,
            request.taluka,
            request.crop_type,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        )
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)
        )

    elapsed = round((time.perf_counter() - start) * 1000, 2)
    logger.info(
        "Crop analysis response | taluka=%s crop=%s suitability=%s time=%sms",
        request.taluka,
        request.crop_type,
        result["crop_suitability"],
        elapsed,
    )
    result["response_time_ms"] = elapsed
    return result


# ---------------------------------------------------------------------------
# GET /api/weather/crops
# ---------------------------------------------------------------------------
@router.get(
    "/crops",
    summary="List supported crop types for weather analysis",
    description=(
        "Returns the list of crop types supported by the weather analysis "
        "endpoint, along with their optimal growing conditions."
    ),
)
async def list_supported_crops():
    profiles = _ensure_profiles_loaded()
    crops = []
    for name, profile in sorted(profiles.items()):
        crops.append(
            {
                "crop_type": name,
                "optimal_temp_range": (
                    f"{profile['optimal_temp_min']}-"
                    f"{profile['optimal_temp_max']}C"
                ),
                "water_need": profile["water_need"],
                "growth_season": profile["growth_season"],
                "gujarat_varieties": profile.get("gujarat_varieties", []),
                "sowing_months": profile.get("sowing_months", []),
                "harvest_months": profile.get("harvest_months", []),
            }
        )
    return {"total": len(crops), "crops": crops}
