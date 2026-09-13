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
  soil_type_default?: string | null;
}

export interface WeatherResponse {
  location: WeatherLocation;
  current: WeatherCurrent;
  daily: WeatherDaily;
  climate?: SeasonalClimate | null;
  advisories: string[];
  timestamp?: string | null;
}

// ==========================================
// Simulated IoT Telemetry Types
// ==========================================

export interface SensorTelemetry {
  preset_id?: string;
  soil_moisture_percent: number;
  soil_temperature_celsius: number;
  irrigation_flow_rate_lpm: number;
  irrigation_duration_minutes: number;
  water_tank_level_percent?: number;
  soil_ph?: number;
  soil_ec_ds_m?: number;
  is_simulated: boolean;
}

export interface IoTPreset {
  preset_id: string;
  name: string;
  description: string;
  telemetry: SensorTelemetry;
}

export interface IoTPresetsResponse {
  presets: IoTPreset[];
}

// ==========================================
// Sustainability Score Types
// ==========================================

export type IrrigationAction = 'delay' | 'irrigate_now';
export type ScoreLabel = 'Excellent' | 'Good' | 'Needs Improvement';

export interface SustainabilityScoreRequest {
  crop: string;
  farm_area_hectares?: number;
  soil_type?: string;
  previous_crop?: string;
  action?: IrrigationAction;
  temperature_celsius: number;
  humidity_percent: number;
  rain_probability_percent?: number;
  expected_rainfall_mm?: number;
  telemetry?: SensorTelemetry;
  soil_moisture_percent?: number;
}

export interface ScoreBreakdownItem {
  dimension: string;
  points: number;
  max_points: number;
  percentage: number;
  reason: string;
  status: string;
}

export interface WaterImpactEstimate {
  litres: number;
  impact_type: 'avoided' | 'saved' | 'unnecessary_use' | 'neutral';
  label: string;
  formula_basis: string;
}

export interface ActionComparisonOption {
  action: IrrigationAction;
  score: number;
  score_label: ScoreLabel;
  water_impact_litres: number;
  water_impact_type: string;
}

export interface SustainabilityScoreResponse {
  total_score: number;
  score_label: ScoreLabel;
  summary: string;
  recommendation: string;
  breakdown: Record<string, ScoreBreakdownItem>;
  water_impact: WaterImpactEstimate;
  comparison: Record<IrrigationAction, ActionComparisonOption>;
  telemetry_used: SensorTelemetry;
  simulated_telemetry_notice: string;
}
