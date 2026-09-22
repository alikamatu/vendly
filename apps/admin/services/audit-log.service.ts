import { VENDLY_API_BASE_URL, getVendlyHeaders } from './config';
import type { AuditLogEntry, AuditLogListParams } from '@/types/operations';

export interface AuditLogResponse {
  items: AuditLogEntry[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export class VendlyAuditLogService {
  private static headers() {
    return getVendlyHeaders();
  }

  static async list(params: AuditLogListParams = {}): Promise<AuditLogResponse> {
    const q = new URLSearchParams();
    if (params.actorId) q.set('actorId', params.actorId);
    if (params.entityType) q.set('entityType', params.entityType);
    if (params.entityId) q.set('entityId', params.entityId);
    if (params.action) q.set('action', params.action);
    if (params.from) q.set('from', params.from);
    if (params.to) q.set('to', params.to);
    if (params.page) q.set('page', String(params.page));
    if (params.limit) q.set('limit', String(params.limit));

    const res = await fetch(`${VENDLY_API_BASE_URL}/audit-logs${q.toString() ? `?${q}` : ''}`, {
      headers: this.headers(),
      cache: 'no-store',
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.message || 'Failed to load audit logs');

    const inner = json?.data ?? json;
    const items: AuditLogEntry[] = Array.isArray(inner?.data)
      ? inner.data
      : Array.isArray(inner)
        ? inner
        : [];
    const meta = inner?.meta || {
      total: items.length,
      page: 1,
      limit: items.length,
      totalPages: 1,
    };
    return { items, meta };
  }
}
