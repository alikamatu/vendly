const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

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

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to place order");
    }

    return response.json();
  },

  async getBuyerOrders(token: string) {
    const response = await fetch(`${API_URL}/orders/buyer`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to fetch orders");
    }

    return response.json();
  },

  async getSellerOrders(token: string) {
    const response = await fetch(`${API_URL}/orders/seller`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to fetch store orders");
    }

    return response.json();
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

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to update order status");
    }

    return response.json();
  },

  async getOrderDetails(token: string, orderId: string) {
    const response = await fetch(`${API_URL}/orders/${orderId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to fetch order details");
    }

    return response.json();
  },
};
