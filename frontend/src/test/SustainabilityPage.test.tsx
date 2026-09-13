import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SustainabilityPage } from '../pages/SustainabilityPage';
import * as client from '../api/client';

const mockWeather = {
  location: { name: 'Pune', country: 'India', latitude: 18.52, longitude: 73.85 },
  current: { temperature: 29.0, humidity: 62, wind_speed: 10.5, weather_code: 0, condition: 'Clear sky' },
  daily: { temp_min: 20.0, temp_max: 32.0, precipitation_sum: 0.0, precipitation_probability: 10 },
  advisories: ['Weather conditions are generally suitable for routine farm activities.'],
};

const mockScoreResponse = {
  total_score: 82,
  score_label: 'Excellent',
  summary: 'Favorable root-zone conditions and low immediate rain risk.',
  recommendation: 'Delay irrigation by 24h to maximize water conservation.',
  water_impact: {
    litres: 2400,
    impact_type: 'avoided',
    label: 'Potential Irrigation Water Avoided: 2,400 L',
    formula_basis: '40 L/min × 60 min (Simulated IoT Telemetry)',
  },
  comparison: {
    delay: {
      action: 'delay',
      score: 82,
      score_label: 'Excellent',
      water_impact_litres: 2400,
      water_impact_type: 'avoided',
    },
    irrigate_now: {
      action: 'irrigate_now',
      score: 65,
      score_label: 'Good',
      water_impact_litres: 2400,
      water_impact_type: 'unnecessary_use',
    },
  },
  breakdown: {
    water_timing: {
      name: 'Water Conservation & Timing',
      score: 35,
      max_score: 40,
      weight_percentage: 40,
      status: 'Optimal',
      reasoning: 'Adequate moisture with low rain risk.',
    },
    weather: {
      name: 'Weather Alignment',
      score: 24,
      max_score: 30,
      weight_percentage: 30,
      status: 'Moderate',
      reasoning: 'Moderate temperatures.',
    },
    soil: {
      name: 'Root-Zone Moisture',
      score: 13,
      max_score: 15,
      weight_percentage: 15,
      status: 'Optimal',
      reasoning: 'Moisture in ideal range.',
    },
    rotation: {
      name: 'Crop Rotation Compatibility',
      score: 10,
      max_score: 15,
      weight_percentage: 15,
      status: 'Moderate',
      reasoning: 'Good rotation compatibility.',
    },
  },
  telemetry_used: {
    preset_id: 'optimal_loam',
    soil_moisture_percent: 28.0,
    soil_temperature_c: 24.5,
    soil_ph: 6.8,
    soil_ec_ds_m: 0.75,
    irrigation_flow_rate_lpm: 40.0,
    irrigation_duration_minutes: 60.0,
    field_area_acres: 1.0,
    water_tank_level_percent: 85.0,
    is_simulated: true,
  },
  simulated_telemetry_notice: 'Simulated IoT Telemetry (SIH Prototype Layer)',
};

vi.mock('../api/client', async () => {
  const actual = await vi.importActual('../api/client');
  return {
    ...actual,
    getWeather: vi.fn(),
    calculateSustainabilityScore: vi.fn(),
  };
});

describe('SustainabilityPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(client.getWeather).mockResolvedValue(mockWeather);
    vi.mocked(client.calculateSustainabilityScore).mockResolvedValue(mockScoreResponse as any);
  });

  it('renders title, score gauge, and IoT telemetry preset controls', async () => {
    render(<SustainabilityPage />);

    expect(screen.getByRole('heading', { name: /sustainability & water-impact score/i, level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/simulated iot telemetry layer/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /sustainability index/i })).toBeInTheDocument();
    });

    // Verify IoT scenario presets render
    expect(screen.getByText(/optimal field capacity/i)).toBeInTheDocument();
    expect(screen.getByText(/root-zone moisture deficit/i)).toBeInTheDocument();
  });

  it('allows toggling irrigation action and updates comparison view', async () => {
    render(<SustainabilityPage />);

    await waitFor(() => {
      expect(screen.getByText(/what-if/i)).toBeInTheDocument();
    });

    const irrigateNowBtn = screen.getByRole('button', { name: /irrigate now/i });
    expect(irrigateNowBtn).toBeInTheDocument();
    fireEvent.click(irrigateNowBtn);

    await waitFor(() => {
      expect(client.calculateSustainabilityScore).toHaveBeenCalled();
    });
  });

  it('fetches live weather on demand and updates parameters', async () => {
    render(<SustainabilityPage initialLocation="Pune" />);

    await waitFor(() => {
      expect(screen.getByText('Clear sky')).toBeInTheDocument();
      expect(screen.getByText('Pune, India')).toBeInTheDocument();
    });

    const fetchBtn = screen.getByRole('button', { name: /fetch weather/i });
    fireEvent.click(fetchBtn);

    await waitFor(() => {
      expect(client.getWeather).toHaveBeenCalled();
    });
  });
});
