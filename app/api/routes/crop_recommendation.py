from fastapi import APIRouter, status
from app.schemas import CropRecommendationRequest, CropRecommendationResponse, ErrorResponse
from app.services.crop_recommendation_service import predict_crop_recommendation

router = APIRouter(prefix="/api", tags=["Crop Recommendation"])

@router.post(
    "/crop-recommendation",
    response_model=CropRecommendationResponse,
    status_code=status.HTTP_200_OK,
    responses={
        422: {"description": "Unprocessable Entity - Input validation failed"},
        500: {"model": ErrorResponse, "description": "Internal server error during model inference"},
        503: {"model": ErrorResponse, "description": "Crop recommendation model checkpoint unavailable"},
    },
    summary="Predict recommended crops based on soil and weather metrics",
)
async def recommend_crop(payload: CropRecommendationRequest):
    """
    Recommend top-3 suitable crops based on soil nutrients (N, P, K), pH,
    ambient temperature, relative humidity, and expected rainfall.
    """
    return predict_crop_recommendation(payload)
