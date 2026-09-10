# AgriSmart AI API Contract

## Base URL
`http://localhost:8000`

---

## Endpoints

### 1. Health Check
Checks backend operational status.

- **Method:** `GET`
- **Path:** `/health`
- **Request Headers:** None
- **Request Body:** None

#### Response (200 OK)
```json
{
  "status": "ok"
}
```

---

### 2. Predict Crop Disease
Submit a crop leaf image for diagnostic classification.

- **Method:** `POST`
- **Path:** `/api/predictions`
- **Content-Type:** `multipart/form-data`
- **Form Fields:**
  - `image`: Binary file (JPEG, PNG, WEBP, BMP). Maximum size: 15MB.

*Status: Inference implementation pending trained checkpoint.*

#### Expected Response (200 OK — Upon model checkpoint deployment)
```json
{
  "predicted_class": "Tomato___Early_blight",
  "confidence": 0.9624,
  "model_version": "v1.0.0"
}
```

#### Error Responses

##### 400 Bad Request
Occurs if the file is missing, empty, or has an invalid extension:
```json
{
  "detail": "Invalid file extension '.pdf'. Allowed extensions: .bmp, .jpeg, .jpg, .png, .webp"
}
```

##### 413 Payload Too Large
Occurs if the file exceeds 15MB:
```json
{
  "detail": "File exceeds maximum allowed size of 15MB."
}
```

##### 503 Service Unavailable
Occurs when no verified trained checkpoint has been placed in the system:
```json
{
  "detail": "No trained model checkpoint found at 'model/checkpoints/best_model.pt'. In accordance with SIH guidelines, model training will be performed with the official organizer dataset and class labels. Fake predictions are strictly prohibited."
}
```
