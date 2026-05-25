const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1000';

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorData: any = {};
    try { errorData = await response.json(); } catch {}
    const raw = Array.isArray(errorData.message)
      ? errorData.message.join(' ')
      : errorData.message;
    const status = response.status;
    const fallback =
      status === 401 ? 'Your session has expired. Please sign in again.' :
      status === 429 ? "You're going a bit fast — try again in a minute." :
      status >= 500 ? 'Our server hit a snag. Please try again in a moment.' :
      'Something went wrong. Please try again.';
    const msg = (typeof raw === 'string' && raw.length) ? raw : fallback;
    const err = new Error(msg);
    (err as any).status = status;
    throw err;
  }
  const json = await response.json();
  return json && typeof json === 'object' && 'data' in json ? json.data : json;
}

function authHeaders(token: string) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export const authApi = {
  async login(
    email: string,
    password: string,
    opts: { totp_code?: string; totp_backup_code?: string } = {},
  ) {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, ...opts }),
    });
    return handleResponse<{
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
    }>(res);
  },

  async twoFactorStatus(token: string) {
    const res = await fetch(`${API_URL}/auth/2fa/status`, { headers: authHeaders(token) });
    return handleResponse<{
      enabled: boolean;
      method: 'TOTP' | 'SMS';
      verified_at: string | null;
      backup_codes_remaining: number;
      phone_hint: string | null;
    }>(res);
  },

  async twoFactorSmsSetup(token: string, phone: string) {
    const res = await fetch(`${API_URL}/auth/2fa/sms/setup`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ phone }),
    });
    return handleResponse<{ message: string; sent: boolean; phone_hint: string }>(res);
  },

  async twoFactorSmsEnable(token: string, code: string) {
    const res = await fetch(`${API_URL}/auth/2fa/sms/enable`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ code }),
    });
    return handleResponse<{ message: string; backup_codes: string[] }>(res);
  },

  async twoFactorSmsResend(email: string, password: string) {
    const res = await fetch(`${API_URL}/auth/2fa/sms/resend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return handleResponse<{ sent: boolean; phone_hint: string }>(res);
  },

  async twoFactorSetup(token: string) {
    const res = await fetch(`${API_URL}/auth/2fa/setup`, {
      method: 'POST',
      headers: authHeaders(token),
    });
    return handleResponse<{ secret: string; otpauth_url: string }>(res);
  },

  async twoFactorEnable(token: string, code: string) {
    const res = await fetch(`${API_URL}/auth/2fa/enable`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ code }),
    });
    return handleResponse<{ message: string; backup_codes: string[] }>(res);
  },

  async twoFactorDisable(
    token: string,
    body: { password: string; totp_code?: string; backup_code?: string },
  ) {
    const res = await fetch(`${API_URL}/auth/2fa/disable`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(body),
    });
    return handleResponse<{ message: string }>(res);
  },

  async twoFactorRegenerateBackup(token: string, password: string) {
    const res = await fetch(`${API_URL}/auth/2fa/backup-codes/regenerate`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ password }),
    });
    return handleResponse<{ backup_codes: string[] }>(res);
  },

  async register(data: {
    full_name: string;
    email: string;
    password: string;
    school: string;
    accept_terms: boolean;
    marketing_opt_in?: boolean;
  }) {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<{ message: string }>(res);
  },

  async resendVerification(email: string) {
    const res = await fetch(`${API_URL}/auth/resend-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    return handleResponse<{ message: string }>(res);
  },

  async findAccount(body: {
    full_name: string;
    business_name?: string;
    phone?: string;
    contact_email?: string;
    note?: string;
  }) {
    const res = await fetch(`${API_URL}/auth/find-account`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return handleResponse<{ message: string }>(res);
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
    const res = await fetch(`${API_URL}/auth/me`, {
      method: 'GET',
      headers: authHeaders(token),
    });
    return handleResponse<{
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
    }>(res);
  },

  async verifyEmail(token: string) {
    const res = await fetch(`${API_URL}/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    return handleResponse<{
      message: string;
      access_token?: string;
      user?: any;
    }>(res);
  },

  async forgotPassword(email: string) {
    const res = await fetch(`${API_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    return handleResponse<{ message: string }>(res);
  },

  async resetPassword(token: string, newPassword: string) {
    const res = await fetch(`${API_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword }),
    });
    return handleResponse<{ message: string }>(res);
  },

  async submitVerification(token: string, data: any) {
    const isFormData = data instanceof FormData;
    const response = await fetch(`${API_URL}/auth/submit-verification`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      },
      body: isFormData ? data : JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Verification submission failed');
    }

    return response.json();
  },

  async getApprovalStatus(token: string) {
    const res = await fetch(`${API_URL}/auth/approval-status`, {
      method: 'GET',
      headers: authHeaders(token),
    });
    return handleResponse<{ status: string | null; reviewed_at: string | null }>(res);
  },

  async logout(token: string) {
    const res = await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: authHeaders(token),
    });
    return handleResponse<{ message: string }>(res);
  },

  async updateProfile(token: string, data: any) {
    const res = await fetch(`${API_URL}/auth/profile`, {
      method: 'PATCH',
      headers: authHeaders(token),
      body: JSON.stringify(data),
    });
    return handleResponse<{ message: string; user: any }>(res);
  },

  async exportData(token: string) {
    const res = await fetch(`${API_URL}/auth/export-data`, {
      method: 'GET',
      headers: authHeaders(token),
    });
    return handleResponse<any>(res);
  },

  async deleteAccount(token: string) {
    const res = await fetch(`${API_URL}/auth/account`, {
      method: 'DELETE',
      headers: authHeaders(token),
    });
    return handleResponse<{ message: string }>(res);
  },
};
