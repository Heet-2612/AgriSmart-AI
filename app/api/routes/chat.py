from fastapi import APIRouter, Depends, HTTPException, status
from app.schemas import ChatRequest, ChatAnswer, ChatContext, WeatherContext, DiseaseMetadata as GenAIDiseaseMetadata
from app.services.disease_metadata_service import DiseaseMetadataService, get_default_metadata_service
from app.services.genai_service import generate_chat_answer
from app.core.errors import ChatProviderUnavailableError

router = APIRouter(prefix="/api", tags=["Chat"])

@router.post("/chat", response_model=ChatAnswer)
def chat(
    request: ChatRequest,
    metadata_service: DiseaseMetadataService = Depends(get_default_metadata_service)
):
    """
    Accepts a prediction context and a question, resolves authoritative disease metadata, 
    and streams a grounded answer via GenAI.
    """
    
    # 1. Resolve authoritative metadata
    disease_metadata = metadata_service.get_genai_metadata(request.predicted_class)
    
    # 2. Build internal ChatContext
    context = ChatContext(
        predicted_class=request.predicted_class,
        confidence=request.confidence,
        probabilities=request.probabilities,
        model_version=request.model_version,
        leaf_detected=request.leaf_detected,
        fallback_used=request.fallback_used,
        disease_metadata=disease_metadata,
        weather_context=None,
        location_context=None,
        farmer_context=None,
        question=request.question,
        session_id=request.session_id,
        language=request.language
    )
    
    # 3. Call internal GenAI service directly
    try:
        answer = generate_chat_answer(context)
        return answer
    except ChatProviderUnavailableError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Chat service is currently unavailable. Please try again later."
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred during chat generation."
        )
