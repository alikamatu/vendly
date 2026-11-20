import { api } from './index';

export const paymentApi = {
  async getTransactions(
    token: string,
    params?: { status?: string; page?: number; limit?: number },
  ) {
    const search = new URLSearchParams();
    if (params?.status) search.set('status', params.status);
    if (params?.page) search.set('page', String(params.page));
    if (params?.limit) search.set('limit', String(params.limit));
    const res = await api.get<{ items: any[]; total: number }>(
      `/payments/transactions?${search.toString()}`,
      { token },
    );
    return res.data;
  },

  async getPayouts(token: string, params?: { status?: string; page?: number; limit?: number }) {
    const search = new URLSearchParams();
    if (params?.status) search.set('status', params.status);
    if (params?.page) search.set('page', String(params.page));
    if (params?.limit) search.set('limit', String(params.limit));
    const res = await api.get<{ items: any[]; total: number }>(
      `/payments/payouts?${search.toString()}`,
      { token },
    );
    return res.data;
  },

  async retryPayout(token: string, payoutId: string) {
    const res = await api.post<any>(`/payments/payouts/${payoutId}/retry`, undefined, { token });
    return res.data;
  },
};
