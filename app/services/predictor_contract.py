from typing import Dict, Any, Union, Protocol, runtime_checkable, Optional
from pathlib import Path
from dataclasses import dataclass
from app.config import settings
from app.core.errors import ModelUnavailableError, InvalidImageError, InferenceError


@dataclass
class PredictionOutput:
    """Normalized output contract returned by any conforming ML Predictor."""
    predicted_class: str
    confidence: float
    probabilities: Dict[str, float]
    model_version: str

    pipeline: Optional[str] = None
    leaf_detected: Optional[bool] = None
    roi_count: Optional[int] = None
    fallback_used: Optional[bool] = None


@runtime_checkable
class PredictorProtocol(Protocol):
    """Synchronous interface contract for Aditya's ML Predictor.

    Accepts a filesystem path to an image file and returns a structured prediction.
    """
    def predict(self, image_path: Union[str, Path]) -> Union[PredictionOutput, Dict[str, Any]]:
        ...


def normalize_prediction_output(raw_output: Any) -> PredictionOutput:
    """Normalize output from either a PredictionOutput dataclass or dictionary."""
    if isinstance(raw_output, PredictionOutput):
        return raw_output
    if isinstance(raw_output, dict):
        if "predicted_class" not in raw_output or "confidence" not in raw_output:
            raise ValueError("Predictor dictionary must contain 'predicted_class' and 'confidence'.")
        return PredictionOutput(
            predicted_class=str(raw_output["predicted_class"]),
            confidence=float(raw_output["confidence"]),
            probabilities=dict(raw_output.get("probabilities", {})),
            model_version=str(raw_output.get("model_version", settings.MODEL_VERSION)),
            pipeline=raw_output.get("pipeline"),
            leaf_detected=raw_output.get("leaf_detected"),
            roi_count=raw_output.get("roi_count"),
            fallback_used=raw_output.get("fallback_used"),
        )
    raise ValueError(f"Unsupported predictor output format: {type(raw_output)}")


class DefaultPredictor:
    """Default adapter delegating to model.inference.predict.predict until real model is linked."""

    def __init__(self, checkpoint_path: Optional[str] = None):
        self.checkpoint_path = checkpoint_path or settings.MODEL_CHECKPOINT_PATH

    def predict(self, image_path: Union[str, Path]) -> PredictionOutput:
        from model.inference.predict import predict as canonical_predict
        raw_result = canonical_predict(str(image_path), checkpoint_path=self.checkpoint_path)
        return normalize_prediction_output(raw_result)
