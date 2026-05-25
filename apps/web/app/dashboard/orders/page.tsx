"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package,
  Loader2,
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Search,
  ChevronRight,
  RefreshCw,
  TrendingUp,
  Sparkles,
  ShoppingBag,
  Truck,
  XCircle,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import { useAuth } from "@/lib/contexts/auth-context";
import { orderApi } from "@/lib/api/order";

// ─── Status groups ────────────────────────────────────────────────────
// Sellers don't care about every server-side status — group them into the
// four buckets they actually act on.
const STATUS_GROUPS = [
  { key: "all", label: "All", match: () => true },
  {
    key: "new",
    label: "New",
    match: (s: string) => ["PENDING", "CONFIRMED", "AWAITING_PAYMENT"].includes(s),
  },
  {
    key: "in_progress",
    label: "In progress",
    match: (s: string) =>
      ["PROCESSING", "PROCESSED", "PAID"].includes(s),
  },
  {
    key: "shipping",
    label: "Shipping",
    match: (s: string) =>
      ["SHIPPED", "ON THE WAY", "AVAILABLE FOR PICKUP"].includes(s),
  },
  {
    key: "completed",
    label: "Completed",
    match: (s: string) => ["DELIVERED", "COMPLETED"].includes(s),
  },
  {
    key: "returns",
    label: "Returns",
    match: (s: string) => ["RETURN_REQUESTED", "RETURNED"].includes(s),
  },
  {
    key: "cancelled",
    label: "Cancelled",
    match: (s: string) => s === "CANCELLED",
  },
] as const;

type StatusGroup = (typeof STATUS_GROUPS)[number]["key"];

const TIME_RANGES = [
  { key: "today", label: "Today" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "all", label: "All time" },
] as const;
type TimeRange = (typeof TIME_RANGES)[number]["key"];

const STATUS_TINT: Record<string, string> = {
  PENDING: "bg-amber-500/10 text-amber-600",
  AWAITING_PAYMENT: "bg-amber-500/10 text-amber-600",
  CONFIRMED: "bg-amber-500/10 text-amber-600",
  PROCESSING: "bg-blue-500/10 text-blue-600",
  PROCESSED: "bg-blue-500/10 text-blue-600",
  PAID: "bg-blue-500/10 text-blue-600",
  SHIPPED: "bg-indigo-500/10 text-indigo-600",
  "ON THE WAY": "bg-indigo-500/10 text-indigo-600",
  "AVAILABLE FOR PICKUP": "bg-indigo-500/10 text-indigo-600",
  DELIVERED: "bg-emerald-500/10 text-emerald-600",
  COMPLETED: "bg-emerald-500/10 text-emerald-600",
  RETURN_REQUESTED: "bg-orange-500/10 text-orange-600",
  RETURNED: "bg-orange-500/10 text-orange-600",
  CANCELLED: "bg-neutral-500/10 text-neutral-500",
};

const STATUS_OPTIONS = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "PROCESSED",
  "ON THE WAY",
  "AVAILABLE FOR PICKUP",
  "SHIPPED",
  "DELIVERED",
  "COMPLETED",
  "CANCELLED",
];

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const daysAgo = (n: number) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
};

const orderTotal = (o: any) =>
  Array.isArray(o.items)
    ? o.items.reduce(
        (sum: number, i: any) =>
          sum + parseFloat(i.price || "0") * (i.quantity || 0),
        0,
      )
    : parseFloat(o.total_amount || "0");

export default function StoreOrdersPage() {
  const { token } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusGroup, setStatusGroup] = useState<StatusGroup>("all");
  const [timeRange, setTimeRange] = useState<TimeRange>("all");
  const [unpaidOnly, setUnpaidOnly] = useState(false);
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "highest">(
    "newest",
  );

  const fetchOrders = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      else setRefreshing(true);
      const data = await orderApi.getSellerOrders(token!);
      setOrders(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load store orders");
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (token) fetchOrders();
  }, [token]);

  // Silent refresh every 30s — fast enough for fulfillment, easy on the API.
  useEffect(() => {
    if (!token) return;
    const id = setInterval(() => fetchOrders(true), 30_000);
    return () => clearInterval(id);
  }, [token]);

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      setUpdatingId(orderId);
      await orderApi.updateOrderStatus(token!, orderId, newStatus);
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)),
      );
    } catch (err: any) {
      alert(err.message || "Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  };

  // ─── Stats (computed from the full order list — instant) ───────────
  const stats = useMemo(() => {
    const today = startOfToday();
    const sevenDays = daysAgo(7);
    let salesToday = 0;
    let salesWeek = 0;
    let newOrders = 0;
    let pendingFulfillment = 0;
    for (const o of orders) {
      const t = new Date(o.created_at);
      const total = orderTotal(o);
      if (t >= today && !["CANCELLED"].includes(o.status)) salesToday += total;
      if (t >= sevenDays && !["CANCELLED"].includes(o.status))
        salesWeek += total;
      if (["PENDING", "CONFIRMED", "AWAITING_PAYMENT"].includes(o.status))
        newOrders++;
      if (
        ["PENDING", "CONFIRMED", "PROCESSING", "PROCESSED", "PAID"].includes(
          o.status,
        )
      )
        pendingFulfillment++;
    }
    return { salesToday, salesWeek, newOrders, pendingFulfillment };
  }, [orders]);

  // ─── Filtered + sorted list ────────────────────────────────────────
  const filtered = useMemo(() => {
    const group = STATUS_GROUPS.find((g) => g.key === statusGroup)!;
    const rangeStart =
      timeRange === "today"
        ? startOfToday()
        : timeRange === "7d"
          ? daysAgo(7)
          : timeRange === "30d"
            ? daysAgo(30)
            : null;
    const q = searchTerm.trim().toLowerCase();
    return orders
      .filter((o) => {
        if (!group.match(o.status)) return false;
        if (rangeStart && new Date(o.created_at) < rangeStart) return false;
        if (unpaidOnly && o.payment_info?.status === "SUCCESS") return false;
        if (q) {
          const hay =
            `${o.id} ${o.buyer?.full_name || ""} ${o.buyer?.email || ""} ${o.customer_name || ""} ${o.customer_phone || ""}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "newest")
          return +new Date(b.created_at) - +new Date(a.created_at);
        if (sortBy === "oldest")
          return +new Date(a.created_at) - +new Date(b.created_at);
        return orderTotal(b) - orderTotal(a);
      });
  }, [orders, statusGroup, timeRange, unpaidOnly, searchTerm, sortBy]);

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="w-7 h-7 text-red-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-6xl mx-auto pb-24 px-3 sm:px-4">
      {/* HEADER */}
      <div className="space-y-3 pt-2">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-[11px] text-muted hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3 h-3" /> Dashboard
        </Link>
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
              Orders
            </h1>
            <p className="text-[11px] text-muted mt-1">
              {filtered.length} of {orders.length} showing · auto-refreshes every 30s
            </p>
          </div>
          <button
            onClick={() => fetchOrders(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-border text-xs font-medium hover:bg-surface transition disabled:opacity-60"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`}
            />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* STATS STRIP */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <StatTile
          accent
          icon={<Sparkles className="w-4 h-4" />}
          label="New orders"
          value={String(stats.newOrders)}
          hint={stats.newOrders > 0 ? "Action needed" : "All caught up"}
        />
        <StatTile
          icon={<Wallet className="w-4 h-4" />}
          label="Sales today"
          value={`GH₵${stats.salesToday.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          hint="incl. unpaid"
        />
        <StatTile
          icon={<Truck className="w-4 h-4" />}
          label="To fulfil"
          value={String(stats.pendingFulfillment)}
          hint="awaiting your action"
        />
        <StatTile
          icon={<TrendingUp className="w-4 h-4" />}
          label="7-day sales"
          value={`GH₵${stats.salesWeek.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          hint="rolling week"
        />
      </div>

      {/* SEARCH + FILTERS */}
      <div className="space-y-2.5">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted pointer-events-none" />
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by order ID, name, email, phone…"
            className="w-full h-11 pl-9 pr-3 rounded-xl bg-surface border border-border text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500/40 transition"
          />
        </div>

        {/* Time range chips */}
        <ChipRow label="When">
          {TIME_RANGES.map((r) => (
            <Chip
              key={r.key}
              active={timeRange === r.key}
              onClick={() => setTimeRange(r.key)}
            >
              {r.label}
            </Chip>
          ))}
        </ChipRow>

        {/* Status group chips */}
        <ChipRow label="Status">
          {STATUS_GROUPS.map((g) => {
            const count =
              g.key === "all"
                ? orders.length
                : orders.filter((o) => g.match(o.status)).length;
            return (
              <Chip
                key={g.key}
                active={statusGroup === g.key}
                onClick={() => setStatusGroup(g.key)}
                badge={count > 0 && g.key !== "all" ? count : undefined}
              >
                {g.label}
              </Chip>
            );
          })}
        </ChipRow>

        {/* Sort + unpaid toggle */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-3 px-3 sm:mx-0 sm:px-0">
          <label className="inline-flex items-center gap-1.5 text-[11px] cursor-pointer select-none shrink-0 px-3 h-8 border border-border rounded-full">
            <input
              type="checkbox"
              checked={unpaidOnly}
              onChange={(e) => setUnpaidOnly(e.target.checked)}
              className="h-3 w-3 accent-red-500"
            />
            Unpaid only
          </label>
          <div className="ml-auto shrink-0 flex items-center gap-1.5 text-[11px]">
            <span className="text-muted uppercase tracking-wider">Sort</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="h-8 px-2.5 rounded-full border border-border bg-background text-xs focus:outline-none focus:border-red-500/40"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="highest">Highest value</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-3 py-2.5 bg-red-500/5 text-red-600 rounded-xl border border-red-500/20 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* ORDER LIST */}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {filtered.length > 0 ? (
            filtered.map((order, idx) => (
              <OrderRow
                key={order.id}
                order={order}
                index={idx}
                onUpdateStatus={handleUpdateStatus}
                updating={updatingId === order.id}
              />
            ))
          ) : (
            <EmptyState query={searchTerm} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Pieces ───────────────────────────────────────────────────────────

function StatTile({
  icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`p-3 sm:p-4 rounded-2xl border ${
        accent
          ? "border-red-500/30 bg-red-500/5"
          : "border-border bg-surface/50"
      }`}
    >
      <div className="flex items-center gap-1.5">
        <span className={accent ? "text-red-500" : "text-muted"}>{icon}</span>
        <span className="text-[10px] uppercase tracking-wider text-muted">
          {label}
        </span>
      </div>
      <div
        className={`mt-1 text-lg sm:text-xl font-semibold tabular-nums ${
          accent ? "text-red-500" : ""
        }`}
      >
        {value}
      </div>
      {hint && (
        <div className="text-[10px] text-muted mt-0.5 truncate">{hint}</div>
      )}
    </div>
  );
}

function ChipRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-3 px-3 sm:mx-0 sm:px-0">
      <span className="text-[10px] uppercase tracking-wider text-muted shrink-0 mr-1">
        {label}
      </span>
      <div className="flex items-center gap-1.5">{children}</div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-medium border transition active:scale-95 ${
        active
          ? "bg-red-500 text-white border-red-500"
          : "bg-background border-border hover:border-foreground/30 text-foreground/80"
      }`}
    >
      {children}
      {typeof badge === "number" && badge > 0 && (
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded-full tabular-nums ${
            active ? "bg-white/20" : "bg-foreground/10"
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

function EmptyState({ query }: { query: string }) {
  return (
    <div className="py-16 sm:py-24 text-center space-y-3 border border-dashed border-border rounded-3xl">
      <div className="mx-auto w-12 h-12 rounded-full bg-surface flex items-center justify-center">
        <ShoppingBag className="w-5 h-5 text-muted" />
      </div>
      <div>
        <p className="text-sm font-medium">
          {query ? "No orders match this search." : "No orders yet."}
        </p>
        <p className="text-[11px] text-muted mt-1">
          {query
            ? "Try clearing filters or widening the time range."
            : "When buyers order from your store, they'll show up here."}
        </p>
      </div>
    </div>
  );
}

function OrderRow({
  order,
  index,
  updating,
  onUpdateStatus,
}: {
  order: any;
  index: number;
  updating: boolean;
  onUpdateStatus: (id: string, newStatus: string) => void;
}) {
  const total = orderTotal(order);
  const items = order.items || [];
  const firstThree = items.slice(0, 3);
  const extra = Math.max(0, items.length - firstThree.length);
  const created = new Date(order.created_at);
  const paid = order.payment_info?.status === "SUCCESS";
  const isNew = ["PENDING", "AWAITING_PAYMENT", "CONFIRMED"].includes(
    order.status,
  );
  const tint = STATUS_TINT[order.status] || "bg-muted/20 text-muted";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ delay: Math.min(index * 0.02, 0.2), duration: 0.2 }}
    >
      <Card
        className={`p-3 sm:p-4 rounded-2xl border transition hover:bg-surface/40 ${
          isNew ? "border-red-500/30" : "border-border"
        }`}
        hoverEffect={false}
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          {/* Thumbnails */}
          <Link
            href={`/dashboard/orders/${order.id}`}
            className="flex items-center gap-1.5 shrink-0"
            aria-label={`Open order ${order.id.slice(-8)}`}
          >
            {firstThree.map((it: any, i: number) => (
              <div
                key={i}
                className="h-12 w-12 rounded-xl overflow-hidden border border-border/50 bg-surface"
              >
                {it.product?.image_urls?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={it.product.image_urls[0]}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted">
                    <Package className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}
            {extra > 0 && (
              <div className="h-12 w-12 rounded-xl border border-dashed border-border bg-surface text-[11px] font-medium text-muted flex items-center justify-center">
                +{extra}
              </div>
            )}
          </Link>

          {/* Middle */}
          <Link
            href={`/dashboard/orders/${order.id}`}
            className="flex-1 min-w-0 space-y-1"
          >
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] uppercase tracking-wider text-muted font-medium">
                #{order.id.slice(-8).toUpperCase()}
              </span>
              <span
                className={`text-[10px] font-medium px-2 py-0.5 rounded-full uppercase tracking-wider ${tint}`}
              >
                {order.status?.replace(/_/g, " ")}
              </span>
              {isNew && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-500 text-white uppercase tracking-wider">
                  New
                </span>
              )}
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  paid
                    ? "bg-emerald-500/10 text-emerald-600"
                    : "bg-amber-500/10 text-amber-600"
                }`}
              >
                {paid ? "Paid" : "Unpaid"}
              </span>
            </div>
            <p className="text-sm font-medium truncate">
              {order.customer_name || order.buyer?.full_name || "Customer"}
              <span className="text-muted font-normal">
                {" "}
                · {order.delivery_method || "Delivery"}
              </span>
            </p>
            <p className="text-[11px] text-muted">
              {created.toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
              {order.delivery_location && ` · ${order.delivery_location}`}
            </p>
          </Link>

          {/* Right: total + actions */}
          <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2 sm:gap-1.5 shrink-0">
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-muted leading-none">
                Total
              </p>
              <p className="text-lg font-semibold text-red-500 tabular-nums leading-tight">
                GH₵{total.toLocaleString()}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <select
                value={order.status}
                disabled={updating}
                onChange={(e) => onUpdateStatus(order.id, e.target.value)}
                className="h-8 px-2 rounded-lg border border-border bg-background text-[11px] focus:outline-none focus:border-red-500/40"
                onClick={(e) => e.stopPropagation()}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, " ").toLowerCase()}
                  </option>
                ))}
              </select>
              {updating && (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-red-500" />
              )}
              <Link
                href={`/dashboard/orders/${order.id}`}
                className="h-8 w-8 hidden sm:inline-flex items-center justify-center rounded-lg border border-border hover:bg-surface transition"
                aria-label="Open"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
