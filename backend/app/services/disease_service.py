"""
Disease Service - Business Logic

Provides fuzzy search, bilingual query support,
treatment recommendations, and cost estimation.
"""

import logging
from difflib import SequenceMatcher
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from app.models import DiseaseTreatment

logger = logging.getLogger(__name__)

# Minimum similarity ratio for fuzzy matching (0.0 - 1.0)
FUZZY_MATCH_THRESHOLD = 0.45


def _similarity(a: str, b: str) -> float:
    """
    Compute similarity ratio between two strings.
    Case-insensitive comparison.
    """
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()


def search_diseases(
    db: Session,
    query: str,
    crop_type: Optional[str] = None,
    limit: int = 10,
) -> List[Tuple[DiseaseTreatment, float]]:
    """
    Search diseases by name (English or Hindi) with fuzzy matching.

    Args:
        db: Database session
        query: Search string (English or Hindi)
        crop_type: Optional crop type filter
        limit: Max results

    Returns:
        List of (DiseaseTreatment, similarity_score) tuples sorted by relevance
    """
    base_query = db.query(DiseaseTreatment)

    if crop_type:
        base_query = base_query.filter(
            func.lower(DiseaseTreatment.crop_type) == crop_type.lower()
        )

    all_diseases = base_query.all()

    if not all_diseases:
        return []

    scored: List[Tuple[DiseaseTreatment, float]] = []
    query_lower = query.lower().strip()

    for disease in all_diseases:
        # Exact match (case-insensitive)
        if disease.disease_name.lower() == query_lower:
            scored.append((disease, 1.0))
            continue

        if disease.disease_name_hindi and disease.disease_name_hindi == query:
            scored.append((disease, 1.0))
            continue

        # Substring match
        if query_lower in disease.disease_name.lower():
            scored.append((disease, 0.90))
            continue

        if disease.disease_name_hindi and query in disease.disease_name_hindi:
            scored.append((disease, 0.90))
            continue

        # Fuzzy match on English name
        name_sim = _similarity(query, disease.disease_name)

        # Fuzzy match on Hindi name
        hindi_sim = 0.0
        if disease.disease_name_hindi:
            hindi_sim = _similarity(query, disease.disease_name_hindi)

        best_sim = max(name_sim, hindi_sim)

        if best_sim >= FUZZY_MATCH_THRESHOLD:
            scored.append((disease, best_sim))

    scored.sort(key=lambda x: x[1], reverse=True)
    return scored[:limit]


def get_disease_by_id(db: Session, disease_id: int) -> Optional[DiseaseTreatment]:
    """
    Retrieve a single disease record by primary key.
    """
    return db.query(DiseaseTreatment).filter(DiseaseTreatment.id == disease_id).first()


def list_diseases(
    db: Session,
    crop_type: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
) -> Tuple[List[DiseaseTreatment], int]:
    """
    List diseases with optional crop_type filter and pagination.

    Returns:
        Tuple of (disease_list, total_count)
    """
    base_query = db.query(DiseaseTreatment)

    if crop_type:
        base_query = base_query.filter(
            func.lower(DiseaseTreatment.crop_type) == crop_type.lower()
        )

    total = base_query.count()
    diseases = (
        base_query
        .order_by(DiseaseTreatment.crop_type, DiseaseTreatment.disease_name)
        .offset(offset)
        .limit(limit)
        .all()
    )
    return diseases, total


def calculate_treatment_cost(disease: DiseaseTreatment, acres: float = 1.0) -> dict:
    """
    Calculate treatment cost estimate for a given number of acres.

    Returns:
        Dict with cost breakdown
    """
    cost_per_acre = disease.cost_per_acre or 0.0
    total_cost = round(cost_per_acre * acres, 2)
    return {
        "cost_per_acre": cost_per_acre,
        "acres": acres,
        "total_estimated_cost": total_cost,
        "currency": "INR",
    }


def build_treatment_response(disease: DiseaseTreatment, acres: float = 1.0) -> dict:
    """
    Build a comprehensive treatment response dict from a disease record.
    """
    cost = calculate_treatment_cost(disease, acres)
    return {
        "id": disease.id,
        "disease_name": disease.disease_name,
        "disease_name_hindi": disease.disease_name_hindi,
        "crop_type": disease.crop_type,
        "symptoms": disease.symptoms,
        "treatment": {
            "chemical": disease.treatment_chemical,
            "organic": disease.treatment_organic,
            "dosage": disease.dosage,
        },
        "cost_estimate": cost,
        "prevention_tips": disease.prevention_tips,
        "affected_stages": disease.affected_stages,
        "image_url": disease.image_url,
    }
