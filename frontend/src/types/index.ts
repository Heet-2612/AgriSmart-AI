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
  season?: string;
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
  precipitation?: number;
}

export interface WeatherDaily {
  temp_min: number;
  temp_max: number;
  precipitation_sum: number;
  precipitation_probability: number;
}

export interface SeasonalClimate {
  season: string;
  temperature_mean: number;
  humidity_mean: number;
  rainfall_normal: number;
  region: string;
  soil_type_default?: string;
}

export interface WeatherResponse {
  location: WeatherLocation;
  current: WeatherCurrent;
  daily: WeatherDaily;
  climate?: SeasonalClimate;
  advisories: string[];
  timestamp?: string;
}

