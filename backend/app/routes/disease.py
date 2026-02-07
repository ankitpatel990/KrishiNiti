"""
Disease Treatment API Routes

Endpoints:
    POST /api/disease/treatment       - Get treatment by disease name
    POST /api/disease/detect          - AI disease detection from image
    GET  /api/disease/supported-crops - List crops supported by AI models
    GET  /api/disease/model-status    - AI model loading status
    GET  /api/disease/list            - List all diseases (with filters)
    GET  /api/disease/{id}            - Get disease details by ID
"""

import logging
import time
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
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
from app.services.plant_disease_model import (
    predict as ai_predict,
    get_supported_crops,
    get_model_status,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/disease", tags=["Disease"])

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB


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
# GET /api/disease/supported-crops
# ---------------------------------------------------------------------------
@router.get(
    "/supported-crops",
    summary="List crops supported by AI disease detection models",
    description="Returns the list of crop types that can be analyzed by the AI models.",
    responses={200: {"description": "Supported crop list"}},
)
async def list_supported_crops():
    return {"crops": get_supported_crops()}


# ---------------------------------------------------------------------------
# GET /api/disease/model-status
# ---------------------------------------------------------------------------
@router.get(
    "/model-status",
    summary="AI model loading status",
    description="Returns the current loading status of both disease detection models.",
    responses={200: {"description": "Model status"}},
)
async def model_status():
    return get_model_status()


# ---------------------------------------------------------------------------
# POST /api/disease/detect
# ---------------------------------------------------------------------------
@router.post(
    "/detect",
    summary="AI disease detection from image",
    description=(
        "Upload a crop leaf image and a crop type to run real AI-powered "
        "disease detection. Returns top predictions with confidence scores "
        "and treatment information from the database when available."
    ),
    responses={
        200: {"description": "Detection results"},
        400: {"model": ErrorResponse, "description": "Invalid input"},
        422: {"model": ErrorResponse, "description": "Unsupported crop type"},
        500: {"model": ErrorResponse, "description": "Model inference error"},
    },
)
async def detect_disease(
    crop_type: str = Query(
        ...,
        min_length=1,
        max_length=100,
        description="Type of crop in the image",
        examples=["Paddy", "Wheat", "Tomato", "Potato"],
    ),
    image: UploadFile = File(
        ...,
        description="Leaf/plant image (JPEG, PNG, or WebP, max 10 MB)",
    ),
    db: Session = Depends(get_db),
):
    start = time.perf_counter()

    # --- validate file type ---
    if image.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Unsupported image type '{image.content_type}'. "
                f"Accepted types: JPEG, PNG, WebP."
            ),
        )

    # --- read and validate size ---
    image_bytes = await image.read()
    if len(image_bytes) > MAX_IMAGE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image exceeds the 10 MB size limit.",
        )

    if len(image_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    logger.info(
        "Disease detection request | crop_type=%s size=%d bytes",
        crop_type,
        len(image_bytes),
    )

    # --- run AI inference ---
    try:
        raw_predictions = ai_predict(image_bytes, crop_type, top_k=3)
    except Exception as exc:
        logger.error("Model inference failed: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Disease detection model failed. Please try again later.",
        )

    # --- enrich predictions with DB treatment info ---
    predictions = []
    for pred in raw_predictions:
        disease_name = pred["disease_name"]
        confidence = pred["confidence"]
        pred_crop = pred["crop_type"]

        # Try to find treatment in our DB via fuzzy search
        db_matches = search_diseases(db, query=disease_name, crop_type=None, limit=1)
        treatment_info = {}
        if db_matches:
            best_match, score = db_matches[0]
            treatment_info = {
                "disease_name_hindi": best_match.disease_name_hindi or "",
                "symptoms": best_match.symptoms or "",
                "affected_stages": best_match.affected_stages or "",
                "treatment_chemical": best_match.treatment_chemical or "",
                "treatment_organic": best_match.treatment_organic or "",
                "dosage": best_match.dosage or "",
                "cost_per_acre": best_match.cost_per_acre or 0,
                "prevention_tips": best_match.prevention_tips or "",
                "db_match_score": round(score, 3),
            }

        predictions.append({
            "disease_name": disease_name,
            "disease_name_hindi": treatment_info.get("disease_name_hindi", ""),
            "crop_type": pred_crop,
            "confidence": confidence,
            "symptoms": treatment_info.get("symptoms", ""),
            "affected_stages": treatment_info.get("affected_stages", ""),
            "treatment_chemical": treatment_info.get("treatment_chemical", ""),
            "treatment_organic": treatment_info.get("treatment_organic", ""),
            "dosage": treatment_info.get("dosage", ""),
            "cost_per_acre": treatment_info.get("cost_per_acre", 0),
            "prevention_tips": treatment_info.get("prevention_tips", ""),
            "model_used": pred.get("model", ""),
            "raw_label": pred.get("raw_label", ""),
        })

    elapsed = round((time.perf_counter() - start) * 1000, 2)
    logger.info(
        "Detection complete | crop_type=%s predictions=%d time=%sms",
        crop_type,
        len(predictions),
        elapsed,
    )

    return {
        "status": "success",
        "crop_type": crop_type,
        "predictions": predictions,
        "response_time_ms": elapsed,
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
