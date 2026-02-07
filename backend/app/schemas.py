"""
Pydantic Schemas for Request/Response Validation

This module contains all Pydantic models for request validation,
response serialization, and data transfer objects (DTOs).
All schemas include proper validation rules and field constraints.
"""

from pydantic import BaseModel, Field, validator, HttpUrl
from typing import Optional, List
from datetime import datetime
from enum import Enum


# Enums
class CropType(str, Enum):
    """Supported crop types"""
    PADDY = "Paddy"
    WHEAT = "Wheat"
    COTTON = "Cotton"
    SUGARCANE = "Sugarcane"
    TOMATO = "Tomato"
    POTATO = "Potato"
    ONION = "Onion"
    CHILLI = "Chilli"
    MAIZE = "Maize"
    PULSES = "Pulses"
    OILSEEDS = "Oilseeds"
    MILLETS = "Millets"


# Disease Treatment Schemas
class DiseaseTreatmentBase(BaseModel):
    """Base schema for disease treatment"""
    disease_name: str = Field(..., min_length=1, max_length=200, description="Disease name in English")
    disease_name_hindi: Optional[str] = Field(None, max_length=200, description="Disease name in Hindi")
    crop_type: str = Field(..., min_length=1, max_length=100, description="Type of crop affected")
    symptoms: str = Field(..., min_length=10, description="Symptoms of the disease")
    treatment_chemical: Optional[str] = Field(None, description="Chemical treatment recommendations")
    treatment_organic: Optional[str] = Field(None, description="Organic treatment recommendations")
    dosage: Optional[str] = Field(None, max_length=500, description="Recommended dosage")
    cost_per_acre: Optional[float] = Field(None, ge=0, description="Estimated cost per acre in INR")
    image_url: Optional[str] = Field(None, max_length=500, description="URL to disease image")
    prevention_tips: Optional[str] = Field(None, description="Tips to prevent the disease")
    affected_stages: Optional[str] = Field(None, max_length=200, description="Crop stages affected (e.g., 'Sowing, Flowering')")
    
    @validator('disease_name')
    def validate_disease_name(cls, v):
        """Validate disease name is not empty after stripping"""
        if not v.strip():
            raise ValueError('Disease name cannot be empty')
        return v.strip()
    
    @validator('crop_type')
    def validate_crop_type(cls, v):
        """Validate crop type is not empty after stripping"""
        if not v.strip():
            raise ValueError('Crop type cannot be empty')
        return v.strip().title()


class DiseaseTreatmentCreate(DiseaseTreatmentBase):
    """Schema for creating disease treatment"""
    pass


class DiseaseTreatmentResponse(DiseaseTreatmentBase):
    """Schema for disease treatment response"""
    id: int = Field(..., description="Unique disease treatment ID")
    created_at: datetime = Field(..., description="Record creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Record last update timestamp")

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": 1,
                "disease_name": "Paddy Blast",
                "disease_name_hindi": "धान का ब्लास्ट",
                "crop_type": "Paddy",
                "symptoms": "Spindle-shaped lesions on leaves, brown spots",
                "treatment_chemical": "Tricyclazole 75% WP @ 0.6g/l",
                "treatment_organic": "Neem oil spray, proper drainage",
                "dosage": "0.6g per liter of water",
                "cost_per_acre": 500.0,
                "image_url": "https://example.com/paddy-blast.jpg",
                "prevention_tips": "Use resistant varieties, avoid excess nitrogen",
                "affected_stages": "Tillering, Flowering",
                "created_at": "2024-01-01T00:00:00Z",
                "updated_at": "2024-01-01T00:00:00Z"
            }
        }


class DiseaseTreatmentListResponse(BaseModel):
    """Schema for list of disease treatments"""
    total: int = Field(..., description="Total number of diseases")
    diseases: List[DiseaseTreatmentResponse] = Field(..., description="List of disease treatments")
    
    class Config:
        json_schema_extra = {
            "example": {
                "total": 30,
                "diseases": []
            }
        }


class DiseaseSearchRequest(BaseModel):
    """Schema for disease search request"""
    query: str = Field(..., min_length=1, max_length=200, description="Search query (disease name in English or Hindi)")
    crop_type: Optional[str] = Field(None, max_length=100, description="Filter by crop type")
    
    class Config:
        json_schema_extra = {
            "example": {
                "query": "blast",
                "crop_type": "Paddy"
            }
        }


# Weather Schemas
class WeatherForecastRequest(BaseModel):
    """Schema for weather forecast request"""
    state: str = Field(..., min_length=1, max_length=100, description="Indian state name")
    district: str = Field(..., min_length=1, max_length=100, description="District name")
    taluka: str = Field(..., min_length=1, max_length=100, description="Taluka name")

    class Config:
        json_schema_extra = {
            "example": {
                "state": "Gujarat",
                "district": "Rajkot",
                "taluka": "Jetpur"
            }
        }


class WeatherForecastResponse(BaseModel):
    """Schema for weather forecast response"""
    taluka: str = Field(..., description="Requested taluka")
    district: str = Field(..., description="District name")
    state: str = Field(..., description="State name")
    latitude: float = Field(..., ge=-90, le=90, description="Latitude coordinate")
    longitude: float = Field(..., ge=-180, le=180, description="Longitude coordinate")
    forecast: dict = Field(..., description="7-day weather forecast data")
    cached: bool = Field(False, description="Whether data was served from cache")
    cached_at: Optional[datetime] = Field(None, description="When data was cached")

    class Config:
        json_schema_extra = {
            "example": {
                "taluka": "Jetpur",
                "district": "Rajkot",
                "state": "Gujarat",
                "latitude": 21.7553,
                "longitude": 70.6203,
                "forecast": {
                    "daily": {
                        "temperature_2m_max": [25, 26, 27],
                        "temperature_2m_min": [15, 16, 17],
                        "precipitation_sum": [0, 5, 10]
                    }
                },
                "cached": False,
                "cached_at": None
            }
        }


class WeatherAlertRequest(BaseModel):
    """Schema for weather alert request"""
    state: str = Field(..., min_length=1, max_length=100, description="Indian state name")
    district: str = Field(..., min_length=1, max_length=100, description="District name")
    taluka: str = Field(..., min_length=1, max_length=100, description="Taluka name")
    crop_type: Optional[str] = Field(None, max_length=100, description="Crop type for crop-specific alerts")


class WeatherAlertResponse(BaseModel):
    """Schema for weather alert response"""
    taluka: str
    district: str
    state: str
    alerts: List[dict] = Field(default_factory=list, description="List of weather alerts")
    severity: str = Field(..., description="Highest alert severity (info, warning, danger)")

    class Config:
        json_schema_extra = {
            "example": {
                "taluka": "Jetpur",
                "district": "Rajkot",
                "state": "Gujarat",
                "alerts": [
                    {
                        "type": "dry_spell",
                        "message": "No rain expected for next 7 days",
                        "severity": "warning",
                        "recommendation": "Consider irrigation"
                    }
                ],
                "severity": "warning"
            }
        }


class CropWeatherAnalysisRequest(BaseModel):
    """Schema for crop weather analysis request (POST /api/weather/analyze)"""
    state: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Indian state name",
    )
    district: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="District name",
    )
    taluka: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Taluka name",
    )
    crop_type: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Crop type for weather analysis",
    )

    class Config:
        json_schema_extra = {
            "example": {
                "state": "Gujarat",
                "district": "Rajkot",
                "taluka": "Jetpur",
                "crop_type": "Paddy"
            }
        }


# Mandi Price Schemas
class MandiPriceBase(BaseModel):
    """Base schema for mandi price"""
    commodity: str = Field(..., min_length=1, max_length=100, description="Commodity name (e.g., Wheat, Rice)")
    mandi_name: str = Field(..., min_length=1, max_length=200, description="Name of the mandi/market")
    state: str = Field(..., min_length=1, max_length=100, description="State name")
    district: str = Field(..., min_length=1, max_length=100, description="District name")
    price_per_quintal: float = Field(..., ge=0, description="Price per quintal in INR")
    arrival_date: datetime = Field(..., description="Date of price arrival")
    min_price: Optional[float] = Field(None, ge=0, description="Minimum price per quintal")
    max_price: Optional[float] = Field(None, ge=0, description="Maximum price per quintal")
    modal_price: Optional[float] = Field(None, ge=0, description="Modal (most common) price per quintal")
    
    @validator('max_price')
    def validate_max_price(cls, v, values):
        """Validate max_price >= min_price if both are provided"""
        if v is not None and 'min_price' in values and values['min_price'] is not None:
            if v < values['min_price']:
                raise ValueError('max_price must be greater than or equal to min_price')
        return v
    
    @validator('modal_price')
    def validate_modal_price(cls, v, values):
        """Validate modal_price is within min and max if provided"""
        if v is not None:
            if 'min_price' in values and values['min_price'] is not None and v < values['min_price']:
                raise ValueError('modal_price must be >= min_price')
            if 'max_price' in values and values['max_price'] is not None and v > values['max_price']:
                raise ValueError('modal_price must be <= max_price')
        return v


class MandiPriceCreate(MandiPriceBase):
    """Schema for creating mandi price"""
    pass


class MandiPriceResponse(MandiPriceBase):
    """Schema for mandi price response"""
    id: int = Field(..., description="Unique mandi price ID")
    created_at: datetime = Field(..., description="Record creation timestamp")

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": 1,
                "commodity": "Wheat",
                "mandi_name": "Azadpur Mandi",
                "state": "Delhi",
                "district": "North Delhi",
                "price_per_quintal": 2200.0,
                "arrival_date": "2024-01-01T00:00:00Z",
                "min_price": 2100.0,
                "max_price": 2300.0,
                "modal_price": 2200.0,
                "created_at": "2024-01-01T00:00:00Z"
            }
        }


class MandiPriceListResponse(BaseModel):
    """Schema for list of mandi prices"""
    total: int = Field(..., description="Total number of prices")
    prices: List[MandiPriceResponse] = Field(..., description="List of mandi prices")
    
    class Config:
        json_schema_extra = {
            "example": {
                "total": 50,
                "prices": []
            }
        }


class MandiPriceSearchRequest(BaseModel):
    """Schema for mandi price search request"""
    commodity: Optional[str] = Field(None, max_length=100, description="Filter by commodity")
    state: Optional[str] = Field(None, max_length=100, description="Filter by state")
    district: Optional[str] = Field(None, max_length=100, description="Filter by district")
    min_price: Optional[float] = Field(None, ge=0, description="Minimum price filter")
    max_price: Optional[float] = Field(None, ge=0, description="Maximum price filter")
    limit: int = Field(50, ge=1, le=100, description="Maximum number of results")
    offset: int = Field(0, ge=0, description="Number of results to skip")
    
    class Config:
        json_schema_extra = {
            "example": {
                "commodity": "Wheat",
                "state": "Punjab",
                "limit": 20,
                "offset": 0
            }
        }


class MandiPriceCompareRequest(BaseModel):
    """Schema for mandi price comparison request"""
    commodity: str = Field(..., min_length=1, max_length=100, description="Commodity to compare")
    mandi_ids: List[int] = Field(..., min_items=2, max_items=10, description="List of mandi IDs to compare")
    
    class Config:
        json_schema_extra = {
            "example": {
                "commodity": "Wheat",
                "mandi_ids": [1, 2, 3]
            }
        }


class BestMandiRequest(BaseModel):
    """Schema for best mandi recommendation request"""
    commodity: str = Field(..., min_length=1, max_length=100, description="Commodity name")
    user_latitude: Optional[float] = Field(None, ge=-90, le=90, description="User's latitude")
    user_longitude: Optional[float] = Field(None, ge=-180, le=180, description="User's longitude")
    max_distance_km: Optional[float] = Field(100, ge=1, le=1000, description="Maximum distance in kilometers")
    
    class Config:
        json_schema_extra = {
            "example": {
                "commodity": "Wheat",
                "user_latitude": 28.6139,
                "user_longitude": 77.2090,
                "max_distance_km": 50
            }
        }


# Error Response Schemas
class ErrorResponse(BaseModel):
    """Schema for error responses"""
    error: str
    detail: Optional[str] = None
    status_code: int


# Success Response Schema
class SuccessResponse(BaseModel):
    """Schema for success responses"""
    message: str
    data: Optional[dict] = None


# Government Schemes Schemas
class GovernmentSchemeBase(BaseModel):
    """Base schema for government scheme"""
    scheme_code: str = Field(..., min_length=1, max_length=50, description="Unique scheme code")
    scheme_name: str = Field(..., min_length=1, max_length=200, description="Scheme name in English")
    scheme_name_hindi: Optional[str] = Field(None, max_length=200, description="Scheme name in Hindi")
    scheme_type: str = Field(..., min_length=1, max_length=50, description="Type of scheme (subsidy/insurance/credit/direct_benefit/price_support/market_access/electricity)")
    state_specific: bool = Field(False, description="Whether scheme is state-specific")
    applicable_states: Optional[List[str]] = Field(default_factory=list, description="List of applicable states (empty for national schemes)")
    description: str = Field(..., min_length=10, description="Detailed description of the scheme")
    description_hindi: Optional[str] = Field(None, description="Description in Hindi")
    benefit_amount: Optional[str] = Field(None, max_length=200, description="Benefit amount or range")
    eligibility_criteria: Optional[dict] = Field(None, description="Eligibility criteria as JSON")
    required_documents: Optional[List[str]] = Field(default_factory=list, description="List of required documents")
    application_process: Optional[str] = Field(None, description="Application process details")
    application_url: Optional[str] = Field(None, max_length=500, description="URL for online application")
    helpline_number: Optional[str] = Field(None, max_length=50, description="Helpline contact number")
    deadline_type: Optional[str] = Field(None, max_length=20, description="Type of deadline (rolling/seasonal/fixed/event_based)")
    deadline_date: Optional[str] = Field(None, max_length=100, description="Deadline date or description")
    key_features: Optional[List[str]] = Field(default_factory=list, description="List of key features")
    is_active: bool = Field(True, description="Whether scheme is currently active")
    last_updated: Optional[str] = Field(None, max_length=20, description="Last update date")


class GovernmentSchemeResponse(GovernmentSchemeBase):
    """Schema for government scheme response"""
    id: int = Field(..., description="Unique scheme ID")
    created_at: datetime = Field(..., description="Record creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Record last update timestamp")

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": 1,
                "scheme_code": "PM_KISAN",
                "scheme_name": "PM-KISAN (Pradhan Mantri Kisan Samman Nidhi)",
                "scheme_name_hindi": "प्रधानमंत्री किसान सम्मान निधि",
                "scheme_type": "direct_benefit",
                "state_specific": False,
                "applicable_states": [],
                "description": "Direct income support scheme providing ₹6,000 per year",
                "benefit_amount": "₹6,000 per year",
                "eligibility_criteria": {"land_holding": "up to 2 hectares"},
                "required_documents": ["Aadhaar Card", "Land records"],
                "application_url": "https://pmkisan.gov.in/",
                "helpline_number": "155261",
                "deadline_type": "rolling",
                "is_active": True,
                "created_at": "2024-01-01T00:00:00Z"
            }
        }


class GovernmentSchemeListResponse(BaseModel):
    """Schema for list of government schemes"""
    total: int = Field(..., description="Total number of schemes")
    schemes: List[GovernmentSchemeResponse] = Field(..., description="List of government schemes")
    
    class Config:
        json_schema_extra = {
            "example": {
                "total": 12,
                "schemes": []
            }
        }


class SchemeFilterRequest(BaseModel):
    """Schema for scheme filter request"""
    scheme_type: Optional[str] = Field(None, max_length=50, description="Filter by scheme type")
    state: Optional[str] = Field(None, max_length=100, description="Filter by state (for state-specific schemes)")
    is_active: Optional[bool] = Field(True, description="Filter by active status")
    
    class Config:
        json_schema_extra = {
            "example": {
                "scheme_type": "subsidy",
                "state": "Gujarat",
                "is_active": True
            }
        }
