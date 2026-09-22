import { VENDLY_API_BASE_URL, getVendlyHeaders, qs, unwrap } from './config';
import type {
  VendlyOrder,
  OrderStatus,
  OrderListParams,
  OrderStatsSummary,
} from '@/types/operations';

export interface OrderListResponse {
  data: VendlyOrder[];
  total: number;
  page: number;
  limit: number;
}

export class VendlyOrderService {
  private static headers() {
    return getVendlyHeaders();
  }

  static async list(params: OrderListParams = {}): Promise<OrderListResponse> {
    const res = await fetch(
      `${VENDLY_API_BASE_URL}/admin/orders${qs(params as Record<string, unknown>)}`,
      {
        headers: this.headers(),
        cache: 'no-store',
      },
    );
    return unwrap<OrderListResponse>(res);
  }

  static async get(id: string): Promise<VendlyOrder> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/admin/orders/${id}`, {
      headers: this.headers(),
      cache: 'no-store',
    });
    return unwrap<VendlyOrder>(res);
  }

  static async setStatus(id: string, status: OrderStatus, reason?: string): Promise<VendlyOrder> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/admin/orders/${id}/status`, {
      method: 'PATCH',
      headers: this.headers(),
      body: JSON.stringify({ status, reason }),
    });
    return unwrap<VendlyOrder>(res);
  }

  static async summary(): Promise<OrderStatsSummary> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/admin/orders/stats/summary`, {
      headers: this.headers(),
      cache: 'no-store',
    });
    return unwrap<OrderStatsSummary>(res);
  }

  static async refund(
    id: string,
    body: {
      amount?: number;
      reason?: string;
      customer_note?: string;
      merchant_note?: string;
    } = {},
  ): Promise<{ success: boolean; message?: string }> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/admin/orders/${id}/refund`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    return unwrap<{ success: boolean; message?: string }>(res);
  }
}
