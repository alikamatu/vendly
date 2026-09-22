import { VENDLY_API_BASE_URL, getVendlyHeaders, qs, unwrap } from './config';
import type { PlatformSettings, GlobalOverviewStats, OrderTransaction } from '@/types/operations';

export class VendlySettingsService {
  private static headers() {
    return getVendlyHeaders();
  }

  static async getSettings(): Promise<PlatformSettings> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/admin/settings`, {
      headers: this.headers(),
      cache: 'no-store',
    });
    return unwrap<PlatformSettings>(res);
  }

  static async updateSettings(settings: Partial<PlatformSettings>): Promise<PlatformSettings> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/admin/settings`, {
      method: 'PATCH',
      headers: this.headers(),
      body: JSON.stringify(settings),
    });
    return unwrap<PlatformSettings>(res);
  }

  static async getGlobalOverview(): Promise<GlobalOverviewStats> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/admin/overview`, {
      headers: this.headers(),
      cache: 'no-store',
    });
    return unwrap<GlobalOverviewStats>(res);
  }

  static async getStats(): Promise<Record<string, unknown>> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/admin/stats`, {
      headers: this.headers(),
      cache: 'no-store',
    });
    return unwrap<Record<string, unknown>>(res);
  }

  static async getTransactions(params: Record<string, unknown> = {}): Promise<{
    data: OrderTransaction[];
    total: number;
  }> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/admin/transactions${qs(params)}`, {
      headers: this.headers(),
      cache: 'no-store',
    });
    return unwrap<{ data: OrderTransaction[]; total: number }>(res);
  }
}
