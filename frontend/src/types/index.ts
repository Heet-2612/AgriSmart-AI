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

export interface RankedCropRecommendation {
  crop: string;
  confidence?: number;
  probability?: number;
  confidence_tier?: string;
}

export interface CropRecommendationRequest {
  state: string;
  district: string;
  temperature: number;
  humidity: number;
  rainfall: number;
  soil_type: string;
  previous_crop: string;
}

export interface CropRecommendationResponse {
  recommended_crop: string;
  confidence: number;
  confidence_level: string;
  recommendations?: Array<RankedCropRecommendation | string>;
  top_k_recommendations?: RankedCropRecommendation[];
  explanation?: string;
  model_version?: string;
  input_features?: Record<string, unknown>;
}
