import { VENDLY_API_BASE_URL, getVendlyHeaders, unwrap } from './config';
import type {
  AdminNotification,
  NotificationStats,
  BroadcastInput,
  DirectNotificationInput,
} from '@/types/operations';

export class VendlyNotificationService {
  private static headers() {
    return getVendlyHeaders();
  }

  static async list(params: { page?: number; limit?: number; type?: string } = {}): Promise<{
    data: AdminNotification[];
    total: number;
  }> {
    const q = new URLSearchParams();
    if (params.page) q.set('page', String(params.page));
    if (params.limit) q.set('limit', String(params.limit));
    if (params.type) q.set('type', params.type);

    const res = await fetch(
      `${VENDLY_API_BASE_URL}/admin/notifications${q.toString() ? `?${q}` : ''}`,
      { headers: this.headers(), cache: 'no-store' },
    );
    return unwrap<{ data: AdminNotification[]; total: number }>(res);
  }

  static async stats(): Promise<NotificationStats> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/admin/notifications/stats`, {
      headers: this.headers(),
      cache: 'no-store',
    });
    return unwrap<NotificationStats>(res);
  }

  static async broadcast(input: BroadcastInput): Promise<{ count: number }> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/admin/notifications/broadcast`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(input),
    });
    return unwrap<{ count: number }>(res);
  }

  static async sendDirect(input: DirectNotificationInput): Promise<AdminNotification> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/admin/notifications/direct`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(input),
    });
    return unwrap<AdminNotification>(res);
  }

  static async markRead(id: string): Promise<AdminNotification> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/admin/notifications/${id}/read`, {
      method: 'PATCH',
      headers: this.headers(),
    });
    return unwrap<AdminNotification>(res);
  }

  static async markAllRead(): Promise<{ count: number }> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/admin/notifications/read-all`, {
      method: 'PATCH',
      headers: this.headers(),
    });
    return unwrap<{ count: number }>(res);
  }
}
