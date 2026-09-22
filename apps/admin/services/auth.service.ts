/**
 * Auth Service
 *
 * Centralized auth API calls against the Vendly NestJS backend.
 * All endpoints from API_REFERENCE.md /auth/* section.
 */

import { apiFetch, getApiUrl } from '@/lib/api';

export interface AuthUser {
  id: string;
  full_name: string;
  email: string;
  role: 'USER' | 'SELLER' | 'ADMIN';
  is_verified: boolean;
  is_suspended: boolean;
  avatar_url?: string | null;
  totp_enabled?: boolean;
  totp_method?: 'TOTP' | 'SMS';
  phone_e164?: string | null;
  is_pro?: boolean;
  created_at: string;
}

export interface LoginResponse {
  access_token?: string;
  totp_required?: boolean;
  requires_2fa?: boolean;
  temp_token?: string;
  method?: 'TOTP' | 'SMS';
  phone_hint?: string | null;
  message?: string;
  user?: AuthUser;
}

export interface MeResponse {
  data: AuthUser;
}

export const authService = {
  /**
   * Login with email + password, optionally passing 2FA TOTP code or backup code.
   * Returns totp_required: true if 2FA is enabled on the account.
   */
  async login(
    email: string,
    password: string,
    totp_code?: string,
    totp_backup_code?: string,
  ): Promise<LoginResponse> {
    const body: Record<string, string> = { email, password };
    if (totp_code) body.totp_code = totp_code;
    if (totp_backup_code) body.totp_backup_code = totp_backup_code;

    const res = await apiFetch<LoginResponse | { data: LoginResponse }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    if (res && typeof res === 'object' && 'data' in res && res.data) {
      return res.data;
    }
    return res as LoginResponse;
  },

  /**
   * Complete 2FA verification during login.
   * NestJS LoginDto requires email & password with totp_code or totp_backup_code.
   */
  async verify2fa(
    email: string,
    password: string,
    code: string,
    isBackupCode = false,
  ): Promise<LoginResponse> {
    const body: Record<string, string> = { email, password };
    if (isBackupCode) {
      body.totp_backup_code = code;
    } else {
      body.totp_code = code;
    }

    const res = await apiFetch<LoginResponse | { data: LoginResponse }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    if (res && typeof res === 'object' && 'data' in res && res.data) {
      return res.data;
    }
    return res as LoginResponse;
  },

  /**
   * Get current authenticated user profile.
   */
  async getMe(): Promise<AuthUser> {
    const res = await apiFetch<MeResponse | AuthUser>('/auth/me');
    // Handle both { data: user } and direct user response
    if (res && typeof res === 'object' && 'data' in res && res.data) {
      return res.data;
    }
    return res as AuthUser;
  },

  /**
   * Logout — blacklists the current token server-side.
   */
  async logout(): Promise<void> {
    await apiFetch('/auth/logout', { method: 'POST' });
  },

  /**
   * Request a password reset email.
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    return apiFetch('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  /**
   * Reset password using the token from the email link.
   * Note: NestJS ResetPasswordDto requires `newPassword`.
   */
  async resetPassword(token: string, password: string): Promise<{ message: string }> {
    return apiFetch('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword: password }),
    });
  },

  /**
   * Get the Google OAuth start URL for redirect.
   */
  getGoogleOAuthUrl(next?: string): string {
    const base = `${getApiUrl()}/auth/oauth/google/start`;
    if (next) {
      return `${base}?next=${encodeURIComponent(next)}`;
    }
    return base;
  },
};
