import pytest
from unittest.mock import patch, MagicMock
from uuid import uuid4
from datetime import datetime, timezone
from pydantic import ValidationError
from google.genai.errors import APIError as GeminiAPIError
from groq import APIError as GroqAPIError, RateLimitError as GroqRateLimitError
from app.schemas import ChatContext, DiseaseMetadata, WeatherContext, ChatAnswer
from app.services.genai_service import generate_chat_answer, _build_grounding_context
from app.core.errors import ChatProviderUnavailableError

@pytest.fixture
def valid_context():
    return ChatContext(
        predicted_class="Apple_scab",
        confidence=0.95,
        probabilities={"Apple_scab": 0.95, "Healthy": 0.05},
        model_version="v1.0",
        leaf_detected=True,
        fallback_used=False,
        disease_metadata=DiseaseMetadata(
            display_name="Apple Scab",
            symptoms="Dark lesions on leaves",
            treatment="Fungicide A"
        ),
        question="What should I do?",
        session_id=uuid4()
    )

@patch("app.services.genai_service.get_gemini_client")
@patch("app.services.genai_service.get_groq_client")
def test_groq_successful_answer(mock_get_groq, mock_get_gemini, valid_context):
    mock_groq = MagicMock()
    mock_response = MagicMock()
    mock_response.choices = [MagicMock(message=MagicMock(content="This is a Groq answer."))]
    mock_groq.chat.completions.create.return_value = mock_response
    mock_get_groq.return_value = mock_groq
    
    mock_get_gemini.return_value = None
    
    answer = generate_chat_answer(valid_context)
    
    assert isinstance(answer, ChatAnswer)
    assert answer.answer == "This is a Groq answer."
    assert answer.source == "groq"
    assert answer.grounded is True
    assert answer.session_id == valid_context.session_id

@patch("app.services.genai_service.get_gemini_client")
@patch("app.services.genai_service.get_groq_client")
def test_groq_temporary_failure_gemini_fallback(mock_get_groq, mock_get_gemini, valid_context):
    from groq import InternalServerError as GroqInternalServerError
    mock_groq = MagicMock()
    mock_groq.chat.completions.create.side_effect = GroqInternalServerError("Server Error", response=MagicMock(), body=None)
    mock_get_groq.return_value = mock_groq
    
    mock_gemini = MagicMock()
    mock_response = MagicMock()
    mock_response.text = "This is a Gemini answer."
    mock_gemini.models.generate_content.return_value = mock_response
    mock_get_gemini.return_value = mock_gemini
    
    answer = generate_chat_answer(valid_context)
    
    assert answer.answer == "This is a Gemini answer."
    assert answer.source == "gemini"
    assert answer.grounded is True

@patch("app.services.genai_service.get_gemini_client")
@patch("app.services.genai_service.get_groq_client")
def test_groq_auth_failure_no_fallback(mock_get_groq, mock_get_gemini, valid_context):
    from groq import APIError as GroqAPIError
    mock_groq = MagicMock()
    # 401 Unauthorized/Fatal error -> should raise
    mock_groq.chat.completions.create.side_effect = GroqAPIError("Unauthorized", request=MagicMock(), body=None)
    mock_get_groq.return_value = mock_groq
    
    mock_get_gemini.return_value = None
    
    with pytest.raises(GroqAPIError):
        generate_chat_answer(valid_context)

@patch("app.services.genai_service.get_gemini_client")
@patch("app.services.genai_service.get_groq_client")
def test_groq_empty_response_fallback(mock_get_groq, mock_get_gemini, valid_context):
    mock_groq = MagicMock()
    mock_response_groq = MagicMock()
    mock_response_groq.choices = [MagicMock(message=MagicMock(content=""))] # Empty response
    mock_groq.chat.completions.create.return_value = mock_response_groq
    mock_get_groq.return_value = mock_groq
    
    mock_gemini = MagicMock()
    mock_response = MagicMock()
    mock_response.text = "Gemini fallback."
    mock_gemini.models.generate_content.return_value = mock_response
    mock_get_gemini.return_value = mock_gemini
    
    answer = generate_chat_answer(valid_context)
    assert answer.source == "gemini"

@patch("app.services.genai_service.get_gemini_client")
@patch("app.services.genai_service.get_groq_client")
def test_gemini_empty_response(mock_get_groq, mock_get_gemini, valid_context):
    mock_get_groq.return_value = None # Skip Groq
    
    mock_gemini = MagicMock()
    mock_response = MagicMock()
    mock_response.text = "   " # Empty after strip
    mock_gemini.models.generate_content.return_value = mock_response
    mock_get_gemini.return_value = mock_gemini
    
    with pytest.raises(ChatProviderUnavailableError):
        generate_chat_answer(valid_context)

@patch("app.services.genai_service.get_gemini_client")
@patch("app.services.genai_service.get_groq_client")
def test_both_providers_fail(mock_get_groq, mock_get_gemini, valid_context):
    from groq import InternalServerError as GroqInternalServerError
    mock_groq = MagicMock()
    mock_groq.chat.completions.create.side_effect = GroqInternalServerError("Server Error", response=MagicMock(), body=None)
    mock_get_groq.return_value = mock_groq
    
    mock_gemini = MagicMock()
    mock_gemini.models.generate_content.side_effect = GeminiAPIError(503, {}, None)
    mock_get_gemini.return_value = mock_gemini
    
    with pytest.raises(ChatProviderUnavailableError):
        generate_chat_answer(valid_context)

def test_missing_disease_metadata():
    context = ChatContext(
        predicted_class="Apple_scab",
        confidence=0.95,
        probabilities={"Apple_scab": 0.95, "Healthy": 0.05},
        model_version="v1.0",
        leaf_detected=True,
        question="What should I do?",
        session_id=uuid4()
    )
    
    answer = generate_chat_answer(context)
    assert answer.grounded is False
    assert answer.source == "system"
    assert "not have enough specific disease information" in answer.answer

def test_leaf_detected_false():
    context = ChatContext(
        predicted_class="Apple_scab",
        confidence=0.95,
        probabilities={"Apple_scab": 0.95, "Healthy": 0.05},
        model_version="v1.0",
        leaf_detected=False,
        disease_metadata=DiseaseMetadata(display_name="Scab", symptoms="", treatment=""),
        question="What should I do?",
        session_id=uuid4()
    )
    
    answer = generate_chat_answer(context)
    assert answer.grounded is False
    assert answer.source == "system"
    assert "uploading a clearer photo" in answer.answer

def test_ambiguous_prediction_grounding(valid_context):
    # Set ambiguity with diff < 0.15
    valid_context.probabilities = {"Apple_scab": 0.40, "Cedar_apple_rust": 0.35, "Healthy": 0.25}
    grounding_text = _build_grounding_context(valid_context)
    
    assert "prediction is somewhat ambiguous" in grounding_text
    assert "Cedar_apple_rust is also a possibility" in grounding_text

def test_fallback_used_grounding(valid_context):
    valid_context.fallback_used = True
    grounding_text = _build_grounding_context(valid_context)
    assert "fallback diagnostic was used" in grounding_text
    
def test_schema_probability_validation():
    with pytest.raises(ValidationError):
        ChatContext(
            predicted_class="Apple_scab",
            confidence=0.95,
            probabilities={"Apple_scab": 1.5}, # Invalid probability
            model_version="v1.0",
            leaf_detected=True,
            question="Help",
            session_id=uuid4()
        )

def test_schema_whitespace_question():
    with pytest.raises(ValidationError):
        ChatContext(
            predicted_class="Apple_scab",
            confidence=0.95,
            probabilities={"Apple_scab": 0.95},
            model_version="v1.0",
            leaf_detected=True,
            question="   \n   ", # Only whitespace
            session_id=uuid4()
        )
