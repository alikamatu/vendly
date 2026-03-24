const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1000';

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const msg = Array.isArray(errorData.message) ? errorData.message[0] : errorData.message || 'Something went wrong';
    throw new Error(msg);
  }
  const json = await response.json();
  return (json && typeof json === 'object' && 'data' in json) ? json.data : json;
}

function authHeaders(token: string) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export const authApi = {
  async login(email: string, password: string) {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return handleResponse<{
      access_token: string;
      user: {
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

  async register(data: { full_name: string; email: string; password: string; school: string }) {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<{ message: string }>(res);
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
    return handleResponse<{ message: string }>(res);
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
};