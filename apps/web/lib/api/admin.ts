import { api } from './index';

export const adminApi = {
  async getHotSalesStats(token: string) {
    const res = await api.get<{
      totalSubscriptions: number;
      successfulSubscriptions: number;
      activeHotSalesProducts: number;
      totalRevenueGhs: number;
    }>('/admin/hot-sales/stats', { token });
    return res.data;
  },

  async getHotSalesSubscriptions(token: string, page = 1, limit = 10) {
    const res = await api.get<{
      data: Array<{
        id: string;
        reference: string;
        amount: string;
        currency: string;
        status: string;
        paid_at?: string | null;
        product: { id: string; title: string; is_featured: boolean };
        seller: { id: string; user_id: string; store_name: string };
      }>;
      meta: { total: number; page: number; limit: number; totalPages: number };
    }>(`/admin/hot-sales/subscriptions?page=${page}&limit=${limit}`, { token });

    return res.data;
  },
};
