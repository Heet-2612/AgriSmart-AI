import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { AuthState, LoginRequest, RegisterRequest } from '../types/auth';
import { loginUser, registerUser, getAuthMe } from '../api/client';

export interface AuthContextValue extends AuthState {
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  resetToGuest: () => void;
}

const defaultAuthState: AuthState = {
  status: 'guest',
  user: null,
};

export const AuthContext = createContext<AuthContextValue>({
  ...defaultAuthState,
  login: async () => {},
  register: async () => {},
  logout: () => {},
  resetToGuest: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>(defaultAuthState);

  const resetToGuest = useCallback(() => {
    try {
      localStorage.removeItem('access_token');
    } catch {
      // Ignore in restricted environments
    }
    setAuthState(defaultAuthState);
  }, []);

  const logout = useCallback(() => {
    resetToGuest();
  }, [resetToGuest]);

  // Session validation and rehydration on mount
  useEffect(() => {
    let isMounted = true;

    async function rehydrateSession() {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) return;

        setAuthState((prev) => ({ ...prev, status: 'loading' }));
        const me = await getAuthMe();
        if (isMounted) {
          setAuthState({
            status: 'authenticated',
            user: me,
          });
        }
      } catch {
        if (isMounted) {
          resetToGuest();
        }
      }
    }

    rehydrateSession();

    return () => {
      isMounted = false;
    };
  }, [resetToGuest]);

  const login = async (data: LoginRequest) => {
    const res = await loginUser(data);
    if (res.access_token) {
      try {
        localStorage.setItem('access_token', res.access_token);
      } catch {
        // Ignore
      }
      setAuthState({
        status: 'authenticated',
        user: res.user || { email: data.email },
      });
    }
  };

  const register = async (data: RegisterRequest) => {
    const res = await registerUser(data);
    if (res.access_token) {
      try {
        localStorage.setItem('access_token', res.access_token);
      } catch {
        // Ignore
      }
      setAuthState({
        status: 'authenticated',
        user: res.user || { email: data.email },
      });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        status: authState.status,
        user: authState.user,
        login,
        register,
        logout,
        resetToGuest,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
