import { HealthResponse, PredictionResponse } from '../types';

export async function checkHealth(): Promise<HealthResponse> {
  const res = await fetch('/health');
  if (!res.ok) {
    throw new Error(`Health check failed with status: ${res.status}`);
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
    throw new Error(errorData.detail || `Prediction failed with status: ${res.status}`);
  }

  return res.json();
}
