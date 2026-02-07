"""
Weather API Routes

Endpoints:
    GET  /api/weather/forecast - Get 7-day weather forecast by pincode
    GET  /api/weather/alerts   - Get farming alerts based on weather
    POST /api/weather/analyze  - Analyze weather for specific crop
    GET  /api/weather/crops    - List supported crop types
"""

import logging
import time
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import CropWeatherAnalysisRequest, ErrorResponse
from app.services.weather_service import (
    CROP_PROFILES,
    analyze_crop_weather,
    determine_overall_severity,
    generate_alerts,
    get_forecast,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/weather", tags=["Weather"])


def _validate_pincode(pincode: str) -> str:
    """Validate and normalize a 6-digit Indian pincode."""
    pincode = pincode.strip()
    if len(pincode) != 6 or not pincode.isdigit():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Pincode must be exactly 6 digits.",
        )
    return pincode


# ---------------------------------------------------------------------------
# GET /api/weather/forecast
# ---------------------------------------------------------------------------
@router.get(
    "/forecast",
    summary="Get 7-day weather forecast by pincode",
    description=(
        "Returns a 7-day weather forecast for the given Indian pincode. "
        "Data is sourced from Open-Meteo and cached for 6 hours."
    ),
    responses={
        200: {"description": "Forecast data retrieved"},
        400: {"model": ErrorResponse, "description": "Invalid pincode"},
        404: {"model": ErrorResponse, "description": "Pincode not found"},
        503: {"model": ErrorResponse, "description": "Weather API unavailable"},
    },
)
async def weather_forecast(
    pincode: str = Query(
        ...,
        min_length=6,
        max_length=6,
        pattern=r"^\d{6}$",
        description="6-digit Indian pincode",
        examples=["110001", "400001", "560001"],
    ),
    db: Session = Depends(get_db),
):
    start = time.perf_counter()
    pincode = _validate_pincode(pincode)

    logger.info("Forecast request | pincode=%s", pincode)

    try:
        result = await get_forecast(db, pincode)
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
        "Forecast response | pincode=%s cached=%s time=%sms",
        pincode,
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
        "Analyze the 7-day forecast for a pincode and return weather alerts "
        "relevant to farming. Optionally filter for a specific crop type."
    ),
    responses={
        200: {"description": "Weather alerts generated"},
        400: {"model": ErrorResponse, "description": "Invalid input"},
        404: {"model": ErrorResponse, "description": "Pincode not found"},
        503: {"model": ErrorResponse, "description": "Weather API unavailable"},
    },
)
async def weather_alerts(
    pincode: str = Query(
        ...,
        min_length=6,
        max_length=6,
        pattern=r"^\d{6}$",
        description="6-digit Indian pincode",
        examples=["110001", "400001"],
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
    pincode = _validate_pincode(pincode)

    logger.info("Alert request | pincode=%s crop_type=%s", pincode, crop_type)

    try:
        forecast_result = await get_forecast(db, pincode)
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
        "Alert response | pincode=%s alerts=%d severity=%s time=%sms",
        pincode,
        len(alerts),
        severity,
        elapsed,
    )

    return {
        "pincode": pincode,
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
        "Comprehensive weather analysis for a specific crop and pincode. "
        "Returns forecast summary, crop suitability assessment, alerts, "
        "and farming recommendations (irrigation, spraying, harvesting)."
    ),
    responses={
        200: {"description": "Crop weather analysis completed"},
        400: {"model": ErrorResponse, "description": "Invalid input"},
        404: {"model": ErrorResponse, "description": "Pincode not found"},
        503: {"model": ErrorResponse, "description": "Weather API unavailable"},
    },
)
async def analyze_weather(
    request: CropWeatherAnalysisRequest,
    db: Session = Depends(get_db),
):
    start = time.perf_counter()

    logger.info(
        "Crop analysis request | pincode=%s crop=%s",
        request.pincode,
        request.crop_type,
    )

    try:
        result = await analyze_crop_weather(
            db, request.pincode, request.crop_type
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
        "Crop analysis response | pincode=%s crop=%s suitability=%s time=%sms",
        request.pincode,
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
    crops = []
    for name, profile in sorted(CROP_PROFILES.items()):
        crops.append(
            {
                "crop_type": name,
                "optimal_temp_range": (
                    f"{profile['optimal_temp_min']}-"
                    f"{profile['optimal_temp_max']}C"
                ),
                "water_need": profile["water_need"],
                "growth_season": profile["growth_season"],
            }
        )
    return {"total": len(crops), "crops": crops}
