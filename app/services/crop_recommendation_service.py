"""
Crop Recommendation Service.

Loads the trained scikit-learn RandomForest model and provides low-latency,
in-process inference with top-3 ranked confidence scores and input summaries.
"""

import os
import json
from typing import Any, Optional
import numpy as np
import joblib
from fastapi import HTTPException, status
from app.config import settings
from app.schemas import (
    CropRecommendationRequest,
    CropRecommendationResponse,
    CropPredictionItem,
    CropInputSummary,
)

_cached_model: Optional[Any] = None
_cached_metadata: Optional[dict[str, Any]] = None


def get_crop_model():
    """Lazy-load and cache the trained RandomForest model."""
    global _cached_model, _cached_metadata
    if _cached_model is not None:
        return _cached_model

    model_path = settings.CROP_MODEL_PATH
    if not os.path.exists(model_path):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Crop recommendation model checkpoint is not available. Please run model training first.",
        )

    try:
        _cached_model = joblib.load(model_path)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load crop recommendation model checkpoint: {str(exc)}",
        )

    # Load metadata if available
    metadata_path = settings.CROP_METADATA_PATH
    if os.path.exists(metadata_path):
        try:
            with open(metadata_path, "r", encoding="utf-8") as f:
                _cached_metadata = json.load(f)
        except Exception:
            _cached_metadata = None

    return _cached_model


def reset_model_cache():
    """Reset the in-memory cached model (useful for testing and hot-reloading)."""
    global _cached_model, _cached_metadata
    _cached_model = None
    _cached_metadata = None


def predict_crop_recommendation(
    payload: CropRecommendationRequest,
) -> CropRecommendationResponse:
    """
    Perform inference on the 7 agricultural features and return top-3 crop recommendations.
    """
    model = get_crop_model()

    # Prepare input array adhering to exact training feature order:
    # [nitrogen, phosphorus, potassium, temperature, humidity, ph, rainfall]
    feature_vector = np.array(
        [
            [
                payload.nitrogen,
                payload.phosphorus,
                payload.potassium,
                payload.temperature,
                payload.humidity,
                payload.ph,
                payload.rainfall,
            ]
        ],
        dtype=float,
    )

    try:
        probabilities = model.predict_proba(feature_vector)[0]
        classes = model.classes_
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error executing crop recommendation inference: {str(exc)}",
        )

    # Pair classes with probabilities and sort descending
    class_prob_pairs = sorted(
        zip(classes, probabilities),
        key=lambda item: item[1],
        reverse=True,
    )

    top_3_items = [
        CropPredictionItem(
            crop=str(crop_name),
            confidence=round(float(prob), 4),
        )
        for crop_name, prob in class_prob_pairs[:3]
    ]

    top_crop = top_3_items[0].crop
    top_confidence = top_3_items[0].confidence

    model_version = (
        _cached_metadata.get("model_version", settings.CROP_MODEL_VERSION)
        if _cached_metadata
        else settings.CROP_MODEL_VERSION
    )

    input_summary = CropInputSummary(
        nitrogen=payload.nitrogen,
        phosphorus=payload.phosphorus,
        potassium=payload.potassium,
        temperature=payload.temperature,
        humidity=payload.humidity,
        ph=payload.ph,
        rainfall=payload.rainfall,
    )

    return CropRecommendationResponse(
        recommended_crop=top_crop,
        confidence=top_confidence,
        top_3_recommendations=top_3_items,
        input_summary=input_summary,
        model_version=model_version,
        explanation="Recommended based on your soil nutrients, pH, temperature, humidity, and rainfall.",
    )
