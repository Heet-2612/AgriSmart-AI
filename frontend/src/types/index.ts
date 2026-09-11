export interface HealthResponse {
  status: string;
}

export interface PredictionResponse {
  predicted_class: string;
  confidence: number;
  model_version: string;
  probabilities?: Record<string, number>;
  display_name?: string;
  precaution?: string;
}

export interface ApiError {
  detail: string;
}
