import { VENDLY_API_BASE_URL, getVendlyHeaders, unwrap } from './config';
import type { PlatformSettings, GlobalOverviewStats } from '@/types/operations';

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
}
