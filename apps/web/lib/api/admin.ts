const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1000';

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const msg = Array.isArray(errorData.message)
      ? errorData.message[0]
      : errorData.message || 'Something went wrong';
    throw new Error(msg);
  }
  const json = await response.json();
  return json && typeof json === 'object' && 'data' in json ? json.data : json;
}

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
  };
}

export const adminApi = {
  async getHotSalesStats(token: string) {
    const res = await fetch(`${API_URL}/admin/hot-sales/stats`, {
      headers: authHeaders(token),
    });
    return handleResponse<{
      totalSubscriptions: number;
      successfulSubscriptions: number;
      activeHotSalesProducts: number;
      totalRevenueGhs: number;
    }>(res);
  },

  async getHotSalesSubscriptions(token: string, page = 1, limit = 10) {
    const res = await fetch(
      `${API_URL}/admin/hot-sales/subscriptions?page=${page}&limit=${limit}`,
      {
        headers: authHeaders(token),
      },
    );

    return handleResponse<{
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
    }>(res);
  },
};
