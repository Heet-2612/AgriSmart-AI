import os
import tempfile
from pathlib import Path
from fastapi import UploadFile, HTTPException, status
from app.config import settings
from model.inference.predict import predict, ModelNotReadyError

ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp", "image/bmp"}
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}
MAX_FILE_SIZE = 15 * 1024 * 1024

async def process_prediction(image: UploadFile):
    """Validate uploaded image and invoke the canonical model prediction interface."""
    if not image.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No file selected or uploaded."
        )

    ext = Path(image.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file extension '{ext}'. Allowed extensions: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        )

    content = await image.read()
    if len(content) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded image file is empty."
        )

    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum allowed size of {MAX_FILE_SIZE // (1024 * 1024)}MB."
        )

    if image.content_type and image.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid Content-Type '{image.content_type}'. Allowed types: {', '.join(sorted(ALLOWED_MIME_TYPES))}"
        )

    suffix = ext if ext else ".jpg"
    temp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            temp_file.write(content)
            temp_path = temp_file.name

        try:
            result = predict(temp_path, checkpoint_path=settings.MODEL_CHECKPOINT_PATH)
            return result
        except ModelNotReadyError as e:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=str(e)
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Prediction pipeline error: {str(e)}"
            )
    finally:
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except OSError:
                pass
