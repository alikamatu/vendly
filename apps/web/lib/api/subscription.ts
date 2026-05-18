const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1000';

async function handle<T>(res: Response): Promise<T> {
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = Array.isArray(json?.message) ? json.message[0] : json?.message || 'Request failed';
    throw new Error(msg);
  }
  return (json && typeof json === 'object' && 'data' in json ? json.data : json) as T;
}

function bearer(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export const PRO_PRICE_GHS = 57;

export interface ProStatus {
  is_pro: boolean;
  pro_expires_at: string | null;
  plan: 'PRO' | 'FREE';
  price_ghs: number;
  duration_days: number;
}

export interface ProInitResponse {
  reference: string;
  // Paystack init payload (loose)
  status?: boolean;
  message?: string;
  data?: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export interface ProVerifyResponse {
  verified: boolean;
  is_pro?: boolean;
  pro_expires_at?: string | null;
  status?: string;
}

export const subscriptionApi = {
  async getMe(token: string): Promise<ProStatus> {
    const res = await fetch(`${API_URL}/subscriptions/me`, {
      headers: bearer(token),
      cache: 'no-store',
    });
    return handle<ProStatus>(res);
  },

  async initializePro(token: string, callbackUrl?: string): Promise<ProInitResponse> {
    const res = await fetch(`${API_URL}/subscriptions/pro/initialize`, {
      method: 'POST',
      headers: {
        ...bearer(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(callbackUrl ? { callback_url: callbackUrl } : {}),
    });
    return handle<ProInitResponse>(res);
  },

  async verifyPro(token: string, reference: string): Promise<ProVerifyResponse> {
    const res = await fetch(
      `${API_URL}/subscriptions/pro/verify?reference=${encodeURIComponent(reference)}`,
      { headers: bearer(token) },
    );
    return handle<ProVerifyResponse>(res);
  },
};
