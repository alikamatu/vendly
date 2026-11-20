import { api, API_URL } from './index';

export const authApi = {
  async login(
    email: string,
    password: string,
    opts: { totp_code?: string; totp_backup_code?: string } = {},
  ) {
    const res = await api.post<{
      // present on 2FA challenge
      totp_required?: boolean;
      method?: 'TOTP' | 'SMS';
      phone_hint?: string | null;
      message?: string;
      // present on full success
      access_token?: string;
      user?: {
        id: string;
        full_name: string;
        email: string;
        role: string;
        is_verified: boolean;
        approval_status: string | null;
        has_verification_doc: boolean;
      };
    }>('/auth/login', { email, password, ...opts });
    return res.data;
  },

  async twoFactorStatus(token: string) {
    const res = await api.get<{
      enabled: boolean;
      method: 'TOTP' | 'SMS';
      verified_at: string | null;
      backup_codes_remaining: number;
      phone_hint: string | null;
    }>('/auth/2fa/status', { token });
    return res.data;
  },

  async twoFactorSmsSetup(token: string, phone: string) {
    const res = await api.post<{ message: string; sent: boolean; phone_hint: string }>(
      '/auth/2fa/sms/setup',
      { phone },
      { token },
    );
    return res.data;
  },

  async twoFactorSmsEnable(token: string, code: string) {
    const res = await api.post<{ message: string; backup_codes: string[] }>(
      '/auth/2fa/sms/enable',
      { code },
      { token },
    );
    return res.data;
  },

  async twoFactorSmsResend(email: string, password: string) {
    const res = await api.post<{ sent: boolean; phone_hint: string }>('/auth/2fa/sms/resend', {
      email,
      password,
    });
    return res.data;
  },

  async twoFactorSetup(token: string) {
    const res = await api.post<{ secret: string; otpauth_url: string }>(
      '/auth/2fa/setup',
      undefined,
      { token },
    );
    return res.data;
  },

  async twoFactorEnable(token: string, code: string) {
    const res = await api.post<{ message: string; backup_codes: string[] }>(
      '/auth/2fa/enable',
      { code },
      { token },
    );
    return res.data;
  },

  async twoFactorDisable(
    token: string,
    body: { password: string; totp_code?: string; backup_code?: string },
  ) {
    const res = await api.post<{ message: string }>('/auth/2fa/disable', body, { token });
    return res.data;
  },

  async twoFactorRegenerateBackup(token: string, password: string) {
    const res = await api.post<{ backup_codes: string[] }>(
      '/auth/2fa/backup-codes/regenerate',
      { password },
      { token },
    );
    return res.data;
  },

  async register(data: {
    full_name: string;
    email: string;
    password: string;
    school: string;
    accept_terms: boolean;
    marketing_opt_in?: boolean;
  }) {
    const res = await api.post<{ message: string }>('/auth/register', data);
    return res.data;
  },

  async resendVerification(email: string) {
    const res = await api.post<{ message: string }>('/auth/resend-verification', { email });
    return res.data;
  },

  async findAccount(body: {
    full_name: string;
    business_name?: string;
    phone?: string;
    contact_email?: string;
    note?: string;
  }) {
    const res = await api.post<{ message: string }>('/auth/find-account', body);
    return res.data;
  },

  /**
   * Returns the URL the browser should be sent to in order to start the
   * Google OAuth handshake. The API then redirects back to
   * `/auth/callback#token=...` on success or `/login?oauth_error=...` on
   * failure.
   */
  googleStartUrl(next?: string): string {
    const qs = next ? `?next=${encodeURIComponent(next)}` : '';
    return `${API_URL}/auth/oauth/google/start${qs}`;
  },

  async getMe(token: string) {
    const res = await api.get<{
      id: string;
      full_name: string;
      email: string;
      school: string;
      role: string;
      is_verified: boolean;
      has_verification_doc: boolean;
      approval_status: string | null;
      seller_profile: any;
      created_at: string;
    }>('/auth/me', { token });
    return res.data;
  },

  async verifyEmail(token: string) {
    const res = await api.post<{
      message: string;
      access_token?: string;
      user?: any;
    }>('/auth/verify-email', { token });
    return res.data;
  },

  async forgotPassword(email: string) {
    const res = await api.post<{ message: string }>('/auth/forgot-password', { email });
    return res.data;
  },

  async resetPassword(token: string, newPassword: string) {
    const res = await api.post<{ message: string }>('/auth/reset-password', {
      token,
      newPassword,
    });
    return res.data;
  },

  async submitVerification(token: string, data: any) {
    const res = await api.post('/auth/submit-verification', data, { token, raw: true });
    return res.data;
  },

  async logout(token: string) {
    const res = await api.post<{ message: string }>('/auth/logout', undefined, { token });
    return res.data;
  },

  async updateProfile(token: string, data: any) {
    const res = await api.patch<{ message: string; user: any }>('/auth/profile', data, { token });
    return res.data;
  },

  async exportData(token: string) {
    const res = await api.get<any>('/auth/export-data', { token });
    return res.data;
  },

  async deleteAccount(token: string) {
    const res = await api.delete<{ message: string }>('/auth/account', { token });
    return res.data;
  },
};
