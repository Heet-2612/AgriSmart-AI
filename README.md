# AgriSmart AI

AgriSmart AI is an intelligent crop disease diagnosis platform designed for **Smart India Hackathon 2026**. The system provides automated computer vision inference to detect plant foliar diseases from leaf imagery and support resilient agricultural practices.

---

## Problem

Crop foliar diseases cause major agricultural losses worldwide. Manual visual diagnosis is often unavailable or slow in rural regions. AgriSmart AI aims to provide rapid, field-resilient diagnostic predictions under varied real-world conditions (illumination changes, complex backgrounds, and varying disease severity).

---

## Planned Architecture

```text
React Frontend (Vite + TypeScript)
        │
        ▼  (REST / multipart/form-data)
FastAPI Backend (Python 3.12)
        │
        ├─────────────────────────────┐
        ▼                             ▼
PyTorch Inference (In-process)   PostgreSQL 17.x
(model/inference/predict.py)     (Prediction Logs & Metadata)
```

* **Frontend:** React SPA with leaf image preview and diagnostic output.
* **Backend:** FastAPI modular monolith handling request validation, error reporting, and model routing.
* **PyTorch Inference:** Low-latency in-process inference interface.
* **PostgreSQL 17.x:** Relational store for diagnostic logging and history tracking.

---

## Repository Structure

```text
AgriSmart-AI/
├── README.md             # Project overview, instructions, and metrics
├── LICENSE               # MIT License
├── .gitignore            # Git exclusions
├── .env.example          # Environment variable template
├── requirements.txt      # Pinned Python dependencies
├── docker-compose.yml    # Docker services for PostgreSQL and FastAPI
├── app/                  # FastAPI web application and routing
├── model/                # Model training, inference, and checkpoints
├── report/               # Model evaluation report and metrics
├── frontend/             # React + TypeScript + Vite web client
├── database/             # Database migrations and seed scripts
├── docs/                 # Architecture, API contract, and guides
├── tests/                # Automated backend, model, and e2e test suites
└── scripts/              # Setup and execution shell scripts
```

---

## Technology Stack

* **Runtime:** Python 3.12.x, Node.js 22.x
* **Frontend:** React 19.x, TypeScript 5.x, Vite 7.x, Tailwind CSS 4.x
* **Backend:** FastAPI 0.116.x, Pydantic 2.11.x, SQLAlchemy 2.0.x, Alembic 1.16.x
* **AI / ML:** PyTorch 2.7.x, torchvision 0.22.x, timm 1.0.x, Albumentations 2.0.x, scikit-learn 1.7.x, MLflow 3.15.x
* **Database:** PostgreSQL 17.x
* **Testing:** pytest 8.x, Vitest 3.x, React Testing Library 16.x, Playwright 1.53.x

*Note: Base PyTorch wheels are specified. CUDA version is NOT assumed and will be configured based on the actual training GPU environment.*

---

## Setup Placeholder

### Local Setup
1. Clone repository: `git clone <repo-url>`
2. Setup backend: `python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt`
3. Start database: `docker-compose up -d postgres`
4. Run backend: `uvicorn app.main:app --reload --port 8000`
5. Setup frontend: `cd frontend && npm install && npm run dev`

### Docker Setup
```bash
docker-compose up --build
```

---

## Dataset Placeholder

* **Dataset source:** TBD — official organizer source to be confirmed
* **Dataset licence:** TBD
* **Dataset split:** TBD
* **Disease classes:** TBD

*No dataset is downloaded or fabricated in this initial scaffold.*

---

## Planned Model Experiments

* **E1:** ResNet-50 baseline
* **E2:** EfficientNet-B2
* **E3:** ConvNeXt-Tiny
* **E4:** Best candidate + stronger domain-shift-aware augmentation
* **E5:** Targeted fine-tuning of strongest candidate

---

## Metrics Placeholder

> Model training pending. No experimental metrics are available yet.

| Model | Macro-F1 | Accuracy |
| :--- | :---: | :---: |
| ResNet-50 | TBD | TBD |
| EfficientNet-B2 | TBD | TBD |
| ConvNeXt-Tiny | TBD | TBD |

---

## Known Limitations

* **Domain gap:** Field imagery with complex background clutter and shadows differs from controlled lab photos.
* **Early symptoms:** Phenotypically similar lesions across different pathogens in early growth phases.
* **Sensor quality:** Noise and motion blur on budget mobile camera sensors.

---

---

## Bonus Module 1: Intelligent Crop Recommendation

AgriSmart AI features an isolated machine learning **Crop Recommendation Engine** that determines the optimal crop variety for a farm field based on 7 soil chemistry and atmospheric environmental factors.

### Problem & Objective
Soil nutrient imbalances and climate variations lead to sub-optimal crop selection, reduced yields, and economic losses for smallholder farmers. The Crop Recommendation module analyzes soil NPK ratios, soil acidity (pH), ambient temperature, humidity, and rainfall to provide ranked agricultural recommendations with calibrated probability distributions.

### Dataset & Source
* **Dataset Name:** Crop Recommendation Dataset
* **Source:** Public agricultural benchmark dataset (Kaggle / Atharva Ingle)
* **License:** Creative Commons Attribution 4.0 International (CC BY 4.0)
* **Dataset Size:** 2,200 records (100 samples per crop class across 22 classes)
* **Target Classes (22):** `rice`, `maize`, `chickpea`, `kidneybeans`, `pigeonpeas`, `mothbeans`, `mungbean`, `blackgram`, `lentil`, `pomegranate`, `banana`, `mango`, `grapes`, `watermelon`, `muskmelon`, `apple`, `orange`, `papaya`, `coconut`, `cotton`, `jute`, `coffee`

### Input Features & Units
| Feature | Agronomic Name | Unit | Valid Range |
| :--- | :--- | :--- | :--- |
| `nitrogen` | Soil Nitrogen (N) ratio | kg/ha | 0 – 300 |
| `phosphorus` | Soil Phosphorus (P) ratio | kg/ha | 0 – 300 |
| `potassium` | Soil Potassium (K) ratio | kg/ha | 0 – 300 |
| `temperature` | Ambient Temperature | °C | -10 – 60 |
| `humidity` | Relative Atmospheric Humidity | % | 0 – 100 |
| `ph` | Soil Acidity / Alkalinity level | pH scale | 0.0 – 14.0 |
| `rainfall` | Precipitation depth | mm | 0 – 500 |

### ML Architecture & Training Configuration
* **Model:** `RandomForestClassifier(n_estimators=100, random_state=42)`
* **Train / Test Split:** 80% Train (1,760 samples) / 20% Test (440 samples), Stratified (`stratify=y`)
* **Random Seed:** `42` (ensures exact deterministic reproducibility)

### Held-Out Test Evaluation Metrics
* **Held-out Test Accuracy:** **99.55%** (438 / 440 correct)
* **Macro F1-Score:** **0.9954**
* **Weighted F1-Score:** **0.9954**
* **Macro Precision:** **0.9958**
* **Macro Recall:** **0.9955**

### Reproducibility & Execution Commands

```bash
# 1. Train Crop Recommendation Model & Generate Artifacts:
python -m model.crop_recommendation.train

# 2. Run Automated Backend Tests:
pytest tests/backend/test_crop_recommendation.py -v
```

### API Specification

* **Endpoint:** `POST /api/crop-recommendation`
* **Content-Type:** `application/json`
* **Status Codes:** `200 OK`, `422 Unprocessable Entity`, `503 Service Unavailable`

#### Request Payload Example
```json
{
  "nitrogen": 90.0,
  "phosphorus": 42.0,
  "potassium": 43.0,
  "temperature": 20.87,
  "humidity": 82.0,
  "ph": 6.5,
  "rainfall": 202.93
}
```

#### Response Payload Example
```json
{
  "recommended_crop": "rice",
  "confidence": 0.99,
  "top_3_recommendations": [
    { "crop": "rice", "confidence": 0.99 },
    { "crop": "jute", "confidence": 0.01 },
    { "crop": "coffee", "confidence": 0.0 }
  ],
  "input_summary": {
    "nitrogen": 90.0,
    "phosphorus": 42.0,
    "potassium": 43.0,
    "temperature": 20.87,
    "humidity": 82.0,
    "ph": 6.5,
    "rainfall": 202.93
  },
  "model_version": "v1.0.0-rf-crop",
  "explanation": "Recommended based on your soil nutrients, pH, temperature, humidity, and rainfall."
}
```

> **⚠️ Agricultural Decision Support Notice:** Recommendations provided by this module are generated through statistical machine learning models for decision-support purposes. Farmers should always consult certified local soil testing laboratories and local agricultural extension officers before committing major crop planting investments.

---

## Bonus Module: Weather Dashboard & Farm Advisory

AgriSmart AI features a real-time **Weather Dashboard and Rule-Based Farm Advisory** module powered by Open-Meteo APIs (zero API key configuration required).

### Features
* **Geocoding & Forecast:** Instant geocoding and real-time forecast retrieval for any city or district.
* **Core Metrics:** Current temperature, humidity, wind speed, WMO weather condition badge, today's minimum/maximum temperatures, expected precipitation, and precipitation probability.
* **Deterministic Farm Advisory Engine:** Translates meteorological variables into actionable agricultural guidance (irrigation adjustments, spraying restrictions, fungal disease inspection, heat protection).

### API Specification

* **Endpoint:** `GET /api/weather`
* **Query Parameter:** `location` (string, required) — e.g. `Pune`, `Nashik`, `Nagpur`
* **Response Status Codes:** `200 OK`, `400 Bad Request`, `404 Not Found`, `503 Service Unavailable`

#### Example Response (`GET /api/weather?location=Pune`)

```json
{
  "location": {
    "name": "Pune",
    "country": "India",
    "latitude": 18.51957,
    "longitude": 73.85535
  },
  "current": {
    "temperature": 24.2,
    "humidity": 82,
    "wind_speed": 10.0,
    "weather_code": 0,
    "condition": "Clear sky"
  },
  "daily": {
    "temp_min": 21.5,
    "temp_max": 29.9,
    "precipitation_sum": 1.5,
    "precipitation_probability": 71
  },
  "advisories": [
    "High chance of rain. Avoid applying fertilizer or pesticide immediately before rainfall.",
    "High humidity may increase fungal disease risk. Inspect crops and avoid prolonged leaf wetness."
  ]
}
```

> **Disclaimer:** Farm advisories are generated via deterministic agronomic threshold rules designed for SIH MVP decision support and do not constitute certified professional agronomic advice.

---

## Bonus Module: Sustainability Impact Score

AgriSmart AI includes a frontend-only, deterministic **Sustainability Impact Score** module demonstrating weather-aware irrigation analytics and farm water conservation for smallholder plots.

### Purpose
Showcases how weather-informed irrigation choices conserve groundwater and improve farm sustainability using transparent agricultural rules.

### Exact Transparent Rules & Points

#### 1. Water Efficiency (Maximum 50 points)
* **Delay irrigation** when rain probability $\ge 60\%$ AND expected rainfall $\ge 5\text{ mm}$: **40 points**
* **Irrigate now** under the same rain condition: **10 points**
* **Otherwise** (standard baseline conditions): **30 points**

#### 2. Weather-Smart Actions (Maximum 30 points)
* Rain probability $\ge 60\%$: **15 points**
* Ambient temperature between $18^\circ\text{C}$ and $34^\circ\text{C}$: **10 points**
* Relative humidity $\le 80\%$: **5 points**

#### 3. Soil and Crop Care (Maximum 20 points)
* Soil moisture in healthy root-zone range ($25\%$ to $40\%$): **12 points**
* Remaining **8 points** are explicitly *reserved for future disease-scan integration* and are not counted.

### Expected Scenario Scores
* **Option A: Follow Recommendation (Delay Irrigation):**
  * $\text{Score} = 40 + 30 + 12 = \mathbf{82/100}$ (`Excellent`)
  * **Water Impact:** $\mathbf{180\text{ Litres Saved}}$
* **Option B: Irrigate Now:**
  * $\text{Score} = 10 + 30 + 12 = \mathbf{52/100}$ (`Needs Improvement`)
  * **Water Impact:** $\mathbf{180\text{ Litres Unnecessary Use}}$

### Score Classification
* **80 – 100:** `Excellent`
* **60 – 79:** `Good`
* **0 – 59:** `Needs Improvement`

> **Badge & Disclaimer:** *Demo / Rule-Based MVP — Not an official environmental certification.* Water impact is an estimate based on a $0.1\text{-hectare}$ Tomato crop scenario.

---

## Demo

* **Demo video:** TBD
* **Deployed application:** TBD

