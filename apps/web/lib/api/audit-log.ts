const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1000';

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

async function unwrap<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let body: any = {};
    try { body = await res.json(); } catch {}
    const msg = Array.isArray(body?.message) ? body.message.join(' ') : body?.message;
    throw new Error(msg || `Audit log request failed (${res.status})`);
  }
  const json = await res.json();
  return (json && typeof json === 'object' && 'data' in json ? json.data : json) as T;
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
    const url = `${API_URL}/audit-logs/me${q.toString() ? `?${q}` : ''}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    const inner = await unwrap<any>(res);
    // Server returns { data: [...], meta: {...} }; unwrap may have peeled the
    // outer .data once already. Handle both shapes.
    if (Array.isArray(inner?.data)) return inner as AuditLogPage;
    if (Array.isArray(inner)) {
      return { data: inner, meta: { total: inner.length, page: 1, limit: inner.length, totalPages: 1 } };
    }
    return { data: [], meta: { total: 0, page: 1, limit: 0, totalPages: 1 } };
  },
};
