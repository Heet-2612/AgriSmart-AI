export type AuthStatus = 'guest' | 'authenticated' | 'loading';

export interface AuthUser {
  id?: string;
  name?: string;
  email?: string;
}

export interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
}

export interface AuthResponse {
  access_token: string;
  token_type?: string;
  user?: AuthUser;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}
