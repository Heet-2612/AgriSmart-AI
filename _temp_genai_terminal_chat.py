import sys
import uuid
import warnings
from datetime import datetime
from dotenv import load_dotenv

# Suppress DeprecationWarnings from SDK for cleaner output
warnings.filterwarnings("ignore", category=DeprecationWarning)
load_dotenv('.env')

from app.schemas import ChatContext, DiseaseMetadata, WeatherContext
from app.services.genai_service import generate_chat_answer
from app.core.errors import ChatProviderUnavailableError

session_id = uuid.uuid4()

def get_tomato_context(question: str) -> ChatContext:
    md = DiseaseMetadata(
        display_name="Tomato Late Blight",
        symptoms="Dark water-soaked spots on leaves and stems, which may rapidly enlarge. Infected areas can turn brown or black, especially during cool and wet conditions.",
        treatment="Remove and safely dispose of severely infected plant material. Apply appropriate fungicide according to the product label and local agricultural guidance.",
        precautions="Avoid overhead watering, improve air circulation, remove infected plant debris, and avoid working with wet plants."
    )
        
    return ChatContext(
        predicted_class="Tomato___Late_blight",
        confidence=0.82,
        probabilities={
            "Tomato___Late_blight": 0.82,
            "Tomato___Early_blight": 0.11,
            "Potato___Late_blight": 0.04
        },
        model_version="E5_YOLOv8n_E4",
        leaf_detected=True,
        fallback_used=False,
        disease_metadata=md,
        weather_context=WeatherContext(risk_level="high", rainfall_probability=0.75, temperature=22.5, humidity=82.0),
        location_context={"region": "Ahmedabad, Gujarat", "crop_season": "Kharif"},
        farmer_context={"crop_type": "Tomato", "farm_size_acres": "2 acres"},
        question=question,
        session_id=session_id,
        language="en"
    )

def print_header():
    print("="*60)
    print("              🌱 AGRISMART AI — FARMER CHAT")
    print("="*60)
    print()
    print("Crop              : Tomato")
    print("Detected Disease  : Tomato Late Blight")
    print("Confidence        : 82%")
    print("Weather Risk      : HIGH")
    print("Temperature       : 22.5°C")
    print("Humidity          : 82%")
    print("Rain Probability  : 75%")
    print("Location          : Ahmedabad, Gujarat")
    print()
    print("AI Provider       : Groq -> Gemini fallback")
    print()
    print("Example questions:")
    print("1. What treatment should I follow?")
    print("2. How can I prevent this disease?")
    print("3. Is the weather risky for my tomatoes?")
    print("4. What should I do first?")
    print("5. What disease did the model detect?")
    print("6. Can I water the plants today?")
    print()
    print("Type your question below.")
    print("Type 'exit' or 'quit' to end the demo.")
    print("="*60)
    print()

def main():
    print_header()
    
    while True:
        try:
            user_input = input("👨‍🌾 Farmer: ")
            if user_input.strip().lower() in ['exit', 'quit']:
                break
                
            if not user_input.strip():
                continue
                
            ctx = get_tomato_context(user_input)
            
            try:
                ans = generate_chat_answer(ctx)
                
                print("\n🤖 AgriSmart AI:")
                print(ans.answer)
                print("\n" + "-"*60)
                print(f"Provider : {ans.source.capitalize()}")
                print(f"Grounded : {ans.grounded}")
                print("-" * 60 + "\n")
                
            except ChatProviderUnavailableError:
                print("\n⚠️ AI service is temporarily unavailable.")
                print("Please try again later.\n")
                
        except EOFError:
            break
        except KeyboardInterrupt:
            break
        except Exception as e:
            print(f"\n⚠️ Unexpected Error: {e}\n")

    print("\n" + "="*60)
    print("Demo ended. Thank you for using AgriSmart AI 🌱")
    print("="*60)

if __name__ == "__main__":
    main()
