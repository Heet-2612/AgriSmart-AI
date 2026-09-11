import { describe, it, expect } from 'vitest';
import {
  calculateSustainabilityScore,
  calculateWaterEfficiency,
  calculateWeatherSmart,
  calculateSoilCropCare,
  calculateWaterImpact,
  getScoreLabel,
  DEFAULT_DEMO_INPUTS,
  SustainabilityInputs,
} from './sustainability';

describe('Sustainability Impact Score Calculation Engine', () => {
  describe('Required Demo Scenarios', () => {
    it('returns score 82 and water saved 180 L for delay irrigation scenario', () => {
      const inputs: SustainabilityInputs = {
        ...DEFAULT_DEMO_INPUTS,
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
      expect(result.waterImpact.label).toContain('180 Litres Saved');
    });

    it('returns score 52 and unnecessary water use 180 L for irrigate-now scenario', () => {
      const inputs: SustainabilityInputs = {
        ...DEFAULT_DEMO_INPUTS,
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
      expect(result.waterImpact.label).toContain('180 Litres Unnecessary Use');
    });
  });

  describe('Score Label Boundaries', () => {
    it('classifies score >= 80 as Excellent', () => {
      expect(getScoreLabel(100)).toBe('Excellent');
      expect(getScoreLabel(82)).toBe('Excellent');
      expect(getScoreLabel(80)).toBe('Excellent');
    });

    it('classifies score between 60 and 79 as Good', () => {
      expect(getScoreLabel(79)).toBe('Good');
      expect(getScoreLabel(70)).toBe('Good');
      expect(getScoreLabel(60)).toBe('Good');
    });

    it('classifies score < 60 as Needs Improvement', () => {
      expect(getScoreLabel(59)).toBe('Needs Improvement');
      expect(getScoreLabel(52)).toBe('Needs Improvement');
      expect(getScoreLabel(30)).toBe('Needs Improvement');
      expect(getScoreLabel(0)).toBe('Needs Improvement');
    });
  });

  describe('Individual Sub-rule Calculations', () => {
    it('evaluates water efficiency under non-rain conditions as baseline (30 pts)', () => {
      const baselineInputs: SustainabilityInputs = {
        ...DEFAULT_DEMO_INPUTS,
        rainProbabilityPercent: 20,
        expectedRainfallMm: 1,
        action: 'delay',
      };

      const efficiency = calculateWaterEfficiency(baselineInputs);
      expect(efficiency.points).toBe(30);
    });

    it('evaluates weather-smart actions rules correctly', () => {
      // Suboptimal conditions test
      const coldDryInputs: SustainabilityInputs = {
        ...DEFAULT_DEMO_INPUTS,
        rainProbabilityPercent: 40, // <60 => 0
        temperatureCelsius: 15,     // <18 => 0
        humidityPercent: 85,        // >80 => 0
      };

      const weather = calculateWeatherSmart(coldDryInputs);
      expect(weather.rainPoints).toBe(0);
      expect(weather.tempPoints).toBe(0);
      expect(weather.humidityPoints).toBe(0);
      expect(weather.points).toBe(0);

      // Optimal conditions test
      const optimalWeather = calculateWeatherSmart(DEFAULT_DEMO_INPUTS);
      expect(optimalWeather.rainPoints).toBe(15);
      expect(optimalWeather.tempPoints).toBe(10);
      expect(optimalWeather.humidityPoints).toBe(5);
      expect(optimalWeather.points).toBe(30);
    });

    it('evaluates soil moisture and reserves 8 points for future disease scan', () => {
      const optimalSoil = calculateSoilCropCare(DEFAULT_DEMO_INPUTS);
      expect(optimalSoil.points).toBe(12);
      expect(optimalSoil.maxCurrentPoints).toBe(12);
      expect(optimalSoil.futurePoints).toBe(8);
      expect(optimalSoil.maxTotalPoints).toBe(20);
      expect(optimalSoil.futureNote).toContain('disease');

      const drySoil = calculateSoilCropCare({
        ...DEFAULT_DEMO_INPUTS,
        soilMoisturePercent: 18,
      });
      expect(drySoil.points).toBe(0);
    });

    it('evaluates water impact object and disclaimers', () => {
      const impactDelay = calculateWaterImpact({ ...DEFAULT_DEMO_INPUTS, action: 'delay' });
      expect(impactDelay.type).toBe('saved');
      expect(impactDelay.litres).toBe(180);
      expect(impactDelay.disclaimer).toContain('0.1-hectare');

      const impactIrrigate = calculateWaterImpact({ ...DEFAULT_DEMO_INPUTS, action: 'irrigate_now' });
      expect(impactIrrigate.type).toBe('unnecessary_use');
      expect(impactIrrigate.litres).toBe(180);
      expect(impactIrrigate.disclaimer).toContain('0.1-hectare');
    });
  });
});
