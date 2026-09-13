import {
  HealthResponse,
  PredictionResponse,
  CropRecommendationRequest,
  CropRecommendationResponse,
  ChatRequest,
  ChatAnswer,
  ChatSessionResponse,
  ChatMessageResponse,
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

  // Browser automatically sets Content-Type to multipart/form-data with boundary
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

export async function sendChatMessage(data: ChatRequest): Promise<ChatAnswer> {
  // Validate question length between 1 and 500 characters
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

  const res = await fetch('/api/chat', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      ...data,
      question: trimmedQuestion,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: res.statusText }));
    let message = 'Failed to get advice from Agro AI';
    if (typeof errorData?.detail === 'string') {
      message = errorData.detail;
    } else if (res.status === 401) {
      message = 'Your session has expired. Please sign in again or continue as guest.';
    } else if (res.status === 400 || res.status === 422) {
      message = 'Please provide a valid question for the AI assistant (1–500 characters).';
    } else if (res.status === 503) {
      message = 'Agro AI Assistant is temporarily unavailable. Please try again in a moment.';
    }
    throw new ApiError(res.status, message);
  }

  return res.json();
}

import { AuthResponse, AuthUser, LoginRequest, RegisterRequest } from '../types/auth';

export async function registerUser(data: RegisterRequest): Promise<AuthResponse> {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(res.status, errorData.detail || `Registration failed with status: ${res.status}`);
  }

  return res.json();
}

export async function loginUser(data: LoginRequest): Promise<AuthResponse> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(res.status, errorData.detail || `Login failed with status: ${res.status}`);
  }

  return res.json();
}

export async function getAuthMe(): Promise<AuthUser> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch('/api/auth/me', {
    method: 'GET',
    headers,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(res.status, errorData.detail || `Session validation failed with status: ${res.status}`);
  }

  return res.json();
}

export async function getChatSessions(): Promise<ChatSessionResponse[]> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch('/api/chat/sessions', {
    method: 'GET',
    headers,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(res.status, errorData.detail || `Failed to fetch chat sessions with status: ${res.status}`);
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
  const res = await fetch(`/api/chat/sessions/${encodedId}/messages`, {
    method: 'GET',
    headers,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(res.status, errorData.detail || `Failed to fetch session messages with status: ${res.status}`);
  }

  return res.json();
}

export async function verifyEmail(token: string): Promise<{ message: string }> {
  const res = await fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`, {
    method: 'GET',
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(res.status, errorData.detail || `Verification failed with status: ${res.status}`);
  }

  return res.json();
}

export async function resendVerificationEmail(email: string): Promise<{ message: string }> {
  const res = await fetch('/api/auth/resend-verification', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(res.status, errorData.detail || `Resend failed with status: ${res.status}`);
  }

  return res.json();
}
