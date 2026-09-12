from fastapi import APIRouter, File, UploadFile, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas import PredictionResponse, ErrorResponse
from app.dependencies import get_db_session, get_predictor, get_metadata_service
from app.services.predictor_contract import PredictorProtocol
from app.services.disease_metadata_service import DiseaseMetadataService
from app.services.prediction_service import process_prediction

router = APIRouter(prefix="/api", tags=["Predictions"])


@router.post(
    "/predictions",
    response_model=PredictionResponse,
    status_code=status.HTTP_200_OK,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid file or parameters"},
        413: {"model": ErrorResponse, "description": "File too large"},
        500: {"model": ErrorResponse, "description": "Inference or persistence error"},
        503: {"model": ErrorResponse, "description": "Model checkpoint not yet available"}
    },
    summary="Predict crop disease from leaf image"
)
async def predict_disease(
    image: UploadFile = File(..., description="Leaf image file (JPG, PNG, WEBP)"),
    db: AsyncSession = Depends(get_db_session),
    predictor: PredictorProtocol = Depends(get_predictor),
    metadata_service: DiseaseMetadataService = Depends(get_metadata_service),
):
    """Classify crop leaf disease from uploaded image."""
    return await process_prediction(
        image=image,
        db=db,
        predictor=predictor,
        metadata_service=metadata_service,
    )
