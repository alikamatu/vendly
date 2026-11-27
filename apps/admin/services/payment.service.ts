import { VENDLY_API_BASE_URL, getVendlyHeaders, qs, unwrap } from './config';
import type { EnhancedTransaction, VendlyPayout, PromotionPayment } from '@/types/operations';

export interface SellerSubaccountRow {
  seller_id: string;
  user_id: string;
  store_name: string;
  store_link: string;
  is_seller_verified: boolean;
  onboarding_completed: boolean;
  bank_name: string | null;
  bank_code: string | null;
  account_number: string | null;
  paystack_subaccount_code: string | null;
  subaccount_status: 'ACTIVE' | 'PENDING_RETRY' | 'FAILED' | 'UNCONFIGURED';
  retry: {
    id: string;
    attempts: number;
    last_error: string | null;
    status: string;
    updated_at: string;
  } | null;
  balance: {
    available: number;
    pending: number;
    withdrawn: number;
  };
  owner?: {
    id: string;
    full_name: string;
    email: string;
    is_verified: boolean;
    is_suspended: boolean;
  };
}

export interface PaystackBalanceInfo {
  live: boolean;
  currency: string;
  available: number | null;
  balances: Array<{ currency: string; amount: number }>;
  error?: string;
  checked_at: string;
}

export interface AdminRefundRow {
  id: string;
  order_id: string;
  transaction_id: string;
  reference: string;
  amount: string | number;
  currency: string;
  status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED';
  reason?: string | null;
  provider: string;
  provider_ref?: string | null;
  customer_note?: string | null;
  merchant_note?: string | null;
  created_at: string;
  transaction?: {
    id: string;
    reference: string;
    amount: string | number;
    provider: string;
  };
  order?: {
    id: string;
    status: string;
    customer_name?: string | null;
    buyer?: { id: string; full_name: string; email: string } | null;
    items?: Array<{
      product?: { seller?: { id: string; store_name: string } | null } | null;
    }>;
  };
}

export interface AdminWalletRow {
  seller_id: string;
  user_id: string;
  store_name: string;
  store_link: string;
  is_seller_verified: boolean;
  bank_name: string | null;
  bank_code: string | null;
  account_number: string | null;
  paystack_subaccount_code: string | null;
  owner?: {
    id: string;
    full_name: string;
    email: string;
    is_suspended: boolean;
  };
  available_balance: number;
  pending_balance: number;
  total_earned: number;
  total_withdrawn: number;
  payouts_count: number;
  ledger_count: number;
}

export interface AdminLedgerRow {
  id: string;
  seller_id: string;
  transaction_id?: string | null;
  payout_id?: string | null;
  reference: string;
  type: 'CREDIT' | 'DEBIT';
  source_type: 'ORDER' | 'PROMOTION' | 'ADJUSTMENT' | 'FEE' | 'PAYOUT' | 'REFUND';
  amount: string | number;
  currency: string;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  seller?: { id: string; store_name: string } | null;
  transaction?: { id: string; reference: string } | null;
  payout?: { id: string; reference: string; status: string } | null;
}

export interface AdminPaymentLogRow {
  id: string;
  event: string;
  event_id?: string | null;
  payload: Record<string, unknown>;
  created_at: string;
}

// ─── Response helpers ────────────────────────────────────────────────────

interface ListResponse<T> {
  data: T[];
  total: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}

interface ListParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  seller_id?: string;
  type?: string;
  source_type?: string;
  event?: string;
}

// ─── Service ─────────────────────────────────────────────────────────────

export class VendlyPaymentService {
  private static headers() {
    return getVendlyHeaders();
  }

  // ── Live Paystack Balance & Account Lookup ───────────────────────────

  static async getPaystackBalance(): Promise<PaystackBalanceInfo> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/payments/paystack-balance`, {
      headers: this.headers(),
      cache: 'no-store',
    });
    return unwrap<PaystackBalanceInfo>(res);
  }

  static async resolveBankAccount(
    bankCode: string,
    accountNumber: string,
  ): Promise<{
    verified: boolean;
    account_name: string | null;
    account_number: string;
    bank_code: string;
    warning?: string;
  }> {
    const query = qs({ bank_code: bankCode, account_number: accountNumber });
    const res = await fetch(`${VENDLY_API_BASE_URL}/payments/resolve-account${query}`, {
      headers: this.headers(),
      cache: 'no-store',
    });
    return unwrap(res);
  }

  // ── Transactions ─────────────────────────────────────────────────────

  static async getTransactions(
    params: ListParams = {},
  ): Promise<ListResponse<EnhancedTransaction>> {
    const query = qs(params as Record<string, unknown>);

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
        const total = adminJson?.data?.total ?? adminJson?.meta?.total ?? items.length;
        const limit = params.limit || 50;
        return {
          data: items,
          total,
          page: params.page || 1,
          limit,
          totalPages: Math.max(1, Math.ceil(total / limit)),
        };
      }
    }

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
    const total = pmtJson?.data?.total ?? pmtJson?.total ?? items.length;
    const limit = params.limit || 50;
    return {
      data: items,
      total,
      page: params.page || 1,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  static async getTransactionById(id: string): Promise<any> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/payments/transactions/${id}`, {
      headers: this.headers(),
      cache: 'no-store',
    });
    return unwrap<any>(res);
  }

  static async verifyTransactionWithPaystack(id: string): Promise<{
    success: boolean;
    reference: string;
    verification: any;
  }> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/payments/transactions/${id}/verify-paystack`, {
      method: 'POST',
      headers: this.headers(),
    });
    return unwrap(res);
  }

  static async releaseOrderEscrow(orderId: string): Promise<{
    success: boolean;
    message: string;
    order_id: string;
  }> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/payments/orders/${orderId}/release-escrow`, {
      method: 'POST',
      headers: this.headers(),
    });
    return unwrap(res);
  }

  static async reconcileTransaction(id: string, status: string): Promise<{ success: boolean }> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/payments/transactions/${id}/reconcile`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ status }),
    });
    return unwrap<{ success: boolean }>(res);
  }

  static async refundTransaction(
    id: string,
    payload: { amount?: number; reason?: string },
  ): Promise<any> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/payments/transactions/${id}/refund`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(payload),
    });
    return unwrap<any>(res);
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
    const total = json?.data?.total ?? json?.total ?? items.length;
    const limit = params.limit || 50;
    return {
      data: items,
      total,
      page: params.page || 1,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  static async runPayoutQueue(): Promise<{ processed: number }> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/payments/payouts/run`, {
      method: 'POST',
      headers: this.headers(),
    });
    return unwrap<{ processed: number }>(res);
  }

  static async retryPayout(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/payments/payouts/${id}/retry`, {
      method: 'POST',
      headers: this.headers(),
    });
    return unwrap<{ success: boolean }>(res);
  }

  static async settlePayout(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/payments/payouts/${id}/process`, {
      method: 'POST',
      headers: this.headers(),
    });
    return unwrap<{ success: boolean }>(res);
  }

  static async holdPayout(id: string, reason: string): Promise<any> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/payments/payouts/${id}/hold`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ reason }),
    });
    return unwrap<any>(res);
  }

  static async releasePayoutHold(id: string): Promise<any> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/payments/payouts/${id}/release-hold`, {
      method: 'POST',
      headers: this.headers(),
    });
    return unwrap<any>(res);
  }

  static async cancelPayout(id: string, reason: string): Promise<any> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/payments/payouts/${id}/cancel`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ reason }),
    });
    return unwrap<any>(res);
  }

  static async markPayoutSettledOffline(
    id: string,
    payload: { external_ref?: string; note?: string },
  ): Promise<any> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/payments/payouts/${id}/mark-settled`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(payload),
    });
    return unwrap<any>(res);
  }

  static async resendPayoutReceipt(id: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/payments/payouts/${id}/resend-receipt`, {
      method: 'POST',
      headers: this.headers(),
    });
    return unwrap<{ success: boolean; message: string }>(res);
  }

  static async createManualPayout(payload: {
    seller_id: string;
    amount: number;
    reason: string;
    execute_now?: boolean;
  }): Promise<any> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/payments/payouts/manual-create`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(payload),
    });
    return unwrap<any>(res);
  }

  // ── Wallets, Ledger & Refunds ────────────────────────────────────────

  static async getRefunds(params: ListParams = {}): Promise<
    ListResponse<AdminRefundRow> & {
      summary?: {
        total_refunded_amount: number;
        success_count: number;
        pending_count: number;
        failed_count: number;
      };
    }
  > {
    const query = qs(params as Record<string, unknown>);
    const res = await fetch(`${VENDLY_API_BASE_URL}/payments/refunds${query}`, {
      headers: this.headers(),
      cache: 'no-store',
    });
    const unwrapped = await unwrap<any>(res);
    const items = unwrapped?.items ?? (Array.isArray(unwrapped) ? unwrapped : []);
    return {
      data: items,
      total: unwrapped?.total ?? items.length,
      page: unwrapped?.page ?? 1,
      limit: unwrapped?.limit ?? 50,
      totalPages: unwrapped?.totalPages ?? 1,
      summary: unwrapped?.summary,
    };
  }

  static async getWallets(params: ListParams = {}): Promise<
    ListResponse<AdminWalletRow> & {
      summary?: {
        total_available: number;
        total_pending: number;
        total_earned: number;
        total_withdrawn: number;
      };
    }
  > {
    const query = qs(params as Record<string, unknown>);
    const res = await fetch(`${VENDLY_API_BASE_URL}/payments/wallets${query}`, {
      headers: this.headers(),
      cache: 'no-store',
    });
    const unwrapped = await unwrap<any>(res);
    const items = unwrapped?.items ?? (Array.isArray(unwrapped) ? unwrapped : []);
    return {
      data: items,
      total: unwrapped?.total ?? items.length,
      page: unwrapped?.page ?? 1,
      limit: unwrapped?.limit ?? 50,
      totalPages: unwrapped?.totalPages ?? 1,
      summary: unwrapped?.summary,
    };
  }

  static async adjustWallet(
    sellerId: string,
    payload: {
      type: 'CREDIT' | 'DEBIT';
      bucket: 'available' | 'pending';
      amount: number;
      reason: string;
    },
  ): Promise<any> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/payments/wallets/${sellerId}/adjust`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(payload),
    });
    return unwrap<any>(res);
  }

  static async releaseWalletPending(
    sellerId: string,
    payload: { amount?: number; reason?: string },
  ): Promise<any> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/payments/wallets/${sellerId}/release-pending`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(payload),
    });
    return unwrap<any>(res);
  }

  static async getLedger(params: ListParams = {}): Promise<ListResponse<AdminLedgerRow>> {
    const query = qs(params as Record<string, unknown>);
    const res = await fetch(`${VENDLY_API_BASE_URL}/payments/ledger${query}`, {
      headers: this.headers(),
      cache: 'no-store',
    });
    const unwrapped = await unwrap<any>(res);
    const items = unwrapped?.items ?? (Array.isArray(unwrapped) ? unwrapped : []);
    return {
      data: items,
      total: unwrapped?.total ?? items.length,
      page: unwrapped?.page ?? 1,
      limit: unwrapped?.limit ?? 50,
      totalPages: unwrapped?.totalPages ?? 1,
    };
  }

  // ── Subaccounts & Retries ────────────────────────────────────────────

  static async getSubaccounts(params: ListParams = {}): Promise<ListResponse<SellerSubaccountRow>> {
    const query = qs(params as Record<string, unknown>);
    const res = await fetch(`${VENDLY_API_BASE_URL}/payments/subaccounts${query}`, {
      headers: this.headers(),
      cache: 'no-store',
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json?.message ?? 'Failed to fetch subaccounts');
    }
    const items = json?.data?.items ?? json?.items ?? (Array.isArray(json?.data) ? json.data : []);
    return {
      data: items,
      total: json?.data?.total ?? json?.total ?? items.length,
    };
  }

  static async syncSellerSubaccount(sellerId: string): Promise<{
    ok: boolean;
    subaccount_code: string | null;
    action: string;
    error?: string;
  }> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/payments/subaccounts/${sellerId}/sync`, {
      method: 'POST',
      headers: this.headers(),
    });
    return unwrap(res);
  }

  static async overrideSellerBank(
    sellerId: string,
    payload: {
      bank_name?: string;
      bank_code: string;
      account_number: string;
      reason?: string;
    },
  ): Promise<any> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/payments/subaccounts/${sellerId}/bank`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(payload),
    });
    return unwrap<any>(res);
  }

  static async retryAllSubaccounts(): Promise<{
    total: number;
    synced: number;
    failed: number;
  }> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/payments/subaccounts/retry-all`, {
      method: 'POST',
      headers: this.headers(),
    });
    return unwrap(res);
  }

  // ── Promotions & Webhook Logs ────────────────────────────────────────

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

  static async reconcilePromotion(
    id: string,
    payload: { status: 'SUCCESS' | 'FAILED'; reason?: string },
  ): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/payments/promotions/${id}/reconcile`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(payload),
    });
    return unwrap(res);
  }

  static async getPaymentLogs(params: ListParams = {}): Promise<ListResponse<AdminPaymentLogRow>> {
    const query = qs(params as Record<string, unknown>);
    const res = await fetch(`${VENDLY_API_BASE_URL}/payments/logs${query}`, {
      headers: this.headers(),
      cache: 'no-store',
    });
    const unwrapped = await unwrap<any>(res);
    const items = unwrapped?.items ?? (Array.isArray(unwrapped) ? unwrapped : []);
    return {
      data: items,
      total: unwrapped?.total ?? items.length,
      page: unwrapped?.page ?? 1,
      limit: unwrapped?.limit ?? 50,
      totalPages: unwrapped?.totalPages ?? 1,
    };
  }
}
