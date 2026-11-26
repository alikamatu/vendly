'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package,
  Loader2,
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Search,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  TrendingUp,
  Sparkles,
  ShoppingBag,
  Truck,
  XCircle,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Select from '@/components/ui/Select';
import Alert from '@/components/ui/Alert';
import { useAuth } from '@/lib/contexts/auth-context';
import { orderApi } from '@/lib/api/order';
import { useRealtimeOrders } from '@/hooks/useRealtimeOrders';
import OrderStatusModal from '@/components/orders/OrderStatusModal';

// Sellers don't care about every server-side status — group them into the
// four buckets they actually act on.
const STATUS_GROUPS = [
  { key: 'all', label: 'All', match: () => true },
  {
    key: 'new',
    label: 'New',
    match: (s: string) => ['PENDING', 'CONFIRMED', 'AWAITING_PAYMENT'].includes(s),
  },
  {
    key: 'in_progress',
    label: 'In progress',
    match: (s: string) => ['PROCESSING', 'PROCESSED', 'PAID'].includes(s),
  },
  {
    key: 'shipping',
    label: 'Shipping',
    match: (s: string) => ['SHIPPED', 'ON THE WAY', 'AVAILABLE FOR PICKUP'].includes(s),
  },
  {
    key: 'completed',
    label: 'Completed',
    match: (s: string) => ['DELIVERED', 'COMPLETED'].includes(s),
  },
  {
    key: 'returns',
    label: 'Returns',
    match: (s: string) => ['RETURN_REQUESTED', 'RETURNED'].includes(s),
  },
  {
    key: 'cancelled',
    label: 'Cancelled',
    match: (s: string) => s === 'CANCELLED',
  },
] as const;

type StatusGroup = (typeof STATUS_GROUPS)[number]['key'];

const TIME_RANGES = [
  { key: 'today', label: 'Today' },
  { key: '7d', label: '7 days' },
  { key: '30d', label: '30 days' },
  { key: 'all', label: 'All time' },
] as const;
type TimeRange = (typeof TIME_RANGES)[number]['key'];

const STATUS_TINT: Record<string, string> = {
  PENDING: 'bg-amber-500/10 text-amber-600',
  AWAITING_PAYMENT: 'bg-amber-500/10 text-amber-600',
  CONFIRMED: 'bg-amber-500/10 text-amber-600',
  PROCESSING: 'bg-blue-500/10 text-blue-600',
  PROCESSED: 'bg-blue-500/10 text-blue-600',
  PAID: 'bg-blue-500/10 text-blue-600',
  SHIPPED: 'bg-indigo-500/10 text-indigo-600',
  'ON THE WAY': 'bg-indigo-500/10 text-indigo-600',
  'AVAILABLE FOR PICKUP': 'bg-indigo-500/10 text-indigo-600',
  DELIVERED: 'bg-emerald-500/10 text-emerald-600',
  COMPLETED: 'bg-emerald-500/10 text-emerald-600',
  RETURN_REQUESTED: 'bg-orange-500/10 text-orange-600',
  RETURNED: 'bg-orange-500/10 text-orange-600',
  CANCELLED: 'bg-neutral-500/10 text-neutral-500',
};

const STATUS_OPTIONS = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'PROCESSED',
  'ON THE WAY',
  'AVAILABLE FOR PICKUP',
  'SHIPPED',
  'DELIVERED',
  'COMPLETED',
  'CANCELLED',
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
        (sum: number, i: any) => sum + parseFloat(i.price || '0') * (i.quantity || 0),
        0,
      )
    : parseFloat(o.total_amount || '0');

export default function StoreOrdersPage() {
  const { token } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusModalOrder, setStatusModalOrder] = useState<any | null>(null);

  useRealtimeOrders({
    onOrderEvent: () => fetchOrders(true),
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [statusGroup, setStatusGroup] = useState<StatusGroup>('all');
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [unpaidOnly, setUnpaidOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highest'>('newest');

  const fetchOrders = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      else setRefreshing(true);
      const data = await orderApi.getSellerOrders(token!);
      setOrders(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load store orders');
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
      if (t >= today && !['CANCELLED'].includes(o.status)) salesToday += total;
      if (t >= sevenDays && !['CANCELLED'].includes(o.status)) salesWeek += total;
      if (['PENDING', 'CONFIRMED', 'AWAITING_PAYMENT'].includes(o.status)) newOrders++;
      if (['PENDING', 'CONFIRMED', 'PROCESSING', 'PROCESSED', 'PAID'].includes(o.status))
        pendingFulfillment++;
    }
    return { salesToday, salesWeek, newOrders, pendingFulfillment };
  }, [orders]);

  const filtered = useMemo(() => {
    const group = STATUS_GROUPS.find((g) => g.key === statusGroup)!;
    const rangeStart =
      timeRange === 'today'
        ? startOfToday()
        : timeRange === '7d'
          ? daysAgo(7)
          : timeRange === '30d'
            ? daysAgo(30)
            : null;
    const q = searchTerm.trim().toLowerCase();
    return orders
      .filter((o) => {
        if (!group.match(o.status)) return false;
        if (rangeStart && new Date(o.created_at) < rangeStart) return false;
        if (unpaidOnly && o.payment_info?.status === 'SUCCESS') return false;
        if (q) {
          const hay =
            `${o.id} ${o.buyer?.full_name || ''} ${o.buyer?.email || ''} ${o.customer_name || ''} ${o.customer_phone || ''}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') return +new Date(b.created_at) - +new Date(a.created_at);
        if (sortBy === 'oldest') return +new Date(a.created_at) - +new Date(b.created_at);
        return orderTotal(b) - orderTotal(a);
      });
  }, [orders, statusGroup, timeRange, unpaidOnly, searchTerm, sortBy]);

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-red-500" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Orders</h1>
          <p className="text-muted mt-1 text-xs sm:text-sm">
            {filtered.length} of {orders.length} showing · auto-refreshes every 30s
          </p>
        </div>
        <button
          onClick={() => fetchOrders(true)}
          disabled={refreshing}
          className="bg-surface hover:bg-foreground/[0.06] inline-flex h-9 items-center gap-1.5 rounded-xl px-3.5 text-xs font-medium transition disabled:opacity-60"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        <StatTile
          accent
          icon={<Sparkles className="h-4 w-4" />}
          label="New orders"
          value={String(stats.newOrders)}
          hint={stats.newOrders > 0 ? 'Action needed' : 'All caught up'}
        />
        <StatTile
          icon={<Wallet className="h-4 w-4" />}
          label="Sales today"
          value={`GH₵${stats.salesToday.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          hint="incl. unpaid"
        />
        <StatTile
          icon={<Truck className="h-4 w-4" />}
          label="To fulfil"
          value={String(stats.pendingFulfillment)}
          hint="awaiting your action"
        />
        <StatTile
          icon={<TrendingUp className="h-4 w-4" />}
          label="7-day sales"
          value={`GH₵${stats.salesWeek.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          hint="rolling week"
        />
      </div>

      <div className="space-y-2.5">
        <div className="relative">
          <Search className="text-muted pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2" />
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by order ID, name, email, phone…"
            className="bg-surface h-11 w-full rounded-2xl pl-9 pr-3 text-sm transition focus:outline-none"
          />
        </div>

        <ChipRow label="When">
          {TIME_RANGES.map((r) => (
            <Chip key={r.key} active={timeRange === r.key} onClick={() => setTimeRange(r.key)}>
              {r.label}
            </Chip>
          ))}
        </ChipRow>

        <ChipRow label="Status">
          {STATUS_GROUPS.map((g) => {
            const count =
              g.key === 'all' ? orders.length : orders.filter((o) => g.match(o.status)).length;
            return (
              <Chip
                key={g.key}
                active={statusGroup === g.key}
                onClick={() => setStatusGroup(g.key)}
                badge={count > 0 && g.key !== 'all' ? count : undefined}
              >
                {g.label}
              </Chip>
            );
          })}
        </ChipRow>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <label className="bg-surface inline-flex h-8 shrink-0 cursor-pointer select-none items-center gap-1.5 rounded-full px-3 text-[11px]">
            <input
              type="checkbox"
              checked={unpaidOnly}
              onChange={(e) => setUnpaidOnly(e.target.checked)}
              className="h-3 w-3 accent-red-500"
            />
            Unpaid only
          </label>
          <div className="ml-auto flex shrink-0 items-center gap-1.5 text-[11px]">
            <span className="text-muted uppercase tracking-wider">Sort:</span>
            <Select
              value={sortBy}
              onChange={(val) => setSortBy(val as any)}
              options={[
                { value: 'newest', label: 'Newest first' },
                { value: 'oldest', label: 'Oldest first' },
                { value: 'highest', label: 'Highest value' },
              ]}
              size="sm"
              className="min-w-[130px]"
            />
          </div>
        </div>
      </div>

      {error && <Alert variant="error" message={error} onDismiss={() => setError(null)} />}

      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {filtered.length > 0 ? (
            filtered.map((order, idx) => (
              <OrderRow
                key={order.id}
                order={order}
                index={idx}
                onOpenStatusModal={() => setStatusModalOrder(order)}
              />
            ))
          ) : (
            <EmptyState query={searchTerm} />
          )}
        </AnimatePresence>
      </div>

      {statusModalOrder && token && (
        <OrderStatusModal
          isOpen={!!statusModalOrder}
          onClose={() => setStatusModalOrder(null)}
          orderId={statusModalOrder.id}
          orderNumber={statusModalOrder.id.slice(-8).toUpperCase()}
          currentStatus={statusModalOrder.status}
          currentPaymentStatus={
            statusModalOrder.payment_info?.status ||
            (statusModalOrder.status === 'PAID' ? 'PAID' : 'PENDING')
          }
          currentPaymentMethod={statusModalOrder.payment_info?.provider || 'PAYSTACK'}
          currentReference={statusModalOrder.payment_info?.reference || ''}
          currentProviderRef={statusModalOrder.payment_info?.provider_ref}
          token={token}
          onStatusUpdated={(newStatus) => {
            setOrders((prev) =>
              prev.map((o) => (o.id === statusModalOrder.id ? { ...o, status: newStatus } : o)),
            );
          }}
          onPaymentUpdated={(paymentInfo, newOrderStatus) => {
            setOrders((prev) =>
              prev.map((o) =>
                o.id === statusModalOrder.id
                  ? {
                      ...o,
                      ...(newOrderStatus ? { status: newOrderStatus } : {}),
                      payment_info: paymentInfo,
                    }
                  : o,
              ),
            );
          }}
        />
      )}
    </div>
  );
}

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
      className={`rounded-2xl border-0 p-3 shadow-none sm:p-4 ${
        accent ? 'bg-red-500/10 text-red-500' : 'bg-surface/40'
      }`}
    >
      <div className="flex items-center gap-1.5">
        <span className={accent ? 'text-red-500' : 'text-muted'}>{icon}</span>
        <span className="text-muted text-[10px] uppercase tracking-wider">{label}</span>
      </div>
      <div
        className={`mt-1 text-lg font-semibold tabular-nums sm:text-xl ${
          accent ? 'text-red-500' : ''
        }`}
      >
        {value}
      </div>
      {hint && <div className="text-muted mt-0.5 truncate text-[10px]">{hint}</div>}
    </div>
  );
}

function ChipRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      <span className="text-muted mr-1 shrink-0 text-[10px] uppercase tracking-wider">{label}</span>
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
      className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border-0 px-3 text-xs font-medium shadow-none transition active:scale-95 ${
        active ? 'bg-red-500 text-white' : 'bg-surface/60 hover:bg-surface/90 text-foreground/80'
      }`}
    >
      {children}
      {typeof badge === 'number' && badge > 0 && (
        <span
          className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${
            active ? 'bg-white/20' : 'bg-foreground/10'
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
    <div className="bg-surface/20 space-y-3 rounded-3xl border-0 py-16 text-center shadow-none sm:py-24">
      <div className="bg-surface mx-auto flex h-12 w-12 items-center justify-center rounded-full">
        <ShoppingBag className="text-muted h-5 w-5" />
      </div>
      <div>
        <p className="text-sm font-medium">
          {query ? 'No orders match this search.' : 'No orders yet.'}
        </p>
        <p className="text-muted mt-1 text-[11px]">
          {query
            ? 'Try clearing filters or widening the time range.'
            : "When buyers order from your store, they'll show up here."}
        </p>
      </div>
    </div>
  );
}

function OrderRow({
  order,
  index,
  onOpenStatusModal,
}: {
  order: any;
  index: number;
  onOpenStatusModal: () => void;
}) {
  const total = orderTotal(order);
  const items = order.items || [];
  const firstThree = items.slice(0, 3);
  const extra = Math.max(0, items.length - firstThree.length);
  const created = new Date(order.created_at);
  const paid = order.payment_info?.status === 'SUCCESS';
  const isNew = ['PENDING', 'AWAITING_PAYMENT', 'CONFIRMED'].includes(order.status);
  const tint = STATUS_TINT[order.status] || 'bg-muted/20 text-muted';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ delay: Math.min(index * 0.02, 0.2), duration: 0.2 }}
    >
      <Card
        className={`hover:bg-surface/60 rounded-2xl border-0 p-4 shadow-none transition-colors ${
          isNew ? 'bg-surface/60' : 'bg-surface/40'
        }`}
        hoverEffect={false}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <Link
            href={`/dashboard/orders/${order.id}`}
            className="flex shrink-0 items-center gap-1.5"
            aria-label={`Open order ${order.id.slice(-8)}`}
          >
            {firstThree.map((it: any, i: number) => (
              <div key={i} className="bg-surface h-12 w-12 overflow-hidden rounded-xl border-0">
                {it.product?.image_urls?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={it.product.image_urls[0]}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="text-muted flex h-full w-full items-center justify-center">
                    <Package className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))}
            {extra > 0 && (
              <div className="bg-surface text-muted flex h-12 w-12 items-center justify-center rounded-xl border-0 text-[11px] font-medium">
                +{extra}
              </div>
            )}
          </Link>

          <Link href={`/dashboard/orders/${order.id}`} className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted text-[11px] font-medium uppercase tracking-wider">
                #{order.id.slice(-8).toUpperCase()}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${tint}`}
              >
                {order.status?.replace(/_/g, ' ')}
              </span>
              {isNew && (
                <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                  New
                </span>
              )}
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${
                  paid ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                }`}
              >
                {paid ? 'Paid' : 'Unpaid'}
              </span>
            </div>
            <p className="truncate text-sm font-medium">
              {order.customer_name || order.buyer?.full_name || 'Customer'}
              <span className="text-muted font-normal">
                {' '}
                · {order.delivery_method || 'Delivery'}
              </span>
            </p>
            <p className="text-muted text-[11px]">
              {created.toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
              {order.delivery_location && ` · ${order.delivery_location}`}
            </p>
          </Link>

          <div className="flex shrink-0 items-center justify-between gap-2 sm:flex-col sm:items-end sm:gap-1.5">
            <div className="text-right">
              <p className="text-muted text-[10px] uppercase leading-none tracking-wider">Total</p>
              <p className="text-lg font-semibold tabular-nums leading-tight text-red-500">
                GH₵{total.toLocaleString()}
              </p>
              <p className="text-muted mt-0.5 text-[9px] leading-none">
                Net 96%: GH₵{(total * 0.96).toFixed(0)}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onOpenStatusModal();
                }}
                className="bg-surface hover:bg-surface/80 text-foreground flex h-8 items-center gap-1.5 rounded-lg border-0 px-2.5 text-[11px] font-medium shadow-none transition"
              >
                <span className="capitalize">{order.status?.replace(/_/g, ' ').toLowerCase()}</span>
                <ChevronDown className="text-muted-foreground h-3 w-3" />
              </button>
              <Link
                href={`/dashboard/orders/${order.id}`}
                className="bg-surface hover:bg-surface/80 hidden h-8 w-8 items-center justify-center rounded-lg border-0 shadow-none transition sm:inline-flex"
                aria-label="Open"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
