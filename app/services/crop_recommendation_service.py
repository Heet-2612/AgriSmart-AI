"""Service layer for Crop Recommendation ML inference."""
from fastapi import HTTPException, status
from app.schemas import CropRecommendationRequest, CropRecommendationResponse
from model.crop_recommendation_v2.predict import predict_crop, ModelNotReadyError

async def process_crop_recommendation(request: CropRecommendationRequest) -> CropRecommendationResponse:
    """Validate and execute crop recommendation prediction through service abstraction."""
    try:
        raw_result = predict_crop(
            state=request.state,
            district=request.district,
            temperature=request.temperature,
            humidity=request.humidity,
            rainfall=request.rainfall,
            soil_type=request.soil_type,
            previous_crop=request.previous_crop,
            top_k=request.top_k,
        )
        return CropRecommendationResponse(**raw_result)
    except ModelNotReadyError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Crop recommendation model is not available: {str(e)}"
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred during crop recommendation inference."
        )
