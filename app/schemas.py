from typing import Optional, Dict
from pydantic import BaseModel, Field

class HealthResponse(BaseModel):
    status: str = "ok"

class PredictionResponse(BaseModel):
    predicted_class: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    model_version: str
    display_name: Optional[str] = None
    precaution: Optional[str] = None
    probabilities: Optional[Dict[str, float]] = None
    pipeline: Optional[str] = None
    leaf_detected: Optional[bool] = None
    roi_count: Optional[int] = None
    fallback_used: Optional[bool] = None

class ErrorResponse(BaseModel):
    detail: str
