import { describe, it, expect } from 'vitest';
import { extractErrorMessage, ApiError } from '../api/client';

describe('API Error Handling & Normalization Contract', () => {
  it('handles 400 invalid request with clear correction message', () => {
    const errorData = { detail: 'Invalid parameters in disease diagnosis.' };
    const msg = extractErrorMessage(errorData, 400, 'Invalid request.');
    expect(msg).toBe('Invalid parameters in disease diagnosis.');
  });

  it('handles 400 validation error array without [object Object]', () => {
    const errorData = {
      detail: [
        { loc: ['body', 'email'], msg: 'Invalid email domain format', type: 'value_error' },
        { loc: ['body', 'password'], msg: 'Password must have at least 6 characters', type: 'value_error' },
      ],
    };
    const msg = extractErrorMessage(errorData, 400, 'Validation failed.');
    expect(msg).toContain('Invalid email domain format');
    expect(msg).toContain('Password must have at least 6 characters');
    expect(msg).not.toContain('[object Object]');
  });

  it('handles 401 unauthorized / expired session with friendly message', () => {
    const msg = extractErrorMessage({ detail: 'Token expired' }, 401, 'Unauthorized');
    expect(msg).toBe('Authentication required or session expired. Please sign in or continue as guest.');
  });

  it('handles 429 rate limit with retry-later notice', () => {
    const msg = extractErrorMessage({}, 429, 'Too many requests');
    expect(msg).toBe('Too many requests. Please wait a moment and try again.');
  });

  it('handles 500 server error without leaking raw stack trace', () => {
    const msg = extractErrorMessage(
      { detail: 'Registration error: Traceback (most recent call last): File /app/main.py, line 50' },
      500,
      'Server error'
    );
    expect(msg).toBe('Registration error:');
    expect(msg).not.toContain('Traceback');
    expect(msg).not.toContain('/app/main.py');
  });

  it('handles 500 when backend is unreachable with helpful action message', () => {
    const msg = extractErrorMessage({}, 500, 'Server error');
    expect(msg).toBe('Backend server is unreachable or encountered an error. Please verify the backend is running on port 8000.');
  });

  it('handles 503 service unavailable with clear retry notice', () => {
    const msg = extractErrorMessage({}, 503, 'Unavailable');
    expect(msg).toBe('Service is temporarily unavailable. Please verify the backend is running and try again.');
  });

  it('handles network failure ApiError', () => {
    const err = new ApiError(0, 'Unable to connect to server. Please check your network connection.');
    expect(err.status).toBe(0);
    expect(err.message).toBe('Unable to connect to server. Please check your network connection.');
    expect(err.message).not.toContain('[object Object]');
  });

  it('sanitizes tokens and passwords from backend error details', () => {
    const sensitiveDetail = {
      detail: 'Failed authenticating with Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9 and password=SuperSecretPassword123',
    };
    const msg = extractErrorMessage(sensitiveDetail, 400, 'Auth failed');
    expect(msg).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
    expect(msg).not.toContain('SuperSecretPassword123');
    expect(msg).toContain('[REDACTED]');
  });
});
