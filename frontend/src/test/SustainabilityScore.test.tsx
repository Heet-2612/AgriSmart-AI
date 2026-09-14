import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SustainabilityScorePage } from '../pages/SustainabilityScorePage';
import App from '../App';
import * as client from '../api/client';
import { ApiError } from '../api/client';
import { SustainabilityScoreResponse } from '../types';

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    calculateSustainabilityScore: vi.fn(),
  };
});

const MOCK_SCORE_RESPONSE: SustainabilityScoreResponse = {
  total_score: 85,
  score_label: 'Excellent',
  summary: 'Sustainability index is 85/100 (Excellent). Action evaluated: Delay.',
  recommendation: 'Delay irrigation for 24–48 hours. Upcoming rain (12 mm) and soil moisture (32%) are sufficient.',
  breakdown: {
    water_conservation: {
      dimension: 'Water Conservation & Irrigation Timing',
      points: 36.0,
      max_points: 40.0,
      percentage: 90.0,
      reason: 'Delaying irrigation captured forecasted rainfall, avoiding unnecessary groundwater extraction.',
      status: 'Optimal Conservation',
    },
    microclimate_alignment: {
      dimension: 'Microclimate & Weather Alignment',
      points: 26.0,
      max_points: 30.0,
      percentage: 86.7,
      reason: 'Ambient temperature (26°C) and RH (65%) are within optimal vegetative range.',
      status: 'Optimal Thermal Window',
    },
    soil_moisture_balance: {
      dimension: 'Soil Moisture & Root-Zone Balance',
      points: 13.0,
      max_points: 15.0,
      percentage: 86.7,
      reason: 'Root-zone moisture (32%) is near field capacity without saturation risks.',
      status: 'Field Capacity Balanced',
    },
    crop_rotation_compatibility: {
      dimension: 'Crop Rotation & Agro-Ecological Compatibility',
      points: 10.0,
      max_points: 15.0,
      percentage: 66.7,
      reason: 'Rotating Wheat after Chickpea maintains legume nitrogen fixation benefits.',
      status: 'Legume Rotation Boost',
    },
  },
  water_impact: {
    litres: 1800,
    impact_type: 'saved',
    label: '1,800 L water conserved by delaying irrigation cycle',
    formula_basis: 'Formula: 30 LPM × 60 min = 1,800 L saved',
  },
  comparison: {
    delay: {
      action: 'delay',
      score: 85,
      score_label: 'Excellent',
      water_impact_litres: 1800,
      water_impact_type: 'saved',
    },
    irrigate_now: {
      action: 'irrigate_now',
      score: 55,
      score_label: 'Needs Improvement',
      water_impact_litres: 1800,
      water_impact_type: 'unnecessary_use',
    },
  },
  telemetry_used: {
    soil_moisture_percent: 32.0,
    soil_temperature_celsius: 24.0,
    irrigation_flow_rate_lpm: 30.0,
    irrigation_duration_minutes: 60,
    water_tank_level_percent: 85.0,
    soil_ph: 6.8,
    soil_ec_ds_m: 1.2,
    is_simulated: true,
  },
  simulated_telemetry_notice:
    'Simulated IoT Telemetry Layer: Root-zone sensor values are deterministically simulated for SIH prototyping and reproducible scoring.',
};

describe('Sustainability Score Feature & Workflows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.scrollTo = vi.fn();
  });

  it('renders the Sustainability Score page with branding and advisory notice', () => {
    render(<SustainabilityScorePage onBack={vi.fn()} />);

    expect(
      screen.getByRole('heading', { name: /farm sustainability & water score/i, level: 1 })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/evaluate your irrigation timing, water conservation, weather alignment/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/farmer advisory:/i)).toBeInTheDocument();
    expect(screen.getByText(/not an official governmental certification/i)).toBeInTheDocument();
  });

  it('renders all required form sections and controls', () => {
    render(<SustainabilityScorePage onBack={vi.fn()} />);

    expect(screen.getByLabelText(/target crop/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/plot size \(hectares\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/soil classification/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/previously harvested crop/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/ambient temp/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/humidity/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/rain probability/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/expected rain/i)).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: /planned irrigation decision/i })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /calculate sustainability score/i })
    ).toBeInTheDocument();
  });

  it('allows updating input values cleanly', () => {
    render(<SustainabilityScorePage onBack={vi.fn()} />);

    const cropInput = screen.getByLabelText(/target crop/i) as HTMLInputElement;
    fireEvent.change(cropInput, { target: { value: 'Rice' } });
    expect(cropInput.value).toBe('Rice');

    const areaInput = screen.getByLabelText(/plot size \(hectares\)/i) as HTMLInputElement;
    fireEvent.change(areaInput, { target: { value: '2.5' } });
    expect(areaInput.value).toBe('2.5');
  });

  it('validates required fields on empty submission', async () => {
    render(<SustainabilityScorePage onBack={vi.fn()} />);

    const cropInput = screen.getByLabelText(/target crop/i);
    fireEvent.change(cropInput, { target: { value: '' } });

    const submitBtn = screen.getByRole('button', { name: /calculate sustainability score/i });
    fireEvent.click(submitBtn);

    expect(
      await screen.findByText(/target crop name is required\./i)
    ).toBeInTheDocument();
    expect(client.calculateSustainabilityScore).not.toHaveBeenCalled();
  });

  it('validates invalid numeric ranges for plot size, temp, and humidity', async () => {
    render(<SustainabilityScorePage onBack={vi.fn()} />);

    const areaInput = screen.getByLabelText(/plot size \(hectares\)/i);
    fireEvent.change(areaInput, { target: { value: '-5' } });

    const tempInput = screen.getByLabelText(/ambient temp/i);
    fireEvent.change(tempInput, { target: { value: '75' } });

    const humInput = screen.getByLabelText(/humidity/i);
    fireEvent.change(humInput, { target: { value: '150' } });

    const submitBtn = screen.getByRole('button', { name: /calculate sustainability score/i });
    fireEvent.click(submitBtn);

    expect(
      await screen.findByText(/plot size must be greater than 0/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/temperature must be between -10°c and 60°c/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/humidity must be between 0% and 100%/i)
    ).toBeInTheDocument();
    expect(client.calculateSustainabilityScore).not.toHaveBeenCalled();
  });

  it('submits form successfully and displays loading state and result UI', async () => {
    vi.mocked(client.calculateSustainabilityScore).mockResolvedValue(MOCK_SCORE_RESPONSE);

    render(<SustainabilityScorePage onBack={vi.fn()} />);

    const submitBtn = screen.getByRole('button', { name: /calculate sustainability score/i });
    fireEvent.click(submitBtn);

    expect(client.calculateSustainabilityScore).toHaveBeenCalledWith(
      expect.objectContaining({
        crop: 'Wheat',
        farm_area_hectares: 1,
        action: 'delay',
        temperature_celsius: 26,
        humidity_percent: 65,
      })
    );

    // Results render
    expect(await screen.findByRole('region', { name: /sustainability score results/i })).toBeInTheDocument();
    expect(screen.getByText('85')).toBeInTheDocument();
    expect(screen.getAllByText('Excellent').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/sustainability index is 85\/100/i)).toBeInTheDocument();
    expect(screen.getByText(/delay irrigation for 24–48 hours/i)).toBeInTheDocument();
  });

  it('renders four-dimension breakdown with points, status, and reason', async () => {
    vi.mocked(client.calculateSustainabilityScore).mockResolvedValue(MOCK_SCORE_RESPONSE);

    render(<SustainabilityScorePage onBack={vi.fn()} />);
    const submitBtn = screen.getByRole('button', { name: /calculate sustainability score/i });
    fireEvent.click(submitBtn);

    expect(
      await screen.findByRole('region', { name: 'Water Conservation & Irrigation Timing' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: 'Microclimate & Weather Alignment' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: 'Soil Moisture & Root-Zone Balance' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: 'Crop Rotation & Agro-Ecological Compatibility' })
    ).toBeInTheDocument();

    expect(screen.getByText('Optimal Conservation')).toBeInTheDocument();
    expect(screen.getByText(/delaying irrigation captured forecasted rainfall/i)).toBeInTheDocument();
  });

  it('renders water volume impact and formula basis', async () => {
    vi.mocked(client.calculateSustainabilityScore).mockResolvedValue(MOCK_SCORE_RESPONSE);

    render(<SustainabilityScorePage onBack={vi.fn()} />);
    const submitBtn = screen.getByRole('button', { name: /calculate sustainability score/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByText('1,800')).toBeInTheDocument();
    expect(screen.getByText('Water Conserved')).toBeInTheDocument();
    expect(screen.getByText(/formula: 30 lpm × 60 min = 1,800 l saved/i)).toBeInTheDocument();
  });

  it('renders what-if action comparison comparing delay vs irrigate_now', async () => {
    vi.mocked(client.calculateSustainabilityScore).mockResolvedValue(MOCK_SCORE_RESPONSE);

    render(<SustainabilityScorePage onBack={vi.fn()} />);
    const submitBtn = screen.getByRole('button', { name: /calculate sustainability score/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByText(/what-if decision comparison/i)).toBeInTheDocument();
    expect(screen.getByText('85/100')).toBeInTheDocument();
    expect(screen.getByText('55/100')).toBeInTheDocument();
    expect(screen.getByText('Evaluated Action')).toBeInTheDocument();
  });

  it('renders simulated IoT telemetry notice and sensor readings', async () => {
    vi.mocked(client.calculateSustainabilityScore).mockResolvedValue(MOCK_SCORE_RESPONSE);

    render(<SustainabilityScorePage onBack={vi.fn()} />);
    const submitBtn = screen.getByRole('button', { name: /calculate sustainability score/i });
    fireEvent.click(submitBtn);

    expect(
      await screen.findByText(/simulated iot telemetry reference layer/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/root-zone sensor values are deterministically simulated/i)
    ).toBeInTheDocument();
    expect(screen.getAllByText('32% VWC').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('24°C')).toBeInTheDocument();
  });

  it('displays backend error message and supports retry', async () => {
    vi.mocked(client.calculateSustainabilityScore).mockRejectedValueOnce(
      new ApiError(400, 'Invalid soil parameter or crop specification.')
    );

    render(<SustainabilityScorePage onBack={vi.fn()} />);
    const submitBtn = screen.getByRole('button', { name: /calculate sustainability score/i });
    fireEvent.click(submitBtn);

    expect(
      await screen.findByText('Unable to Calculate Sustainability Score')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Invalid soil parameter or crop specification.')
    ).toBeInTheDocument();

    // Retry
    vi.mocked(client.calculateSustainabilityScore).mockResolvedValueOnce(MOCK_SCORE_RESPONSE);
    const retryBtn = screen.getByRole('button', { name: /retry calculation/i });
    fireEvent.click(retryBtn);

    expect(
      await screen.findByRole('region', { name: /sustainability score results/i })
    ).toBeInTheDocument();
  });

  it('displays network failure error cleanly and supports retry', async () => {
    vi.mocked(client.calculateSustainabilityScore).mockRejectedValueOnce(
      new ApiError(0, 'Unable to connect to the sustainability service. Please check your network connection.')
    );

    render(<SustainabilityScorePage onBack={vi.fn()} />);
    const submitBtn = screen.getByRole('button', { name: /calculate sustainability score/i });
    fireEvent.click(submitBtn);

    expect(
      await screen.findByText(/unable to connect to the sustainability service/i)
    ).toBeInTheDocument();
  });

  it('allows guest access without requiring authentication', () => {
    render(<SustainabilityScorePage onBack={vi.fn()} />);

    expect(
      screen.getByRole('button', { name: /calculate sustainability score/i })
    ).toBeEnabled();
  });

  it('navigates to Crop Recommendation via Farm Insights sub-tabs and back', () => {
    const handleNavCrop = vi.fn();
    render(<SustainabilityScorePage onBack={vi.fn()} onNavigateCropRecommendation={handleNavCrop} />);

    const cropTab = screen.getByRole('tab', { name: /crop recommendation/i });
    fireEvent.click(cropTab);

    expect(handleNavCrop).toHaveBeenCalledTimes(1);
  });

  it('switches between Crop Recommendation and Sustainability Score within App navigation', async () => {
    render(<App />);

    // Click Farm Insight from header
    const farmInsightBtn = screen.getByRole('button', { name: /farm insight — crop recommendation/i });
    fireEvent.click(farmInsightBtn);

    // Verify Crop Recommendation view
    expect(
      await screen.findByRole('heading', { name: 'Crop Recommendation', level: 1 })
    ).toBeInTheDocument();

    // Click Sustainability Score sub-tab
    const sustainTab = screen.getByRole('tab', { name: /sustainability score/i });
    fireEvent.click(sustainTab);

    // Verify Sustainability Score view
    expect(
      await screen.findByRole('heading', { name: /farm sustainability & water score/i, level: 1 })
    ).toBeInTheDocument();

    // Click Back to Plant Diagnosis
    const backBtn = screen.getByRole('button', { name: /back to plant diagnosis/i });
    fireEvent.click(backBtn);

    // Returned to Plant Disease Diagnosis
    expect(
      await screen.findByRole('heading', { name: /plant disease diagnosis/i, level: 1 })
    ).toBeInTheDocument();
  });
});
