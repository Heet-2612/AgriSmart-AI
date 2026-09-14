import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SignupPage } from '../pages/SignupPage';
import { AuthContext } from '../context/AuthContext';
import { ApiError } from '../api/client';

describe('Signup Flow & Error Handling End-to-End', () => {
  const mockRegister = vi.fn();
  const mockNavigateLogin = vi.fn();
  const mockBack = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderSignup = () =>
    render(
      <AuthContext.Provider
        value={{
          status: 'guest',
          user: null,
          login: vi.fn(),
          register: mockRegister,
          logout: vi.fn(),
          resetToGuest: vi.fn(),
        }}
      >
        <SignupPage onBack={mockBack} onNavigateLogin={mockNavigateLogin} />
      </AuthContext.Provider>
    );

  it('validates password length >= 6 characters on client side', async () => {
    renderSignup();

    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'farmer@gmail.com' } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: '12345' } });
    fireEvent.click(screen.getByRole('button', { name: /submit sign up/i }));

    expect(screen.getByRole('alert')).toHaveTextContent('Password must be at least 6 characters long.');
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('submits registration successfully and navigates to login', async () => {
    mockRegister.mockResolvedValueOnce(undefined);
    renderSignup();

    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'farmer@gmail.com' } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'securepassword123' } });
    fireEvent.click(screen.getByRole('button', { name: /submit sign up/i }));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        email: 'farmer@gmail.com',
        password: 'securepassword123',
      });
      expect(mockNavigateLogin).toHaveBeenCalledTimes(1);
    });
  });

  it('displays duplicate email error without [object Object]', async () => {
    mockRegister.mockRejectedValueOnce(
      new ApiError(400, 'A user with this email already exists.')
    );
    renderSignup();

    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'existing@gmail.com' } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'securepassword123' } });
    fireEvent.click(screen.getByRole('button', { name: /submit sign up/i }));

    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent('A user with this email already exists.');
      expect(alert.textContent).not.toContain('[object Object]');
    });
  });

  it('displays clear backend unreachable error when server is offline without [object Object]', async () => {
    mockRegister.mockRejectedValueOnce(
      new ApiError(500, 'Backend server is unreachable or encountered an error. Please verify the backend is running on port 8000.')
    );
    renderSignup();

    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'farmer@gmail.com' } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'securepassword123' } });
    fireEvent.click(screen.getByRole('button', { name: /submit sign up/i }));

    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent('Backend server is unreachable or encountered an error. Please verify the backend is running on port 8000.');
      expect(alert.textContent).not.toContain('[object Object]');
    });
  });

  it('displays validation error message when email provider is unsupported', async () => {
    mockRegister.mockRejectedValueOnce(
      new ApiError(422, 'Value error, Email provider not supported')
    );
    renderSignup();

    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'farmer@unsupported.com' } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'securepassword123' } });
    fireEvent.click(screen.getByRole('button', { name: /submit sign up/i }));

    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent('Value error, Email provider not supported');
      expect(alert.textContent).not.toContain('[object Object]');
    });
  });
});
