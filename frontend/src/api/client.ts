import {
  HealthResponse,
  PredictionResponse,
  CropRecommendationRequest,
  CropRecommendationResponse,
  WeatherResponse,
  SeasonalClimate,
  ChatRequest,
  ChatAnswer,
  ChatSessionResponse,
  ChatMessageResponse,
  SustainabilityScoreRequest,
  SustainabilityScoreResponse,
  IoTPresetsResponse,
  WeatherIntelligenceRequest,
  WeatherIntelligenceResponse,
} from '../types';

export class ApiError extends Error {

  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function extractErrorMessage(
  errorData: unknown,
  status: number,
  fallbackMessage: string
): string {
  if (status === 401) {
    return 'Authentication required or session expired. Please sign in or continue as guest.';
  }
  if (status === 429) {
    return 'Too many requests. Please wait a moment and try again.';
  }

  let message = '';
  if (typeof errorData === 'object' && errorData !== null) {
    const data = errorData as Record<string, unknown>;
    if (typeof data.detail === 'string' && data.detail.trim()) {
      message = data.detail.trim();
    } else if (Array.isArray(data.detail)) {
      const msgs = data.detail
        .map((item) => {
          if (typeof item === 'string') return item.trim();
          if (typeof item === 'object' && item !== null) {
            const d = item as Record<string, unknown>;
            if (typeof d.msg === 'string') return d.msg.trim();
            if (typeof d.message === 'string') return d.message.trim();
          }
          return '';
        })
        .filter(Boolean);
      if (msgs.length > 0) {
        message = msgs.join('. ');
      }
    } else if (typeof data.message === 'string' && data.message.trim()) {
      message = data.message.trim();
    }
  } else if (typeof errorData === 'string' && errorData.trim()) {
    message = errorData.trim();
  }

  if (message) {
    if (message.includes('[object Object]')) {
      return fallbackMessage;
    }
    const sanitized = message
      .replace(/(Bearer\s+)[A-Za-z0-9-_=.]+/gi, '$1[REDACTED]')
      .replace(/(password|secret|key|token)[=:]\s*[^\s,]+/gi, '$1=[REDACTED]')
      .replace(/Traceback \(most recent call last\):[\s\S]*/gi, '')
      .trim();
    return sanitized || fallbackMessage;
  }

  if (status === 503) {
    return 'Service is temporarily unavailable. Please verify the backend is running and try again.';
  }
  if (status >= 500) {
    return 'Backend server is unreachable or encountered an error. Please verify the backend is running on port 8000.';
  }

  return fallbackMessage;
}

export async function checkHealth(): Promise<HealthResponse> {
  let res: Response;
  try {
    res = await fetch('/health');
  } catch {
    throw new ApiError(0, 'Unable to connect to server. Please check your network connection.');
  }

  if (!res.ok) {
    throw new ApiError(res.status, `Health check failed with status: ${res.status}`);
  }
  return res.json();
}

export async function predictDisease(file: File): Promise<PredictionResponse> {
  const formData = new FormData();
  formData.append('image', file);

  let res: Response;
  try {
    res = await fetch('/api/predictions', {
      method: 'POST',
      body: formData,
    });
  } catch {
    throw new ApiError(0, 'Unable to connect to the diagnostic server. Please check your network connection.');
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: res.statusText }));
    const message = extractErrorMessage(errorData, res.status, `Prediction failed with status: ${res.status}`);
    throw new ApiError(res.status, message);
  }

  return res.json();
}

export async function recommendCrop(
  data: CropRecommendationRequest
): Promise<CropRecommendationResponse> {
  let res: Response;
  try {
    res = await fetch('/api/crop-recommendations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  } catch {
    throw new ApiError(0, 'Unable to connect to the recommendation server. Please check your network connection.');
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: res.statusText }));
    const message = extractErrorMessage(errorData, res.status, 'Failed to get crop recommendation');
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

export async function getWeatherIntelligence(
  data: WeatherIntelligenceRequest
): Promise<WeatherIntelligenceResponse> {
  const trimmedLocation = (data.location || '').trim();
  if (!trimmedLocation) {
    throw new ApiError(400, 'Location query cannot be empty.');
  }

  let res: Response;
  try {
    res = await fetch('/api/weather-intelligence', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...data,
        location: trimmedLocation,
      }),
    });
  } catch {
    throw new ApiError(0, 'Unable to connect to the weather intelligence service. Please check your network connection.');
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: res.statusText }));
    const message = extractErrorMessage(errorData, res.status, `Weather intelligence retrieval failed with status: ${res.status}`);
    throw new ApiError(res.status, message);
  }

  return res.json();
}


export async function sendChatMessage(data: ChatRequest): Promise<ChatAnswer> {
  const trimmedQuestion = data.question ? data.question.trim() : '';
  if (!trimmedQuestion || trimmedQuestion.length > 500) {
    throw new ApiError(400, 'Question must be between 1 and 500 characters.');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  try {
    const token = localStorage.getItem('access_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  } catch {
    // Gracefully ignore in non-browser/restricted environments
  }

  let res: Response;
  try {
    res = await fetch('/api/chat', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ...data,
        question: trimmedQuestion,
      }),
    });
  } catch {
    throw new ApiError(0, 'Unable to connect to the AI assistant. Please check your network connection.');
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: res.statusText }));
    let message = extractErrorMessage(errorData, res.status, 'Failed to get advice from Agro AI');
    if (res.status === 400 || res.status === 422) {
      message = typeof errorData?.detail === 'string' && errorData.detail
        ? errorData.detail
        : 'Please provide a valid question for the AI assistant (1–500 characters).';
    }
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

import { AuthResponse, AuthUser, LoginRequest, RegisterRequest } from '../types/auth';

export async function registerUser(data: RegisterRequest): Promise<AuthResponse> {
  let res: Response;
  try {
    res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  } catch {
    throw new ApiError(0, 'Unable to connect to the authentication server. Please check your network connection.');
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: res.statusText }));
    const message = extractErrorMessage(errorData, res.status, `Registration failed with status: ${res.status}`);
    throw new ApiError(res.status, message);
  }

  return res.json();
}

export async function loginUser(data: LoginRequest): Promise<AuthResponse> {
  let res: Response;
  try {
    res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  } catch {
    throw new ApiError(0, 'Unable to connect to the authentication server. Please check your network connection.');
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: res.statusText }));
    let message = extractErrorMessage(errorData, res.status, `Login failed with status: ${res.status}`);
    if (res.status === 401) {
      message = typeof errorData?.detail === 'string' && errorData.detail
        ? errorData.detail
        : 'Incorrect email or password.';
    }
    throw new ApiError(res.status, message);
  }

  return res.json();
}

export async function getAuthMe(): Promise<AuthUser> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch('/api/auth/me', {
      method: 'GET',
      headers,
    });
  } catch {
    throw new ApiError(0, 'Unable to connect to the server. Please check your network connection.');
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: res.statusText }));
    const message = extractErrorMessage(errorData, res.status, `Session validation failed with status: ${res.status}`);
    throw new ApiError(res.status, message);
  }

  return res.json();
}

export async function getChatSessions(): Promise<ChatSessionResponse[]> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch('/api/chat/sessions', {
      method: 'GET',
      headers,
    });
  } catch {
    throw new ApiError(0, 'Unable to connect to the chat service. Please check your network connection.');
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: res.statusText }));
    const message = extractErrorMessage(errorData, res.status, `Failed to fetch chat sessions with status: ${res.status}`);
    throw new ApiError(res.status, message);
  }

  return res.json();
}

export async function getChatSessionMessages(sessionId: string): Promise<ChatMessageResponse[]> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const encodedId = encodeURIComponent(sessionId);
  let res: Response;
  try {
    res = await fetch(`/api/chat/sessions/${encodedId}/messages`, {
      method: 'GET',
      headers,
    });
  } catch {
    throw new ApiError(0, 'Unable to connect to the chat service. Please check your network connection.');
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: res.statusText }));
    const message = extractErrorMessage(errorData, res.status, `Failed to fetch session messages with status: ${res.status}`);
    throw new ApiError(res.status, message);
  }

  return res.json();
}

export async function calculateSustainabilityScore(
  data: SustainabilityScoreRequest
): Promise<SustainabilityScoreResponse> {
  let res: Response;
  try {
    res = await fetch('/api/sustainability-score', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  } catch {
    throw new ApiError(0, 'Unable to connect to the sustainability service. Please check your network connection.');
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: res.statusText }));
    const message = extractErrorMessage(errorData, res.status, 'Failed to calculate sustainability score');
    throw new ApiError(res.status, message);
  }

  return res.json();
}

export async function getIoTPresets(): Promise<IoTPresetsResponse> {
  let res: Response;
  try {
    res = await fetch('/api/sustainability/iot-telemetry', {
      method: 'GET',
    });
  } catch {
    throw new ApiError(0, 'Unable to connect to the IoT telemetry service. Please check your network connection.');
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: res.statusText }));
    const message = extractErrorMessage(errorData, res.status, 'Failed to fetch IoT telemetry presets');
    throw new ApiError(res.status, message);
  }

  return res.json();
}


