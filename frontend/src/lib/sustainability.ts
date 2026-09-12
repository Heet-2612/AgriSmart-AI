export type IrrigationAction = 'delay' | 'irrigate_now';

export interface SustainabilityInputs {
  crop: string;
  farmAreaHectares: number;
  soilMoisturePercent: number;
  rainProbabilityPercent: number;
  expectedRainfallMm: number;
  temperatureCelsius: number;
  humidityPercent: number;
  action: IrrigationAction;
}

export interface WaterEfficiencyBreakdown {
  points: number;
  maxPoints: number;
  reason: string;
}

export interface WeatherSmartBreakdown {
  points: number;
  maxPoints: number;
  rainPoints: number;
  tempPoints: number;
  humidityPoints: number;
  reasons: string[];
}

export interface SoilCropCareBreakdown {
  points: number;
  maxCurrentPoints: number;
  futurePoints: number;
  maxTotalPoints: number;
  soilMoisturePoints: number;
  futureDiseaseScanPoints: number;
  reason: string;
  futureNote: string;
}

export interface WaterImpact {
  litres: number;
  type: 'saved' | 'unnecessary_use';
  label: string;
  disclaimer: string;
}

export type ScoreLabel = 'Excellent' | 'Good' | 'Needs Improvement';

export interface SustainabilityScoreResult {
  totalScore: number;
  maxCurrentScore: number;
  maxPossibleScore: number;
  scoreLabel: ScoreLabel;
  waterEfficiency: WaterEfficiencyBreakdown;
  weatherSmart: WeatherSmartBreakdown;
  soilCropCare: SoilCropCareBreakdown;
  waterImpact: WaterImpact;
  recommendation: string;
  comparison: {
    delay: {
      score: number;
      waterSavedLitres: number;
      label: ScoreLabel;
    };
    irrigateNow: {
      score: number;
      unnecessaryWaterLitres: number;
      label: ScoreLabel;
    };
  };
}

export interface SustainabilityValidationErrors {
  crop?: string;
  farmAreaHectares?: string;
  soilMoisturePercent?: string;
  rainProbabilityPercent?: string;
  expectedRainfallMm?: string;
  temperatureCelsius?: string;
  humidityPercent?: string;
}

export const DEFAULT_DEMO_INPUTS: SustainabilityInputs = {
  crop: 'Tomato',
  farmAreaHectares: 0.1,
  soilMoisturePercent: 31,
  rainProbabilityPercent: 65,
  expectedRainfallMm: 8,
  temperatureCelsius: 29,
  humidityPercent: 72,
  action: 'delay',
};

export const DEMO_RECOMMENDATION_TEXT =
  'Delay irrigation for 24 hours. Rain is likely and soil moisture is adequate.';

export const DEMO_DISCLAIMER_BADGE =
  'Deterministic Rule-Based Sustainability Score — Not an official environmental certification.';

export const WATER_IMPACT_LITERS_PER_HECTARE = 1800;

export const WATER_IMPACT_DISCLAIMER =
  'Demo estimate formula: 180 L × (farm area in hectares / 0.1 ha). This is an indicative MVP estimate, not a scientific water-footprint measurement.';

export const WATER_IMPACT_HEURISTIC_NOTE =
  'This is an indicative MVP heuristic, not a scientific or universal water-footprint measurement.';

export const CROP_CONTEXT_NOTE =
  'Target crop name is recorded for farm context in this MVP and does not alter the deterministic rule-based score calculation.';

/**
 * Frontend Validation for Farm Conditions:
 * - Crop: non-empty string
 * - Farm area: finite number > 0
 * - Soil moisture: finite number 0–100 inclusive
 * - Rain probability: finite number 0–100 inclusive
 * - Expected rainfall: finite number >= 0
 * - Temperature: finite number
 * - Humidity: finite number 0–100 inclusive
 * 
 * Rejects empty string, NaN, Infinity, -Infinity, and out-of-range values.
 */
export function validateSustainabilityInputs(inputs: Partial<SustainabilityInputs>): SustainabilityValidationErrors {
  const errors: SustainabilityValidationErrors = {};

  if (!inputs.crop || typeof inputs.crop !== 'string' || inputs.crop.trim() === '') {
    errors.crop = 'Crop name is required.';
  }

  if (
    inputs.farmAreaHectares === undefined ||
    inputs.farmAreaHectares === null ||
    typeof inputs.farmAreaHectares !== 'number' ||
    !Number.isFinite(inputs.farmAreaHectares) ||
    inputs.farmAreaHectares <= 0
  ) {
    errors.farmAreaHectares = 'Farm area must be greater than 0 hectares.';
  }

  if (
    inputs.soilMoisturePercent === undefined ||
    inputs.soilMoisturePercent === null ||
    typeof inputs.soilMoisturePercent !== 'number' ||
    !Number.isFinite(inputs.soilMoisturePercent) ||
    inputs.soilMoisturePercent < 0 ||
    inputs.soilMoisturePercent > 100
  ) {
    errors.soilMoisturePercent = 'Soil moisture must be between 0% and 100%.';
  }

  if (
    inputs.rainProbabilityPercent === undefined ||
    inputs.rainProbabilityPercent === null ||
    typeof inputs.rainProbabilityPercent !== 'number' ||
    !Number.isFinite(inputs.rainProbabilityPercent) ||
    inputs.rainProbabilityPercent < 0 ||
    inputs.rainProbabilityPercent > 100
  ) {
    errors.rainProbabilityPercent = 'Rain probability must be between 0% and 100%.';
  }

  if (
    inputs.expectedRainfallMm === undefined ||
    inputs.expectedRainfallMm === null ||
    typeof inputs.expectedRainfallMm !== 'number' ||
    !Number.isFinite(inputs.expectedRainfallMm) ||
    inputs.expectedRainfallMm < 0
  ) {
    errors.expectedRainfallMm = 'Expected rainfall cannot be negative.';
  }

  if (
    inputs.temperatureCelsius === undefined ||
    inputs.temperatureCelsius === null ||
    typeof inputs.temperatureCelsius !== 'number' ||
    !Number.isFinite(inputs.temperatureCelsius)
  ) {
    errors.temperatureCelsius = 'Please enter a valid temperature.';
  }

  if (
    inputs.humidityPercent === undefined ||
    inputs.humidityPercent === null ||
    typeof inputs.humidityPercent !== 'number' ||
    !Number.isFinite(inputs.humidityPercent) ||
    inputs.humidityPercent < 0 ||
    inputs.humidityPercent > 100
  ) {
    errors.humidityPercent = 'Humidity must be between 0% and 100%.';
  }

  return errors;
}

/**
 * Contextual rule-based recommendation based on microclimate and soil conditions
 */
export function calculateRecommendation(inputs: SustainabilityInputs): string {
  const isRainImminent = inputs.rainProbabilityPercent >= 60 && inputs.expectedRainfallMm >= 5;

  if (isRainImminent) {
    if (inputs.soilMoisturePercent > 40) {
      return 'Delay irrigation. Rain is likely and soil moisture is already high, avoiding over-saturation.';
    }
    return DEMO_RECOMMENDATION_TEXT;
  }

  if (inputs.soilMoisturePercent < 25) {
    return 'Irrigate now. Soil moisture is low and no significant rain is forecasted.';
  }

  if (inputs.soilMoisturePercent > 40) {
    return 'Delay irrigation. Soil moisture is high, preventing root over-saturation.';
  }

  return 'Maintain routine monitoring. Soil moisture and weather conditions are optimal.';
}

/**
 * Water Efficiency Rule (Max 50 points):
 * - If delay irrigation AND rain prob >= 60% AND expected rainfall >= 5mm: 40 points
 * - If irrigate now under the same rain conditions: 10 points
 * - Otherwise: 30 points
 * Guarantees: 0 <= points <= 50
 */
export function calculateWaterEfficiency(inputs: SustainabilityInputs): WaterEfficiencyBreakdown {
  const isRainImminent = inputs.rainProbabilityPercent >= 60 && inputs.expectedRainfallMm >= 5;
  let rawPoints = 30;
  let reason = `Standard baseline irrigation timing under non-rain conditions (+30 pts).`;

  if (inputs.action === 'delay' && isRainImminent) {
    rawPoints = 40;
    reason = `Rain forecasted (≥60% chance, ≥5 mm) & irrigation delayed: optimal natural rainfall utilization (+40 pts).`;
  } else if (inputs.action === 'irrigate_now' && isRainImminent) {
    rawPoints = 10;
    reason = `Irrigation applied despite imminent rainfall (≥60% chance, ≥5 mm): high risk of runoff and water wastage (+10 pts).`;
  }

  const points = Math.max(0, Math.min(50, rawPoints));

  return {
    points,
    maxPoints: 50,
    reason,
  };
}

/**
 * Weather-Smart Actions Rule (Max 30 points):
 * - Rain probability >= 60%: 15 points
 * - Temperature between 18°C and 34°C: 10 points
 * - Humidity <= 80%: 5 points
 * Guarantees: 0 <= points <= 30
 */
export function calculateWeatherSmart(inputs: SustainabilityInputs): WeatherSmartBreakdown {
  let rainPoints = 0;
  let tempPoints = 0;
  let humidityPoints = 0;
  const reasons: string[] = [];

  if (inputs.rainProbabilityPercent >= 60) {
    rainPoints = 15;
    reasons.push(`High rain probability (${inputs.rainProbabilityPercent}% ≥ 60%): +15 pts`);
  } else {
    reasons.push(`Rain probability (${inputs.rainProbabilityPercent}% < 60%): 0 pts`);
  }

  if (inputs.temperatureCelsius >= 18 && inputs.temperatureCelsius <= 34) {
    tempPoints = 10;
    reasons.push(`Optimal vegetative temperature (${inputs.temperatureCelsius}°C between 18°C–34°C): +10 pts`);
  } else {
    reasons.push(`Suboptimal temperature (${inputs.temperatureCelsius}°C): 0 pts`);
  }

  if (inputs.humidityPercent <= 80) {
    humidityPoints = 5;
    reasons.push(`Safe transpiration humidity (${inputs.humidityPercent}% ≤ 80%): +5 pts`);
  } else {
    reasons.push(`High humidity (${inputs.humidityPercent}% > 80%): 0 pts`);
  }

  const points = Math.max(0, Math.min(30, rainPoints + tempPoints + humidityPoints));

  return {
    points,
    maxPoints: 30,
    rainPoints,
    tempPoints,
    humidityPoints,
    reasons,
  };
}

/**
 * Soil and Crop Care Rule (Max 20 points):
 * - Soil moisture between 25% and 40%: 12 points
 * - Future disease-scan integration: 8 points (reserved)
 * Guarantees: 0 <= points <= 20
 */
export function calculateSoilCropCare(inputs: SustainabilityInputs): SoilCropCareBreakdown {
  let soilMoisturePoints = 0;
  let reason = '';

  if (inputs.soilMoisturePercent >= 25 && inputs.soilMoisturePercent <= 40) {
    soilMoisturePoints = 12;
    reason = `Adequate root-zone soil moisture (${inputs.soilMoisturePercent}% in healthy 25%–40% range): +12 pts.`;
  } else if (inputs.soilMoisturePercent < 25) {
    reason = `Low root-zone moisture (${inputs.soilMoisturePercent}% < 25%): dry threshold.`;
  } else {
    reason = `High root-zone moisture (${inputs.soilMoisturePercent}% > 40%): over-saturation risk.`;
  }

  const points = Math.max(0, Math.min(20, soilMoisturePoints));

  return {
    points,
    maxCurrentPoints: 12,
    futurePoints: 8,
    maxTotalPoints: 20,
    soilMoisturePoints,
    futureDiseaseScanPoints: 0,
    reason,
    futureNote: `+8 points reserved for future leaf disease diagnostic scan integration (not currently calculated).`,
  };
}

/**
 * Water Impact Estimation:
 * - Scaled to farm area: 180 L * (farm area / 0.1 ha) = farmArea * WATER_IMPACT_LITERS_PER_HECTARE
 * - Delay irrigation: Litres saved
 * - Irrigate now: Litres unnecessary use
 */
export function calculateWaterImpact(inputs: SustainabilityInputs): WaterImpact {
  const farmArea = typeof inputs.farmAreaHectares === 'number' && Number.isFinite(inputs.farmAreaHectares) && inputs.farmAreaHectares > 0
    ? inputs.farmAreaHectares
    : 0.1;
  const litres = Math.round(farmArea * WATER_IMPACT_LITERS_PER_HECTARE);
  const disclaimer = WATER_IMPACT_DISCLAIMER;

  if (inputs.action === 'delay') {
    return {
      litres,
      type: 'saved',
      label: `Estimated ${litres} Litres Saved`,
      disclaimer,
    };
  }

  return {
    litres,
    type: 'unnecessary_use',
    label: `Estimated ${litres} Litres Unnecessary Use`,
    disclaimer,
  };
}

/**
 * Score Classification Label:
 * - Score >= 80: 'Excellent'
 * - Score 60 to 79: 'Good'
 * - Score < 60: 'Needs Improvement'
 */
export function getScoreLabel(score: number): ScoreLabel {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  return 'Needs Improvement';
}

/**
 * Main Deterministic Sustainability Score Calculator
 * Always guarantees: 0 <= totalScore <= 100
 */
export function calculateSustainabilityScore(
  inputs: SustainabilityInputs = DEFAULT_DEMO_INPUTS
): SustainabilityScoreResult {
  const waterEfficiency = calculateWaterEfficiency(inputs);
  const weatherSmart = calculateWeatherSmart(inputs);
  const soilCropCare = calculateSoilCropCare(inputs);
  const waterImpact = calculateWaterImpact(inputs);

  const rawTotal = waterEfficiency.points + weatherSmart.points + soilCropCare.points;
  const totalScore = Math.max(0, Math.min(100, rawTotal));
  const scoreLabel = getScoreLabel(totalScore);

  // Precalculate both comparison scenarios using the identical calculation engine
  const delayInputs: SustainabilityInputs = { ...inputs, action: 'delay' };
  const irrigateInputs: SustainabilityInputs = { ...inputs, action: 'irrigate_now' };

  const delayEfficiency = calculateWaterEfficiency(delayInputs);
  const delayWeather = calculateWeatherSmart(delayInputs);
  const delaySoil = calculateSoilCropCare(delayInputs);
  const delayImpact = calculateWaterImpact(delayInputs);
  const delayScore = Math.max(0, Math.min(100, delayEfficiency.points + delayWeather.points + delaySoil.points));

  const irrigateEfficiency = calculateWaterEfficiency(irrigateInputs);
  const irrigateWeather = calculateWeatherSmart(irrigateInputs);
  const irrigateSoil = calculateSoilCropCare(irrigateInputs);
  const irrigateImpact = calculateWaterImpact(irrigateInputs);
  const irrigateScore = Math.max(0, Math.min(100, irrigateEfficiency.points + irrigateWeather.points + irrigateSoil.points));

  return {
    totalScore,
    maxCurrentScore: 82,
    maxPossibleScore: 100,
    scoreLabel,
    waterEfficiency,
    weatherSmart,
    soilCropCare,
    waterImpact,
    recommendation: calculateRecommendation(inputs),
    comparison: {
      delay: {
        score: delayScore,
        waterSavedLitres: delayImpact.litres,
        label: getScoreLabel(delayScore),
      },
      irrigateNow: {
        score: irrigateScore,
        unnecessaryWaterLitres: irrigateImpact.litres,
        label: getScoreLabel(irrigateScore),
      },
    },
  };
}
