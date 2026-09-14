import os
import tempfile
from decimal import Decimal
from pathlib import Path
from typing import Optional
from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import (
    InvalidImageError,
    PayloadTooLargeError,
    ModelUnavailableError,
    InferenceError,
    DatabaseError,
)
from app.db.models.prediction import PredictionLog
from app.schemas import PredictionResponse
from app.services.predictor_contract import (
    PredictorProtocol,
    DefaultPredictor,
    normalize_prediction_output,
)
from app.services.disease_metadata_service import (
    DiseaseMetadataService,
    get_default_metadata_service,
)
from model.inference.predict import ModelNotReadyError

ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp", "image/bmp"}
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}
MAX_FILE_SIZE = 15 * 1024 * 1024


async def process_prediction(
    image: UploadFile,
    db: Optional[AsyncSession] = None,
    predictor: Optional[PredictorProtocol] = None,
    metadata_service: Optional[DiseaseMetadataService] = None,
) -> PredictionResponse:
    """Validate uploaded image, invoke ML predictor, map metadata, persist to DB, and return response."""
    if not image.filename:
        raise InvalidImageError("No file selected or uploaded.")

    ext = Path(image.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise InvalidImageError(
            f"Invalid file extension '{ext}'. Allowed extensions: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        )

    content = await image.read()
    if len(content) == 0:
        raise InvalidImageError("The uploaded image file is empty.")

    if len(content) > MAX_FILE_SIZE:
        raise PayloadTooLargeError(
            f"File exceeds maximum allowed size of {MAX_FILE_SIZE // (1024 * 1024)}MB."
        )

    if image.content_type and image.content_type not in ALLOWED_MIME_TYPES:
        raise InvalidImageError(
            f"Invalid Content-Type '{image.content_type}'. Allowed types: {', '.join(sorted(ALLOWED_MIME_TYPES))}"
        )

    suffix = ext if ext else ".jpg"
    temp_path = None

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            temp_file.write(content)
            temp_path = temp_file.name

        # Resolve predictor and metadata service
        active_predictor = predictor if predictor is not None else DefaultPredictor()
        active_metadata_service = (
            metadata_service if metadata_service is not None else get_default_metadata_service()
        )

        # ML inference execution
        try:
            raw_output = active_predictor.predict(temp_path)
            prediction_output = normalize_prediction_output(raw_output)
        except (ModelUnavailableError, ModelNotReadyError) as e:
            raise ModelUnavailableError(str(e))
        except (InvalidImageError, ValueError, FileNotFoundError, OSError) as e:
            raise InvalidImageError(
                str(e)
                if isinstance(e, (InvalidImageError, ValueError))
                else "Unsupported or invalid image file. Please upload a clear crop or leaf photo."
            )
        except InferenceError:
            raise
        except Exception as e:
            raise InferenceError(f"Model inference failed: {str(e)}")

        # Backend metadata mapping
        metadata = active_metadata_service.get_metadata(prediction_output.predicted_class)

        # Persist genuine prediction to database only after successful inference
        if db is not None:
            try:
                conf_val = None
                if prediction_output.confidence is not None:
                    conf_val = Decimal(str(round(prediction_output.confidence, 4)))

                log_entry = PredictionLog(
                    image_filename=image.filename,
                    predicted_class=prediction_output.predicted_class,
                    confidence=conf_val,
                    model_version=prediction_output.model_version,
                )
                db.add(log_entry)
                await db.flush()
            except Exception as e:
                raise DatabaseError(f"Database persistence failed: {str(e)}")

        return PredictionResponse(
            predicted_class=prediction_output.predicted_class,
            confidence=prediction_output.confidence,
            model_version=prediction_output.model_version,
            display_name=metadata.display_name,
            precaution=metadata.precaution,
            probabilities=prediction_output.probabilities,
            pipeline=prediction_output.pipeline,
            leaf_detected=prediction_output.leaf_detected,
            roi_count=prediction_output.roi_count,
            fallback_used=prediction_output.fallback_used,
        )

    finally:
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except OSError:
                pass
