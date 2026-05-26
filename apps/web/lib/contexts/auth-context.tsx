'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '@/lib/api/auth';

export interface User {
  id: string;
  full_name: string;
  email: string;
  /** Business name (legacy column was "school"; UI labels it as Business). */
  school?: string;
  /** E.164 phone number, e.g. "+233244123456". Set during signup. */
  phone_e164?: string | null;
  role: 'USER' | 'ADMIN' | 'SELLER';
  is_verified: boolean;
  has_verification_doc: boolean;
  approval_status: 'PENDING' | 'APPROVED' | 'REJECTED' | null;
  /** True when the user has an active Pro subscription (not expired). */
  is_pro?: boolean;
  pro_expires_at?: string | null;
  seller_profile?: {
    id: string;
    store_name: string;
    store_link: string;
    bio: string | null;
    logo_url: string | null;
    location: string | null;
    location_id: string | null;
    area: string | null;
    delivery_policies: string | null;
    business_hours: string | null;
    whatsapp_number: string | null;
    social_links: any | null;
    accepted_payment_methods: string[];
    payment_timing: string | null;
    service_area: string | null;
    avg_delivery_time: string | null;
    bank_name: string | null;
    bank_code: string | null;
    account_number: string | null;
    onboarding_completed: boolean;
    structured_location?: {
      id: string;
      region: string;
      city: string;
    } | null;
  } | null;
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  /**
   * Resolves with `{ totp_required: true }` when the server demands a 2FA
   * code; the caller should re-invoke `login` passing `opts.totp_code` or
   * `opts.totp_backup_code`. Resolves with `void` on full success.
   */
  login: (
    email: string,
    password: string,
    opts?: { totp_code?: string; totp_backup_code?: string },
  ) => Promise<{
    totp_required?: boolean;
    method?: 'TOTP' | 'SMS';
    phone_hint?: string | null;
  } | void>;
  register: (data: {
    full_name: string;
    email: string;
    password: string;
    school: string;
    accept_terms: boolean;
    marketing_opt_in?: boolean;
  }) => Promise<{ message: string }>;
  logout: () => void;
  clearError: () => void;
  refreshUser: () => Promise<void>;
  setAuthData: (token: string, user: User) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAuthenticated = !!token && !!user;

  // Hydrate on mount
  useEffect(() => {
    const stored = localStorage.getItem('vendly_token');
    if (stored) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setToken(stored);
      authApi
        .getMe(stored)
        .then((u) => setUser(u as User))
        .catch(() => {
          // Token expired or invalid
          localStorage.removeItem('vendly_token');
          setToken(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(
    async (
      email: string,
      password: string,
      opts: { totp_code?: string; totp_backup_code?: string } = {},
    ) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await authApi.login(email, password, opts);
        if (res.totp_required) {
          // No token issued — caller should now collect a code and retry.
          return {
            totp_required: true,
            method: res.method,
            phone_hint: res.phone_hint ?? null,
          };
        }
        if (!res.access_token || !res.user) {
          throw new Error(res.message || 'Login failed');
        }
        localStorage.setItem('vendly_token', res.access_token);
        setToken(res.access_token);
        setUser(res.user as User);
        return;
      } catch (err: any) {
        setError(err.message || 'Login failed');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const register = useCallback(
    async (data: {
      full_name: string;
      email: string;
      password: string;
      school: string;
      accept_terms: boolean;
      marketing_opt_in?: boolean;
    }) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await authApi.register(data);
        return res;
      } catch (err: any) {
        setError(err.message || 'Registration failed');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const logout = useCallback(() => {
    if (token) {
      authApi.logout(token).catch(() => {});
    }
    localStorage.removeItem('vendly_token');
    setToken(null);
    setUser(null);
  }, [token]);

  const clearError = useCallback(() => setError(null), []);

  const refreshUser = useCallback(async () => {
    if (!token) return;
    try {
      const u = await authApi.getMe(token);
      setUser(u as User);
    } catch {
      // ignore
    }
  }, [token]);

  const setAuthData = useCallback((newToken: string, newUser: User) => {
    localStorage.setItem('vendly_token', newToken);
    setToken(newToken);
    setUser(newUser);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isLoading,
        error,
        login,
        register,
        logout,
        clearError,
        refreshUser,
        setAuthData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
