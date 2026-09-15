# AgriSmart AI

AgriSmart AI is a comprehensive, intelligent agricultural platform designed for Smart India Hackathon 2026. It leverages computer vision, predictive weather intelligence, and generative AI to deliver robust crop disease diagnosis, localized agronomic interventions, and interactive farmer assistance, ultimately driving resilient farming practices.

## Problem Statement

Crop diseases and unpredictable weather patterns cause significant agricultural losses, especially in rural regions where manual diagnosis and expert agronomic advice are slow or unavailable. Farmers lack immediate, data-driven interventions tailored to their exact location and specific crop conditions, resulting in over-spraying, wasted irrigation, and diminished yields.

## Solution

AgriSmart AI bridges the gap between expert agronomy and rural farming by providing an offline-capable, scalable diagnostic ecosystem. By fusing deep learning-based foliar disease detection with hyper-local weather intelligence and a robust GenAI fallback chain, the platform offers farmers real-time, actionable insights for irrigation, spraying, and crop management.

## Key Features

- **Instant Disease Diagnosis:** Rapid identification of crop diseases using a multi-stage PyTorch-based computer vision pipeline.
- **Hyper-local Weather Intelligence:** Actionable agronomic rules based on Open-Meteo forecasts and India Meteorological Department (IMD) climatological normals (1981–2010), supplemented by simulated deterministic IoT telemetry.
- **Resilient Farmer Assistant:** Context-aware generative AI with an automated provider fallback mechanism.
- **Actionable Agronomy:** Automated recommendations for irrigation and chemical applications.
- **Modular Monolith Backend:** Fast, scalable API built on FastAPI and PostgreSQL.

## System Architecture

The platform is built as a robust modular monolith:
1. **Frontend:** React SPA built with Vite and TypeScript, featuring modular, independent components for weather, diagnostics, and AI assistance (UI layout is functionally driven and actively being iterated for optimal user experience).
2. **Backend:** FastAPI handling strict request validation, routing, and error reporting, supported by PostgreSQL for persistent logging.
3. **AI Integration:** 
   - Local PyTorch inference interface for disease detection.
   - External API integrations (Open-Meteo, Google Gemini, Groq) orchestrated with fault-tolerant service layers.

## Disease Diagnosis Pipeline (E14/E12/E11)

The disease diagnosis pipeline utilizes a multi-stage PyTorch inference architecture designed for edge and cloud deployment. To ensure diagnostic safety, the pipeline follows a strict gating sequence:
- **E14 Leaf Gate:** A presence gate that evaluates whether the image contains foliage or degenerate/background elements. E14 achieved a verified **94.83%** overall accuracy on the locked audit set.
- **E12 Validity Gate:** A SigLIP-based classifier that verifies if the crop is a supported species (e.g., Potato, Tomato, Corn, Apple). E12 achieved a verified **98.62%** validation accuracy and an **88.89%** accuracy on supported leaves in the locked audit.
- **E11 Disease Predictor:** The final stage performing 10-class crop-disease image classification. The architecture uses a frozen SigLIP ViT-B/16 (`vit_base_patch16_siglip_224`) backbone with a 768→10 linear classification head.
  - **Production Checkpoint:** `model/checkpoints/E11_SigLIP_HYBRID10_PRODUCTION.pt`
  - **SHA-256:** `a51d814fc434c514743180a9df596d6a5aa6d250e7b3e496dd5927fdea6c64df`
  - **Supported Classes (10):** Potato Early Blight, Potato Late Blight, Potato Healthy, Corn Gray Leaf Spot, Corn Healthy, Tomato Yellow Leaf Curl Virus, Tomato Healthy, Apple Scab, Apple Cedar Rust, Apple Healthy.

### E11 Evaluation Metrics
- **PUBLIC Held-Out Field-Condition Test Set (1,708 images):**
  - **Macro-F1:** 95.07%
  - **Accuracy:** 96.31%
- **PlantVillage Validation Set:**
  - **Macro-F1:** 98.96%

## Weather Intelligence

The Weather Intelligence module provides localized, deterministic agronomic guidance. Using the Open-Meteo API and historical IMD climatological normals (1981–2010), along with simulated deterministic IoT telemetry, the system analyzes location-specific weather conditions (such as precipitation probability, wind speed, and soil moisture). It applies precise, rule-based logic to issue actionable directives like recommending optimal irrigation and spraying windows. Rather than attempting to diagnose diseases from weather, it strictly identifies "raised disease risk — monitor" to prompt visual inspection by the farmer.

## Crop Recommendation

The platform architecture includes a dedicated module to process soil and environmental parameters, delivering data-driven crop recommendations. This ensures farmers are advised on the most viable crops based on their specific geographical and climatological profiles.

## Sustainability Score

AgriSmart AI evaluates farming practices against sustainable agronomic baselines. By analyzing resource utilization (e.g., water usage, targeted spraying), the system calculates a sustainability score, encouraging ecological farming and reducing chemical runoff.

## Farmer Assistant

The Farmer Assistant is an interactive, conversational AI tailored for agricultural queries. It is powered by a highly resilient generative AI failover architecture:
- **Primary Provider:** Google Gemini utilizing the exact model `gemini-3.1-flash-lite` for high-speed, accurate agronomic reasoning.
- **Fallback Provider:** Groq utilizing the exact model `qwen/qwen3.8-27b`, ensuring uninterrupted service during transient primary API failures.
This dual-provider strategy guarantees high availability for critical farmer support.

## Tech Stack

- **Frontend:** Node.js 22.x, React 19.x, TypeScript 5.x, Vite 6.2.x, Tailwind CSS 4.x
- **Backend:** Python 3.12.x, FastAPI 0.116.x, Pydantic 2.11.x, SQLAlchemy 2.0.x, PostgreSQL 17.x
- **AI / ML:** PyTorch 2.7.x, torchvision 0.22.x, scikit-learn 1.9.x, google-genai, groq
- **Testing:** pytest 8.x, Vitest 3.x

## Setup

### Local Environment
1. Clone the repository and checkout the feature branch:
   ```bash
   git clone <repo-url>
   cd AgriSmartAi
   git checkout feat/weather-intelligence-genai
   ```
2. Configure environment variables (do not commit secrets):
   ```bash
   cp .env.example .env
   ```
3. Initialize the backend:
   ```bash
   python -m venv .venv
   source .venv/Scripts/activate  # Windows
   pip install -r requirements.txt
   ```
4. Start the backend server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
5. Initialize the frontend:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

### Docker
```bash
docker-compose up --build -d
```

## Testing

The repository maintains strict test coverage ensuring system reliability:
- **Backend:** Automated tests via `pytest` (202 tests passing), validating the FastAPI routes, pipeline architecture, and GenAI fallback logic.
- **Frontend:** Automated component and unit tests via `vitest` (149 tests passing).

## Data Sources

- **Weather Data:** High-resolution meteorological data provided by the Open-Meteo API.
- **Climate Data:** Historical district climatological profiles provided by India Meteorological Department (IMD) Normals (1981-2010).
- **Agricultural Corpus:** Domain-specific context fed into the Farmer Assistant via Google Gemini and Groq models.
- **Disease Dataset:** PlantVillage validation data and a public held-out field-condition test set.

## Limitations

- **Domain Gap & Robustness:** Visual diagnosis accuracy may vary when transitioning from controlled lab imagery to complex field conditions with shadows and background clutter. To ensure reliable performance, the system's robustness is rigorously evaluated against challenging, real-world field-condition test data.
- **Sensor Variability:** Low-budget mobile camera sensors may introduce noise and motion blur, impacting inference confidence.
- **Early Symptom Overlap:** Phenotypically similar lesions in early disease stages present a classification challenge.

## Hackathon Positioning

AgriSmart AI is positioned as a comprehensive, hackathon-ready agricultural decision-support platform with a modular backend and frontend. By demonstrating strict engineering practices—such as resilient API fallbacks, deterministic agronomic rule engines, rigorous pipeline gating, and comprehensive automated testing—the project provides a scalable foundation for modern agricultural interventions, strictly aligned with the goals of Smart India Hackathon 2026.
