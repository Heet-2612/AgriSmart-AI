export interface HealthResponse {
  status: string;
}

export interface PredictionResponse {
  predicted_class: string;
  confidence: number;
  model_version: string;
  display_name?: string;
  precaution?: string;
  probabilities?: Record<string, number>;
  pipeline?: string;
  leaf_detected?: boolean;
  roi_count?: number;
  fallback_used?: boolean;
}

export type ChatLanguage = 'en' | 'hi' | 'gu';

export interface ChatRequest {
  predicted_class: string;
  confidence: number;
  probabilities: Record<string, number>;
  model_version: string;
  leaf_detected?: boolean;
  fallback_used?: boolean;
  question: string;
  session_id: string;
  language?: ChatLanguage;
}

export interface ChatAnswer {
  answer: string;
  session_id: string;
  grounded: boolean;
  source: string;
  timestamp: string;
}

export interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export interface ChatSessionResponse {
  id: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessageResponse {
  id: number;
  role: 'user' | 'assistant' | string;
  content: string;
  created_at: string;
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

export * from './auth';
export * from './sustainability';
