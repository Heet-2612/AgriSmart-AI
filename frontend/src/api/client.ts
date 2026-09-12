import { HealthResponse, PredictionResponse } from '../types';

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
