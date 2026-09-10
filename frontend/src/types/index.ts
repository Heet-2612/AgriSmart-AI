export interface HealthResponse {
  status: string;
}

export interface PredictionResponse {
  predicted_class: string;
  confidence: number;
  model_version: string;
}

export interface ApiError {
  detail: string;
}
