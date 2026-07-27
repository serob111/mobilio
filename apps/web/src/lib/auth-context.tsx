'use client';

import * as React from 'react';
import { api, logoutSession, onAccessTokenChange, refreshSession } from './api-client';
import { CurrentUser } from './types';

interface RegisterInput {
  email: string;
  password: string;
  name: string;
}

interface LoginInput {
  email: string;
  password: string;
}

interface AuthContextValue {
  user: CurrentUser | null;
  isLoading: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

interface AuthResponseBody {
  user: CurrentUser;
  accessToken: string;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      const refreshed = await refreshSession();
      if (refreshed && !cancelled) {
        try {
          const me = await api.get<CurrentUser>('/auth/me');
          if (!cancelled) {
            setUser(me);
          }
        } catch {
          if (!cancelled) {
            setUser(null);
          }
        }
      }
      if (!cancelled) {
        setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(
    () =>
      onAccessTokenChange((token) => {
        if (!token) {
          setUser(null);
        }
      }),
    [],
  );

  const login = React.useCallback(async (input: LoginInput) => {
    const result = await api.post<AuthResponseBody>('/auth/login', input, {
      skipAuthRetry: true,
    });
    setUser(result.user);
  }, []);

  const register = React.useCallback(async (input: RegisterInput) => {
    const result = await api.post<AuthResponseBody>('/auth/register', input, {
      skipAuthRetry: true,
    });
    setUser(result.user);
  }, []);

  const logout = React.useCallback(async () => {
    await logoutSession();
    setUser(null);
  }, []);

  const value = React.useMemo(
    () => ({ user, isLoading, login, register, logout }),
    [user, isLoading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
