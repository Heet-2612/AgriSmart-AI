from pydantic import BaseModel, Field

class HealthResponse(BaseModel):
    status: str = "ok"

class PredictionResponse(BaseModel):
    predicted_class: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    model_version: str

class ErrorResponse(BaseModel):
    detail: str
