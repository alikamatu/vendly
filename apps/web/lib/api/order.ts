import { api } from './index';

export const orderApi = {
  async createOrder(
    token: string,
    storeLink: string,
    items: { productId: string; variantId?: string | null; quantity: number }[],
    checkoutDetails: {
      customerName: string;
      customerPhone: string;
      deliveryMethod: string;
      deliveryLocation: string;
      deliveryNotes?: string;
      paymentMethod?: string;
    },
  ) {
    const res = await api.post<any>('/orders', { storeLink, items, ...checkoutDetails }, { token });
    return res.data;
  },

  async getBuyerOrders(token: string) {
    const res = await api.get<any[]>('/orders/buyer', { token });
    return res.data;
  },

  async getSellerOrders(token: string) {
    const res = await api.get<any[]>('/orders/seller', { token });
    return res.data;
  },

  async updateOrderStatus(token: string, orderId: string, status: string) {
    const res = await api.post<any>(`/orders/${orderId}/status`, { status }, { token });
    return res.data;
  },

  async updateOrderPaymentStatus(
    token: string,
    orderId: string,
    data: {
      payment_status: 'PAID' | 'PENDING' | 'FAILED';
      payment_method: 'PAYSTACK' | 'CASH' | 'CASH_ON_DELIVERY';
      reference?: string;
    },
  ) {
    const res = await api.post<any>(`/orders/${orderId}/payment-status`, data, { token });
    return res.data;
  },

  async getOrderDetails(token: string, orderId: string) {
    const res = await api.get<any>(`/orders/${orderId}`, { token });
    return res.data;
  },

  async verifyOrderPayment(token: string, reference: string, orderId: string) {
    const res = await api.get<{
      verified: boolean;
      payment_status: string;
      order_status: string;
    }>(
      `/orders/verify/payment?reference=${encodeURIComponent(reference)}&order_id=${encodeURIComponent(orderId)}`,
      { token },
    );
    return res.data;
  },

  async retryPayment(token: string, orderId: string) {
    const res = await api.post<{
      authorization_url: string;
      reference: string;
      access_code?: string;
    }>(`/orders/${orderId}/retry-payment`, undefined, { token });
    return res.data;
  },

  async cancelOrder(token: string, orderId: string, reason?: string) {
    const res = await api.post<{ message: string; status: string }>(
      `/orders/${orderId}/cancel`,
      { reason: reason ?? '' },
      { token },
    );
    return res.data;
  },

  async getBuyerOrderDetails(token: string, orderId: string) {
    const res = await api.get<any>(`/orders/buyer/${orderId}`, { token });
    return res.data;
  },

  async createReturnRequest(
    token: string,
    orderId: string,
    data: { reason: string; description: string; photo_urls?: string[] },
  ) {
    const res = await api.post<any>(`/orders/${orderId}/return`, data, { token });
    return res.data;
  },

  async updateReturnRequestStatus(
    token: string,
    orderId: string,
    data: {
      status: 'APPROVED' | 'REJECTED' | 'REFUNDED';
      sellerResponse?: string;
      refundNow?: boolean;
    },
  ) {
    const res = await api.post<any>(`/orders/${orderId}/return/status`, data, { token });
    return res.data;
  },

  async escalateReturnRequest(token: string, orderId: string, reason: string) {
    const res = await api.post<any>(`/orders/${orderId}/return/escalate`, { reason }, { token });
    return res.data;
  },

  async confirmReturnReceivedAndRefund(token: string, orderId: string, note?: string) {
    const res = await api.post<any>(
      `/orders/${orderId}/return/confirm-refund`,
      { note },
      { token },
    );
    return res.data;
  },
};
