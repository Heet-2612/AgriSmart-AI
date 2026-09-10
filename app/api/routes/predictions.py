from fastapi import APIRouter, File, UploadFile, status
from app.schemas import PredictionResponse, ErrorResponse
from app.services.prediction_service import process_prediction

router = APIRouter(prefix="/api", tags=["Predictions"])

@router.post(
    "/predictions",
    response_model=PredictionResponse,
    status_code=status.HTTP_200_OK,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid file or parameters"},
        413: {"model": ErrorResponse, "description": "File too large"},
        503: {"model": ErrorResponse, "description": "Model checkpoint not yet available"}
    },
    summary="Predict crop disease from leaf image"
)
async def predict_disease(image: UploadFile = File(..., description="Leaf image file (JPG, PNG, WEBP)")):
    """Classify crop leaf disease from uploaded image."""
    return await process_prediction(image)
