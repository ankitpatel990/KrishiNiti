"""
Authentication API Routes

Provides endpoints for user signup, login with OTP (dummy implementation),
and location master data for dropdowns.
"""

import logging
import secrets
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.database import get_db
from app.models import User
from app.schemas import (
    UserSignupRequest,
    UserLoginRequest,
    OTPRequestSchema,
    UserResponse,
    AuthResponse,
    LocationDataResponse,
    UpdateProfileRequest,
)
import json

logger = logging.getLogger(__name__)

router = APIRouter()


# ---------------------------------------------------------------------------
# Location Master Data
# ---------------------------------------------------------------------------
# Hardcoded location hierarchy for the project scope.
# This can be moved to a database table or JSON file if needed.

LOCATION_DATA = {
    "states": ["Gujarat"],
    "districts": {
        "Gujarat": ["Rajkot", "Ahmedabad", "Surat", "Vadodara", "Bhavnagar"]
    },
    "talukas": {
        "Rajkot": ["Gondal", "Jetpur", "Dhoraji", "Upleta", "Jasdan", "Kotda Sangani"],
        "Ahmedabad": ["Daskroi", "Sanand", "Dholka", "Viramgam", "Mandal"],
        "Surat": ["Chorasi", "Kamrej", "Palsana", "Olpad", "Bardoli"],
        "Vadodara": ["Padra", "Karjan", "Dabhoi", "Savli", "Waghodia"],
        "Bhavnagar": ["Ghogha", "Sihor", "Palitana", "Talaja", "Mahuva"]
    }
}


def generate_dummy_token(user_id: int) -> str:
    """Generate a dummy token for authentication (not secure, for demo only)."""
    random_part = secrets.token_hex(16)
    return f"dummy_token_{user_id}_{random_part}"


def parse_crops(crops_str: str) -> list:
    """Parse crops JSON string to list."""
    if not crops_str:
        return []
    try:
        return json.loads(crops_str)
    except (json.JSONDecodeError, TypeError):
        return []


def user_to_response(user: User) -> UserResponse:
    """Convert User model to UserResponse schema."""
    return UserResponse(
        id=user.id,
        mobile_number=user.mobile_number,
        name=user.name,
        state=user.state,
        district=user.district,
        taluka=user.taluka,
        crops=parse_crops(user.crops),
        is_active=bool(user.is_active),
        created_at=user.created_at
    )


# ---------------------------------------------------------------------------
# Location Data Endpoint
# ---------------------------------------------------------------------------

@router.get(
    "/auth/locations",
    response_model=LocationDataResponse,
    summary="Get location master data",
    description="Retrieve states, districts, and talukas for signup dropdowns"
)
async def get_location_data():
    """
    Get location master data for populating signup form dropdowns.
    
    Returns:
        - List of states
        - Districts mapped by state
        - Talukas mapped by district
    """
    logger.info("Location data requested")
    return LocationDataResponse(
        states=LOCATION_DATA["states"],
        districts=LOCATION_DATA["districts"],
        talukas=LOCATION_DATA["talukas"]
    )


# ---------------------------------------------------------------------------
# Signup Endpoint
# ---------------------------------------------------------------------------

@router.post(
    "/auth/signup",
    response_model=AuthResponse,
    summary="User signup",
    description="Register a new user with mobile number and profile details"
)
async def signup(
    request: UserSignupRequest,
    db: Session = Depends(get_db)
):
    """
    Register a new user.
    
    - **mobile_number**: Unique 10-15 digit mobile number
    - **name**: User's full name
    - **state**: State from dropdown
    - **district**: District from dropdown
    - **taluka**: Taluka from dropdown
    
    Returns user data and authentication token on success.
    """
    try:
        # Validate location data
        if request.state not in LOCATION_DATA["states"]:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid state: {request.state}. Available states: {LOCATION_DATA['states']}"
            )
        
        if request.district not in LOCATION_DATA["districts"].get(request.state, []):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid district: {request.district} for state {request.state}"
            )
        
        if request.taluka not in LOCATION_DATA["talukas"].get(request.district, []):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid taluka: {request.taluka} for district {request.district}"
            )
        
        # Check if mobile number already exists
        existing_user = db.query(User).filter(
            User.mobile_number == request.mobile_number
        ).first()
        
        if existing_user:
            raise HTTPException(
                status_code=400,
                detail="Mobile number already registered. Please login instead."
            )
        
        # Create new user
        new_user = User(
            mobile_number=request.mobile_number,
            name=request.name.strip(),
            state=request.state,
            district=request.district,
            taluka=request.taluka,
            is_active=1
        )
        
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        logger.info(f"New user registered: {new_user.mobile_number} ({new_user.name})")
        
        token = generate_dummy_token(new_user.id)
        
        return AuthResponse(
            success=True,
            message="Signup successful",
            user=user_to_response(new_user),
            token=token
        )
        
    except HTTPException:
        raise
    except IntegrityError as e:
        db.rollback()
        logger.error(f"Integrity error during signup: {str(e)}")
        raise HTTPException(
            status_code=400,
            detail="Mobile number already registered"
        )
    except Exception as e:
        db.rollback()
        logger.error(f"Error during signup: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Signup failed: {str(e)}"
        )


# ---------------------------------------------------------------------------
# OTP Request Endpoint (Dummy)
# ---------------------------------------------------------------------------

@router.post(
    "/auth/request-otp",
    response_model=dict,
    summary="Request OTP",
    description="Request OTP for login (dummy implementation - always succeeds)"
)
async def request_otp(
    request: OTPRequestSchema,
    db: Session = Depends(get_db)
):
    """
    Request OTP for login.
    
    This is a dummy implementation that always succeeds.
    In production, this would send an actual OTP via SMS.
    
    - **mobile_number**: Registered mobile number
    
    Returns success message.
    """
    try:
        # Check if user exists
        user = db.query(User).filter(
            User.mobile_number == request.mobile_number
        ).first()
        
        if not user:
            raise HTTPException(
                status_code=404,
                detail="Mobile number not registered. Please signup first."
            )
        
        if not user.is_active:
            raise HTTPException(
                status_code=403,
                detail="Account is deactivated. Please contact support."
            )
        
        # Dummy OTP - in production, generate and send actual OTP
        logger.info(f"OTP requested for: {request.mobile_number} (dummy - any 4-6 digit OTP will work)")
        
        return {
            "success": True,
            "message": "OTP sent successfully (dummy: use any 4-6 digit code)",
            "mobile_number": request.mobile_number
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error requesting OTP: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to request OTP: {str(e)}"
        )


# ---------------------------------------------------------------------------
# Login Endpoint
# ---------------------------------------------------------------------------

@router.post(
    "/auth/login",
    response_model=AuthResponse,
    summary="User login",
    description="Login with mobile number and OTP (dummy OTP - any 4-6 digit code works)"
)
async def login(
    request: UserLoginRequest,
    db: Session = Depends(get_db)
):
    """
    Login with mobile number and OTP.
    
    This is a dummy implementation where any 4-6 digit OTP will work.
    In production, this would validate against an actual OTP.
    
    - **mobile_number**: Registered mobile number
    - **otp**: 4-6 digit OTP code (any code works in dummy mode)
    
    Returns user data and authentication token on success.
    """
    try:
        # Find user by mobile number
        user = db.query(User).filter(
            User.mobile_number == request.mobile_number
        ).first()
        
        if not user:
            raise HTTPException(
                status_code=404,
                detail="Mobile number not registered. Please signup first."
            )
        
        if not user.is_active:
            raise HTTPException(
                status_code=403,
                detail="Account is deactivated. Please contact support."
            )
        
        # Dummy OTP validation - accept any 4-6 digit code
        # In production, validate against stored OTP with expiry
        if not request.otp.isdigit() or len(request.otp) < 4 or len(request.otp) > 6:
            raise HTTPException(
                status_code=400,
                detail="Invalid OTP format. OTP must be 4-6 digits."
            )
        
        logger.info(f"User logged in: {user.mobile_number} ({user.name})")
        
        token = generate_dummy_token(user.id)
        
        return AuthResponse(
            success=True,
            message="Login successful",
            user=user_to_response(user),
            token=token
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during login: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Login failed: {str(e)}"
        )


# ---------------------------------------------------------------------------
# Get Current User Endpoint
# ---------------------------------------------------------------------------

@router.get(
    "/auth/me",
    response_model=UserResponse,
    summary="Get current user",
    description="Get current user details by mobile number (for demo purposes)"
)
async def get_current_user(
    mobile_number: str,
    db: Session = Depends(get_db)
):
    """
    Get current user details.
    
    In production, this would use the JWT token to identify the user.
    For demo purposes, accepts mobile number as query parameter.
    
    - **mobile_number**: User's mobile number
    
    Returns user profile data.
    """
    try:
        user = db.query(User).filter(
            User.mobile_number == mobile_number
        ).first()
        
        if not user:
            raise HTTPException(
                status_code=404,
                detail="User not found"
            )
        
        return user_to_response(user)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching user: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch user: {str(e)}"
        )


# ---------------------------------------------------------------------------
# Update Profile Endpoint
# ---------------------------------------------------------------------------

@router.put(
    "/auth/profile",
    response_model=UserResponse,
    summary="Update user profile",
    description="Update user profile including crops selection (max 2 crops)"
)
async def update_profile(
    mobile_number: str,
    request: UpdateProfileRequest,
    db: Session = Depends(get_db)
):
    """
    Update user profile.
    
    In production, this would use the JWT token to identify the user.
    For demo purposes, accepts mobile number as query parameter.
    
    - **mobile_number**: User's mobile number (query param)
    - **name**: Optional new name
    - **crops**: Optional list of crops (max 2)
    
    Returns updated user profile data.
    """
    try:
        user = db.query(User).filter(
            User.mobile_number == mobile_number
        ).first()
        
        if not user:
            raise HTTPException(
                status_code=404,
                detail="User not found"
            )
        
        # Update name if provided
        if request.name is not None:
            user.name = request.name.strip()
        
        # Update crops if provided
        if request.crops is not None:
            if len(request.crops) > 2:
                raise HTTPException(
                    status_code=400,
                    detail="Maximum 2 crops allowed"
                )
            user.crops = json.dumps(request.crops)
        
        db.commit()
        db.refresh(user)
        
        logger.info(f"Profile updated for: {user.mobile_number} ({user.name})")
        
        return user_to_response(user)
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating profile: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update profile: {str(e)}"
        )
