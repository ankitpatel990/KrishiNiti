"""
Plant Disease AI Model Service

Loads two Hugging Face image classification models and provides
a unified inference API:

  1. wambugu71/crop_leaf_diseases_vit   - Rice, Wheat, Potato, Corn  (ViT-tiny)
  2. linkanjarad/mobilenet_v2_1.0_224-plant-disease-identification
                                        - Tomato, Potato, Corn, Apple,
                                          Pepper, Grape, etc. (MobileNetV2)

Models are loaded lazily on first request and cached for the process
lifetime.

Public API:
    get_supported_crops()                -> list[dict]
    predict(image_bytes, crop_type)      -> list[dict]
    get_model_status()                   -> dict
"""

import io
import logging
import time
from typing import Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Lazy imports  (avoid hard crash if torch is absent at import time)
# ---------------------------------------------------------------------------

_torch = None
_Image = None
_transforms = None
_AutoImageProcessor = None
_AutoModelForImageClassification = None
_ViTFeatureExtractor = None
_ViTForImageClassification = None


def _ensure_imports():
    """Import heavy ML libraries on first use."""
    global _torch, _Image, _transforms
    global _AutoImageProcessor, _AutoModelForImageClassification
    global _ViTFeatureExtractor, _ViTForImageClassification

    if _torch is not None:
        return

    import torch
    from PIL import Image
    from torchvision import transforms
    from transformers import (
        AutoImageProcessor,
        AutoModelForImageClassification,
        ViTFeatureExtractor,
        ViTForImageClassification,
    )

    _torch = torch
    _Image = Image
    _transforms = transforms
    _AutoImageProcessor = AutoImageProcessor
    _AutoModelForImageClassification = AutoModelForImageClassification
    _ViTFeatureExtractor = ViTFeatureExtractor
    _ViTForImageClassification = ViTForImageClassification


# ---------------------------------------------------------------------------
# Model identifiers
# ---------------------------------------------------------------------------

VIT_MODEL_ID = "wambugu71/crop_leaf_diseases_vit"
MOBILENET_MODEL_ID = "linkanjarad/mobilenet_v2_1.0_224-plant-disease-identification"

# ---------------------------------------------------------------------------
# Label-to-DB mapping
# ---------------------------------------------------------------------------

# Maps model output labels to (display_name, crop_type) used by our DB /
# frontend.  Values without a mapping are presented as-is.

VIT_LABEL_MAP: Dict[str, Tuple[str, str]] = {
    "Rice___Brown_Spot":     ("Brown Spot of Paddy", "Paddy"),
    "Rice___Leaf_Blast":     ("Paddy Blast", "Paddy"),
    "Rice___Healthy":        ("Healthy Plant", "Paddy"),
    "Wheat___Brown_Rust":    ("Rust of Wheat", "Wheat"),
    "Wheat___Yellow_Rust":   ("Stripe Rust of Wheat", "Wheat"),
    "Wheat___Healthy":       ("Healthy Plant", "Wheat"),
    "Potato___Early_Blight": ("Early Blight of Potato", "Potato"),
    "Potato___Late_Blight":  ("Late Blight of Potato", "Potato"),
    "Potato___Healthy":      ("Healthy Plant", "Potato"),
    "Corn___Common_Rust":    ("Common Rust of Corn", "Corn"),
    "Corn___Gray_Leaf_Spot": ("Gray Leaf Spot of Corn", "Corn"),
    "Corn___Healthy":        ("Healthy Plant", "Corn"),
    "Invalid":               ("Invalid Image", "Unknown"),
}

MOBILENET_LABEL_MAP: Dict[str, Tuple[str, str]] = {
    "Apple Scab":                                          ("Apple Scab", "Apple"),
    "Apple with Black Rot":                                ("Black Rot of Apple", "Apple"),
    "Cedar Apple Rust":                                    ("Cedar Apple Rust", "Apple"),
    "Healthy Apple":                                       ("Healthy Plant", "Apple"),
    "Healthy Blueberry Plant":                             ("Healthy Plant", "Blueberry"),
    "Cherry with Powdery Mildew":                          ("Powdery Mildew of Cherry", "Cherry"),
    "Healthy Cherry Plant":                                ("Healthy Plant", "Cherry"),
    "Corn (Maize) with Cercospora and Gray Leaf Spot":     ("Gray Leaf Spot of Corn", "Corn"),
    "Corn (Maize) with Common Rust":                       ("Common Rust of Corn", "Corn"),
    "Corn (Maize) with Northern Leaf Blight":              ("Northern Leaf Blight of Corn", "Corn"),
    "Healthy Corn (Maize) Plant":                          ("Healthy Plant", "Corn"),
    "Grape with Black Rot":                                ("Black Rot of Grape", "Grape"),
    "Grape with Esca (Black Measles)":                     ("Esca of Grape", "Grape"),
    "Grape with Isariopsis Leaf Spot":                     ("Isariopsis Leaf Spot of Grape", "Grape"),
    "Healthy Grape Plant":                                 ("Healthy Plant", "Grape"),
    "Orange with Citrus Greening":                         ("Citrus Greening", "Orange"),
    "Peach with Bacterial Spot":                           ("Bacterial Spot of Peach", "Peach"),
    "Healthy Peach Plant":                                 ("Healthy Plant", "Peach"),
    "Bell Pepper with Bacterial Spot":                     ("Bacterial Spot of Bell Pepper", "Bell Pepper"),
    "Healthy Bell Pepper Plant":                           ("Healthy Plant", "Bell Pepper"),
    "Potato with Early Blight":                            ("Early Blight of Potato", "Potato"),
    "Potato with Late Blight":                             ("Late Blight of Potato", "Potato"),
    "Healthy Potato Plant":                                ("Healthy Plant", "Potato"),
    "Healthy Raspberry Plant":                             ("Healthy Plant", "Raspberry"),
    "Healthy Soybean Plant":                               ("Healthy Plant", "Soybean"),
    "Squash with Powdery Mildew":                          ("Powdery Mildew of Squash", "Squash"),
    "Strawberry with Leaf Scorch":                         ("Leaf Scorch of Strawberry", "Strawberry"),
    "Healthy Strawberry Plant":                            ("Healthy Plant", "Strawberry"),
    "Tomato with Bacterial Spot":                          ("Bacterial Spot of Tomato", "Tomato"),
    "Tomato with Early Blight":                            ("Early Blight of Tomato", "Tomato"),
    "Tomato with Late Blight":                             ("Late Blight of Tomato", "Tomato"),
    "Tomato with Leaf Mold":                               ("Leaf Mold of Tomato", "Tomato"),
    "Tomato with Septoria Leaf Spot":                      ("Septoria Leaf Spot of Tomato", "Tomato"),
    "Tomato with Spider Mites or Two-spotted Spider Mite": ("Spider Mites on Tomato", "Tomato"),
    "Tomato with Target Spot":                             ("Target Spot of Tomato", "Tomato"),
    "Tomato Yellow Leaf Curl Virus":                       ("Tomato Yellow Leaf Curl Virus", "Tomato"),
    "Tomato Mosaic Virus":                                 ("Tomato Mosaic Virus", "Tomato"),
    "Healthy Tomato Plant":                                ("Healthy Plant", "Tomato"),
}

# Crop -> which model to use.  Crops supported by the ViT model use ViT;
# others fall back to MobileNet.  Potato and Corn are present in both;
# we prefer ViT for Potato (fewer classes, faster) and MobileNet for Corn
# (more corn diseases).

_VIT_CROPS = {"paddy", "rice", "wheat"}
_MOBILENET_CROPS = {
    "tomato", "apple", "blueberry", "cherry", "grape", "orange",
    "peach", "bell pepper", "pepper", "raspberry", "soybean",
    "squash", "strawberry",
}
# Both models cover potato and corn; default to ViT for these.
_SHARED_CROPS = {"potato", "corn", "maize"}

# Canonical list surfaced to frontend.
SUPPORTED_CROPS: List[Dict[str, str]] = [
    {"value": "Paddy",        "label": "Paddy (Rice)",    "model": "vit"},
    {"value": "Wheat",        "label": "Wheat",           "model": "vit"},
    {"value": "Potato",       "label": "Potato",          "model": "vit"},
    {"value": "Corn",         "label": "Corn (Maize)",    "model": "mobilenet"},
    {"value": "Tomato",       "label": "Tomato",          "model": "mobilenet"},
    {"value": "Apple",        "label": "Apple",           "model": "mobilenet"},
    {"value": "Grape",        "label": "Grape",           "model": "mobilenet"},
    {"value": "Cherry",       "label": "Cherry",          "model": "mobilenet"},
    {"value": "Peach",        "label": "Peach",           "model": "mobilenet"},
    {"value": "Bell Pepper",  "label": "Bell Pepper",     "model": "mobilenet"},
    {"value": "Orange",       "label": "Orange",          "model": "mobilenet"},
    {"value": "Strawberry",   "label": "Strawberry",      "model": "mobilenet"},
    {"value": "Soybean",      "label": "Soybean",         "model": "mobilenet"},
    {"value": "Squash",       "label": "Squash",          "model": "mobilenet"},
    {"value": "Blueberry",    "label": "Blueberry",       "model": "mobilenet"},
    {"value": "Raspberry",    "label": "Raspberry",       "model": "mobilenet"},
]


# ---------------------------------------------------------------------------
# Model singletons
# ---------------------------------------------------------------------------

_vit_model = None
_vit_processor = None
_mobilenet_model = None
_mobilenet_processor = None

_load_errors: Dict[str, str] = {}


def _select_model(crop_type: str) -> str:
    """Return 'vit' or 'mobilenet' based on crop type."""
    ct = crop_type.lower().strip()
    if ct in _VIT_CROPS:
        return "vit"
    if ct in _MOBILENET_CROPS:
        return "mobilenet"
    if ct in _SHARED_CROPS:
        return "vit"
    return "mobilenet"


def _load_vit():
    """Load the ViT model (lazy, cached)."""
    global _vit_model, _vit_processor
    if _vit_model is not None:
        return

    _ensure_imports()
    logger.info("Loading ViT model: %s", VIT_MODEL_ID)
    start = time.perf_counter()
    try:
        _vit_processor = _ViTFeatureExtractor.from_pretrained(VIT_MODEL_ID)
        _vit_model = _ViTForImageClassification.from_pretrained(
            VIT_MODEL_ID, ignore_mismatched_sizes=True
        )
        _vit_model.eval()
        elapsed = round(time.perf_counter() - start, 2)
        logger.info("ViT model loaded in %ss", elapsed)
        logger.info(
            "ViT id2label (%d classes): %s",
            len(_vit_model.config.id2label),
            _vit_model.config.id2label,
        )
    except Exception as exc:
        _load_errors["vit"] = str(exc)
        logger.error("Failed to load ViT model: %s", exc)
        raise


def _load_mobilenet():
    """Load the MobileNetV2 model (lazy, cached)."""
    global _mobilenet_model, _mobilenet_processor
    if _mobilenet_model is not None:
        return

    _ensure_imports()
    logger.info("Loading MobileNet model: %s", MOBILENET_MODEL_ID)
    start = time.perf_counter()
    try:
        _mobilenet_processor = _AutoImageProcessor.from_pretrained(MOBILENET_MODEL_ID)
        _mobilenet_model = _AutoModelForImageClassification.from_pretrained(
            MOBILENET_MODEL_ID
        )
        _mobilenet_model.eval()
        elapsed = round(time.perf_counter() - start, 2)
        logger.info("MobileNet model loaded in %ss", elapsed)
        logger.info(
            "MobileNet id2label (%d classes): %s",
            len(_mobilenet_model.config.id2label),
            _mobilenet_model.config.id2label,
        )
    except Exception as exc:
        _load_errors["mobilenet"] = str(exc)
        logger.error("Failed to load MobileNet model: %s", exc)
        raise


# ---------------------------------------------------------------------------
# Inference helpers
# ---------------------------------------------------------------------------

def _preprocess_image(image_bytes: bytes) -> "PIL.Image.Image":
    """Decode raw bytes into an RGB PIL Image."""
    _ensure_imports()
    image = _Image.open(io.BytesIO(image_bytes)).convert("RGB")
    return image


def _resolve_label(id2label: dict, class_idx: int) -> str:
    """
    Resolve a class index to its label string.

    The transformers library normalises id2label keys to integers when
    loading from config.json, but some model cards ship with string keys.
    Try both to be safe.
    """
    label = id2label.get(class_idx)
    if label is None:
        label = id2label.get(str(class_idx))
    if label is None:
        label = f"class_{class_idx}"
    return label


def _run_vit_inference(image: "PIL.Image.Image", top_k: int = 3) -> List[dict]:
    """Run ViT inference and return top-k predictions."""
    _load_vit()
    inputs = _vit_processor(images=image, return_tensors="pt")
    with _torch.no_grad():
        outputs = _vit_model(**inputs)
    probs = _torch.nn.functional.softmax(outputs.logits, dim=1)[0]
    top_probs, top_indices = _torch.topk(probs, min(top_k, len(probs)))

    results = []
    for prob, idx in zip(top_probs, top_indices):
        raw_label = _resolve_label(_vit_model.config.id2label, idx.item())
        mapped = VIT_LABEL_MAP.get(raw_label, (raw_label, "Unknown"))
        results.append({
            "disease_name": mapped[0],
            "crop_type": mapped[1],
            "confidence": round(prob.item() * 100, 1),
            "raw_label": raw_label,
            "model": "vit",
        })
    return results


def _run_mobilenet_inference(image: "PIL.Image.Image", top_k: int = 3) -> List[dict]:
    """Run MobileNetV2 inference and return top-k predictions."""
    _load_mobilenet()
    inputs = _mobilenet_processor(images=image, return_tensors="pt")
    with _torch.no_grad():
        outputs = _mobilenet_model(**inputs)
    probs = _torch.nn.functional.softmax(outputs.logits, dim=1)[0]
    top_probs, top_indices = _torch.topk(probs, min(top_k, len(probs)))

    results = []
    for prob, idx in zip(top_probs, top_indices):
        raw_label = _resolve_label(_mobilenet_model.config.id2label, idx.item())
        mapped = MOBILENET_LABEL_MAP.get(raw_label, (raw_label, "Unknown"))
        results.append({
            "disease_name": mapped[0],
            "crop_type": mapped[1],
            "confidence": round(prob.item() * 100, 1),
            "raw_label": raw_label,
            "model": "mobilenet",
        })
    return results


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def get_supported_crops() -> List[Dict[str, str]]:
    """Return the list of crops supported by the AI models."""
    return SUPPORTED_CROPS


def predict(image_bytes: bytes, crop_type: str, top_k: int = 3) -> List[dict]:
    """
    Run disease detection on an image.

    Args:
        image_bytes: Raw image file bytes (JPEG / PNG / WebP).
        crop_type:   User-selected crop type.
        top_k:       Number of top predictions to return.

    Returns:
        List of prediction dicts, each containing:
            disease_name, crop_type, confidence, raw_label, model
    """
    image = _preprocess_image(image_bytes)
    model_key = _select_model(crop_type)

    if model_key == "vit":
        return _run_vit_inference(image, top_k=top_k)
    return _run_mobilenet_inference(image, top_k=top_k)


def get_model_status() -> dict:
    """Return current loading status for both models."""
    return {
        "vit": {
            "loaded": _vit_model is not None,
            "model_id": VIT_MODEL_ID,
            "error": _load_errors.get("vit"),
        },
        "mobilenet": {
            "loaded": _mobilenet_model is not None,
            "model_id": MOBILENET_MODEL_ID,
            "error": _load_errors.get("mobilenet"),
        },
    }
