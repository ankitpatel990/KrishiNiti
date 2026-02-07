"""
Government Schemes API Routes

Provides endpoints for retrieving government schemes information,
filtering by type and state, and accessing detailed scheme information.
"""

import logging
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Query, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import GovernmentScheme
from app.schemas import (
    GovernmentSchemeResponse,
    GovernmentSchemeListResponse,
)
from app.utils.helpers import serialize_json_field

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get(
    "/schemes",
    response_model=GovernmentSchemeListResponse,
    summary="Get all government schemes",
    description="Retrieve all active government schemes with optional filtering by type and state"
)
async def get_all_schemes(
    scheme_type: Optional[str] = Query(None, description="Filter by scheme type (subsidy/insurance/credit/direct_benefit/price_support/market_access/electricity)"),
    state: Optional[str] = Query(None, description="Filter by state for state-specific schemes (e.g., Gujarat)"),
    is_active: bool = Query(True, description="Filter by active status"),
    db: Session = Depends(get_db)
):
    """
    Get all government schemes with optional filters.
    
    - **scheme_type**: Filter by type (optional)
    - **state**: Filter by state for state-specific schemes (optional)
    - **is_active**: Show only active schemes (default: True)
    
    Returns list of schemes with complete details.
    """
    try:
        query = db.query(GovernmentScheme)
        
        # Apply filters
        if is_active is not None:
            query = query.filter(GovernmentScheme.is_active == (1 if is_active else 0))
        
        if scheme_type:
            query = query.filter(GovernmentScheme.scheme_type == scheme_type)
        
        if state:
            # For state filter, get both national schemes and state-specific schemes for that state
            query = query.filter(
                (GovernmentScheme.state_specific == 0) |
                (GovernmentScheme.applicable_states.like(f'%{state}%'))
            )
        
        schemes = query.order_by(GovernmentScheme.scheme_name).all()
        
        # Serialize JSON fields
        schemes_data = []
        for scheme in schemes:
            scheme_dict = {
                "id": scheme.id,
                "scheme_code": scheme.scheme_code,
                "scheme_name": scheme.scheme_name,
                "scheme_name_hindi": scheme.scheme_name_hindi,
                "scheme_type": scheme.scheme_type,
                "state_specific": bool(scheme.state_specific),
                "applicable_states": serialize_json_field(scheme.applicable_states),
                "description": scheme.description,
                "description_hindi": scheme.description_hindi,
                "benefit_amount": scheme.benefit_amount,
                "eligibility_criteria": serialize_json_field(scheme.eligibility_criteria),
                "required_documents": serialize_json_field(scheme.required_documents),
                "application_process": scheme.application_process,
                "application_url": scheme.application_url,
                "helpline_number": scheme.helpline_number,
                "deadline_type": scheme.deadline_type,
                "deadline_date": scheme.deadline_date,
                "key_features": serialize_json_field(scheme.key_features),
                "is_active": bool(scheme.is_active),
                "last_updated": scheme.last_updated,
                "created_at": scheme.created_at,
                "updated_at": scheme.updated_at,
            }
            schemes_data.append(GovernmentSchemeResponse(**scheme_dict))
        
        logger.info(
            f"Retrieved {len(schemes_data)} schemes | type={scheme_type} state={state} active={is_active}"
        )
        
        return GovernmentSchemeListResponse(
            total=len(schemes_data),
            schemes=schemes_data
        )
        
    except Exception as e:
        logger.error(f"Error retrieving schemes: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve schemes: {str(e)}"
        )


@router.get(
    "/schemes/{scheme_id}",
    response_model=GovernmentSchemeResponse,
    summary="Get scheme by ID",
    description="Retrieve detailed information about a specific government scheme"
)
async def get_scheme_by_id(
    scheme_id: int,
    db: Session = Depends(get_db)
):
    """
    Get detailed information about a specific scheme by ID.
    
    - **scheme_id**: Unique scheme identifier
    
    Returns complete scheme details including eligibility, documents, and application process.
    """
    try:
        scheme = db.query(GovernmentScheme).filter(GovernmentScheme.id == scheme_id).first()
        
        if not scheme:
            raise HTTPException(
                status_code=404,
                detail=f"Scheme with ID {scheme_id} not found"
            )
        
        # Serialize JSON fields
        scheme_dict = {
            "id": scheme.id,
            "scheme_code": scheme.scheme_code,
            "scheme_name": scheme.scheme_name,
            "scheme_name_hindi": scheme.scheme_name_hindi,
            "scheme_type": scheme.scheme_type,
            "state_specific": bool(scheme.state_specific),
            "applicable_states": serialize_json_field(scheme.applicable_states),
            "description": scheme.description,
            "description_hindi": scheme.description_hindi,
            "benefit_amount": scheme.benefit_amount,
            "eligibility_criteria": serialize_json_field(scheme.eligibility_criteria),
            "required_documents": serialize_json_field(scheme.required_documents),
            "application_process": scheme.application_process,
            "application_url": scheme.application_url,
            "helpline_number": scheme.helpline_number,
            "deadline_type": scheme.deadline_type,
            "deadline_date": scheme.deadline_date,
            "key_features": serialize_json_field(scheme.key_features),
            "is_active": bool(scheme.is_active),
            "last_updated": scheme.last_updated,
            "created_at": scheme.created_at,
            "updated_at": scheme.updated_at,
        }
        
        logger.info(f"Retrieved scheme: {scheme.scheme_name} (ID: {scheme_id})")
        
        return GovernmentSchemeResponse(**scheme_dict)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving scheme {scheme_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve scheme: {str(e)}"
        )


@router.get(
    "/schemes/code/{scheme_code}",
    response_model=GovernmentSchemeResponse,
    summary="Get scheme by code",
    description="Retrieve detailed information about a specific government scheme by its code"
)
async def get_scheme_by_code(
    scheme_code: str,
    db: Session = Depends(get_db)
):
    """
    Get detailed information about a specific scheme by code.
    
    - **scheme_code**: Unique scheme code (e.g., PM_KISAN, PMFBY, KCC)
    
    Returns complete scheme details.
    """
    try:
        scheme = db.query(GovernmentScheme).filter(
            GovernmentScheme.scheme_code == scheme_code.upper()
        ).first()
        
        if not scheme:
            raise HTTPException(
                status_code=404,
                detail=f"Scheme with code '{scheme_code}' not found"
            )
        
        # Serialize JSON fields
        scheme_dict = {
            "id": scheme.id,
            "scheme_code": scheme.scheme_code,
            "scheme_name": scheme.scheme_name,
            "scheme_name_hindi": scheme.scheme_name_hindi,
            "scheme_type": scheme.scheme_type,
            "state_specific": bool(scheme.state_specific),
            "applicable_states": serialize_json_field(scheme.applicable_states),
            "description": scheme.description,
            "description_hindi": scheme.description_hindi,
            "benefit_amount": scheme.benefit_amount,
            "eligibility_criteria": serialize_json_field(scheme.eligibility_criteria),
            "required_documents": serialize_json_field(scheme.required_documents),
            "application_process": scheme.application_process,
            "application_url": scheme.application_url,
            "helpline_number": scheme.helpline_number,
            "deadline_type": scheme.deadline_type,
            "deadline_date": scheme.deadline_date,
            "key_features": serialize_json_field(scheme.key_features),
            "is_active": bool(scheme.is_active),
            "last_updated": scheme.last_updated,
            "created_at": scheme.created_at,
            "updated_at": scheme.updated_at,
        }
        
        logger.info(f"Retrieved scheme by code: {scheme.scheme_name} ({scheme_code})")
        
        return GovernmentSchemeResponse(**scheme_dict)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving scheme by code {scheme_code}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve scheme: {str(e)}"
        )


@router.get(
    "/schemes/types/list",
    response_model=dict,
    summary="Get all scheme types",
    description="Retrieve list of all available scheme types"
)
async def get_scheme_types(db: Session = Depends(get_db)):
    """
    Get list of all available scheme types.
    
    Returns unique scheme types available in the database.
    """
    try:
        types = db.query(GovernmentScheme.scheme_type).distinct().all()
        scheme_types = [t[0] for t in types if t[0]]
        
        logger.info(f"Retrieved {len(scheme_types)} scheme types")
        
        return {
            "total": len(scheme_types),
            "types": sorted(scheme_types)
        }
        
    except Exception as e:
        logger.error(f"Error retrieving scheme types: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve scheme types: {str(e)}"
        )
