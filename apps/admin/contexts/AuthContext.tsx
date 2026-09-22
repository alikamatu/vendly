'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { authService, type AuthUser } from '@/services/auth.service';
import { setToken, clearToken, getToken } from '@/lib/api';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (
    email: string,
    password: string,
    totpCode?: string,
    backupCode?: string,
  ) => Promise<{
    success: boolean;
    requires2fa?: boolean;
    method?: 'TOTP' | 'SMS';
    phoneHint?: string | null;
    error?: string;
  }>;
  verify2fa: (
    email: string,
    password: string,
    code: string,
    isBackupCode?: boolean,
  ) => Promise<{
    success: boolean;
    error?: string;
  }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const fetchUser = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const userData = await authService.getMe();

      // Strict Admin-only gate: only users with role === 'ADMIN' are authorized
      if (!userData || userData.role !== 'ADMIN') {
        clearToken();
        setUser(null);
        if (!pathname.startsWith('/auth')) {
          router.replace('/auth/login?error=unauthorized');
        }
        return;
      }

      setUser(userData);
    } catch {
      clearToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [pathname, router]);

  // Fetch user on mount
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Redirect unauthorized users away from protected routes
  useEffect(() => {
    if (!loading && (!user || user.role !== 'ADMIN') && !pathname.startsWith('/auth')) {
      router.replace('/auth/login?error=unauthorized');
    }
  }, [user, loading, pathname, router]);

  const login = async (email: string, password: string, totpCode?: string, backupCode?: string) => {
    try {
      const rawRes: any = await authService.login(email, password, totpCode, backupCode);
      const res =
        rawRes && typeof rawRes === 'object' && 'data' in rawRes && rawRes.data
          ? rawRes.data
          : rawRes;

      // 2FA required (supports both NestJS totp_required flag and legacy requires_2fa)
      if (res.totp_required || res.requires_2fa) {
        return {
          success: false,
          requires2fa: true,
          method: res.method || 'TOTP',
          phoneHint: res.phone_hint || null,
        };
      }

      // Direct login success
      if (res.access_token) {
        // Enforce admin-only verification before committing session
        if (res.user && res.user.role !== 'ADMIN') {
          clearToken();
          setUser(null);
          return {
            success: false,
            error:
              'Access denied: Only platform administrators are permitted to access this dashboard.',
          };
        }

        setToken(res.access_token);

        try {
          const profile = await authService.getMe();
          if (profile.role !== 'ADMIN') {
            clearToken();
            setUser(null);
            return {
              success: false,
              error:
                'Access denied: Only platform administrators are permitted to access this dashboard.',
            };
          }
          setUser(profile);
          return { success: true };
        } catch {
          clearToken();
          setUser(null);
          return {
            success: false,
            error: 'Failed to verify administrator profile. Please try again.',
          };
        }
      }

      return { success: false, error: res.message || 'Unexpected response from server.' };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed';
      return { success: false, error: message };
    }
  };

  const verify2fa = async (email: string, password: string, code: string, isBackupCode = false) => {
    try {
      const rawRes: any = await authService.verify2fa(email, password, code, isBackupCode);
      const res =
        rawRes && typeof rawRes === 'object' && 'data' in rawRes && rawRes.data
          ? rawRes.data
          : rawRes;

      if (res.access_token) {
        if (res.user && res.user.role !== 'ADMIN') {
          clearToken();
          setUser(null);
          return {
            success: false,
            error:
              'Access denied: Only platform administrators are permitted to access this dashboard.',
          };
        }

        setToken(res.access_token);

        try {
          const profile = await authService.getMe();
          if (profile.role !== 'ADMIN') {
            clearToken();
            setUser(null);
            return {
              success: false,
              error:
                'Access denied: Only platform administrators are permitted to access this dashboard.',
            };
          }
          setUser(profile);
          return { success: true };
        } catch {
          clearToken();
          setUser(null);
          return {
            success: false,
            error: 'Failed to verify administrator profile.',
          };
        }
      }

      return { success: false, error: 'Invalid verification code. Please try again.' };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Verification failed';
      return { success: false, error: message };
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch {
      // Logout may fail if token is already invalid — that's fine
    } finally {
      clearToken();
      setUser(null);
      router.replace('/auth/login');
    }
  };

  const refreshUser = async () => {
    await fetchUser();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, verify2fa, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
