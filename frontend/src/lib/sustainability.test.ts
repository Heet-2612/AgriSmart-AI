import { describe, it, expect } from 'vitest';
import {
  calculateSustainabilityScore,
  calculateWaterEfficiency,
  calculateWeatherSmart,
  calculateSoilCropCare,
  calculateWaterImpact,
  calculateRecommendation,
  validateSustainabilityInputs,
  getScoreLabel,
  DEFAULT_DEMO_INPUTS,
  WATER_IMPACT_LITERS_PER_HECTARE,
  WATER_IMPACT_DISCLAIMER,
  SustainabilityInputs,
} from './sustainability';

describe('Deterministic Sustainability Score Calculation Engine', () => {
  describe('Default Demo Values & Scenarios', () => {
    it('returns score 82 and water saved 180 L for 0.1 ha delay irrigation scenario', () => {
      const inputs: SustainabilityInputs = {
        ...DEFAULT_DEMO_INPUTS,
        farmAreaHectares: 0.1,
        action: 'delay',
      };

      const result = calculateSustainabilityScore(inputs);

      expect(result.totalScore).toBe(82);
      expect(result.scoreLabel).toBe('Excellent');
      expect(result.waterEfficiency.points).toBe(40);
      expect(result.weatherSmart.points).toBe(30);
      expect(result.soilCropCare.points).toBe(12);
      expect(result.soilCropCare.futurePoints).toBe(8);
      expect(result.waterImpact.type).toBe('saved');
      expect(result.waterImpact.litres).toBe(180);
      expect(result.waterImpact.label).toBe('Estimated 180 Litres Saved');
      expect(result.waterImpact.disclaimer).toBe(WATER_IMPACT_DISCLAIMER);
      expect(result.recommendation).toBe('Delay irrigation for 24 hours. Rain is likely and soil moisture is adequate.');
      expect(result.comparison.delay.score).toBe(82);
      expect(result.comparison.delay.waterSavedLitres).toBe(180);
      expect(result.comparison.irrigateNow.score).toBe(52);
      expect(result.comparison.irrigateNow.unnecessaryWaterLitres).toBe(180);
    });

    it('returns score 52 and unnecessary water use 180 L for 0.1 ha irrigate-now scenario', () => {
      const inputs: SustainabilityInputs = {
        ...DEFAULT_DEMO_INPUTS,
        farmAreaHectares: 0.1,
        action: 'irrigate_now',
      };

      const result = calculateSustainabilityScore(inputs);

      expect(result.totalScore).toBe(52);
      expect(result.scoreLabel).toBe('Needs Improvement');
      expect(result.waterEfficiency.points).toBe(10);
      expect(result.weatherSmart.points).toBe(30);
      expect(result.soilCropCare.points).toBe(12);
      expect(result.waterImpact.type).toBe('unnecessary_use');
      expect(result.waterImpact.litres).toBe(180);
      expect(result.waterImpact.label).toBe('Estimated 180 Litres Unnecessary Use');
      expect(result.waterImpact.disclaimer).toBe(WATER_IMPACT_DISCLAIMER);
    });
  });

  describe('Mathematical Boundary Guarantees', () => {
    it('guarantees 0 <= totalScore <= 100 across all condition variations', () => {
      const allOptimal: SustainabilityInputs = {
        crop: 'Rice',
        farmAreaHectares: 1.0,
        soilMoisturePercent: 30,
        rainProbabilityPercent: 80,
        expectedRainfallMm: 20,
        temperatureCelsius: 25,
        humidityPercent: 60,
        action: 'delay',
      };
      const maxRes = calculateSustainabilityScore(allOptimal);
      expect(maxRes.totalScore).toBeGreaterThanOrEqual(0);
      expect(maxRes.totalScore).toBeLessThanOrEqual(100);

      const allSuboptimal: SustainabilityInputs = {
        crop: 'Wheat',
        farmAreaHectares: 0.5,
        soilMoisturePercent: 10,
        rainProbabilityPercent: 70,
        expectedRainfallMm: 15,
        temperatureCelsius: 40,
        humidityPercent: 95,
        action: 'irrigate_now',
      };
      const minRes = calculateSustainabilityScore(allSuboptimal);
      expect(minRes.totalScore).toBeGreaterThanOrEqual(0);
      expect(minRes.totalScore).toBeLessThanOrEqual(100);
      expect(minRes.waterEfficiency.points).toBeLessThanOrEqual(50);
      expect(minRes.weatherSmart.points).toBeLessThanOrEqual(30);
      expect(minRes.soilCropCare.points).toBeLessThanOrEqual(20);
    });

    it('classifies score thresholds correctly', () => {
      expect(getScoreLabel(100)).toBe('Excellent');
      expect(getScoreLabel(80)).toBe('Excellent');
      expect(getScoreLabel(79)).toBe('Good');
      expect(getScoreLabel(60)).toBe('Good');
      expect(getScoreLabel(59)).toBe('Needs Improvement');
      expect(getScoreLabel(0)).toBe('Needs Improvement');
    });
  });

  describe('Rule Thresholds & Component Breakdown', () => {
    it('evaluates water efficiency thresholds (rain prob >= 60% and rainfall >= 5mm)', () => {
      // Exactly at threshold: 60% and 5mm + delay => 40 pts
      expect(
        calculateWaterEfficiency({
          ...DEFAULT_DEMO_INPUTS,
          rainProbabilityPercent: 60,
          expectedRainfallMm: 5,
          action: 'delay',
        }).points
      ).toBe(40);

      // Just below rain probability threshold: 59% + 5mm + delay => baseline 30 pts
      expect(
        calculateWaterEfficiency({
          ...DEFAULT_DEMO_INPUTS,
          rainProbabilityPercent: 59,
          expectedRainfallMm: 5,
          action: 'delay',
        }).points
      ).toBe(30);

      // Just below rainfall threshold: 65% + 4.9mm + delay => baseline 30 pts
      expect(
        calculateWaterEfficiency({
          ...DEFAULT_DEMO_INPUTS,
          rainProbabilityPercent: 65,
          expectedRainfallMm: 4.9,
          action: 'delay',
        }).points
      ).toBe(30);

      // Imminent rain with irrigate_now => 10 pts
      expect(
        calculateWaterEfficiency({
          ...DEFAULT_DEMO_INPUTS,
          rainProbabilityPercent: 60,
          expectedRainfallMm: 5,
          action: 'irrigate_now',
        }).points
      ).toBe(10);
    });

    it('evaluates weather-smart actions threshold boundaries', () => {
      // Rain prob boundary (60% vs 59%)
      const weather60 = calculateWeatherSmart({ ...DEFAULT_DEMO_INPUTS, rainProbabilityPercent: 60 });
      expect(weather60.rainPoints).toBe(15);
      const weather59 = calculateWeatherSmart({ ...DEFAULT_DEMO_INPUTS, rainProbabilityPercent: 59 });
      expect(weather59.rainPoints).toBe(0);

      // Temperature boundaries (18°C and 34°C inclusive)
      expect(calculateWeatherSmart({ ...DEFAULT_DEMO_INPUTS, temperatureCelsius: 18 }).tempPoints).toBe(10);
      expect(calculateWeatherSmart({ ...DEFAULT_DEMO_INPUTS, temperatureCelsius: 34 }).tempPoints).toBe(10);
      expect(calculateWeatherSmart({ ...DEFAULT_DEMO_INPUTS, temperatureCelsius: 17.9 }).tempPoints).toBe(0);
      expect(calculateWeatherSmart({ ...DEFAULT_DEMO_INPUTS, temperatureCelsius: 34.1 }).tempPoints).toBe(0);

      // Humidity boundary (80% vs 81%)
      expect(calculateWeatherSmart({ ...DEFAULT_DEMO_INPUTS, humidityPercent: 80 }).humidityPoints).toBe(5);
      expect(calculateWeatherSmart({ ...DEFAULT_DEMO_INPUTS, humidityPercent: 81 }).humidityPoints).toBe(0);
    });

    it('evaluates soil moisture threshold boundaries (25% to 40% inclusive)', () => {
      expect(calculateSoilCropCare({ ...DEFAULT_DEMO_INPUTS, soilMoisturePercent: 25 }).points).toBe(12);
      expect(calculateSoilCropCare({ ...DEFAULT_DEMO_INPUTS, soilMoisturePercent: 40 }).points).toBe(12);
      expect(calculateSoilCropCare({ ...DEFAULT_DEMO_INPUTS, soilMoisturePercent: 24.9 }).points).toBe(0);
      expect(calculateSoilCropCare({ ...DEFAULT_DEMO_INPUTS, soilMoisturePercent: 40.1 }).points).toBe(0);
    });
  });

  describe('Water Impact Constant & Area Scaling', () => {
    it('uses WATER_IMPACT_LITERS_PER_HECTARE constant of 1800', () => {
      expect(WATER_IMPACT_LITERS_PER_HECTARE).toBe(1800);
    });

    it('scales water impact by farm area (180 L * area / 0.1 ha)', () => {
      // 0.1 ha -> 180 L
      const impact01 = calculateWaterImpact({ ...DEFAULT_DEMO_INPUTS, farmAreaHectares: 0.1, action: 'delay' });
      expect(impact01.litres).toBe(180);

      // 0.5 ha -> 900 L
      const impact05 = calculateWaterImpact({ ...DEFAULT_DEMO_INPUTS, farmAreaHectares: 0.5, action: 'delay' });
      expect(impact05.litres).toBe(900);
      expect(impact05.label).toBe('Estimated 900 Litres Saved');

      // 0.2 ha -> 360 L
      const impact02 = calculateWaterImpact({ ...DEFAULT_DEMO_INPUTS, farmAreaHectares: 0.2, action: 'irrigate_now' });
      expect(impact02.litres).toBe(360);
      expect(impact02.label).toBe('Estimated 360 Litres Unnecessary Use');
    });
  });

  describe('Deterministic Recommendations & What-if Engine', () => {
    it('generates rule-based recommendations deterministically', () => {
      // Default: rain imminent, moisture adequate
      expect(calculateRecommendation(DEFAULT_DEMO_INPUTS)).toBe(
        'Delay irrigation for 24 hours. Rain is likely and soil moisture is adequate.'
      );

      // Rain imminent, moisture already high (> 40%)
      expect(
        calculateRecommendation({
          ...DEFAULT_DEMO_INPUTS,
          soilMoisturePercent: 45,
          rainProbabilityPercent: 70,
          expectedRainfallMm: 10,
        })
      ).toBe('Delay irrigation. Rain is likely and soil moisture is already high, avoiding over-saturation.');

      // Low moisture without rain
      expect(
        calculateRecommendation({
          ...DEFAULT_DEMO_INPUTS,
          soilMoisturePercent: 15,
          rainProbabilityPercent: 20,
          expectedRainfallMm: 0,
        })
      ).toBe('Irrigate now. Soil moisture is low and no significant rain is forecasted.');

      // High moisture without rain
      expect(
        calculateRecommendation({
          ...DEFAULT_DEMO_INPUTS,
          soilMoisturePercent: 48,
          rainProbabilityPercent: 10,
          expectedRainfallMm: 0,
        })
      ).toBe('Delay irrigation. Soil moisture is high, preventing root over-saturation.');
    });

    it('uses the same scoring engine for what-if delay and irrigate-now comparisons', () => {
      const result = calculateSustainabilityScore(DEFAULT_DEMO_INPUTS);
      expect(result.comparison.delay.score).toBe(82);
      expect(result.comparison.delay.waterSavedLitres).toBe(180);
      expect(result.comparison.delay.label).toBe('Excellent');

      expect(result.comparison.irrigateNow.score).toBe(52);
      expect(result.comparison.irrigateNow.unnecessaryWaterLitres).toBe(180);
      expect(result.comparison.irrigateNow.label).toBe('Needs Improvement');
    });
  });

  describe('Input Validation & Boundary Rejections', () => {
    it('accepts valid 0 and 100 percentage boundaries', () => {
      const zeroErrors = validateSustainabilityInputs({
        ...DEFAULT_DEMO_INPUTS,
        soilMoisturePercent: 0,
        rainProbabilityPercent: 0,
        humidityPercent: 0,
        expectedRainfallMm: 0,
      });
      expect(Object.keys(zeroErrors)).toHaveLength(0);

      const hundredErrors = validateSustainabilityInputs({
        ...DEFAULT_DEMO_INPUTS,
        soilMoisturePercent: 100,
        rainProbabilityPercent: 100,
        humidityPercent: 100,
      });
      expect(Object.keys(hundredErrors)).toHaveLength(0);
    });

    it('rejects negative values for percentage, area, and rainfall', () => {
      const errors = validateSustainabilityInputs({
        ...DEFAULT_DEMO_INPUTS,
        farmAreaHectares: -0.1,
        soilMoisturePercent: -1,
        rainProbabilityPercent: -5,
        humidityPercent: -10,
        expectedRainfallMm: -2,
      });

      expect(errors.farmAreaHectares).toBe('Farm area must be greater than 0 hectares.');
      expect(errors.soilMoisturePercent).toBe('Soil moisture must be between 0% and 100%.');
      expect(errors.rainProbabilityPercent).toBe('Rain probability must be between 0% and 100%.');
      expect(errors.humidityPercent).toBe('Humidity must be between 0% and 100%.');
      expect(errors.expectedRainfallMm).toBe('Expected rainfall cannot be negative.');
    });

    it('rejects values above 100% for percentages', () => {
      const errors = validateSustainabilityInputs({
        ...DEFAULT_DEMO_INPUTS,
        soilMoisturePercent: 101,
        rainProbabilityPercent: 100.1,
        humidityPercent: 150,
      });

      expect(errors.soilMoisturePercent).toBe('Soil moisture must be between 0% and 100%.');
      expect(errors.rainProbabilityPercent).toBe('Rain probability must be between 0% and 100%.');
      expect(errors.humidityPercent).toBe('Humidity must be between 0% and 100%.');
    });

    it('rejects NaN, Infinity, and -Infinity values', () => {
      const nanErrors = validateSustainabilityInputs({
        crop: 'Tomato',
        farmAreaHectares: NaN,
        soilMoisturePercent: NaN,
        rainProbabilityPercent: NaN,
        expectedRainfallMm: NaN,
        temperatureCelsius: NaN,
        humidityPercent: NaN,
        action: 'delay',
      });

      expect(nanErrors.farmAreaHectares).toBeDefined();
      expect(nanErrors.soilMoisturePercent).toBeDefined();
      expect(nanErrors.rainProbabilityPercent).toBeDefined();
      expect(nanErrors.expectedRainfallMm).toBeDefined();
      expect(nanErrors.temperatureCelsius).toBeDefined();
      expect(nanErrors.humidityPercent).toBeDefined();

      const infErrors = validateSustainabilityInputs({
        crop: 'Tomato',
        farmAreaHectares: Infinity,
        soilMoisturePercent: Infinity,
        rainProbabilityPercent: -Infinity,
        expectedRainfallMm: Infinity,
        temperatureCelsius: Infinity,
        humidityPercent: Infinity,
        action: 'delay',
      });

      expect(infErrors.farmAreaHectares).toBeDefined();
      expect(infErrors.soilMoisturePercent).toBeDefined();
      expect(infErrors.rainProbabilityPercent).toBeDefined();
      expect(infErrors.expectedRainfallMm).toBeDefined();
      expect(infErrors.temperatureCelsius).toBeDefined();
      expect(infErrors.humidityPercent).toBeDefined();
    });

    it('rejects empty or whitespace-only crop names', () => {
      expect(validateSustainabilityInputs({ ...DEFAULT_DEMO_INPUTS, crop: '' }).crop).toBe('Crop name is required.');
      expect(validateSustainabilityInputs({ ...DEFAULT_DEMO_INPUTS, crop: '   ' }).crop).toBe('Crop name is required.');
    });
  });
});
