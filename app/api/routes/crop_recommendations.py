"""API route for crop recommendations."""
from fastapi import APIRouter, status
from app.schemas import CropRecommendationRequest, CropRecommendationResponse, ErrorResponse
from app.services.crop_recommendation_service import process_crop_recommendation

router = APIRouter(prefix="/api", tags=["Crop Recommendations"])

@router.post(
    "/crop-recommendations",
    response_model=CropRecommendationResponse,
    status_code=status.HTTP_200_OK,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid parameter values"},
        422: {"model": ErrorResponse, "description": "Request validation error (missing/out-of-bounds inputs)"},
        503: {"model": ErrorResponse, "description": "Crop recommendation model unavailable"}
    },
    summary="Recommend crops based on soil nutrients and meteorological conditions"
)
async def recommend_crop(request: CropRecommendationRequest) -> CropRecommendationResponse:
    """Evaluate soil nutrients (N, P, K) and environmental parameters (temperature, humidity, pH, rainfall)

    to return ranked crop recommendations with model confidence scores.
    """
    return await process_crop_recommendation(request)
