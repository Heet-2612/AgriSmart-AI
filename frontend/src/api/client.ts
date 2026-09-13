import {
  HealthResponse,
  PredictionResponse,
  CropRecommendationRequest,
  CropRecommendationResponse,
  WeatherResponse,
  SeasonalClimate,
} from '../types';

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function checkHealth(): Promise<HealthResponse> {
  const res = await fetch('/health');
  if (!res.ok) {
    throw new ApiError(res.status, `Health check failed with status: ${res.status}`);
  }
  return res.json();
}

export async function predictDisease(file: File): Promise<PredictionResponse> {
  const formData = new FormData();
  formData.append('image', file);

  const res = await fetch('/api/predictions', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(res.status, errorData.detail || `Prediction failed with status: ${res.status}`);
  }

  return res.json();
}

export async function recommendCrop(
  data: CropRecommendationRequest
): Promise<CropRecommendationResponse> {
  const res = await fetch('/api/crop-recommendations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: res.statusText }));
    let message = 'Failed to get crop recommendation';
    if (typeof errorData?.detail === 'string') {
      message = errorData.detail;
    } else if (Array.isArray(errorData?.detail)) {
      message = errorData.detail
        .map((d: { msg?: string }) => d.msg || JSON.stringify(d))
        .join('; ');
    } else if (res.statusText) {
      message = `${res.statusText} (${res.status})`;
    }
    throw new ApiError(res.status, message);
  }

  return res.json();
}

export const recommendCrops = recommendCrop;

export async function getWeather(location: string): Promise<WeatherResponse> {
  const trimmed = location.trim();
  if (!trimmed) {
    throw new ApiError(400, 'Location query cannot be empty.');
  }

  const res = await fetch(`/api/weather?location=${encodeURIComponent(trimmed)}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: res.statusText }));
    const message = errorData?.detail || `Weather retrieval failed with status: ${res.status}`;
    throw new ApiError(res.status, message);
  }

  return res.json();
}

export async function getSeasonalClimate(
  state: string,
  district?: string,
  season?: string
): Promise<SeasonalClimate> {
  const params = new URLSearchParams({ state: state.trim() });
  if (district?.trim()) params.append('district', district.trim());
  if (season?.trim()) params.append('season', season.trim());

  const res = await fetch(`/api/seasonal-climate?${params.toString()}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: res.statusText }));
    const message = errorData?.detail || `Seasonal climate retrieval failed with status: ${res.status}`;
    throw new ApiError(res.status, message);
  }

  return res.json();
}

