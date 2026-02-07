"""
Data Validation Utilities

This module provides validation functions for sample data
before insertion into the database.
"""

import json
import logging
from datetime import datetime
from typing import Dict, List, Any, Optional
from pathlib import Path

logger = logging.getLogger(__name__)


def validate_disease_data(disease: Dict[str, Any]) -> tuple[bool, Optional[str]]:
    """
    Validate a single disease record
    
    Args:
        disease: Dictionary containing disease data
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    required_fields = ["disease_name", "crop_type", "symptoms"]
    
    # Check required fields
    for field in required_fields:
        if field not in disease or not disease[field]:
            return False, f"Missing or empty required field: {field}"
    
    # Validate field lengths
    if len(disease["disease_name"]) > 200:
        return False, "disease_name exceeds 200 characters"
    
    if disease.get("disease_name_hindi") and len(disease["disease_name_hindi"]) > 200:
        return False, "disease_name_hindi exceeds 200 characters"
    
    if len(disease["crop_type"]) > 100:
        return False, "crop_type exceeds 100 characters"
    
    if len(disease["symptoms"]) < 10:
        return False, "symptoms must be at least 10 characters"
    
    if disease.get("dosage") and len(disease["dosage"]) > 500:
        return False, "dosage exceeds 500 characters"
    
    # Validate cost
    if disease.get("cost_per_acre") is not None:
        try:
            cost = float(disease["cost_per_acre"])
            if cost < 0:
                return False, "cost_per_acre must be >= 0"
        except (ValueError, TypeError):
            return False, "cost_per_acre must be a valid number"
    
    # Validate image_url length
    if disease.get("image_url") and len(disease["image_url"]) > 500:
        return False, "image_url exceeds 500 characters"
    
    # Validate affected_stages length
    if disease.get("affected_stages") and len(disease["affected_stages"]) > 200:
        return False, "affected_stages exceeds 200 characters"
    
    return True, None


def validate_mandi_price_data(price: Dict[str, Any]) -> tuple[bool, Optional[str]]:
    """
    Validate a single mandi price record
    
    Args:
        price: Dictionary containing mandi price data
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    required_fields = ["commodity", "mandi_name", "state", "district", "price_per_quintal", "arrival_date"]
    
    # Check required fields
    for field in required_fields:
        if field not in price:
            return False, f"Missing required field: {field}"
    
    # Validate field lengths
    if len(price["commodity"]) > 100:
        return False, "commodity exceeds 100 characters"
    
    if len(price["mandi_name"]) > 200:
        return False, "mandi_name exceeds 200 characters"
    
    if len(price["state"]) > 100:
        return False, "state exceeds 100 characters"
    
    if len(price["district"]) > 100:
        return False, "district exceeds 100 characters"
    
    # Validate prices
    try:
        price_per_quintal = float(price["price_per_quintal"])
        if price_per_quintal < 0:
            return False, "price_per_quintal must be >= 0"
    except (ValueError, TypeError):
        return False, "price_per_quintal must be a valid number"
    
    # Validate optional prices
    for price_field in ["min_price", "max_price", "modal_price"]:
        if price.get(price_field) is not None:
            try:
                price_val = float(price[price_field])
                if price_val < 0:
                    return False, f"{price_field} must be >= 0"
            except (ValueError, TypeError):
                return False, f"{price_field} must be a valid number"
    
    # Validate max_price >= min_price if both present
    if price.get("min_price") is not None and price.get("max_price") is not None:
        if float(price["max_price"]) < float(price["min_price"]):
            return False, "max_price must be >= min_price"
    
    # Validate modal_price range if present
    if price.get("modal_price") is not None:
        modal = float(price["modal_price"])
        if price.get("min_price") and modal < float(price["min_price"]):
            return False, "modal_price must be >= min_price"
        if price.get("max_price") and modal > float(price["max_price"]):
            return False, "modal_price must be <= max_price"
    
    # Validate arrival_date
    try:
        if isinstance(price["arrival_date"], str):
            datetime.fromisoformat(price["arrival_date"].replace("Z", "+00:00"))
    except (ValueError, AttributeError):
        return False, "arrival_date must be a valid ISO format datetime string"
    
    return True, None


def validate_weather_alert_data(alert: Dict[str, Any]) -> tuple[bool, Optional[str]]:
    """
    Validate a single weather alert record
    
    Args:
        alert: Dictionary containing weather alert data
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    required_fields = ["alert_type", "severity", "title", "description", "recommendation"]
    
    # Check required fields
    for field in required_fields:
        if field not in alert or not alert[field]:
            return False, f"Missing or empty required field: {field}"
    
    # Validate severity
    valid_severities = ["info", "warning", "danger"]
    if alert["severity"] not in valid_severities:
        return False, f"severity must be one of: {', '.join(valid_severities)}"
    
    # Validate alert_type
    if not alert["alert_type"] or len(alert["alert_type"]) < 3:
        return False, "alert_type must be at least 3 characters"
    
    return True, None


def validate_json_file(file_path: Path, validator_func) -> tuple[bool, List[str], int]:
    """
    Validate all records in a JSON file
    
    Args:
        file_path: Path to JSON file
        validator_func: Validation function to apply to each record
        
    Returns:
        Tuple of (all_valid, error_messages, valid_count)
    """
    errors = []
    valid_count = 0
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        if not isinstance(data, list):
            return False, ["JSON file must contain an array"], 0
        
        for idx, record in enumerate(data):
            is_valid, error_msg = validator_func(record)
            if not is_valid:
                errors.append(f"Record {idx + 1}: {error_msg}")
            else:
                valid_count += 1
        
        return len(errors) == 0, errors, valid_count
        
    except json.JSONDecodeError as e:
        return False, [f"Invalid JSON: {str(e)}"], 0
    except FileNotFoundError:
        return False, [f"File not found: {file_path}"], 0
    except Exception as e:
        return False, [f"Error reading file: {str(e)}"], 0


def load_and_validate_diseases(data_dir: Path) -> tuple[bool, List[Dict], List[str]]:
    """
    Load and validate diseases.json file
    
    Args:
        data_dir: Directory containing data files
        
    Returns:
        Tuple of (is_valid, diseases_list, error_messages)
    """
    file_path = data_dir / "diseases.json"
    is_valid, errors, count = validate_json_file(file_path, validate_disease_data)
    
    if is_valid:
        with open(file_path, 'r', encoding='utf-8') as f:
            diseases = json.load(f)
        logger.info(f"Loaded and validated {count} disease records")
        return True, diseases, []
    else:
        logger.error(f"Validation failed for diseases.json: {errors}")
        return False, [], errors


def load_and_validate_mandi_prices(data_dir: Path) -> tuple[bool, List[Dict], List[str]]:
    """
    Load and validate mandi_prices.json file
    
    Args:
        data_dir: Directory containing data files
        
    Returns:
        Tuple of (is_valid, prices_list, error_messages)
    """
    file_path = data_dir / "mandi_prices.json"
    is_valid, errors, count = validate_json_file(file_path, validate_mandi_price_data)
    
    if is_valid:
        with open(file_path, 'r', encoding='utf-8') as f:
            prices = json.load(f)
        logger.info(f"Loaded and validated {count} mandi price records")
        return True, prices, []
    else:
        logger.error(f"Validation failed for mandi_prices.json: {errors}")
        return False, [], errors


def load_and_validate_weather_alerts(data_dir: Path) -> tuple[bool, List[Dict], List[str]]:
    """
    Load and validate weather_alerts.json file
    
    Args:
        data_dir: Directory containing data files
        
    Returns:
        Tuple of (is_valid, alerts_list, error_messages)
    """
    file_path = data_dir / "weather_alerts.json"
    is_valid, errors, count = validate_json_file(file_path, validate_weather_alert_data)
    
    if is_valid:
        with open(file_path, 'r', encoding='utf-8') as f:
            alerts = json.load(f)
        logger.info(f"Loaded and validated {count} weather alert records")
        return True, alerts, []
    else:
        logger.error(f"Validation failed for weather_alerts.json: {errors}")
        return False, [], errors
