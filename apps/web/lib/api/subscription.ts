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

export type ProPlan = 'monthly' | 'annual';

export interface ProStatus {
  is_pro: boolean;
  pro_expires_at: string | null;
  plan: 'PRO' | 'FREE';
  /** Back-compat monthly pricing fields. */
  price_ghs: number;
  duration_days: number;
  /** Newer per-plan breakdown. Optional so the page renders if the API is older. */
  plans?: {
    monthly: { price_ghs: number; duration_days: number };
    annual: {
      price_ghs: number;
      duration_days: number;
      discount_pct: number;
      undiscounted_ghs: number;
      savings_ghs: number;
      monthly_equivalent_ghs: number;
    };
  };
}

export interface ProInitResponse {
  reference: string;
  plan?: ProPlan;
  amount_ghs?: number;
  duration_days?: number;
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
  plan?: ProPlan;
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

  async initializePro(
    token: string,
    callbackUrl?: string,
    plan: ProPlan = 'monthly',
  ): Promise<ProInitResponse> {
    const body: Record<string, unknown> = { plan };
    if (callbackUrl) body.callback_url = callbackUrl;
    const res = await fetch(`${API_URL}/subscriptions/pro/initialize`, {
      method: 'POST',
      headers: {
        ...bearer(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
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
