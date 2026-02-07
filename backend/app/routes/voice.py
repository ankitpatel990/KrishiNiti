"""
Voice Assistant API Routes

Endpoints:
    POST /api/voice/chat - Process a voice/text query and return AI response
"""

import logging
import time
from typing import Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.voice_assistant_service import process_voice_query

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/voice", tags=["Voice Assistant"])


# ---------------------------------------------------------------------------
# Request / Response Schemas
# ---------------------------------------------------------------------------

class VoiceChatRequest(BaseModel):
    """Request body for voice chat endpoint."""
    message: str = Field(
        ...,
        min_length=1,
        max_length=500,
        description="User's voice transcript or typed message",
    )
    language: str = Field(
        default="en",
        description="Response language: 'en' or 'hi'",
    )
    location: Optional[Dict[str, str]] = Field(
        default=None,
        description="User location: {state, district, taluka}",
    )


class VoiceChatResponse(BaseModel):
    """Response body for voice chat endpoint."""
    response: str = Field(..., description="AI-generated response text")
    intent: str = Field(..., description="Detected intent category")
    navigate_to: Optional[str] = Field(
        None, description="Suggested frontend route for navigation"
    )
    data: Optional[Dict] = Field(
        None, description="Optional structured data (type, location, etc.)"
    )
    response_time_ms: float = Field(..., description="Server processing time")


# ---------------------------------------------------------------------------
# POST /api/voice/chat
# ---------------------------------------------------------------------------

@router.post(
    "/chat",
    response_model=VoiceChatResponse,
    summary="Process voice/text query with AI",
    description=(
        "Receives a natural language message (from voice transcript or text input), "
        "fetches relevant backend data (weather, APMC prices, etc.), and uses "
        "the Groq LLM to generate a conversational response. "
        "Optionally accepts user location for location-aware answers."
    ),
    responses={
        200: {"description": "AI response generated successfully"},
        400: {"description": "Invalid request body"},
        503: {"description": "AI service temporarily unavailable"},
    },
)
async def voice_chat(
    request: VoiceChatRequest,
    db: Session = Depends(get_db),
):
    start = time.perf_counter()

    logger.info(
        "Voice chat request | lang=%s message_len=%d has_location=%s",
        request.language,
        len(request.message),
        request.location is not None,
    )

    result = await process_voice_query(
        message=request.message,
        language=request.language,
        location=request.location,
        db=db,
    )

    elapsed = round((time.perf_counter() - start) * 1000, 2)

    logger.info(
        "Voice chat response | intent=%s time=%sms",
        result.get("intent", "unknown"),
        elapsed,
    )

    return VoiceChatResponse(
        response=result["response"],
        intent=result["intent"],
        navigate_to=result.get("navigate_to"),
        data=result.get("data"),
        response_time_ms=elapsed,
    )
