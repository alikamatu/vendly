import { VENDLY_API_BASE_URL, getVendlyHeaders, qs, unwrap } from './config';
import type { EnhancedTransaction, VendlyPayout, PromotionPayment } from '@/types/operations';

// ─── Response helpers ────────────────────────────────────────────────────

interface ListResponse<T> {
  data: T[];
  total: number;
}

interface ListParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}

// ─── Service ─────────────────────────────────────────────────────────────

export class VendlyPaymentService {
  private static headers() {
    return getVendlyHeaders();
  }

  // ── Transactions ─────────────────────────────────────────────────────

  /**
   * Fetch paginated transactions with enriched buyer/seller/payout data.
   * Tries the admin endpoint first, then falls back to /payments/transactions.
   */
  static async getTransactions(
    params: ListParams = {},
  ): Promise<ListResponse<EnhancedTransaction>> {
    const query = qs(params as Record<string, unknown>);

    // Primary: admin endpoint
    const adminRes = await fetch(`${VENDLY_API_BASE_URL}/admin/transactions${query}`, {
      headers: this.headers(),
      cache: 'no-store',
    });
    const adminJson = await adminRes.json().catch(() => ({}));

    if (adminRes.ok) {
      const items =
        adminJson?.data?.items ??
        adminJson?.data?.data ??
        (Array.isArray(adminJson?.data) ? adminJson.data : null);
      if (items) {
        return {
          data: items,
          total: adminJson?.data?.total ?? adminJson?.meta?.total ?? items.length,
        };
      }
    }

    // Fallback: payments management endpoint
    const pmtRes = await fetch(`${VENDLY_API_BASE_URL}/payments/transactions${query}`, {
      headers: this.headers(),
      cache: 'no-store',
    });
    const pmtJson = await pmtRes.json().catch(() => ({}));

    if (!pmtRes.ok) {
      throw new Error(pmtJson?.message ?? adminJson?.message ?? 'Failed to load transactions');
    }

    const items =
      pmtJson?.data?.items ?? pmtJson?.items ?? (Array.isArray(pmtJson?.data) ? pmtJson.data : []);
    return {
      data: items,
      total: pmtJson?.data?.total ?? pmtJson?.total ?? items.length,
    };
  }

  /**
   * Admin-only: reconcile (force-update) a transaction status.
   */
  static async reconcileTransaction(id: string, status: string): Promise<{ success: boolean }> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/payments/transactions/${id}/reconcile`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ status }),
    });
    return unwrap<{ success: boolean }>(res);
  }

  // ── Payouts ──────────────────────────────────────────────────────────

  static async getPayouts(params: ListParams = {}): Promise<ListResponse<VendlyPayout>> {
    const query = qs(params as Record<string, unknown>);

    const res = await fetch(`${VENDLY_API_BASE_URL}/payments/payouts${query}`, {
      headers: this.headers(),
      cache: 'no-store',
    });
    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(json?.message ?? 'Failed to fetch payouts');
    }

    const items = json?.data?.items ?? json?.items ?? (Array.isArray(json?.data) ? json.data : []);
    return {
      data: items,
      total: json?.data?.total ?? json?.total ?? items.length,
    };
  }

  /** Process all pending payouts in one batch via Paystack. */
  static async runPayoutQueue(): Promise<{ processed: number }> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/payments/payouts/run`, {
      method: 'POST',
      headers: this.headers(),
    });
    return unwrap<{ processed: number }>(res);
  }

  /** Re-queue a failed payout for retry. */
  static async retryPayout(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/payments/payouts/${id}/retry`, {
      method: 'POST',
      headers: this.headers(),
    });
    return unwrap<{ success: boolean }>(res);
  }

  /** Process a manual payout via Paystack Transfers and send receipt. */
  static async settlePayout(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/payments/payouts/${id}/process`, {
      method: 'POST',
      headers: this.headers(),
    });
    return unwrap<{ success: boolean }>(res);
  }

  // ── Promotions ───────────────────────────────────────────────────────

  static async getPromotions(params: ListParams = {}): Promise<ListResponse<PromotionPayment>> {
    const query = qs(params as Record<string, unknown>);

    const res = await fetch(`${VENDLY_API_BASE_URL}/payments/promotions${query}`, {
      headers: this.headers(),
      cache: 'no-store',
    });
    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(json?.message ?? 'Failed to fetch promotions');
    }

    const items = json?.data?.items ?? json?.items ?? (Array.isArray(json?.data) ? json.data : []);
    return {
      data: items,
      total: json?.data?.total ?? json?.total ?? items.length,
    };
  }
}
