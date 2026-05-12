const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:1000";

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const msg = Array.isArray(errorData.message)
      ? errorData.message[0]
      : errorData.message || "Something went wrong";
    throw new Error(msg);
  }
  const json = await response.json();
  return json && typeof json === "object" && "data" in json ? json.data : json;
}

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export const paymentApi = {
  async getTransactions(token: string, params?: { status?: string; page?: number; limit?: number }) {
    const search = new URLSearchParams();
    if (params?.status) search.set("status", params.status);
    if (params?.page) search.set("page", String(params.page));
    if (params?.limit) search.set("limit", String(params.limit));
    const response = await fetch(`${API_URL}/payments/transactions?${search.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return handleResponse<{ items: any[]; total: number }>(response);
  },

  async getPayouts(token: string, params?: { status?: string; page?: number; limit?: number }) {
    const search = new URLSearchParams();
    if (params?.status) search.set("status", params.status);
    if (params?.page) search.set("page", String(params.page));
    if (params?.limit) search.set("limit", String(params.limit));
    const response = await fetch(`${API_URL}/payments/payouts?${search.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return handleResponse<{ items: any[]; total: number }>(response);
  },

  async getHistory(token: string, params?: { page?: number; limit?: number }) {
    const search = new URLSearchParams();
    if (params?.page) search.set("page", String(params.page));
    if (params?.limit) search.set("limit", String(params.limit));
    const response = await fetch(`${API_URL}/payments/history?${search.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return handleResponse<any>(response);
  },

  async retryPayout(token: string, payoutId: string) {
    const response = await fetch(`${API_URL}/payments/payouts/${payoutId}/retry`, {
      method: "POST",
      headers: authHeaders(token),
    });
    return handleResponse<any>(response);
  },
};
