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
  'Demo / Rule-Based MVP — Not an official environmental certification.';

export const WATER_IMPACT_DISCLAIMER =
  'Estimated demo metric based on a 0.1-hectare Tomato farm scenario, not a direct field sensor measurement.';

/**
 * Water Efficiency Rule (Max 50 points):
 * - If delay irrigation AND rain prob >= 60% AND expected rainfall >= 5mm: 40 points
 * - If irrigate now under the same rain conditions: 10 points
 * - Otherwise: 30 points
 */
export function calculateWaterEfficiency(inputs: SustainabilityInputs): WaterEfficiencyBreakdown {
  const isRainImminent = inputs.rainProbabilityPercent >= 60 && inputs.expectedRainfallMm >= 5;

  if (inputs.action === 'delay' && isRainImminent) {
    return {
      points: 40,
      maxPoints: 50,
      reason: `Rain forecasted (≥60% chance, ≥5 mm) & irrigation delayed: optimal natural rainfall utilization (+40 pts).`,
    };
  }

  if (inputs.action === 'irrigate_now' && isRainImminent) {
    return {
      points: 10,
      maxPoints: 50,
      reason: `Irrigation applied despite imminent rainfall (≥60% chance, ≥5 mm): high risk of runoff and water wastage (+10 pts).`,
    };
  }

  return {
    points: 30,
    maxPoints: 50,
    reason: `Standard baseline irrigation timing under non-rain conditions (+30 pts).`,
  };
}

/**
 * Weather-Smart Actions Rule (Max 30 points):
 * - Rain probability >= 60%: 15 points
 * - Temperature between 18°C and 34°C: 10 points
 * - Humidity <= 80%: 5 points
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

  const points = rainPoints + tempPoints + humidityPoints;

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

  return {
    points: soilMoisturePoints,
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
 * - Delay irrigation: 180 Litres saved
 * - Irrigate now: 180 Litres unnecessary use
 */
export function calculateWaterImpact(inputs: SustainabilityInputs): WaterImpact {
  if (inputs.action === 'delay') {
    return {
      litres: 180,
      type: 'saved',
      label: 'Estimated 180 Litres Saved',
      disclaimer: WATER_IMPACT_DISCLAIMER,
    };
  }

  return {
    litres: 180,
    type: 'unnecessary_use',
    label: 'Estimated 180 Litres Unnecessary Use',
    disclaimer: WATER_IMPACT_DISCLAIMER,
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
 * Main Sustainability Score Calculator
 */
export function calculateSustainabilityScore(
  inputs: SustainabilityInputs = DEFAULT_DEMO_INPUTS
): SustainabilityScoreResult {
  const waterEfficiency = calculateWaterEfficiency(inputs);
  const weatherSmart = calculateWeatherSmart(inputs);
  const soilCropCare = calculateSoilCropCare(inputs);
  const waterImpact = calculateWaterImpact(inputs);

  const totalScore = waterEfficiency.points + weatherSmart.points + soilCropCare.points;
  const scoreLabel = getScoreLabel(totalScore);

  // Precalculate both comparison scenarios for quick what-if review
  const delayInputs: SustainabilityInputs = { ...inputs, action: 'delay' };
  const irrigateInputs: SustainabilityInputs = { ...inputs, action: 'irrigate_now' };

  const delayEfficiency = calculateWaterEfficiency(delayInputs);
  const delayWeather = calculateWeatherSmart(delayInputs);
  const delaySoil = calculateSoilCropCare(delayInputs);
  const delayScore = delayEfficiency.points + delayWeather.points + delaySoil.points;

  const irrigateEfficiency = calculateWaterEfficiency(irrigateInputs);
  const irrigateWeather = calculateWeatherSmart(irrigateInputs);
  const irrigateSoil = calculateSoilCropCare(irrigateInputs);
  const irrigateScore = irrigateEfficiency.points + irrigateWeather.points + irrigateSoil.points;

  return {
    totalScore,
    maxCurrentScore: 82,
    maxPossibleScore: 100,
    scoreLabel,
    waterEfficiency,
    weatherSmart,
    soilCropCare,
    waterImpact,
    recommendation: DEMO_RECOMMENDATION_TEXT,
    comparison: {
      delay: {
        score: delayScore,
        waterSavedLitres: 180,
        label: getScoreLabel(delayScore),
      },
      irrigateNow: {
        score: irrigateScore,
        unnecessaryWaterLitres: 180,
        label: getScoreLabel(irrigateScore),
      },
    },
  };
}
