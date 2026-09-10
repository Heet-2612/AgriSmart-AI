from fastapi import APIRouter, HTTPException
from app.schemas import ChatRequest, ChatResponse
from app.services.gemini_service import generate_chat_response

router = APIRouter()

@router.post("/", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Handles chatbot queries using the Gemini API."""
    try:
        answer = await generate_chat_response(request.query)
        return ChatResponse(answer=answer)
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
