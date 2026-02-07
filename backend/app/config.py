"""
Application Configuration using Pydantic Settings
"""

from pathlib import Path
from pydantic_settings import BaseSettings
from typing import List, Optional
import os

# Resolve .env relative to this file so it works regardless of CWD
_ENV_FILE = Path(__file__).resolve().parent.parent / ".env"


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables
    """
    # Application
    APP_NAME: str = "Farm Help API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"

    # Database
    DATABASE_URL: str = "sqlite:///./farmhelp.db"
    
    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:5173"]

    # API Keys
    OPEN_METEO_API_URL: str = "https://api.open-meteo.com/v1/forecast"
    DATA_GOV_IN_API_URL: str = "https://api.data.gov.in/resource"
    DATA_GOV_IN_API_KEY: str = ""
    GROQ_API_KEY: str = ""

    # Cache Settings
    WEATHER_CACHE_HOURS: int = 6
    APMC_CACHE_HOURS: int = 24

    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 60

    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FILE: str = "logs/app.log"

    # Static files (production: path to frontend dist for SPA + assets)
    STATIC_DIR: Optional[str] = None

    class Config:
        env_file = str(_ENV_FILE) if _ENV_FILE.exists() else ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


settings = Settings()
