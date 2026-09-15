import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import * as client from '../api/client';
import { WeatherIntelligenceCard } from '../components/weather/WeatherIntelligenceCard';
import { WeatherIntelligenceResponse } from '../types';

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    getWeatherIntelligence: vi.fn(),
  };
});

const mockIntelligenceResponse: WeatherIntelligenceResponse = {
  location: {
    name: 'Pune',
    country: 'India',
    latitude: 18.5204,
    longitude: 73.8567,
    state: 'Maharashtra',
    district: 'Pune',
  },
  current: {
    temperature: 28.5,
    humidity: 84.0,
    wind_speed: 12.0,
    weather_code: 61,
    condition: 'Slight rain',
    precipitation: 1.5,
  },
  forecast_daily: [
    {
      date: '2026-09-15',
      temp_min: 22.0,
      temp_max: 30.0,
      precipitation_sum: 12.4,
      precipitation_probability: 80.0,
      weather_code: 63,
      condition: 'Moderate rain',
    },
    {
      date: '2026-09-16',
      temp_min: 21.0,
      temp_max: 29.0,
      precipitation_sum: 4.0,
      precipitation_probability: 45.0,
      weather_code: 61,
      condition: 'Slight rain',
    },
  ],
  primary_action: {
    action: 'DELAY_IRRIGATION',
    badge_label: 'Delay Irrigation',
    headline: 'Delay irrigation — rain is likely within the next 24 hours.',
    detail: '12.4 mm rain forecast within 24 hours (80% probability) while soil moisture is currently adequate at 34.0%.',
    severity: 'high',
  },
  alerts: [
    {
      category: 'irrigation',
      severity: 'high',
      action: 'DELAY_IRRIGATION',
      title: 'Delay Irrigation',
      message: 'Delay irrigation — rain likely.',
      reason: '12.4 mm rain forecast within 24 hours (80% probability).',
      priority: 2,
    },
    {
      category: 'disease_risk',
      severity: 'high',
      action: 'MONITOR_DISEASE_RISK',
      title: 'Raised Disease Risk',
      message: 'Raised disease risk — monitor canopy for symptoms of Potato___Late_blight.',
      reason: 'High relative humidity (84.0%) and moderate temperature (28.5°C) favor fungal pathogens.',
      priority: 3,
    },
  ],
  farm_context_applied: {
    crop: 'Potato',
    soil_moisture_percent: 34.0,
    diagnosed_disease: 'Potato___Late_blight',
  },
  farm_context_complete: true,
  data_source: 'Open-Meteo API & India Meteorological Department (IMD) Normals',
  timestamp: '2026-09-15T10:30:00Z',
};

describe('WeatherIntelligenceCard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders weather intelligence card and displays primary action and alerts', async () => {
    vi.mocked(client.getWeatherIntelligence).mockResolvedValueOnce(mockIntelligenceResponse);

    render(
      <WeatherIntelligenceCard
        initialLocation="Pune"
        initialCrop="Potato"
        initialSoilMoisture={34.0}
        initialDisease="Potato___Late_blight"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Weather & Farm Intelligence')).toBeInTheDocument();
      expect(screen.getAllByText('Delay Irrigation').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/12.4 mm rain forecast/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('28.5°C')).toBeInTheDocument();
      expect(screen.getByText('84%')).toBeInTheDocument();
      expect(screen.getByText(/Open-Meteo API/)).toBeInTheDocument();
    });


  });

  it('handles error state gracefully on API failure', async () => {
    vi.mocked(client.getWeatherIntelligence).mockRejectedValueOnce(
      new client.ApiError(503, 'Weather service is temporarily unavailable.')
    );

    render(<WeatherIntelligenceCard initialLocation="Pune" />);

    await waitFor(() => {
      expect(screen.getByText('Unable to load weather intelligence')).toBeInTheDocument();
      expect(screen.getByText('Weather service is temporarily unavailable.')).toBeInTheDocument();
    });
  });

  it('allows editing location and submitting update', async () => {
    vi.mocked(client.getWeatherIntelligence).mockResolvedValue(mockIntelligenceResponse);

    render(<WeatherIntelligenceCard initialLocation="Pune" />);

    await waitFor(() => {
      expect(client.getWeatherIntelligence).toHaveBeenCalledWith(
        expect.objectContaining({ location: 'Pune' })
      );
    });

    const input = screen.getByPlaceholderText('City / District (e.g. Pune)');
    fireEvent.change(input, { target: { value: 'Ahmedabad' } });

    const updateBtn = screen.getByRole('button', { name: /update/i });
    fireEvent.click(updateBtn);

    await waitFor(() => {
      expect(client.getWeatherIntelligence).toHaveBeenCalledWith(
        expect.objectContaining({ location: 'Ahmedabad' })
      );
    });
  });
});
