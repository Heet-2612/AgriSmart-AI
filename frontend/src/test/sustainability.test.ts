import { describe, it, expect } from 'vitest';
import {
  calculateClientSustainabilityScore,
  validateSustainabilityForm,
  getScoreLabel,
  IOT_PRESETS,
} from '../lib/sustainability';

describe('Sustainability Library & Calculation Engine', () => {
  it('correctly maps score labels across boundaries', () => {
    expect(getScoreLabel(80)).toBe('Excellent');
    expect(getScoreLabel(100)).toBe('Excellent');
    expect(getScoreLabel(79)).toBe('Good');
    expect(getScoreLabel(60)).toBe('Good');
    expect(getScoreLabel(59)).toBe('Needs Improvement');
    expect(getScoreLabel(0)).toBe('Needs Improvement');
  });

  it('validates farm form inputs and catches errors', () => {
    const valid = {
      crop: 'Wheat',
      farm_area_hectares: '0.2',
      temperature_celsius: '24',
      humidity_percent: '60',
      rain_probability_percent: '40',
      expected_rainfall_mm: '10',
      soil_moisture_percent: '30',
    };
    expect(Object.keys(validateSustainabilityForm(valid))).toHaveLength(0);

    const invalid = {
      ...valid,
      crop: '',
      farm_area_hectares: '-1',
      humidity_percent: '150',
    };
    const errors = validateSustainabilityForm(invalid);
    expect(errors.crop).toBeDefined();
    expect(errors.farm_area_hectares).toBeDefined();
    expect(errors.humidity_percent).toBeDefined();
  });

  it('scores high (>= 80) when delaying irrigation before imminent rain with optimal soil & rotation', () => {
    const res = calculateClientSustainabilityScore({
      crop: 'Chickpea',
      previous_crop: 'Cotton',
      soil_type: 'Black',
      farm_area_hectares: 0.1,
      action: 'delay',
      temperature_celsius: 24.0,
      humidity_percent: 55.0,
      rain_probability_percent: 75.0,
      expected_rainfall_mm: 15.0,
      soil_moisture_percent: 32.0,
    });

    expect(res.total_score).toBeGreaterThanOrEqual(80);
    expect(res.score_label).toBe('Excellent');
    expect(res.breakdown.water_conservation.points).toBe(40.0);
    expect(res.breakdown.crop_rotation_compatibility.points).toBe(15.0);
    expect(res.water_impact.impact_type).toBe('avoided');
    expect(res.water_impact.litres).toBeGreaterThan(0);
    expect(res.water_impact.label).toContain('Potential Irrigation Water Avoided');
  });

  it('penalizes score when irrigating into already waterlogged soil before heavy rain', () => {
    const res = calculateClientSustainabilityScore({
      crop: 'Rice',
      previous_crop: 'Rice', // Monoculture
      soil_type: 'Clay',
      farm_area_hectares: 0.1,
      action: 'irrigate_now', // Irrigating into waterlogged soil before rain
      temperature_celsius: 38.0,
      humidity_percent: 90.0,
      rain_probability_percent: 85.0,
      expected_rainfall_mm: 20.0,
      soil_moisture_percent: 50.0,
    });

    expect(res.total_score).toBeLessThan(50);
    expect(res.score_label).toBe('Needs Improvement');
    expect(res.breakdown.water_conservation.points).toBe(10.0);
    expect(res.breakdown.crop_rotation_compatibility.points).toBe(4.0);
    expect(res.water_impact.impact_type).toBe('unnecessary_use');
  });

  it('is completely deterministic: identical inputs yield identical scores', () => {
    const req = {
      crop: 'Wheat',
      previous_crop: 'Rice',
      farm_area_hectares: 0.5,
      action: 'delay' as const,
      temperature_celsius: 20.0,
      humidity_percent: 55.0,
      rain_probability_percent: 20.0,
      expected_rainfall_mm: 0.0,
      soil_moisture_percent: 30.0,
    };

    const res1 = calculateClientSustainabilityScore(req);
    const res2 = calculateClientSustainabilityScore(req);
    expect(res1.total_score).toBe(res2.total_score);
    expect(res1.water_impact.litres).toBe(res2.water_impact.litres);
    expect(res1.breakdown).toEqual(res2.breakdown);
  });

  it('calculates water volume impact accurately from IoT flow rate and plot area', () => {
    const telemetry = IOT_PRESETS[0].telemetry; // 30 L/min, 60 min -> 1,800 L per 0.1 ha
    const res = calculateClientSustainabilityScore({
      crop: 'Maize',
      farm_area_hectares: 0.2, // 2x baseline
      action: 'delay',
      temperature_celsius: 25.0,
      humidity_percent: 60.0,
      rain_probability_percent: 70.0,
      expected_rainfall_mm: 10.0,
      soil_moisture_percent: 30.0,
      telemetry,
    });

    // 30 L/min * 60 min * (0.2 / 0.1) = 3,600 Litres
    expect(res.water_impact.litres).toBe(3600);
    expect(res.water_impact.impact_type).toBe('avoided');
    expect(res.water_impact.label).toContain('Potential Irrigation Water Avoided: 3,600 L');
  });
});
