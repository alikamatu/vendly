const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:1000";

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const msg = Array.isArray(errorData.message) ? errorData.message[0] : errorData.message || 'Something went wrong';
    throw new Error(msg);
  }
  const json = await response.json();
  return (json && typeof json === 'object' && 'data' in json) ? json.data : json;
}

export const orderApi = {
  async createOrder(token: string, storeLink: string, items: { productId: string; quantity: number }[], checkoutDetails: {
    customerName: string;
    customerPhone: string;
    deliveryMethod: string;
    deliveryLocation: string;
    deliveryNotes?: string;
  }) {
    const response = await fetch(`${API_URL}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ storeLink, items, ...checkoutDetails }),
    });

    return handleResponse<any>(response);
  },

  async getBuyerOrders(token: string) {
    const response = await fetch(`${API_URL}/orders/buyer`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return handleResponse<any[]>(response);
  },

  async getSellerOrders(token: string) {
    const response = await fetch(`${API_URL}/orders/seller`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return handleResponse<any[]>(response);
  },

  async updateOrderStatus(token: string, orderId: string, status: string) {
    const response = await fetch(`${API_URL}/orders/${orderId}/status`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    });

    return handleResponse<any>(response);
  },

  async getOrderDetails(token: string, orderId: string) {
    const response = await fetch(`${API_URL}/orders/${orderId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return handleResponse<any>(response);
  },
};
