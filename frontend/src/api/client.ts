import { HealthResponse, PredictionResponse, CropRecommendationRequest, CropRecommendationResponse } from '../types';

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
