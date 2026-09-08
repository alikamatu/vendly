'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  AlertCircle,
  Activity,
  Search,
  Clock,
  ChevronDown,
  ChevronUp,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '@/lib/contexts/auth-context';
import { auditLogApi, AuditLogEntry } from '@/lib/api/audit-log';

const ACTION_LABEL: Record<string, string> = {
  'product.create': 'Created a product',
  'product.update': 'Updated a product',
  'product.delete': 'Deleted a product',
  'product.status_change': 'Changed product status',
  'product.feature': 'Featured a product',
  'product.unfeature': 'Unfeatured a product',
  'payout.retry': 'Retried a payout',
  'payout.run_queue': 'Triggered the payout queue',
  'approval.approve': 'Verification approved',
  'approval.reject': 'Verification rejected',
  'order.status_change': 'Updated an order status',
  'user.suspend': 'Account suspended',
  'user.unsuspend': 'Account unsuspended',
  'user.warn': 'Warning issued',
  'user.role_change': 'Role changed',
};

function prettyAction(action: string) {
  return ACTION_LABEL[action] || action.replace(/[._]/g, ' ');
}

function relativeTime(iso: string) {
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

const PAGE_SIZE = 50;

export default function SettingsActivityPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setIsLoading(true);
      setError(null);
      const res = await auditLogApi.listMine(token, { page, limit: PAGE_SIZE });
      setItems(res.data);
      setTotal(res.meta.total);
    } catch (err: any) {
      setError(err.message || 'Failed to load activity');
    } finally {
      setIsLoading(false);
    }
  }, [token, page]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter(
      (row) =>
        row.action.toLowerCase().includes(term) ||
        row.entity_type.toLowerCase().includes(term) ||
        (row.reason || '').toLowerCase().includes(term) ||
        (row.entity_id || '').toLowerCase().includes(term)
    );
  }, [items, search]);

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Back Link & Header */}
      <div>
        <Link
          href="/dashboard/settings"
          className="inline-flex items-center gap-2 text-xs font-medium text-muted hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
          Settings
        </Link>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                <Activity className="h-4 w-4" />
              </div>
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
                Activity & Audit Log
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-muted mt-1 max-w-xl">
              An append-only audit trail of actions taken under your account — product updates, status changes, and administrative events.
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="text-muted absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 opacity-60" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter actions or IDs..."
              className="border-border/60 bg-surface/50 focus:border-border h-9 w-full rounded-2xl border pl-9 pr-3 text-xs text-foreground placeholder:text-muted focus:outline-none transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Trust note */}
      <div className="border border-border/60 bg-surface/30 flex items-start gap-3 rounded-2xl p-4">
        <ShieldCheck className="text-emerald-500 mt-0.5 h-4 w-4 shrink-0" />
        <p className="text-muted text-xs leading-relaxed">
          This log is immutable and append-only. Each recorded entry includes the device, IP address, and timestamp to protect your store integrity in case of dispute.
        </p>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-2.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="border border-border/40 bg-surface/30 h-18 animate-pulse rounded-2xl"
            />
          ))}
        </div>
      ) : error ? (
        <div className="border border-dashed border-border/70 bg-surface/20 flex flex-col items-center gap-3 rounded-3xl p-10 text-center">
          <AlertCircle className="text-red-500 h-8 w-8" />
          <p className="text-foreground text-sm font-medium">{error}</p>
          <button
            onClick={load}
            className="border border-border/70 bg-surface hover:bg-surface/80 rounded-full px-5 py-1.5 text-xs text-foreground transition-colors"
          >
            Try again
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="border border-dashed border-border/60 bg-surface/20 flex flex-col items-center gap-2.5 rounded-3xl p-12 text-center">
          <Clock className="text-muted h-8 w-8 opacity-40" />
          <p className="text-foreground text-sm font-medium">
            {search ? 'No activity matches your search' : 'No activity recorded yet'}
          </p>
          <p className="text-muted text-xs max-w-sm">
            Actions such as listing products, editing details, or updating order statuses will automatically appear here.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {filtered.map((row) => {
              const open = expanded.has(row.id);
              return (
                <div
                  key={row.id}
                  className="border border-border/60 bg-surface/30 overflow-hidden rounded-2xl transition-colors hover:bg-surface/60"
                >
                  <button
                    type="button"
                    onClick={() => toggle(row.id)}
                    className="flex w-full items-center gap-3.5 p-3.5 sm:p-4 text-left"
                  >
                    <div className="bg-blue-500/10 text-blue-500 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
                      <Activity className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-foreground truncate text-xs sm:text-sm font-medium">
                        {prettyAction(row.action)}
                      </p>
                      <p className="text-muted truncate text-[11px] mt-0.5">
                        {row.entity_type}
                        {row.entity_id ? ` · ${row.entity_id.slice(0, 8)}…` : ''}
                        {row.reason ? ` · ${row.reason}` : ''}
                      </p>
                    </div>
                    <div className="text-muted text-right text-[11px] shrink-0">
                      <p className="font-medium text-foreground">{relativeTime(row.created_at)}</p>
                      <p className="text-[10px] text-muted opacity-70">
                        {new Date(row.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    {open ? (
                      <ChevronUp className="text-muted h-4 w-4 shrink-0" />
                    ) : (
                      <ChevronDown className="text-muted h-4 w-4 shrink-0" />
                    )}
                  </button>
                  {open && (
                    <div className="border-t border-border/50 bg-surface/40 p-4 text-xs">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Detail label="Action" value={row.action} />
                        <Detail
                          label="Entity"
                          value={`${row.entity_type}${row.entity_id ? ` / ${row.entity_id}` : ''}`}
                        />
                        <Detail
                          label="Timestamp"
                          value={new Date(row.created_at).toLocaleString()}
                        />
                        <Detail label="IP Address" value={row.ip || '—'} />
                      </div>
                      <JsonBlock label="Before" data={row.before} />
                      <JsonBlock label="After" data={row.after} />
                      <JsonBlock label="Metadata" data={row.metadata} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          <div className="text-muted flex items-center justify-between pt-3 text-xs">
            <span>
              Page {page} of {totalPages} ({total} events)
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1 || isLoading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="border border-border/60 bg-surface/50 hover:bg-surface rounded-xl px-3 py-1.5 text-xs text-foreground disabled:opacity-40 transition-colors"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages || isLoading}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="border border-border/60 bg-surface/50 hover:bg-surface rounded-xl px-3 py-1.5 text-xs text-foreground disabled:opacity-40 transition-colors"
              >
                {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Next'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted text-[10px] uppercase tracking-wider font-mono opacity-70">
        {label}
      </p>
      <p className="text-foreground mt-0.5 break-all font-mono text-xs">
        {value}
      </p>
    </div>
  );
}

function JsonBlock({ label, data }: { label: string; data: unknown }) {
  if (!data || (typeof data === 'object' && !Object.keys(data as any).length)) {
    return null;
  }
  return (
    <div className="mt-3">
      <p className="text-muted text-[10px] uppercase tracking-wider font-mono opacity-70">
        {label}
      </p>
      <pre className="bg-background/80 border border-border/50 mt-1 overflow-x-auto rounded-xl p-3 font-mono text-[11px]">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}
