"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
} from "lucide-react";
import { useAuth } from "@/lib/contexts/auth-context";
import { auditLogApi, AuditLogEntry } from "@/lib/api/audit-log";

/**
 * Seller-facing activity / audit log page.
 *
 * Calls GET /audit-logs/me — the API forces the scope to the current user,
 * so a seller can only ever see entries where they were the actor. Useful
 * for sellers to retrace their own actions when an order, payout, or
 * verification submission goes sideways.
 */

const ACTION_LABEL: Record<string, string> = {
  "product.create": "Created a product",
  "product.update": "Updated a product",
  "product.delete": "Deleted a product",
  "product.status_change": "Changed product status",
  "product.feature": "Featured a product",
  "product.unfeature": "Unfeatured a product",
  "payout.retry": "Retried a payout",
  "payout.run_queue": "Triggered the payout queue",
  "approval.approve": "Verification approved",
  "approval.reject": "Verification rejected",
  "order.status_change": "Updated an order status",
  "user.suspend": "Account suspended",
  "user.unsuspend": "Account unsuspended",
  "user.warn": "Warning issued",
  "user.role_change": "Role changed",
};

function prettyAction(action: string) {
  return ACTION_LABEL[action] || action.replace(/[._]/g, " ");
}

function relativeTime(iso: string) {
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

const PAGE_SIZE = 50;

export default function SellerActivityPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
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
      setError(err.message || "Failed to load activity");
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
    return items.filter((row) =>
      row.action.toLowerCase().includes(term) ||
      row.entity_type.toLowerCase().includes(term) ||
      (row.reason || "").toLowerCase().includes(term) ||
      (row.entity_id || "").toLowerCase().includes(term),
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/dashboard"
          className="text-muted hover:text-foreground inline-flex items-center gap-2 text-xs"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>
        <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="text-red-500 h-5 w-5" />
              <h1 className="text-foreground text-2xl font-medium tracking-tight">
                My Activity
              </h1>
            </div>
            <p className="text-muted mt-1 text-sm">
              An append-only record of every change you&apos;ve made — product edits,
              payout retries, verification submissions. Use this when something
              looks off, or to defend yourself in a dispute.
            </p>
          </div>
          <div className="relative w-full md:w-72">
            <Search className="text-muted absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search action, reason, id…"
              className="border-border bg-surface focus:ring-primary/20 h-10 w-full rounded-2xl border pl-9 pr-3 text-xs font-normal focus:outline-none focus:ring-2"
            />
          </div>
        </div>
      </div>

      {/* Trust note */}
      <div className="border-border/40 bg-surface flex items-start gap-3 rounded-2xl border p-4">
        <ShieldCheck className="text-emerald-500 mt-0.5 h-4 w-4 shrink-0" />
        <p className="text-muted text-xs leading-relaxed">
          This log is append-only. Entries cannot be edited or deleted, by you
          or by Vendly admins. The IP, device, and exact timestamp of every
          action you take here are stored and can be referenced if your
          account is ever audited.
        </p>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="border-border/30 bg-surface/40 h-20 animate-pulse rounded-2xl border"
            />
          ))}
        </div>
      ) : error ? (
        <div className="border-border/40 bg-surface flex flex-col items-center gap-4 rounded-3xl border border-dashed p-12 text-center">
          <AlertCircle className="text-red-500/70 h-10 w-10" />
          <p className="text-foreground text-sm font-medium">{error}</p>
          <button
            onClick={load}
            className="border-border hover:bg-surface rounded-full border px-6 py-2 text-xs"
          >
            Try again
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="border-border/40 bg-surface/30 flex flex-col items-center gap-3 rounded-3xl border border-dashed p-16 text-center">
          <Clock className="text-muted h-10 w-10 opacity-40" />
          <p className="text-muted text-xs font-normal uppercase tracking-widest">
            {search ? "No activity matches your search" : "No activity yet"}
          </p>
          <p className="text-muted text-xs opacity-60">
            Once you start editing products, retrying payouts, or submitting
            verification, entries will land here.
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
                  className="border-border/40 bg-surface/40 overflow-hidden rounded-2xl border transition-colors hover:bg-surface/60"
                >
                  <button
                    type="button"
                    onClick={() => toggle(row.id)}
                    className="flex w-full items-center gap-4 p-4 text-left"
                  >
                    <div className="bg-red-500/10 text-red-500 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                      <Activity className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-foreground truncate text-sm font-normal">
                        {prettyAction(row.action)}
                      </p>
                      <p className="text-muted truncate text-xs">
                        {row.entity_type}
                        {row.entity_id ? ` · ${row.entity_id.slice(0, 8)}…` : ""}
                        {row.reason ? ` · ${row.reason}` : ""}
                      </p>
                    </div>
                    <div className="text-muted text-right text-xs">
                      <p>{relativeTime(row.created_at)}</p>
                      <p className="text-[10px] opacity-60">
                        {new Date(row.created_at).toLocaleString()}
                      </p>
                    </div>
                    {open ? (
                      <ChevronUp className="text-muted h-4 w-4 shrink-0" />
                    ) : (
                      <ChevronDown className="text-muted h-4 w-4 shrink-0" />
                    )}
                  </button>
                  {open && (
                    <div className="border-border/30 border-t p-4 text-xs">
                      <div className="grid gap-4 md:grid-cols-2">
                        <Detail label="Action" value={row.action} />
                        <Detail label="Entity" value={`${row.entity_type}${row.entity_id ? ` / ${row.entity_id}` : ""}`} />
                        <Detail label="When" value={new Date(row.created_at).toLocaleString()} />
                        <Detail label="From IP" value={row.ip || "—"} />
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
          <div className="text-muted flex items-center justify-between pt-2 text-[11px]">
            <span>
              Page {page} of {totalPages} · {total} total
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1 || isLoading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="border-border hover:bg-surface rounded-full border px-4 py-1.5 text-xs disabled:opacity-40"
              >
                Prev
              </button>
              <button
                disabled={page >= totalPages || isLoading}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="border-border hover:bg-surface rounded-full border px-4 py-1.5 text-xs disabled:opacity-40"
              >
                {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Next"}
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
      <p className="text-muted text-[10px] uppercase tracking-widest opacity-60">
        {label}
      </p>
      <p className="text-foreground mt-0.5 break-all font-mono text-xs">
        {value}
      </p>
    </div>
  );
}

function JsonBlock({ label, data }: { label: string; data: unknown }) {
  if (!data || (typeof data === "object" && !Object.keys(data as any).length)) {
    return null;
  }
  return (
    <div className="mt-4">
      <p className="text-muted text-[10px] uppercase tracking-widest opacity-60">
        {label}
      </p>
      <pre className="bg-muted/40 mt-1 overflow-x-auto rounded-xl p-3 font-mono text-[11px]">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}
