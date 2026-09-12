# Implementation Plan: Bonus Module — Crop Recommendation Engine

## 1. Overview & Architectural Scope

The **Crop Recommendation Engine** is an isolated, machine learning–based agricultural decision-support module within AgriSmart AI. It provides smallholder farmers with ranked, data-driven crop selection guidance based on 7 soil chemistry and ambient microclimate indicators.

### Strict Architectural Boundaries
1. **Isolated from Computer Vision Disease Detection:**
   - Crop Recommendation operates exclusively on tabular agronomic features (`N, P, K, temperature, humidity, ph, rainfall`).
   - It does NOT interact with, share weights with, or modify the PyTorch CNN/Vision Transformer leaf disease detection pipeline.
2. **Decision Support Nature & Agronomic Disclaimer:**
   - Recommendations are probabilistic decision-support outputs based on statistical modeling.
   - They do **not** constitute an agronomic guarantee of crop yield, disease immunity, market price, or financial return.
   - Farmers should combine model outputs with local soil testing laboratory reports and regional agricultural extension guidance.
3. **No Automatic Training on Startup:**
   - The FastAPI backend application never initiates model training or downloads large external files during its lifecycle or startup events.
   - Inference uses pre-compiled serialized artifacts (`.joblib` + `.json` metadata).

---

## 2. Dataset Specification & Provenance Protocol

### Required Columns & Units
The training pipeline requires a clean CSV dataset with exactly 8 features:

| Column Header | Standard Alias | Data Type | Physical Unit | Permissible Range | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `N` | `nitrogen` | Numeric (Float) | kg/ha | $\ge 0.0$ | Nitrogen nutrient ratio in soil |
| `P` | `phosphorus` | Numeric (Float) | kg/ha | $\ge 0.0$ | Phosphorus nutrient ratio in soil |
| `K` | `potassium` | Numeric (Float) | kg/ha | $\ge 0.0$ | Potassium nutrient ratio in soil |
| `temperature` | `temperature` | Numeric (Float) | °C | Finite Float | Ambient air temperature |
| `humidity` | `humidity` | Numeric (Float) | % | $0.0 – 100.0$ | Relative atmospheric humidity |
| `ph` | `ph` | Numeric (Float) | pH scale | $0.0 – 14.0$ | Soil acidity / alkalinity |
| `rainfall` | `rainfall` | Numeric (Float) | mm | $\ge 0.0$ | Precipitation depth |
| `label` | `crop` | Categorical (String) | N/A | Non-empty | Target crop classification category |

### Dataset Placement Instructions
When an authentic, appropriately licensed dataset (e.g. *Crop Recommendation Dataset*, CC BY 4.0) is acquired:
1. Place the verified CSV file at:
   ```text
   model/crop_recommendation/data/Crop_recommendation.csv
   ```
2. Do **not** fabricate, synthesize, or commit unverified synthetic training data to the repository.
3. The training pipeline validates all column names, data types, and nullity before proceeding.

---

## 3. Training & Validation Protocol

### Algorithm Specification
* **Classifier:** `sklearn.ensemble.RandomForestClassifier`
* **Hyperparameters:**
  * `n_estimators`: 100
  * `criterion`: `'gini'`
  * `random_state`: 42 (ensures deterministic reproducibility)
  * `n_jobs`: -1 (parallel CPU tree construction)

### Train / Test Split Protocol
* **Data Split:** 80% Training Set, 20% Held-out Test Set.
* **Stratification:** Enabled (`stratify=y`) to maintain identical class balance across both splits.
* **Random Seed:** `random_state=42`.

### Evaluation Metrics & Reporting
When training executes on a cited dataset, the script automatically generates:
1. **Held-Out Test Accuracy:** Overall classification accuracy on unseen 20% test samples.
2. **Macro & Weighted F1-Scores:** Evaluates performance across all multi-class targets without bias toward dominant classes.
3. **Classification Report:** Detailed per-crop precision, recall, and F1 metrics.
4. **Confusion Matrix:** Saved to `report/confusion-matrix/crop_recommendation_confusion_matrix.json` (or `.png`).

### Artifact Serialization & Storage
All training outputs are persisted independently in the `model/crop_recommendation/` directory:
* **Trained Model Binary:** `model/crop_recommendation/crop_model.joblib`
* **Metadata & Schema:** `model/crop_recommendation/model_metadata.json`
  * Contains: `model_version`, `features` (ordered list), `classes` (ordered list), `training_timestamp`, and `evaluation_metrics`.

---

## 4. REST API Contract & Validation Rules

### Endpoint Definition
* **Method:** `POST`
* **Route:** `/api/crop-recommendation`
* **Tags:** `Crop Recommendation`
* **Content-Type:** `application/json`

### Request Payload (`CropRecommendationRequest`)
```json
{
  "nitrogen": 90.0,
  "phosphorus": 42.0,
  "potassium": 43.0,
  "temperature": 26.5,
  "humidity": 80.0,
  "ph": 6.5,
  "rainfall": 202.0
}
```

#### Strict Pydantic Validation Constraints:
- `nitrogen`: Finite float, $\ge 0.0$ (rejects negative numbers and non-finite values)
- `phosphorus`: Finite float, $\ge 0.0$
- `potassium`: Finite float, $\ge 0.0$
- `temperature`: Finite float
- `humidity`: Finite float, $0.0 \le \text{humidity} \le 100.0$
- `ph`: Finite float, $0.0 \le \text{ph} \le 14.0$
- `rainfall`: Finite float, $\ge 0.0$
- **Validation Failure:** Returns HTTP `422 Unprocessable Entity` with explicit field-level error messages.

### Response Payload (`CropRecommendationResponse`)
```json
{
  "recommended_crop": "rice",
  "confidence": 0.92,
  "top_3_recommendations": [
    { "crop": "rice", "confidence": 0.92 },
    { "crop": "maize", "confidence": 0.05 },
    { "crop": "jute", "confidence": 0.03 }
  ],
  "input_summary": {
    "nitrogen": 90.0,
    "phosphorus": 42.0,
    "potassium": 43.0,
    "temperature": 26.5,
    "humidity": 80.0,
    "ph": 6.5,
    "rainfall": 202.0
  },
  "model_version": "v1.0.0-rf-crop",
  "explanation": "Recommended based on your soil nutrients, pH, temperature, humidity, and rainfall."
}
```

### Unavailability Handling (503 Service Unavailable)
If the serialized model file `model/crop_recommendation/crop_model.joblib` does not exist:
* The endpoint returns HTTP `503 Service Unavailable`:
  ```json
  {
    "detail": "Crop recommendation model checkpoint is not available. Please run model training first."
  }
  ```

---

## 5. Execution & Developer Instructions

### 1. Training Command (When Dataset is Present)
```powershell
python -m model.crop_recommendation.train --data model/crop_recommendation/data/Crop_recommendation.csv
```

### 2. Running Automated Backend Tests
```powershell
pytest tests/backend/test_crop_recommendation.py -v
```

---

## 6. Testing Strategy

The test suite in [`tests/backend/test_crop_recommendation.py`](file:///c:/Users/Hetav/OneDrive/LJ%20Practice/AgriSmart%20AI/AgriSmart-AI/tests/backend/test_crop_recommendation.py) guarantees:
1. **Pydantic Request Validation:**
   - Valid boundary tests (0 values for NPK, 0 and 100 for humidity, 0 and 14 for pH, 0 for rainfall).
   - Negative values rejection (NPK $<0$, rainfall $<0$).
   - Range violations rejection (humidity $<0$ or $>100$, pH $<0$ or $>14$).
   - Rejection of non-finite numbers (`NaN`, `Infinity`).
2. **Model Missing State (503):**
   - Correct HTTP 503 response and informative error detail when no model checkpoint is loaded.
3. **Inference & Probabilistic Ranking:**
   - Uses an isolated synthetic in-memory test model to verify true probability sorting for top-3 recommendations, confidence precision, and input echoing.
4. **Complete Offline Operation:**
   - Zero network requests and zero dependency on disease classification checkpoints.
