import { VENDLY_API_BASE_URL, getVendlyHeaders, qs, unwrap } from './config';
import type { ReturnRequest, ReturnStatus } from '@/types/operations';

export interface ReturnListResponse {
  data: ReturnRequest[];
  total: number;
}

export class VendlyReturnsService {
  private static headers() {
    return getVendlyHeaders();
  }

  static async list(params: Record<string, unknown> = {}): Promise<ReturnListResponse> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/admin/returns${qs(params)}`, {
      headers: this.headers(),
      cache: 'no-store',
    });
    return unwrap<ReturnListResponse>(res);
  }

  static async update(
    id: string,
    body: { status: ReturnStatus; admin_note?: string },
  ): Promise<ReturnRequest> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/admin/returns/${id}`, {
      method: 'PATCH',
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    return unwrap<ReturnRequest>(res);
  }

  static async refund(
    id: string,
    body: { amount?: number; reason?: string; admin_note?: string } = {},
  ): Promise<{ success: boolean; message?: string }> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/admin/returns/${id}/refund`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    return unwrap<{ success: boolean; message?: string }>(res);
  }
}
