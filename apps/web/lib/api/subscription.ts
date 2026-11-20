import { api } from './index';

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
    const res = await api.get<ProStatus>('/subscriptions/me', { token, cache: 'no-store' });
    return res.data;
  },

  async initializePro(
    token: string,
    callbackUrl?: string,
    plan: ProPlan = 'monthly',
  ): Promise<ProInitResponse> {
    const body: Record<string, unknown> = { plan };
    if (callbackUrl) body.callback_url = callbackUrl;
    const res = await api.post<ProInitResponse>('/subscriptions/pro/initialize', body, { token });
    return res.data;
  },

  async verifyPro(token: string, reference: string): Promise<ProVerifyResponse> {
    const res = await api.get<ProVerifyResponse>(
      `/subscriptions/pro/verify?reference=${encodeURIComponent(reference)}`,
      { token },
    );
    return res.data;
  },
};
