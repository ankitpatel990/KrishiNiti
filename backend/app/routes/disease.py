"""
Disease Treatment API Routes

Endpoints:
    POST /api/disease/treatment  - Get treatment by disease name
    POST /api/disease/detect     - Simulate AI disease detection
    GET  /api/disease/list       - List all diseases (with filters)
    GET  /api/disease/{id}       - Get disease details by ID
"""

import logging
import time
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import DiseaseTreatment
from app.schemas import (
    DiseaseTreatmentResponse,
    DiseaseTreatmentListResponse,
    DiseaseSearchRequest,
    ErrorResponse,
)
from app.services.disease_service import (
    search_diseases,
    get_disease_by_id,
    list_diseases,
    build_treatment_response,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/disease", tags=["Disease"])


# ---------------------------------------------------------------------------
# POST /api/disease/treatment
# ---------------------------------------------------------------------------
@router.post(
    "/treatment",
    summary="Get treatment recommendation by disease name",
    description=(
        "Search for a disease by name (English or Hindi) and return "
        "treatment recommendations including chemical and organic options, "
        "dosage, cost estimates, and prevention tips. "
        "Supports fuzzy matching to handle typos."
    ),
    responses={
        200: {"description": "Treatment found"},
        400: {"model": ErrorResponse, "description": "Invalid input"},
        404: {"model": ErrorResponse, "description": "Disease not found"},
    },
)
async def get_treatment(
    disease_name: str = Query(
        ...,
        min_length=1,
        max_length=200,
        description="Disease name in English or Hindi",
        examples=["Paddy Blast", "धान का ब्लास्ट"],
    ),
    crop_type: Optional[str] = Query(
        None,
        max_length=100,
        description="Optional crop type filter",
        examples=["Paddy", "Wheat"],
    ),
    acres: float = Query(
        1.0,
        ge=0.1,
        le=10000,
        description="Number of acres for cost estimation",
    ),
    db: Session = Depends(get_db),
):
    start = time.perf_counter()

    disease_name = disease_name.strip()
    if not disease_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="disease_name cannot be empty",
        )

    logger.info(
        "Treatment request | query=%s crop_type=%s acres=%s",
        disease_name,
        crop_type,
        acres,
    )

    results = search_diseases(db, query=disease_name, crop_type=crop_type, limit=5)

    if not results:
        logger.info("No match found for query=%s", disease_name)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No disease found matching '{disease_name}'. Please check the name and try again.",
        )

    best_match, score = results[0]
    response = build_treatment_response(best_match, acres=acres)
    response["match_score"] = round(score, 3)

    # Include alternative matches when the best match is not exact
    if len(results) > 1 and score < 1.0:
        response["alternatives"] = [
            {"id": d.id, "disease_name": d.disease_name, "crop_type": d.crop_type, "score": round(s, 3)}
            for d, s in results[1:]
        ]

    elapsed = round((time.perf_counter() - start) * 1000, 2)
    logger.info("Treatment response | disease=%s score=%.3f time=%sms", best_match.disease_name, score, elapsed)
    response["response_time_ms"] = elapsed
    return response


# ---------------------------------------------------------------------------
# POST /api/disease/detect
# ---------------------------------------------------------------------------
@router.post(
    "/detect",
    summary="Simulate AI disease detection from image",
    description=(
        "Placeholder endpoint that simulates AI-based disease detection. "
        "In production this will accept an image and run inference with "
        "TensorFlow.js / a server-side model. Currently returns mock results."
    ),
    responses={
        200: {"description": "Detection results (simulated)"},
        400: {"model": ErrorResponse, "description": "Invalid input"},
    },
)
async def detect_disease(
    crop_type: str = Query(
        ...,
        min_length=1,
        max_length=100,
        description="Type of crop in the image",
        examples=["Paddy", "Wheat", "Cotton"],
    ),
    db: Session = Depends(get_db),
):
    """
    Simulated AI detection. Returns mock predictions drawn from the
    database for the given crop type.
    """
    logger.info("Disease detection request | crop_type=%s", crop_type)

    diseases, total = list_diseases(db, crop_type=crop_type, limit=3, offset=0)

    if not diseases:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No diseases found for crop type '{crop_type}'",
        )

    # Simulate confidence scores (descending)
    confidence_values = [0.92, 0.78, 0.45]
    predictions = []
    for idx, disease in enumerate(diseases):
        confidence = confidence_values[idx] if idx < len(confidence_values) else 0.10
        predictions.append(
            {
                "disease_id": disease.id,
                "disease_name": disease.disease_name,
                "disease_name_hindi": disease.disease_name_hindi,
                "confidence": confidence,
                "treatment_summary": {
                    "chemical": disease.treatment_chemical,
                    "organic": disease.treatment_organic,
                },
            }
        )

    return {
        "status": "simulated",
        "crop_type": crop_type,
        "predictions": predictions,
        "message": "This is a simulated detection. Real AI model integration is planned.",
    }


# ---------------------------------------------------------------------------
# GET /api/disease/list
# ---------------------------------------------------------------------------
@router.get(
    "/list",
    response_model=DiseaseTreatmentListResponse,
    summary="List all diseases with optional filters",
    description=(
        "Retrieve a paginated list of all diseases. "
        "Optionally filter by crop type."
    ),
    responses={
        200: {"description": "Disease list retrieved"},
    },
)
async def list_all_diseases(
    crop_type: Optional[str] = Query(
        None,
        max_length=100,
        description="Filter by crop type (e.g. Paddy, Wheat)",
        examples=["Paddy", "Wheat"],
    ),
    limit: int = Query(100, ge=1, le=500, description="Maximum results"),
    offset: int = Query(0, ge=0, description="Results to skip"),
    db: Session = Depends(get_db),
):
    start = time.perf_counter()

    logger.info("List diseases | crop_type=%s limit=%s offset=%s", crop_type, limit, offset)

    diseases, total = list_diseases(db, crop_type=crop_type, limit=limit, offset=offset)

    elapsed = round((time.perf_counter() - start) * 1000, 2)
    logger.info("Listed %d/%d diseases in %sms", len(diseases), total, elapsed)

    return DiseaseTreatmentListResponse(total=total, diseases=diseases)


# ---------------------------------------------------------------------------
# GET /api/disease/{disease_id}
# ---------------------------------------------------------------------------
@router.get(
    "/{disease_id}",
    response_model=DiseaseTreatmentResponse,
    summary="Get disease details by ID",
    description="Retrieve detailed information about a specific disease.",
    responses={
        200: {"description": "Disease details retrieved"},
        404: {"model": ErrorResponse, "description": "Disease not found"},
    },
)
async def get_disease(
    disease_id: int,
    db: Session = Depends(get_db),
):
    logger.info("Get disease | id=%s", disease_id)

    disease = get_disease_by_id(db, disease_id)
    if not disease:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Disease with id {disease_id} not found",
        )
    return disease
