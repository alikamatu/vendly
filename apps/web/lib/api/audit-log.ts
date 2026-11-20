import { api } from './index';

export interface AuditLogEntry {
  id: string;
  actor_id: string | null;
  actor_role: 'ADMIN' | 'SELLER' | 'USER' | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  reason: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface AuditLogPage {
  data: AuditLogEntry[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

/**
 * Read-only client for the audit-log API. Sellers can only see entries where
 * they are the actor — the server enforces that scope regardless of params,
 * so the client just doesn't bother sending actorId.
 */
export const auditLogApi = {
  async listMine(
    token: string,
    params: { page?: number; limit?: number } = {},
  ): Promise<AuditLogPage> {
    const q = new URLSearchParams();
    if (params.page) q.set('page', String(params.page));
    if (params.limit) q.set('limit', String(params.limit));
    const res = await api.get<AuditLogPage | AuditLogEntry[]>(
      `/audit-logs/me${q.toString() ? `?${q}` : ''}`,
      { token, cache: 'no-store' },
    );
    const inner = res.data;
    // Server returns { data: [...], meta: {...} }; the shared client may have
    // peeled the outer .data once already. Handle both shapes.
    if (!Array.isArray(inner) && Array.isArray(inner?.data)) return inner;
    if (Array.isArray(inner)) {
      return {
        data: inner,
        meta: { total: inner.length, page: 1, limit: inner.length, totalPages: 1 },
      };
    }
    return { data: [], meta: { total: 0, page: 1, limit: 0, totalPages: 1 } };
  },
};
