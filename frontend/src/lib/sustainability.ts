/**
 * Sustainability & Simulated IoT Calculation Library for AgriSmart AI.
 *
 * Implements deterministic 4-dimensional scoring (0–100 scale):
 * 1. Water Conservation & Irrigation Timing (0–40 pts)
 * 2. Microclimate & Weather Alignment (0–30 pts)
 * 3. Soil Moisture & Root-Zone Balance (0–15 pts)
 * 4. Crop Rotation & Agro-Ecological Compatibility (0–15 pts)
 */

import {
  SensorTelemetry,
  IoTPreset,
  IrrigationAction,
  ScoreLabel,
  SustainabilityScoreRequest,
  SustainabilityScoreResponse,
} from '../types';

export const IOT_PRESETS: IoTPreset[] = [
  {
    preset_id: 'optimal_loam',
    name: 'Optimal Field Capacity',
    description: 'Balanced root-zone moisture (32%) and mild soil temperature (24°C).',
    telemetry: {
      soil_moisture_percent: 32.0,
      soil_temperature_celsius: 24.0,
      irrigation_flow_rate_lpm: 30.0,
      irrigation_duration_minutes: 60,
      water_tank_level_percent: 85.0,
      soil_ph: 6.8,
      soil_ec_ds_m: 1.2,
      is_simulated: true,
    },
  },
  {
    preset_id: 'dry_deficit',
    name: 'Root-Zone Moisture Deficit',
    description: 'Low moisture (18%), indicating legitimate irrigation requirement.',
    telemetry: {
      soil_moisture_percent: 18.0,
      soil_temperature_celsius: 28.5,
      irrigation_flow_rate_lpm: 35.0,
      irrigation_duration_minutes: 90,
      water_tank_level_percent: 60.0,
      soil_ph: 7.2,
      soil_ec_ds_m: 1.5,
      is_simulated: true,
    },
  },
  {
    preset_id: 'saturated_heavy',
    name: 'Over-Saturated Soil (Waterlogged)',
    description: 'Excess moisture (48%) presenting hypoxia and root rot risk.',
    telemetry: {
      soil_moisture_percent: 48.0,
      soil_temperature_celsius: 21.5,
      irrigation_flow_rate_lpm: 25.0,
      irrigation_duration_minutes: 45,
      water_tank_level_percent: 95.0,
      soil_ph: 6.5,
      soil_ec_ds_m: 1.0,
      is_simulated: true,
    },
  },
  {
    preset_id: 'heat_stress',
    name: 'High Heat & Transpiration Stress',
    description: 'Elevated soil temperature (36°C) and rapid evapotranspiration.',
    telemetry: {
      soil_moisture_percent: 23.0,
      soil_temperature_celsius: 36.0,
      irrigation_flow_rate_lpm: 40.0,
      irrigation_duration_minutes: 75,
      water_tank_level_percent: 50.0,
      soil_ph: 7.0,
      soil_ec_ds_m: 1.8,
      is_simulated: true,
    },
  },
];

export const DEFAULT_IOT_TELEMETRY: SensorTelemetry = IOT_PRESETS[0].telemetry;

const LEGUMES = ['chickpea', 'moong', 'soybean', 'pulses', 'groundnut', 'pigeonpea', 'urad', 'clusterbean'];
const CEREALS = ['wheat', 'rice', 'maize', 'bajra', 'jowar', 'barley'];
const CASH_CROPS = ['cotton', 'sugarcane', 'potato', 'tobacco'];

export function getScoreLabel(score: number): ScoreLabel {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  return 'Needs Improvement';
}

export function validateSustainabilityForm(values: {
  crop: string;
  farm_area_hectares: string;
  temperature_celsius: string;
  humidity_percent: string;
  rain_probability_percent: string;
  expected_rainfall_mm: string;
  soil_moisture_percent: string;
}): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!values.crop || !values.crop.trim()) {
    errors.crop = 'Crop name is required.';
  }

  const area = Number(values.farm_area_hectares);
  if (!Number.isFinite(area) || area <= 0) {
    errors.farm_area_hectares = 'Farm area must be greater than 0 hectares.';
  }

  const temp = Number(values.temperature_celsius);
  if (!Number.isFinite(temp) || temp < -10 || temp > 60) {
    errors.temperature_celsius = 'Temperature must be between -10°C and 60°C.';
  }

  const hum = Number(values.humidity_percent);
  if (!Number.isFinite(hum) || hum < 0 || hum > 100) {
    errors.humidity_percent = 'Humidity must be between 0% and 100%.';
  }

  const rainProb = Number(values.rain_probability_percent);
  if (!Number.isFinite(rainProb) || rainProb < 0 || rainProb > 100) {
    errors.rain_probability_percent = 'Rain probability must be between 0% and 100%.';
  }

  const rainfall = Number(values.expected_rainfall_mm);
  if (!Number.isFinite(rainfall) || rainfall < 0) {
    errors.expected_rainfall_mm = 'Rainfall cannot be negative.';
  }

  const moisture = Number(values.soil_moisture_percent);
  if (!Number.isFinite(moisture) || moisture < 0 || moisture > 100) {
    errors.soil_moisture_percent = 'Soil moisture must be between 0% and 100%.';
  }

  return errors;
}

/**
 * Deterministic client calculation matching backend formula for offline/instant evaluation.
 */
export function calculateClientSustainabilityScore(
  req: SustainabilityScoreRequest
): SustainabilityScoreResponse {
  const action: IrrigationAction = req.action || 'delay';
  const rainProb = req.rain_probability_percent ?? 0;
  const rainfall = req.expected_rainfall_mm ?? 0;
  const temp = req.temperature_celsius;
  const humidity = req.humidity_percent;
  const area = req.farm_area_hectares && req.farm_area_hectares > 0 ? req.farm_area_hectares : 0.1;
  const telemetry = req.telemetry || DEFAULT_IOT_TELEMETRY;
  const moisture = req.soil_moisture_percent ?? telemetry.soil_moisture_percent;

  const rainImminent = rainProb >= 60 && rainfall >= 5.0;

  // 1. Water Conservation (0–40 pts)
  let waterPts = 30.0;
  let waterReason = 'Standard maintenance timing under normal microclimate.';
  let waterStatus = 'Routine';

  if (action === 'delay' && rainImminent) {
    waterPts = 40.0;
    waterReason = `Imminent rain (≥60% chance, ${rainfall.toFixed(1)} mm) utilized; postponed to capture precipitation.`;
    waterStatus = 'Optimal Timing';
  } else if (action === 'irrigate_now' && rainImminent) {
    waterPts = 10.0;
    waterReason = `Irrigated despite imminent rain (${rainProb}% chance, ${rainfall.toFixed(1)} mm); runoff risk.`;
    waterStatus = 'Runoff Risk';
  } else if (moisture < 25.0) {
    if (action === 'irrigate_now') {
      waterPts = 36.0;
      waterReason = `Timely irrigation relieving root-zone moisture deficit (${moisture.toFixed(1)}%).`;
      waterStatus = 'Targeted Relief';
    } else {
      waterPts = 22.0;
      waterReason = `Delayed despite dry root-zone (${moisture.toFixed(1)}%); potential drought stress.`;
      waterStatus = 'Under-Irrigated';
    }
  } else if (moisture > 40.0) {
    if (action === 'delay') {
      waterPts = 38.0;
      waterReason = `Delayed for already saturated soil (${moisture.toFixed(1)}%); prevents waterlogging.`;
      waterStatus = 'Saturation Avoided';
    } else {
      waterPts = 14.0;
      waterReason = `Irrigated into already saturated soil (${moisture.toFixed(1)}%); unnecessary pumping.`;
      waterStatus = 'Over-Irrigation';
    }
  }

  // 2. Weather Alignment (0–30 pts)
  const rainBonus = rainProb >= 60 ? 10.0 : rainProb >= 30 ? 6.0 : 3.0;
  const tempPts = temp >= 18 && temp <= 34 ? 14.0 : temp >= 10 && temp < 18 ? 8.0 : temp > 35 ? 4.0 : 2.0;
  const humPts = humidity <= 75 ? 6.0 : humidity <= 85 ? 3.0 : 0.0;
  const weatherPts = Math.min(30.0, rainBonus + tempPts + humPts);
  const weatherStatus = weatherPts >= 22.0 ? 'Favorable' : weatherPts >= 14.0 ? 'Moderate' : 'Stressful';
  const weatherReason = `Microclimate factors: temp ${temp.toFixed(1)}°C (+${tempPts} pts), humidity ${humidity.toFixed(0)}% (+${humPts} pts), rain probability ${rainProb.toFixed(0)}% (+${rainBonus} pts).`;

  // 3. Soil Moisture Balance (0–15 pts)
  let soilPts = 15.0;
  let soilStatus = 'Optimal';
  let soilReason = `Root-zone moisture (${moisture.toFixed(1)}%) in healthy 25%–40% field capacity range.`;

  if (moisture >= 25.0 && moisture <= 40.0) {
    soilPts = 15.0;
  } else if (moisture >= 20.0 && moisture < 25.0) {
    soilPts = 10.0;
    soilStatus = 'Mild Deficit';
    soilReason = `Mild root-zone deficit (${moisture.toFixed(1)}%); approaching wilting threshold.`;
  } else if (moisture < 20.0) {
    soilPts = 4.0;
    soilStatus = 'Severe Deficit';
    soilReason = `Acute moisture deficit (${moisture.toFixed(1)}% < 20%); wilting stress hazard.`;
  } else if (moisture > 40.0 && moisture <= 45.0) {
    soilPts = 9.0;
    soilStatus = 'Elevated';
    soilReason = `Elevated root-zone moisture (${moisture.toFixed(1)}%); aeration slightly constrained.`;
  } else {
    soilPts = 3.0;
    soilStatus = 'Waterlogged';
    soilReason = `Waterlogged root-zone (${moisture.toFixed(1)}% > 45%); root asphyxiation risk.`;
  }

  // 4. Crop Rotation Compatibility (0–15 pts)
  const tCrop = req.crop.toLowerCase();
  const pCrop = (req.previous_crop || '').toLowerCase();
  let rotationPts = 10.0;
  let rotationStatus = 'Baseline Single-Crop';
  let rotationReason = `Standalone planting without preceding rotation history (+10 pts baseline).`;

  if (pCrop) {
    if (tCrop === pCrop) {
      rotationPts = 4.0;
      rotationStatus = 'Monoculture Risk';
      rotationReason = `Continuous monoculture of '${req.crop}'; pest build-up and nutrient drain risk.`;
    } else {
      const isTLegume = LEGUMES.some((l) => tCrop.includes(l));
      const isPLegume = LEGUMES.some((l) => pCrop.includes(l));
      const isTCereal = CEREALS.some((c) => tCrop.includes(c));
      const isPCereal = CEREALS.some((c) => pCrop.includes(c));
      const isTCash = CASH_CROPS.some((c) => tCrop.includes(c));
      const isPCash = CASH_CROPS.some((c) => pCrop.includes(c));

      if ((isTLegume && (isPCereal || isPCash)) || ((isTCereal || isTCash) && isPLegume)) {
        rotationPts = 15.0;
        rotationStatus = 'Optimal Rotation';
        rotationReason = `Synergistic restorative rotation ('${pCrop}' → '${tCrop}'); restores nitrogen and disrupts pests.`;
      } else if (isTLegume || isPLegume) {
        rotationPts = 13.0;
        rotationStatus = 'Favorable Rotation';
        rotationReason = `Beneficial rotation incorporating legume biology ('${pCrop}' → '${tCrop}').`;
      } else {
        rotationPts = 11.0;
        rotationStatus = 'Diverse Rotation';
        rotationReason = `Diverse crop sequence ('${pCrop}' → '${tCrop}'); breaks monoculture cycles.`;
      }
    }
  }

  const rawTotal = waterPts + weatherPts + soilPts + rotationPts;
  const totalScore = Math.max(0, Math.min(100, Math.round(rawTotal)));
  const scoreLabel = getScoreLabel(totalScore);

  // Water volume impact
  const nominalLiters = telemetry.irrigation_flow_rate_lpm * telemetry.irrigation_duration_minutes;
  const scaledLiters = Math.round(nominalLiters * (area / 0.1));

  let impactType: 'saved' | 'unnecessary_use' | 'neutral' = 'neutral';
  let impactLabel = `${scaledLiters.toLocaleString()} Litres Routine Cycle`;
  let formulaBasis = `Irrigation cycle for ${area.toFixed(2)} ha based on ${telemetry.irrigation_flow_rate_lpm} L/min flow.`;

  if (action === 'delay' && (rainImminent || moisture > 40.0)) {
    impactType = 'saved';
    impactLabel = `Estimated ${scaledLiters.toLocaleString()} Litres Conserved`;
    formulaBasis = `${telemetry.irrigation_flow_rate_lpm} L/min × ${telemetry.irrigation_duration_minutes} min × (${area.toFixed(2)} ha / 0.1 ha) delayed due to rainfall/saturation.`;
  } else if (action === 'irrigate_now' && (rainImminent || moisture > 40.0)) {
    impactType = 'unnecessary_use';
    impactLabel = `Estimated ${scaledLiters.toLocaleString()} Litres Redundant Application`;
    formulaBasis = `Avoidable application during rainfall or saturation across ${area.toFixed(2)} ha.`;
  }

  let recommendation = 'Maintain routine monitoring. Conditions are well-balanced.';
  if (rainImminent) {
    recommendation = moisture > 40.0
      ? 'Postpone irrigation for 24–48 hours. Rain is imminent and soil moisture is already high, avoiding hypoxia.'
      : 'Postpone irrigation for 24 hours. Natural precipitation will replenish root-zone moisture.';
  } else if (moisture < 25.0) {
    recommendation = 'Irrigate during early morning or evening hours. Root-zone moisture has dropped below comfort threshold.';
  } else if (moisture > 40.0) {
    recommendation = 'Hold irrigation. Root-zone moisture is sufficient; additional watering risks leaching.';
  }

  return {
    total_score: totalScore,
    score_label: scoreLabel,
    summary: `Sustainability Score: ${totalScore}/100 (${scoreLabel}). Evaluates farm plot (${area} ha) growing '${req.crop}' with soil moisture ${moisture.toFixed(1)}%.`,
    recommendation,
    breakdown: {
      water_conservation: {
        dimension: 'Water Conservation & Irrigation Timing',
        points: waterPts,
        max_points: 40.0,
        percentage: Math.round((waterPts / 40.0) * 100),
        reason: waterReason,
        status: waterStatus,
      },
      microclimate_alignment: {
        dimension: 'Microclimate & Weather Alignment',
        points: weatherPts,
        max_points: 30.0,
        percentage: Math.round((weatherPts / 30.0) * 100),
        reason: weatherReason,
        status: weatherStatus,
      },
      soil_moisture_balance: {
        dimension: 'Soil Moisture & Root-Zone Balance',
        points: soilPts,
        max_points: 15.0,
        percentage: Math.round((soilPts / 15.0) * 100),
        reason: soilReason,
        status: soilStatus,
      },
      crop_rotation_compatibility: {
        dimension: 'Crop Rotation & Agro-Ecological Health',
        points: rotationPts,
        max_points: 15.0,
        percentage: Math.round((rotationPts / 15.0) * 100),
        reason: rotationReason,
        status: rotationStatus,
      },
    },
    water_impact: {
      litres: scaledLiters,
      impact_type: impactType,
      label: impactLabel,
      formula_basis: formulaBasis,
    },
    comparison: {
      delay: {
        action: 'delay',
        score: totalScore,
        score_label: scoreLabel,
        water_impact_litres: scaledLiters,
        water_impact_type: impactType,
      },
      irrigate_now: {
        action: 'irrigate_now',
        score: totalScore,
        score_label: scoreLabel,
        water_impact_litres: scaledLiters,
        water_impact_type: impactType,
      },
    },
    telemetry_used: {
      ...telemetry,
      soil_moisture_percent: moisture,
    },
    simulated_telemetry_notice: 'Sensor telemetry is generated via the Simulated IoT Sensor Layer for prototype validation.',
  };
}
