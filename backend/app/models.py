"""
SQLAlchemy Database Models

This module contains all database models for the Farm Help application.
Models are defined using SQLAlchemy ORM with proper relationships,
indexes, and constraints for optimal performance.
"""

from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Index, CheckConstraint
from sqlalchemy.sql import func
from app.database import Base


class DiseaseTreatment(Base):
    """
    Disease Treatment Information Model
    """
    __tablename__ = "disease_treatments"

    id = Column(Integer, primary_key=True, index=True)
    disease_name = Column(String(200), nullable=False, index=True)
    disease_name_hindi = Column(String(200), nullable=True, index=True)
    crop_type = Column(String(100), nullable=False, index=True)
    symptoms = Column(Text, nullable=False)
    treatment_chemical = Column(Text, nullable=True)
    treatment_organic = Column(Text, nullable=True)
    dosage = Column(String(500), nullable=True)
    cost_per_acre = Column(Float, nullable=True)
    image_url = Column(String(500), nullable=True)
    prevention_tips = Column(Text, nullable=True)
    affected_stages = Column(String(200), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    __table_args__ = (
        Index('idx_disease_crop', 'disease_name', 'crop_type'),
        Index('idx_disease_hindi', 'disease_name_hindi'),
        Index('idx_crop_type', 'crop_type'),
        CheckConstraint('cost_per_acre >= 0', name='check_cost_positive'),
    )


class WeatherCache(Base):
    """
    Weather Data Cache Model
    """
    __tablename__ = "weather_cache"

    id = Column(Integer, primary_key=True, index=True)
    taluka = Column(String(100), nullable=False, index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    forecast_data = Column(Text, nullable=False)
    cached_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        Index('idx_taluka_expires', 'taluka', 'expires_at'),
        Index('idx_expires_at', 'expires_at'),
        CheckConstraint('latitude >= -90 AND latitude <= 90', name='check_latitude_range'),
        CheckConstraint('longitude >= -180 AND longitude <= 180', name='check_longitude_range'),
    )


class MandiPrice(Base):
    """
    Mandi Price Information Model
    """
    __tablename__ = "mandi_prices"

    id = Column(Integer, primary_key=True, index=True)
    commodity = Column(String(100), nullable=False, index=True)
    mandi_name = Column(String(200), nullable=False)
    state = Column(String(100), nullable=False, index=True)
    district = Column(String(100), nullable=False, index=True)
    price_per_quintal = Column(Float, nullable=False)
    arrival_date = Column(DateTime(timezone=True), nullable=False, index=True)
    min_price = Column(Float, nullable=True)
    max_price = Column(Float, nullable=True)
    modal_price = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index('idx_commodity_state', 'commodity', 'state'),
        Index('idx_commodity_date', 'commodity', 'arrival_date'),
        Index('idx_state_district', 'state', 'district'),
        Index('idx_arrival_date', 'arrival_date'),
        CheckConstraint('price_per_quintal >= 0', name='check_price_positive'),
        CheckConstraint('min_price IS NULL OR min_price >= 0', name='check_min_price_positive'),
        CheckConstraint('max_price IS NULL OR max_price >= 0', name='check_max_price_positive'),
        CheckConstraint('modal_price IS NULL OR modal_price >= 0', name='check_modal_price_positive'),
    )


class User(Base):
    """
    User Model for authentication and profile management.
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    mobile_number = Column(String(15), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    state = Column(String(100), nullable=False, index=True)
    district = Column(String(100), nullable=False, index=True)
    taluka = Column(String(100), nullable=False, index=True)
    crops = Column(String(500), nullable=True)  # JSON array of max 2 crops
    is_active = Column(Integer, default=1, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    __table_args__ = (
        Index('idx_user_location', 'state', 'district', 'taluka'),
        Index('idx_user_mobile', 'mobile_number'),
        CheckConstraint("length(mobile_number) >= 10", name='check_mobile_length'),
    )


class GovernmentScheme(Base):
    """
    Government Schemes Information Model
    """
    __tablename__ = "government_schemes"

    id = Column(Integer, primary_key=True, index=True)
    scheme_code = Column(String(50), unique=True, nullable=False, index=True)
    scheme_name = Column(String(200), nullable=False, index=True)
    scheme_name_hindi = Column(String(200), nullable=True)
    scheme_type = Column(String(50), nullable=False, index=True)
    state_specific = Column(Integer, default=0, nullable=False)
    applicable_states = Column(Text, nullable=True)
    description = Column(Text, nullable=False)
    description_hindi = Column(Text, nullable=True)
    benefit_amount = Column(String(200), nullable=True)
    eligibility_criteria = Column(Text, nullable=True)
    required_documents = Column(Text, nullable=True)
    application_process = Column(Text, nullable=True)
    application_url = Column(String(500), nullable=True)
    helpline_number = Column(String(50), nullable=True)
    deadline_type = Column(String(20), nullable=True)
    deadline_date = Column(String(100), nullable=True)
    key_features = Column(Text, nullable=True)
    is_active = Column(Integer, default=1, nullable=False)
    last_updated = Column(String(20), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    __table_args__ = (
        Index('idx_scheme_type', 'scheme_type'),
        Index('idx_state_specific', 'state_specific'),
        Index('idx_is_active', 'is_active'),
        Index('idx_scheme_type_active', 'scheme_type', 'is_active'),
    )
