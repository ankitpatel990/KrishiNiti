"""
Voice Assistant Service - Groq-Powered Conversational AI

Orchestrates data fetching and LLM response generation for voice
assistant queries. Determines what backend data is needed based on
the user's message, fetches it from existing services, then sends
the context to Groq for a natural-language response.
"""

import json
import logging
from typing import Any, Dict, List, Optional

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.1-8b-instant"
GROQ_TIMEOUT_SECONDS = 25.0
GROQ_MAX_TOKENS = 512

# Default location when user has not set one
DEFAULT_LOCATION = {
    "state": "Gujarat",
    "district": "Rajkot",
    "taluka": "Jetpur",
}


def _build_system_prompt(language: str = "en") -> str:
    """Build the system prompt for the voice assistant."""
    lang_instruction = (
        "Respond in Hindi (Devanagari script). Use simple, farmer-friendly Hindi."
        if language == "hi"
        else "Respond in simple, clear English."
    )

    return (
        "You are FarmHelp Voice Assistant, an AI farming advisor for Indian farmers. "
        "You answer questions about weather forecasts, crop prices (APMC/mandi), "
        "crop diseases, and farming advice. "
        f"{lang_instruction} "
        "Keep responses concise (2-4 sentences) since they will be spoken aloud. "
        "Always include specific numbers (temperatures, prices, dates) when available in the data. "
        "If weather data is provided, refer to specific days and temperatures. "
        "If asked about tomorrow, focus on tomorrow's data specifically. "
        "Do NOT use markdown formatting, bullet points, or special characters. "
        "Speak naturally as if talking to a farmer."
    )


def _build_weather_context(forecast_data: Dict[str, Any], time_ref: Optional[str] = None) -> str:
    """Build weather context string from forecast data."""
    daily = forecast_data.get("forecast", {}).get("daily", {})
    if not daily:
        return "No weather data available."

    times = daily.get("time", [])
    temp_max = daily.get("temperature_2m_max", [])
    temp_min = daily.get("temperature_2m_min", [])
    precip = daily.get("precipitation_sum", [])
    humidity = daily.get("relative_humidity_2m_max", [])
    wind = daily.get("windspeed_10m_max", [])

    location = forecast_data.get("location", {})
    loc_str = f"{location.get('taluka', '')}, {location.get('district', '')}"

    lines = [f"Location: {loc_str}"]

    if time_ref == "tomorrow" and len(times) >= 2:
        lines.append(f"Tomorrow ({times[1]}):")
        lines.append(f"  Temperature: {temp_min[1]}C to {temp_max[1]}C")
        if precip:
            lines.append(f"  Rainfall: {precip[1]}mm")
        if humidity:
            lines.append(f"  Humidity: {humidity[1]}%")
        if wind:
            lines.append(f"  Wind: {wind[1]} km/h")
    elif time_ref == "today" and len(times) >= 1:
        lines.append(f"Today ({times[0]}):")
        lines.append(f"  Temperature: {temp_min[0]}C to {temp_max[0]}C")
        if precip:
            lines.append(f"  Rainfall: {precip[0]}mm")
        if humidity:
            lines.append(f"  Humidity: {humidity[0]}%")
        if wind:
            lines.append(f"  Wind: {wind[0]} km/h")
    else:
        # Full 7-day summary
        for i, date in enumerate(times[:7]):
            rain_str = f", Rain: {precip[i]}mm" if precip and i < len(precip) else ""
            lines.append(
                f"  {date}: {temp_min[i]}C - {temp_max[i]}C{rain_str}"
            )

    return "\n".join(lines)


def _build_mandi_context(prices_data: Dict[str, Any]) -> str:
    """Build mandi/APMC price context string from API response."""
    records = prices_data.get("records", [])
    if not records:
        return "No price data available."

    lines = ["APMC Price Data:"]
    for record in records[:10]:
        lines.append(
            f"  {record.get('commodity', 'N/A')} at {record.get('market', 'N/A')}, "
            f"{record.get('district', '')}: "
            f"Min Rs {record.get('min_price', 'N/A')}, "
            f"Max Rs {record.get('max_price', 'N/A')}, "
            f"Modal Rs {record.get('modal_price', 'N/A')}/qtl"
        )

    return "\n".join(lines)


def _detect_intent(message: str) -> str:
    """Simple intent detection from message text."""
    lower = message.lower()

    weather_keywords = [
        "weather", "forecast", "temperature", "rain", "humidity", "wind",
        "tomorrow", "today", "next week", "this week",
        "मौसम", "बारिश", "तापमान", "कल", "आज",
    ]
    mandi_keywords = [
        "price", "mandi", "apmc", "market", "cost", "rate", "sell",
        "भाव", "मंडी", "दाम", "कीमत", "बेच",
    ]
    disease_keywords = [
        "disease", "treatment", "cure", "blight", "rust", "rot",
        "रोग", "बीमारी", "इलाज",
    ]

    if any(kw in lower for kw in weather_keywords):
        return "weather"
    if any(kw in lower for kw in mandi_keywords):
        return "mandi"
    if any(kw in lower for kw in disease_keywords):
        return "disease"

    return "general"


# Commodity names the system can extract from voice queries
_COMMODITY_NAMES = [
    "wheat", "paddy", "rice", "cotton", "sugarcane", "tomato", "potato",
    "onion", "chilli", "maize", "corn", "pulses", "oilseeds", "millets",
    "groundnut", "cumin", "soybean", "mustard", "bajra", "jowar", "ragi",
    "barley", "gram", "tur", "moong", "urad", "masoor", "arhar",
]

_COMMODITY_HI_MAP = {
    "गेहूं": "Wheat",
    "धान": "Paddy",
    "चावल": "Paddy",
    "कपास": "Cotton",
    "गन्ना": "Sugarcane",
    "टमाटर": "Tomato",
    "आलू": "Potato",
    "प्याज": "Onion",
    "मिर्च": "Chilli",
    "मक्का": "Maize",
    "दालें": "Pulses",
    "दाल": "Pulses",
    "तिलहन": "Oilseeds",
    "बाजरा": "Millets",
    "ज्वार": "Millets",
    "मूंगफली": "Groundnut",
    "जीरा": "Cumin",
    "सोयाबीन": "Soybean",
    "सरसों": "Mustard",
}


def _extract_commodity(message: str) -> Optional[str]:
    """Extract a commodity/crop name from the user message."""
    lower = message.lower()

    for name in _COMMODITY_NAMES:
        if name in lower:
            return name.capitalize()

    for hindi, english in _COMMODITY_HI_MAP.items():
        if hindi in message:
            return english

    return None


def _detect_time_ref(message: str) -> Optional[str]:
    """Detect time reference in message."""
    lower = message.lower()
    if "tomorrow" in lower or "कल" in lower:
        return "tomorrow"
    if "today" in lower or "आज" in lower:
        return "today"
    if "next week" in lower or "अगले हफ्ते" in lower:
        return "next week"
    if "this week" in lower or "इस हफ्ते" in lower:
        return "this week"
    return None


async def _fetch_weather(location: Dict[str, str], db) -> Optional[Dict]:
    """Fetch weather forecast from internal service."""
    try:
        from app.services.weather_service import get_forecast
        result = await get_forecast(
            db,
            location.get("state", DEFAULT_LOCATION["state"]),
            location.get("district", DEFAULT_LOCATION["district"]),
            location.get("taluka", DEFAULT_LOCATION["taluka"]),
        )
        return result
    except Exception as exc:
        logger.warning("Failed to fetch weather for voice: %s", exc)
        return None


async def _fetch_apmc_prices(commodity: Optional[str] = None) -> Optional[Dict]:
    """Fetch APMC prices from the data.gov.in API."""
    try:
        from app.services.apmc_service import fetch_from_data_gov
        records = await fetch_from_data_gov(commodity=commodity, limit=10)
        if records:
            return {"records": records}
        return None
    except Exception as exc:
        logger.warning("Failed to fetch APMC prices for voice: %s", exc)
        return None


async def _call_groq(system_prompt: str, user_prompt: str) -> Optional[str]:
    """Call Groq LLM API and return the text response."""
    api_key = settings.GROQ_API_KEY
    if not api_key:
        logger.warning("GROQ_API_KEY not configured; cannot generate response")
        return None

    payload = {
        "model": GROQ_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.4,
        "max_tokens": GROQ_MAX_TOKENS,
    }

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=GROQ_TIMEOUT_SECONDS) as client:
            response = await client.post(
                GROQ_API_URL, json=payload, headers=headers
            )
            response.raise_for_status()
            data = response.json()

        content = data["choices"][0]["message"]["content"]
        logger.info(
            "Voice LLM response generated (model=%s, tokens=%s)",
            GROQ_MODEL,
            data.get("usage", {}).get("total_tokens", "N/A"),
        )
        return content.strip()

    except httpx.TimeoutException:
        logger.error("Groq API timed out for voice query")
    except httpx.HTTPStatusError as exc:
        logger.error(
            "Groq API HTTP error %d: %s",
            exc.response.status_code,
            exc.response.text[:300],
        )
    except (KeyError, IndexError) as exc:
        logger.error("Failed to parse Groq voice response: %s", exc)
    except Exception as exc:
        logger.error("Unexpected error in voice LLM call: %s", exc)

    return None


async def process_voice_query(
    message: str,
    language: str = "en",
    location: Optional[Dict[str, str]] = None,
    db=None,
) -> Dict[str, Any]:
    """
    Process a voice assistant query end-to-end.

    1. Detect intent from the message
    2. Fetch relevant backend data (weather, prices, etc.)
    3. Send data + message to Groq for natural language response
    4. Return the response with optional navigation suggestion

    Args:
        message:  User's voice transcript or typed message.
        language: 'en' or 'hi'.
        location: Optional user location {state, district, taluka}.
        db:       SQLAlchemy session for weather queries.

    Returns:
        Dict with keys: response, intent, navigate_to, data.
    """
    if not message or not message.strip():
        fallback = (
            "कृपया अपना प्रश्न दोहराएं।"
            if language == "hi"
            else "Could you please repeat your question?"
        )
        return {
            "response": fallback,
            "intent": "unknown",
            "navigate_to": None,
            "data": None,
        }

    loc = location if location and location.get("taluka") else DEFAULT_LOCATION
    intent = _detect_intent(message)
    time_ref = _detect_time_ref(message)
    commodity = _extract_commodity(message)
    context_parts = [f"User message: {message}"]
    navigate_to = None
    fetched_data = None

    # ----- Fetch relevant data based on intent -----

    if intent == "weather" and db is not None:
        forecast = await _fetch_weather(loc, db)
        if forecast:
            weather_ctx = _build_weather_context(forecast, time_ref)
            context_parts.append(f"\n{weather_ctx}")
            navigate_to = "/weather"
            fetched_data = {
                "type": "weather",
                "location": forecast.get("location"),
            }
        else:
            context_parts.append(
                "\nWeather data is currently unavailable. "
                "Apologize and suggest the user check the weather page."
            )
            navigate_to = "/weather"

    elif intent == "mandi":
        # Fetch prices, optionally filtered by commodity
        prices = await _fetch_mandi_prices(commodity=commodity)
        if prices:
            mandi_ctx = _build_mandi_context(prices)
            context_parts.append(f"\n{mandi_ctx}")
            if commodity:
                context_parts.append(f"\nUser is specifically asking about: {commodity}")
            navigate_to = "/apmc"
            fetched_data = {
                "type": "mandi",
                "commodity": commodity,
            }
        else:
            context_parts.append(
                "\nMandi price data is currently unavailable. "
                "Suggest the user check the APMC prices page."
            )
            navigate_to = "/apmc"
            fetched_data = {
                "type": "mandi",
                "commodity": commodity,
            }

    elif intent == "disease":
        context_parts.append(
            "\nFor disease detection, the user should upload a photo of the "
            "affected crop on the Disease Detection page. Guide them there."
        )
        navigate_to = "/disease"
        fetched_data = {"type": "disease"}

    else:
        # General farming question - no specific data fetch needed
        context_parts.append(
            "\nNo specific data was fetched. Answer the farming question "
            "based on your general knowledge if possible, or guide the user "
            "to the appropriate feature."
        )

    # ----- Generate response via Groq -----

    system_prompt = _build_system_prompt(language)
    user_prompt = "\n".join(context_parts)

    llm_response = await _call_groq(system_prompt, user_prompt)

    if llm_response:
        return {
            "response": llm_response,
            "intent": intent,
            "navigate_to": navigate_to,
            "data": fetched_data,
        }

    # Fallback if Groq fails
    fallback_responses = {
        "weather": {
            "en": f"I could not fetch the weather details right now. Please check the weather page for {loc.get('taluka', 'your area')}.",
            "hi": f"अभी मौसम की जानकारी नहीं मिल पाई। कृपया {loc.get('taluka', 'अपने क्षेत्र')} का मौसम पेज देखें।",
        },
        "mandi": {
            "en": "I could not fetch the APMC prices right now. Please check the APMC prices page.",
            "hi": "अभी APMC भाव नहीं मिल पाए। कृपया APMC भाव पेज देखें।",
        },
        "disease": {
            "en": "For disease detection, please go to the Disease Detection page and upload a photo of the affected crop.",
            "hi": "रोग पहचान के लिए कृपया रोग पहचान पेज पर जाकर प्रभावित फसल की फोटो अपलोड करें।",
        },
        "general": {
            "en": "I am your farming assistant. You can ask me about weather, crop prices, or diseases. How can I help?",
            "hi": "मैं आपका कृषि सहायक हूँ। आप मौसम, फसल भाव या रोगों के बारे में पूछ सकते हैं।",
        },
    }

    fb = fallback_responses.get(intent, fallback_responses["general"])
    return {
        "response": fb.get(language, fb["en"]),
        "intent": intent,
        "navigate_to": navigate_to,
        "data": fetched_data,
    }
