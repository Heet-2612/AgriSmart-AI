export interface SensorTelemetry {
  soil_moisture_percent: number;
  soil_temperature_celsius: number;
  irrigation_flow_rate_lpm?: number;
  irrigation_duration_minutes?: number;
  water_tank_level_percent?: number;
  soil_ph?: number;
  soil_ec_ds_m?: number;
  preset_id?: string;
  is_simulated?: boolean;
}

export type ScoreLabel = 'Excellent' | 'Good' | 'Needs Improvement' | string;
export type IrrigationAction = 'delay' | 'irrigate_now';

export interface SustainabilityScoreRequest {
  crop: string;
  farm_area_hectares?: number;
  soil_type?: string | null;
  previous_crop?: string | null;
  action: 'delay' | 'irrigate_now' | string;
  temperature_celsius: number;
  humidity_percent: number;
  rain_probability_percent?: number;
  expected_rainfall_mm?: number;
  telemetry?: SensorTelemetry | null;
  soil_moisture_percent?: number | null;
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
  impact_type: 'saved' | 'unnecessary_use' | 'neutral' | string;
  label: string;
  formula_basis: string;
}

export interface ActionComparisonOption {
  action: 'delay' | 'irrigate_now' | string;
  score: number;
  score_label: string;
  water_impact_litres: number;
  water_impact_type: string;
}

export interface SustainabilityScoreResponse {
  total_score: number;
  score_label: 'Excellent' | 'Good' | 'Needs Improvement' | string;
  summary: string;
  recommendation: string;
  breakdown: Record<string, ScoreBreakdownItem>;
  water_impact: WaterImpactEstimate;
  comparison: Record<string, ActionComparisonOption>;
  telemetry_used: SensorTelemetry;
  simulated_telemetry_notice: string;
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
