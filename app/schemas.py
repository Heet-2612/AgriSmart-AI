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

class CropRecommendationRequest(BaseModel):
    state: str
    district: str
    temperature: float = Field(..., ge=-10.0, le=60.0)
    humidity: float = Field(..., ge=0.0, le=100.0)
    rainfall: float = Field(..., ge=0.0, le=5000.0)
    soil_type: str
    previous_crop: str
    top_k: int = Field(default=3, ge=1, le=10)

class RankedCropRecommendation(BaseModel):
    crop: str
    probability: float
    confidence_tier: str

class CropRecommendationResponse(BaseModel):
    recommended_crop: str
    confidence: float
    confidence_level: str
    recommendations: list[RankedCropRecommendation]
    top_k_recommendations: list[RankedCropRecommendation]
    explanation: str
    model_version: str
    input_features: dict
