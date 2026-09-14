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
  pipeline?: string;
  is_conclusive?: boolean;
  status?: string;
  leaf_detected?: boolean;
  roi_count?: number;
  fallback_used?: boolean;
  crop_class?: string;
  crop_confidence?: number;
  rejection_reason?: string;
}

export interface ApiError {
  detail: string;
  status?: string | number;
  is_conclusive?: boolean;
  rejection_reason?: string;
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
  season?: string;
  top_k?: number;
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


// ==========================================
// Weather Intelligence Types
// ==========================================

export interface WeatherLocation {
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  state?: string;
  district?: string;
}

export interface WeatherCurrent {
  temperature: number;
  humidity: number;
  wind_speed: number;
  weather_code: number;
  condition: string;
  is_day?: boolean;
  precipitation?: number;
}

export interface WeatherDaily {
  temperature_max?: number;
  temperature_min?: number;
  temp_max?: number;
  temp_min?: number;
  precipitation_sum: number;
  precipitation_probability_max?: number;
  precipitation_probability?: number;
  wind_speed_max?: number;
}

export interface SeasonalClimate {
  region: string;
  season: string;
  temperature_mean: number;
  temperature_min: number;
  temperature_max: number;
  humidity_mean: number;
  rainfall_normal: number;
  climate_zone: string;
  soil_type_default?: string;
  source: string;
}

export interface WeatherResponse {
  location: WeatherLocation;
  current: WeatherCurrent;
  daily: WeatherDaily;
  climate?: SeasonalClimate;
  advisories: string[];
  timestamp?: string;
}

export * from './auth';
export * from './sustainability';
