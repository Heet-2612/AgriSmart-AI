import google.generativeai as genai
from app.config import settings
import logging

logger = logging.getLogger(__name__)

if settings.GEMINI_API_KEY:
    genai.configure(api_key=settings.GEMINI_API_KEY)
else:
    logger.warning("Gemini API key not found. Please set it in the environment.")

async def generate_chat_response(query: str) -> str:
    """Handles chatbot queries using the Gemini API."""
    if not settings.GEMINI_API_KEY:
        raise ValueError("Gemini API key is not configured.")
        
    try:
        model = genai.GenerativeModel('gemini-pro')
        prompt = f"""
        You are 'Kisan Mitra,' an expert AI farming assistant for farmers in India. 
        Your goal is to provide simple, clear, and helpful advice. 
        Answer the following question: {query}
        """
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        logger.error(f"Error generating content: {str(e)}")
        raise Exception(f"An error occurred with the AI model: {str(e)}")
