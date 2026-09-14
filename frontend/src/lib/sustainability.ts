/**
 * Sustainability & Simulated IoT Calculation Library for AgriSmart AI.
 *
 * Implements deterministic 4-dimensional scoring (0–100 scale):
 * 1. Water Conservation & Irrigation Timing (0–40 pts) - Soil-Profile Aware
 * 2. Microclimate & Weather Alignment (0–30 pts) - Crop-Aware
 * 3. Soil Moisture & Root-Zone Balance (0–15 pts) - Soil-Profile Aware
 * 4. Crop Rotation & Agro-Ecological Compatibility (0–15 pts)
 */

import {
  SensorTelemetry,
  IoTPreset,
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
    name: 'Saturated Heavy Soil',
    description: 'Waterlogged root-zone (48%), severe over-irrigation risk.',
    telemetry: {
      soil_moisture_percent: 48.0,
      soil_temperature_celsius: 21.0,
      irrigation_flow_rate_lpm: 25.0,
      irrigation_duration_minutes: 45,
      water_tank_level_percent: 95.0,
      soil_ph: 6.5,
      soil_ec_ds_m: 0.9,
      is_simulated: true,
    },
  },
  {
    preset_id: 'heat_stress',
    name: 'Extreme Heat & Rapid ET',
    description: 'High soil temperature (34°C) causing accelerated moisture depletion.',
    telemetry: {
      soil_moisture_percent: 22.0,
      soil_temperature_celsius: 34.0,
      irrigation_flow_rate_lpm: 40.0,
      irrigation_duration_minutes: 75,
      water_tank_level_percent: 40.0,
      soil_ph: 7.5,
      soil_ec_ds_m: 2.1,
      is_simulated: true,
    },
  },
];

export const DEFAULT_IOT_TELEMETRY: SensorTelemetry = IOT_PRESETS[0].telemetry;

const LEGUMES = ['chickpea', 'moong', 'soybean', 'pulses', 'groundnut', 'pigeonpea', 'urad', 'clusterbean'];
const CEREALS = ['wheat', 'rice', 'maize', 'bajra', 'jowar', 'barley'];
const CASH_CROPS = ['cotton', 'sugarcane', 'potato', 'tobacco'];

// 1. Soil Profiles
interface SoilProfileConfig {
  name: string;
  wilting_point: number;
  mild_deficit: number;
  optimal_min: number;
  optimal_max: number;
  elevated: number;
  saturation: number;
}

const SOIL_PROFILES: Record<string, SoilProfileConfig> = {
  clay: {
    name: 'Clay Soil Profile',
    wilting_point: 20.0,
    mild_deficit: 28.0,
    optimal_min: 28.0,
    optimal_max: 42.0,
    elevated: 46.0,
    saturation: 48.0,
  },
  sandy: {
    name: 'Sandy / Coarse Profile',
    wilting_point: 8.0,
    mild_deficit: 14.0,
    optimal_min: 14.0,
    optimal_max: 24.0,
    elevated: 28.0,
    saturation: 32.0,
  },
  black: {
    name: 'Black Cotton / Vertisol Profile',
    wilting_point: 18.0,
    mild_deficit: 26.0,
    optimal_min: 26.0,
    optimal_max: 42.0,
    elevated: 46.0,
    saturation: 50.0,
  },
  loam: {
    name: 'Loam Reference Profile (Simulated Standard)',
    wilting_point: 15.0,
    mild_deficit: 22.0,
    optimal_min: 22.0,
    optimal_max: 38.0,
    elevated: 42.0,
    saturation: 45.0,
  },
};

function resolveSoilProfile(soilType?: string, presetId?: string): SoilProfileConfig {
  const st = (soilType || '').toLowerCase().trim();
  if (st.includes('clay')) return SOIL_PROFILES.clay;
  if (st.includes('sand')) return SOIL_PROFILES.sandy;
  if (st.includes('black') || st.includes('vertisol')) return SOIL_PROFILES.black;
  if (presetId === 'saturated_heavy') return SOIL_PROFILES.clay;
  return SOIL_PROFILES.loam;
}

// 2. Crop Microclimate Windows
interface CropWeatherProfile {
  name: string;
  temp_optimal: [number, number];
  temp_stress: number;
  temp_chill: number;
  rh_optimal: [number, number];
  rh_fungal_risk: number;
}

const CROP_WEATHER_PROFILES: Record<string, CropWeatherProfile> = {
  rice: {
    name: 'Rice (Warm Kharif Cereal)',
    temp_optimal: [22.0, 33.0],
    temp_stress: 37.0,
    temp_chill: 16.0,
    rh_optimal: [60.0, 85.0],
    rh_fungal_risk: 90.0,
  },
  maize: {
    name: 'Maize (Warm Cereal)',
    temp_optimal: [20.0, 32.0],
    temp_stress: 36.0,
    temp_chill: 14.0,
    rh_optimal: [45.0, 75.0],
    rh_fungal_risk: 85.0,
  },
  cotton: {
    name: 'Cotton (Semi-Arid Cash Crop)',
    temp_optimal: [23.0, 35.0],
    temp_stress: 38.0,
    temp_chill: 18.0,
    rh_optimal: [40.0, 70.0],
    rh_fungal_risk: 85.0,
  },
  wheat: {
    name: 'Wheat (Cool Rabi Cereal)',
    temp_optimal: [14.0, 25.0],
    temp_stress: 30.0,
    temp_chill: 6.0,
    rh_optimal: [40.0, 70.0],
    rh_fungal_risk: 85.0,
  },
  chickpea: {
    name: 'Chickpea (Rabi Pulse)',
    temp_optimal: [15.0, 26.0],
    temp_stress: 31.0,
    temp_chill: 7.0,
    rh_optimal: [35.0, 65.0],
    rh_fungal_risk: 80.0,
  },
  pigeonpea: {
    name: 'Pigeonpea (Warm Kharif Pulse)',
    temp_optimal: [20.0, 34.0],
    temp_stress: 38.0,
    temp_chill: 14.0,
    rh_optimal: [45.0, 80.0],
    rh_fungal_risk: 85.0,
  },
  sugarcane: {
    name: 'Sugarcane (Tropical Perennial)',
    temp_optimal: [24.0, 36.0],
    temp_stress: 40.0,
    temp_chill: 18.0,
    rh_optimal: [55.0, 85.0],
    rh_fungal_risk: 90.0,
  },
  tomato: {
    name: 'Tomato (Solanaceous Vegetable)',
    temp_optimal: [18.0, 28.0],
    temp_stress: 34.0,
    temp_chill: 12.0,
    rh_optimal: [45.0, 70.0],
    rh_fungal_risk: 80.0,
  },
  potato: {
    name: 'Potato (Tuber Crop)',
    temp_optimal: [16.0, 24.0],
    temp_stress: 29.0,
    temp_chill: 8.0,
    rh_optimal: [50.0, 80.0],
    rh_fungal_risk: 85.0,
  },
};

const DEFAULT_WEATHER_PROFILE: CropWeatherProfile = {
  name: 'General Agronomic Microclimate Index',
  temp_optimal: [18.0, 32.0],
  temp_stress: 35.0,
  temp_chill: 12.0,
  rh_optimal: [40.0, 75.0],
  rh_fungal_risk: 85.0,
};

function resolveCropWeatherProfile(crop?: string): CropWeatherProfile {
  const c = (crop || '').toLowerCase().trim();
  for (const [key, prof] of Object.entries(CROP_WEATHER_PROFILES)) {
    if (c.includes(key)) return prof;
  }
  return DEFAULT_WEATHER_PROFILE;
}

export function getScoreLabel(score: number): ScoreLabel {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  return 'Needs Improvement';
}

export function validateSustainabilityForm(data: Record<string, string>): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!data.crop || !data.crop.trim()) {
    errors.crop = 'Target crop is required';
  }

  const area = Number(data.farm_area_hectares);
  if (isNaN(area) || area <= 0 || area > 1000) {
    errors.farm_area_hectares = 'Area must be between 0.01 and 1000 ha';
  }

  const temp = Number(data.temperature_celsius);
  if (isNaN(temp) || temp < -10 || temp > 60) {
    errors.temperature_celsius = 'Temperature must be between -10°C and 60°C';
  }

  const hum = Number(data.humidity_percent);
  if (isNaN(hum) || hum < 0 || hum > 100) {
    errors.humidity_percent = 'Humidity must be between 0% and 100%';
  }

  const rainProb = Number(data.rain_probability_percent);
  if (isNaN(rainProb) || rainProb < 0 || rainProb > 100) {
    errors.rain_probability_percent = 'Rain probability must be 0–100%';
  }

  const rainMm = Number(data.expected_rainfall_mm);
  if (isNaN(rainMm) || rainMm < 0 || rainMm > 500) {
    errors.expected_rainfall_mm = 'Rainfall must be 0–500 mm';
  }

  const moist = Number(data.soil_moisture_percent);
  if (isNaN(moist) || moist < 0 || moist > 100) {
    errors.soil_moisture_percent = 'Moisture must be 0–100%';
  }

  return errors;
}

export function calculateClientSustainabilityScore(
  req: SustainabilityScoreRequest
): SustainabilityScoreResponse {
  const rainProb = req.rain_probability_percent ?? 0.0;
  const rainMm = req.expected_rainfall_mm ?? 0.0;
  const moisture = req.soil_moisture_percent ?? req.telemetry?.soil_moisture_percent ?? 30.0;
  const temp = req.temperature_celsius;
  const humidity = req.humidity_percent;
  const action = req.action ?? 'delay';
  const farmArea = req.farm_area_hectares ?? 0.1;

  const soilProfile = resolveSoilProfile(req.soil_type ?? undefined, req.telemetry?.preset_id);
  const cropWeatherProfile = resolveCropWeatherProfile(req.crop);

  const isRainImminent = rainProb >= 60.0 && rainMm >= 5.0;

  // Dim 1: Water Conservation (Soil Profile Aware)
  let waterPts = 28.0;
  let waterReason = `Routine maintenance irrigation applied within acceptable soil moisture (${moisture.toFixed(1)}%) for configured ${soilProfile.name}.`;
  let waterStatus = 'Routine Use';

  if (action === 'delay' && isRainImminent) {
    waterPts = 40.0;
    waterReason = `Forecasted rainfall (≥60% probability, ${rainMm.toFixed(1)} mm) utilized; irrigation postponed to capture natural precipitation and conserve groundwater.`;
    waterStatus = 'Optimal Timing';
  } else if (action === 'irrigate_now' && isRainImminent) {
    waterPts = 10.0;
    waterReason = `Irrigation triggered despite imminent rainfall (${rainProb.toFixed(0)}% chance, ${rainMm.toFixed(1)} mm); high risk of surface runoff and avoidable pumping.`;
    waterStatus = 'Runoff Risk';
  } else if (moisture < soilProfile.optimal_min) {
    if (action === 'irrigate_now') {
      waterPts = 36.0;
      waterReason = `Timely irrigation applied to relieve root-zone deficit (${moisture.toFixed(1)}% < ${soilProfile.optimal_min.toFixed(0)}%) for configured ${soilProfile.name}; protects crop from wilting.`;
      waterStatus = 'Targeted Relief';
    } else {
      waterPts = moisture < soilProfile.wilting_point ? 20.0 : 24.0;
      waterReason = `Irrigation delayed despite root-zone deficit (${moisture.toFixed(1)}% < ${soilProfile.optimal_min.toFixed(0)}%) for configured ${soilProfile.name}; risks moisture stress if deferred further.`;
      waterStatus = 'Under-Irrigated';
    }
  } else if (moisture > soilProfile.optimal_max) {
    if (action === 'delay') {
      waterPts = 38.0;
      waterReason = `Irrigation delayed for moist soil (${moisture.toFixed(1)}% > ${soilProfile.optimal_max.toFixed(0)}%) in configured ${soilProfile.name}; avoids waterlogging and unnecessary water expenditure.`;
      waterStatus = 'Saturation Avoided';
    } else {
      waterPts = 14.0;
      waterReason = `Irrigation applied to already saturated soil (${moisture.toFixed(1)}% > ${soilProfile.optimal_max.toFixed(0)}%) in configured ${soilProfile.name}; unnecessary application.`;
      waterStatus = 'Over-Irrigation';
    }
  } else if (action === 'delay') {
    waterPts = 32.0;
    waterReason = `Standard conservation: root-zone moisture (${moisture.toFixed(1)}%) is within healthy field capacity (${soilProfile.optimal_min.toFixed(0)}%–${soilProfile.optimal_max.toFixed(0)}%) for configured ${soilProfile.name}; routine deferral.`;
    waterStatus = 'Preserved';
  }

  // Dim 2: Weather Alignment (Crop Aware)
  const rainPts = rainProb >= 60.0 ? 10.0 : rainProb >= 30.0 ? 6.0 : 3.0;
  let tempPts = 8.0;
  let tempNote = `moderate temperature (${temp.toFixed(1)}°C)`;
  if (temp >= cropWeatherProfile.temp_optimal[0] && temp <= cropWeatherProfile.temp_optimal[1]) {
    tempPts = 14.0;
    tempNote = `optimal temperature (${temp.toFixed(1)}°C within ${cropWeatherProfile.temp_optimal[0]}–${cropWeatherProfile.temp_optimal[1]}°C window)`;
  } else if (temp > cropWeatherProfile.temp_stress) {
    tempPts = 4.0;
    tempNote = `heat stress (${temp.toFixed(1)}°C > ${cropWeatherProfile.temp_stress}°C threshold)`;
  } else if (temp < cropWeatherProfile.temp_chill) {
    tempPts = 2.0;
    tempNote = `chilling stress (${temp.toFixed(1)}°C < ${cropWeatherProfile.temp_chill}°C threshold)`;
  }

  let humPts = 3.0;
  let humNote = `moderate humidity (${humidity.toFixed(0)}%)`;
  if (humidity >= cropWeatherProfile.rh_optimal[0] && humidity <= cropWeatherProfile.rh_optimal[1]) {
    humPts = 6.0;
    humNote = `favorable relative humidity (${humidity.toFixed(0)}%)`;
  } else if (humidity > cropWeatherProfile.rh_fungal_risk) {
    humPts = 0.0;
    humNote = `very high humidity (${humidity.toFixed(0)}% > ${cropWeatherProfile.rh_fungal_risk}%) elevating foliar disease risk`;
  }

  const weatherPts = Math.min(30.0, rainPts + tempPts + humPts);
  const weatherStatus = weatherPts >= 22.0 ? 'Favorable' : weatherPts >= 14.0 ? 'Moderate' : 'Stressful';
  const weatherReason = `Microclimate alignment for ${cropWeatherProfile.name}: ${tempNote} (+${tempPts.toFixed(0)} pts), ${humNote} (+${humPts.toFixed(0)} pts), and rain chance ${rainProb.toFixed(0)}% (+${rainPts.toFixed(0)} pts).`;

  // Dim 3: Soil Moisture Balance (Soil Profile Aware)
  let soilPts = 15.0;
  let soilReason = `IoT probe shows root-zone moisture (${moisture.toFixed(1)}%) within optimal field capacity (${soilProfile.optimal_min.toFixed(0)}%–${soilProfile.optimal_max.toFixed(0)}%) for configured ${soilProfile.name}.`;
  let soilStatus = 'Optimal';

  if (moisture >= soilProfile.optimal_min && moisture <= soilProfile.optimal_max) {
    soilPts = 15.0;
    soilReason = `IoT probe shows root-zone moisture (${moisture.toFixed(1)}%) within optimal field capacity (${soilProfile.optimal_min.toFixed(0)}%–${soilProfile.optimal_max.toFixed(0)}%) for configured ${soilProfile.name}.`;
    soilStatus = 'Optimal';
  } else if (moisture >= soilProfile.mild_deficit && moisture < soilProfile.optimal_min) {
    soilPts = 11.0;
    soilReason = `IoT probe indicates mild moisture deficit (${moisture.toFixed(1)}%) below ${soilProfile.optimal_min.toFixed(0)}% field capacity for configured ${soilProfile.name}.`;
    soilStatus = 'Mild Deficit';
  } else if (moisture >= soilProfile.wilting_point && moisture < soilProfile.mild_deficit) {
    soilPts = 8.0;
    soilReason = `IoT probe indicates moderate deficit (${moisture.toFixed(1)}%); approaching ${soilProfile.wilting_point.toFixed(0)}% wilting threshold for configured ${soilProfile.name}.`;
    soilStatus = 'Moderate Deficit';
  } else if (moisture < soilProfile.wilting_point) {
    soilPts = 4.0;
    soilReason = `IoT probe detects acute moisture deficit (${moisture.toFixed(1)}% < ${soilProfile.wilting_point.toFixed(0)}% wilting point) for configured ${soilProfile.name}; root stress imminent.`;
    soilStatus = 'Severe Deficit';
  } else if (moisture > soilProfile.optimal_max && moisture <= soilProfile.saturation) {
    soilPts = 9.0;
    soilReason = `IoT probe reports elevated moisture (${moisture.toFixed(1)}% > ${soilProfile.optimal_max.toFixed(0)}% field capacity) for configured ${soilProfile.name}; root aeration constrained.`;
    soilStatus = 'Elevated';
  } else {
    soilPts = 3.0;
    soilReason = `IoT probe reports saturation (${moisture.toFixed(1)}% > ${soilProfile.saturation.toFixed(0)}%) for configured ${soilProfile.name}; high risk of root hypoxia and rot.`;
    soilStatus = 'Waterlogged';
  }

  // Dim 4: Crop Rotation
  const tCrop = req.crop.toLowerCase().trim();
  const pCrop = (req.previous_crop || '').toLowerCase().trim();
  let rotPts = 10.0;
  let rotReason = `Target crop '${req.crop}' evaluated as standalone seasonal planting without preceding rotation history (+10 pts baseline).`;
  let rotStatus = 'Baseline Single-Crop';

  if (pCrop) {
    if (tCrop === pCrop) {
      rotPts = 4.0;
      rotReason = `Continuous monoculture of '${tCrop}' following '${pCrop}'; increases soil-borne pathogen persistence and nutrient depletion.`;
      rotStatus = 'Monoculture Risk';
    } else {
      const isTLegume = LEGUMES.some((l) => tCrop.includes(l));
      const isPLegume = LEGUMES.some((l) => pCrop.includes(l));
      const isTCereal = CEREALS.some((c) => tCrop.includes(c));
      const isPCereal = CEREALS.some((c) => pCrop.includes(c));
      const isTCash = CASH_CROPS.some((c) => tCrop.includes(c));
      const isPCash = CASH_CROPS.some((c) => pCrop.includes(c));

      if ((isTLegume && (isPCereal || isPCash)) || ((isTCereal || isTCash) && isPLegume)) {
        rotPts = 15.0;
        rotReason = `Synergistic restorative rotation ('${pCrop}' → '${tCrop}'); breaks pest cycles, replenishes soil nitrogen, and optimizes nutrient uptake.`;
        rotStatus = 'Optimal Rotation';
      } else if (isTLegume || isPLegume) {
        rotPts = 13.0;
        rotReason = `Beneficial rotation incorporating legume biology ('${pCrop}' → '${tCrop}'); supports soil microbial health.`;
        rotStatus = 'Favorable Rotation';
      } else {
        rotPts = 11.0;
        rotReason = `Standard diverse crop sequence ('${pCrop}' → '${tCrop}'); interrupts host-specific disease cycles compared to monoculture.`;
        rotStatus = 'Diverse Rotation';
      }
    }
  }

  const rawTotal = waterPts + weatherPts + soilPts + rotPts;
  const totalScore = Math.max(0, Math.min(100, Math.round(rawTotal)));
  const scoreLabel = getScoreLabel(totalScore);

  // Water Volume Impact
  const flow = req.telemetry?.irrigation_flow_rate_lpm ?? 30.0;
  const duration = req.telemetry?.irrigation_duration_minutes ?? 60.0;
  // Option A: irrigation_flow_rate_lpm represents total irrigation-system flow for the selected field.
  // Total cycle volume = flow * duration. Field area does NOT multiply volume.
  const cycleLiters = Math.round(flow * duration);

  let waterImpactLitres = cycleLiters;
  let impactType: 'avoided' | 'saved' | 'unnecessary_use' | 'neutral' = 'neutral';
  let impactLabel = `${cycleLiters.toLocaleString()} L Productively Delivered`;
  let formulaBasis = `Measured water delivery (${flow.toFixed(0)} L/min over ${duration} min) satisfying crop requirement on ${farmArea.toFixed(2)} ha field (${cycleLiters.toLocaleString()} L total cycle volume).`;

  if (action === 'delay') {
    if (isRainImminent || moisture > soilProfile.optimal_max) {
      impactType = 'avoided';
      impactLabel = `Potential Irrigation Water Avoided: ${cycleLiters.toLocaleString()} L`;
      formulaBasis = `Avoided 1 planned irrigation cycle (${flow.toFixed(0)} L/min × ${duration} min for ${farmArea.toFixed(2)} ha field) because rain or root-zone moisture was sufficient. Represents simulated cycle volume avoided, not agronomic excess demand.`;
    } else {
      impactType = 'neutral';
      impactLabel = `Estimated ${cycleLiters.toLocaleString()} L Irrigation Deferred`;
      formulaBasis = `Irrigation deferred under standard operational schedule for ${farmArea.toFixed(2)} ha field (${cycleLiters.toLocaleString()} L total cycle volume).`;
    }
  } else if (isRainImminent || moisture > soilProfile.optimal_max) {
    impactType = 'unnecessary_use';
    impactLabel = `Estimated ${cycleLiters.toLocaleString()} L Redundant Application`;
    formulaBasis = `Application during imminent rain or soil saturation leads to avoidable pumping (${cycleLiters.toLocaleString()} L total cycle volume for ${farmArea.toFixed(2)} ha field).`;
  }

  // Recommendations
  let rec = 'Maintain routine monitoring. Soil moisture, microclimate, and crop rotation indices are well-balanced.';
  if (isRainImminent) {
    rec = moisture > soilProfile.optimal_max
      ? 'Postpone irrigation for 24–48 hours. Heavy rainfall is imminent and root-zone moisture is already elevated, avoiding root hypoxia.'
      : 'Postpone irrigation for 24 hours. Natural precipitation will sufficiently replenish root-zone moisture without groundwater pumping.';
  } else if (moisture < soilProfile.optimal_min) {
    rec = 'Irrigate during early morning or evening hours. Root-zone moisture has dropped below the field capacity threshold and no significant precipitation is forecast.';
  } else if (moisture > soilProfile.optimal_max) {
    rec = 'Hold irrigation. Current root-zone moisture is sufficient; additional watering risks nutrient leaching.';
  }

  const delayWaterPts = isRainImminent ? 40.0 : moisture > soilProfile.optimal_max ? 38.0 : moisture < soilProfile.optimal_min ? (moisture < soilProfile.wilting_point ? 20.0 : 24.0) : 32.0;
  const irrigateWaterPts = isRainImminent ? 10.0 : moisture > soilProfile.optimal_max ? 14.0 : moisture < soilProfile.optimal_min ? 36.0 : 28.0;

  const delayTotal = Math.max(0, Math.min(100, Math.round(delayWaterPts + weatherPts + soilPts + rotPts)));
  const irrigateTotal = Math.max(0, Math.min(100, Math.round(irrigateWaterPts + weatherPts + soilPts + rotPts)));

  return {
    total_score: totalScore,
    score_label: scoreLabel,
    summary: `Sustainability index is ${totalScore}/100 (${scoreLabel}). Action evaluated: ${action === 'delay' ? 'Delay' : 'Irrigate Now'}.`,
    recommendation: rec,
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
        dimension: 'Crop Rotation & Agro-Ecological Compatibility',
        points: rotPts,
        max_points: 15.0,
        percentage: Math.round((rotPts / 15.0) * 100),
        reason: rotReason,
        status: rotStatus,
      },
    },
    water_impact: {
      litres: waterImpactLitres,
      impact_type: impactType,
      label: impactLabel,
      formula_basis: formulaBasis,
    },
    comparison: {
      delay: {
        action: 'delay',
        score: delayTotal,
        score_label: getScoreLabel(delayTotal),
        water_impact_litres: cycleLiters,
        water_impact_type: isRainImminent || moisture > soilProfile.optimal_max ? 'avoided' : 'neutral',
      },
      irrigate_now: {
        action: 'irrigate_now',
        score: irrigateTotal,
        score_label: getScoreLabel(irrigateTotal),
        water_impact_litres: cycleLiters,
        water_impact_type: isRainImminent || moisture > soilProfile.optimal_max ? 'unnecessary_use' : 'neutral',
      },
    },
    telemetry_used: req.telemetry || DEFAULT_IOT_TELEMETRY,
    simulated_telemetry_notice:
      'Simulated IoT Telemetry Layer: Root-zone sensor values are deterministically simulated for SIH prototyping and reproducible scoring.',
  };
}
