"""
LLM Advisory Service - Groq API Integration

Generates contextual, expert-quality farming advice by sending
structured weather data, crop profiles, and location context
to the Groq LLM API (llama-3.1-8b-instant).
"""

import json
import logging
from typing import Any, Dict, List, Optional

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.1-8b-instant"
GROQ_TIMEOUT_SECONDS = 30.0
GROQ_MAX_TOKENS = 1024


def _build_system_prompt() -> str:
    return (
        "You are an expert agricultural advisor for Gujarat, India. "
        "You provide precise, actionable farming recommendations based on "
        "real weather forecast data and crop science. Your advice must be "
        "specific to the Saurashtra and South Gujarat region. "
        "Always be practical and consider the local farmer's context. "
        "Respond in structured JSON format only."
    )


def _build_user_prompt(
    location: Dict[str, Any],
    forecast_summary: Dict[str, Any],
    crop_type: str,
    crop_profile: Dict[str, Any],
    alerts: List[Dict],
    soil_data: Optional[Dict] = None,
    historical_comparison: Optional[Dict] = None,
) -> str:
    current_month = forecast_summary.get("period_start", "")[:7]

    prompt_parts = [
        f"Location: {location.get('taluka', '')}, {location.get('district', '')}, Gujarat",
        f"Soil Type: {location.get('soil_type', 'unknown')}",
        f"Crop: {crop_type}",
        f"Season: {crop_profile.get('growth_season', 'Unknown')}",
        f"Gujarat Varieties: {', '.join(crop_profile.get('gujarat_varieties', []))}",
        "",
        "=== 7-Day Weather Forecast Summary ===",
        f"Period: {forecast_summary.get('period_start', 'N/A')} to {forecast_summary.get('period_end', 'N/A')}",
        f"Temperature: Avg Max {forecast_summary['temperature']['avg_max']}C, "
        f"Avg Min {forecast_summary['temperature']['avg_min']}C, "
        f"Peak {forecast_summary['temperature']['peak_max']}C, "
        f"Lowest {forecast_summary['temperature']['lowest_min']}C",
        f"Rainfall: Total {forecast_summary['rainfall']['total_mm']}mm, "
        f"Max Daily {forecast_summary['rainfall']['max_daily_mm']}mm, "
        f"{forecast_summary['rainfall']['rainy_days']} rainy day(s)",
        f"Wind: Avg {forecast_summary['wind']['avg_speed_kmh']} km/h, "
        f"Max {forecast_summary['wind']['max_speed_kmh']} km/h",
        f"Humidity: Avg {forecast_summary['humidity']['avg_percent']}%, "
        f"Max {forecast_summary['humidity']['max_percent']}%",
    ]

    if alerts:
        prompt_parts.append("")
        prompt_parts.append("=== Active Weather Alerts ===")
        for alert in alerts:
            prompt_parts.append(
                f"- [{alert.get('severity', 'info').upper()}] "
                f"{alert.get('type', '')}: {alert.get('message', '')}"
            )

    if soil_data:
        prompt_parts.append("")
        prompt_parts.append("=== Soil Moisture Data ===")
        if soil_data.get("root_zone_moisture") is not None:
            prompt_parts.append(
                f"Root Zone Moisture: {soil_data['root_zone_moisture']:.2f} "
                "(0=dry, 1=saturated)"
            )
        if soil_data.get("profile_moisture") is not None:
            prompt_parts.append(
                f"Profile Moisture: {soil_data['profile_moisture']:.2f}"
            )

    if historical_comparison:
        prompt_parts.append("")
        prompt_parts.append("=== Historical Comparison (5-year avg for this week) ===")
        hist = historical_comparison
        if hist.get("temperature"):
            prompt_parts.append(
                f"Historical Avg Max Temp: {hist['temperature']['hist_avg_max']}C "
                f"(current: {hist['temperature']['current_avg_max']}C, "
                f"deviation: {hist['temperature']['deviation_max']}C)"
            )
        if hist.get("rainfall"):
            prompt_parts.append(
                f"Historical Avg Weekly Rainfall: {hist['rainfall']['hist_avg_mm']}mm "
                f"(current forecast: {hist['rainfall']['current_mm']}mm, "
                f"deviation: {hist['rainfall']['deviation_pct']}%)"
            )

    # Growth stages context
    growth_stages = crop_profile.get("growth_stages", {})
    if growth_stages:
        prompt_parts.append("")
        prompt_parts.append(f"=== {crop_type} Growth Stages Reference ===")
        for stage_name, stage_info in growth_stages.items():
            prompt_parts.append(
                f"- {stage_name.replace('_', ' ').title()}: "
                f"{stage_info['duration_days']} days, "
                f"Temp {stage_info['temp_min']}-{stage_info['temp_max']}C, "
                f"Water {stage_info['water_mm_per_week']}mm/week"
            )

    # Common pests and diseases
    pests = crop_profile.get("common_pests_gujarat", [])
    diseases = crop_profile.get("common_diseases_gujarat", [])
    if pests:
        prompt_parts.append(f"\nCommon Pests in Gujarat: {', '.join(pests)}")
    if diseases:
        prompt_parts.append(
            f"Common Diseases in Gujarat: {', '.join(diseases)}"
        )

    prompt_parts.append("")
    prompt_parts.append(
        "Based on all the above data, provide expert farming advice. "
        "Respond ONLY with a JSON object having these exact keys:\n"
        '{\n'
        '  "irrigation": "specific irrigation advice for this week...",\n'
        '  "pest_disease": "pest and disease management advice based on current weather...",\n'
        '  "spraying": "spraying schedule and recommendations...",\n'
        '  "harvesting": "harvesting advice if applicable...",\n'
        '  "general": "overall field operations and management advice...",\n'
        '  "growth_stage_advice": "advice based on likely current growth stage (considering the month)...",\n'
        '  "weather_impact": "how this week\'s weather specifically impacts this crop..."\n'
        '}\n'
        "Make each recommendation 2-3 sentences. Be specific to Gujarat farming practices."
    )

    return "\n".join(prompt_parts)


async def generate_llm_advisory(
    location: Dict[str, Any],
    forecast_summary: Dict[str, Any],
    crop_type: str,
    crop_profile: Dict[str, Any],
    alerts: List[Dict],
    soil_data: Optional[Dict] = None,
    historical_comparison: Optional[Dict] = None,
) -> Optional[Dict[str, str]]:
    """
    Generate contextual farming advice using the Groq LLM API.

    Returns:
        Dict with recommendation keys (irrigation, pest_disease, spraying,
        harvesting, general, growth_stage_advice, weather_impact),
        or None if the LLM call fails.
    """
    api_key = settings.GROQ_API_KEY
    if not api_key:
        logger.warning("GROQ_API_KEY not configured; skipping LLM advisory")
        return None

    system_prompt = _build_system_prompt()
    user_prompt = _build_user_prompt(
        location=location,
        forecast_summary=forecast_summary,
        crop_type=crop_type,
        crop_profile=crop_profile,
        alerts=alerts,
        soil_data=soil_data,
        historical_comparison=historical_comparison,
    )

    payload = {
        "model": GROQ_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.3,
        "max_tokens": GROQ_MAX_TOKENS,
        "response_format": {"type": "json_object"},
    }

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=GROQ_TIMEOUT_SECONDS) as client:
            response = await client.post(
                GROQ_API_URL,
                json=payload,
                headers=headers,
            )
            response.raise_for_status()
            data = response.json()

        content = data["choices"][0]["message"]["content"]
        advisory = json.loads(content)

        logger.info(
            "LLM advisory generated for %s in %s (model=%s, tokens=%s)",
            crop_type,
            location.get("taluka", "unknown"),
            GROQ_MODEL,
            data.get("usage", {}).get("total_tokens", "N/A"),
        )
        return advisory

    except httpx.TimeoutException:
        logger.error("Groq API timed out for %s advisory", crop_type)
    except httpx.HTTPStatusError as exc:
        logger.error(
            "Groq API HTTP error %d: %s",
            exc.response.status_code,
            exc.response.text[:300],
        )
    except (json.JSONDecodeError, KeyError, IndexError) as exc:
        logger.error("Failed to parse Groq LLM response: %s", exc)
    except Exception as exc:
        logger.error("Unexpected error in LLM advisory: %s", exc)

    return None
