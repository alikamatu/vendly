import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { authApi, configureApiClient, type LoginResponse, type User } from '@/lib/api';
import { tokenStorage } from '@/lib/storage';

type LoginResult =
  | { status: 'ok' }
  | { status: '2fa'; method: 'TOTP' | 'SMS'; phoneHint?: string | null };

interface AuthContextValue {
  user: User | null;
  token: string | null;
  /** True until the stored token has been checked on launch. */
  isRestoring: boolean;
  isAuthenticated: boolean;
  login: (
    email: string,
    password: string,
    opts?: { totp_code?: string; totp_backup_code?: string },
  ) => Promise<LoginResult>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);
  const tokenRef = useRef<string | null>(null);

  const clearSession = useCallback(async () => {
    tokenRef.current = null;
    setToken(null);
    setUser(null);
    await tokenStorage.clear();
  }, []);

  // Wire the shared API client to the current token once.
  useEffect(() => {
    configureApiClient({
      getToken: () => tokenRef.current,
      onUnauthorized: () => {
        void clearSession();
      },
    });
  }, [clearSession]);

  // Restore session on launch.
  useEffect(() => {
    (async () => {
      try {
        const stored = await tokenStorage.get();
        if (stored) {
          const me = await authApi.me(stored);
          tokenRef.current = stored;
          setToken(stored);
          setUser(me);
        }
      } catch {
        await tokenStorage.clear();
      } finally {
        setIsRestoring(false);
      }
    })();
  }, []);

  const login = useCallback<AuthContextValue['login']>(async (email, password, opts) => {
    const res: LoginResponse = await authApi.login(email.trim().toLowerCase(), password, opts);
    if (res.totp_required) {
      return { status: '2fa', method: res.method ?? 'TOTP', phoneHint: res.phone_hint };
    }
    if (!res.access_token) {
      throw new Error(res.message || 'Sign in failed. Please try again.');
    }
    await tokenStorage.set(res.access_token);
    tokenRef.current = res.access_token;
    setToken(res.access_token);
    // /auth/me returns the fuller profile (phone, seller profile, ...).
    try {
      setUser(await authApi.me(res.access_token));
    } catch {
      setUser(res.user ?? null);
    }
    return { status: 'ok' };
  }, []);

  const logout = useCallback(async () => {
    if (tokenRef.current) authApi.logout().catch(() => {});
    await clearSession();
  }, [clearSession]);

  const refreshUser = useCallback(async () => {
    if (!tokenRef.current) return;
    try {
      setUser(await authApi.me());
    } catch {
      // handled by onUnauthorized for 401s
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      isRestoring,
      isAuthenticated: !!token,
      login,
      logout,
      refreshUser,
    }),
    [user, token, isRestoring, login, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
