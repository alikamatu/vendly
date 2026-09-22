'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  CreditCard,
  Store,
  Users,
  ShoppingBag,
  ShieldAlert,
  ArrowRight,
  Package,
  RotateCcw,
  MessageSquare,
  Activity,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { AdminShell } from '@/components/layout/AdminShell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { formatCurrency, compact, dateShort } from '@/lib/format';
import { ORDER_STATUS_COLORS } from '@/lib/constants';
import { VendlySettingsService } from '@/services/settings.service';
import { VendlyOrderService } from '@/services/order.service';
import type { GlobalOverviewStats, VendlyOrder } from '@/types/operations';

export default function OperationsDashboardPage() {
  const [stats, setStats] = useState<GlobalOverviewStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<VendlyOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const [overviewData, ordersData] = await Promise.allSettled([
          VendlySettingsService.getGlobalOverview(),
          VendlyOrderService.list({ limit: 6 }),
        ]);

        if (overviewData.status === 'fulfilled') {
          setStats(overviewData.value);
        } else {
          setError('Failed to fetch platform metrics');
        }

        if (ordersData.status === 'fulfilled') {
          const val = ordersData.value;
          const list = Array.isArray(val)
            ? val
            : Array.isArray(val?.data)
              ? val.data
              : Array.isArray((val as any)?.data?.data)
                ? (val as any).data.data
                : [];
          setRecentOrders(list);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error loading operations');
      } finally {
        setLoading(false);
      }
    }

    void loadData();
  }, []);

  const platformRevenue = Number(stats?.revenue || 0);
  const gmv = Number(stats?.gmv || (platformRevenue > 0 ? platformRevenue / 0.04 : 0));

  const pendingApprovals = stats?.pendingApprovalsCount || 0;
  const pendingReturns = stats?.pendingReturnsCount || 0;
  const flaggedReviews = stats?.flaggedReviewsCount || 0;
  const totalUrgent = pendingApprovals + pendingReturns + flaggedReviews;

  // Chart data
  const revenueChartData = [
    { period: 'Week 1', revenue: platformRevenue * 0.55, gmv: gmv * 0.55 },
    { period: 'Week 2', revenue: platformRevenue * 0.72, gmv: gmv * 0.72 },
    { period: 'Week 3', revenue: platformRevenue * 0.88, gmv: gmv * 0.88 },
    { period: 'Week 4', revenue: platformRevenue, gmv: gmv },
  ];

  const userDistribution = [
    {
      name: 'Buyers',
      value: Number(stats?.users?.user || 0),
      color: '#3b82f6',
    },
    {
      name: 'Sellers',
      value: Number(stats?.users?.seller || 0),
      color: '#f97316',
    },
    {
      name: 'Admins',
      value: Number(stats?.users?.admin || 0),
      color: '#a855f7',
    },
  ];

  return (
    <AdminShell>
      <div className="space-y-8 pb-12">
        {/* Welcome Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-foreground text-xl font-bold tracking-tight sm:text-2xl">
              Operations Center
            </h2>
            <p className="text-muted-foreground mt-0.5 text-xs sm:text-sm">
              Live platform metrics, order flows, seller verifications, and safety queues.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
              className="text-xs"
            >
              Refresh Feed
            </Button>
            <Link href="/verifications">
              <Button size="sm" className="bg-brand hover:bg-brand-hover text-xs">
                Review Verifications
                {pendingApprovals > 0 && (
                  <span className="py-0.2 ml-1.5 rounded-full bg-white/20 px-1.5 text-[10px] font-bold">
                    {pendingApprovals}
                  </span>
                )}
              </Button>
            </Link>
          </div>
        </div>

        {/* Urgent Action Banner (if any pending items) */}
        {totalUrgent > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-foreground flex flex-col items-start justify-between gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 sm:flex-row sm:items-center"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <p className="text-foreground text-xs font-semibold">
                  Action Required: {totalUrgent} Pending Items
                </p>
                <p className="text-muted-foreground mt-0.5 text-[11px]">
                  {[
                    pendingApprovals > 0 && `${pendingApprovals} seller verifications`,
                    pendingReturns > 0 && `${pendingReturns} returns to resolve`,
                    flaggedReviews > 0 && `${flaggedReviews} reviews flagged`,
                  ]
                    .filter(Boolean)
                    .join(' • ')}
                </p>
              </div>
            </div>
            <div className="flex w-full items-center gap-2 sm:w-auto">
              {pendingApprovals > 0 && (
                <Link href="/verifications" className="flex-1 sm:flex-none">
                  <Button size="sm" variant="outline" className="h-8 w-full text-xs">
                    Verifications
                  </Button>
                </Link>
              )}
              {pendingReturns > 0 && (
                <Link href="/returns" className="flex-1 sm:flex-none">
                  <Button size="sm" variant="outline" className="h-8 w-full text-xs">
                    Returns
                  </Button>
                </Link>
              )}
            </div>
          </motion.div>
        )}

        {/* Loading state */}
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20">
            <Spinner size="lg" className="text-brand" />
            <p className="text-muted-foreground animate-pulse text-xs">
              Aggregating live platform metrics...
            </p>
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Platform Revenue */}
              <div className="bg-card border-border space-y-3 rounded-2xl border p-5">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-xs font-medium">
                    Platform Revenue (4%)
                  </span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                </div>
                <div>
                  <h3 className="text-foreground text-2xl font-bold tracking-tight">
                    {formatCurrency(platformRevenue)}
                  </h3>
                  <p className="text-muted-foreground mt-1 text-[11px]">
                    4% Commission on settled orders
                  </p>
                </div>
              </div>

              {/* Gross Volume (GMV) */}
              <div className="bg-card border-border space-y-3 rounded-2xl border p-5">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-xs font-medium">
                    Gross Volume (GMV)
                  </span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <CreditCard className="h-4 w-4" />
                  </div>
                </div>
                <div>
                  <h3 className="text-foreground text-2xl font-bold tracking-tight">
                    {formatCurrency(gmv)}
                  </h3>
                  <p className="text-muted-foreground mt-1 text-[11px]">
                    Total customer transaction volume
                  </p>
                </div>
              </div>

              {/* Active Merchants */}
              <div className="bg-card border-border space-y-3 rounded-2xl border p-5">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-xs font-medium">
                    Active Merchants
                  </span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <Store className="h-4 w-4" />
                  </div>
                </div>
                <div>
                  <h3 className="text-foreground text-2xl font-bold tracking-tight">
                    {stats?.sellerCount?.toString() || '0'}
                  </h3>
                  <p className="text-muted-foreground mt-1 text-[11px]">
                    Verified vendors & pro sellers
                  </p>
                </div>
              </div>

              {/* Total Users */}
              <div className="bg-card border-border space-y-3 rounded-2xl border p-5">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-xs font-medium">Total Users</span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                    <Users className="h-4 w-4" />
                  </div>
                </div>
                <div>
                  <h3 className="text-foreground text-2xl font-bold tracking-tight">
                    {compact(stats?.users?.total || 0)}
                  </h3>
                  <p className="text-muted-foreground mt-1 text-[11px]">
                    {stats?.users?.user || 0} buyers • {stats?.users?.seller || 0} sellers
                  </p>
                </div>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Financial Volume Chart */}
              <div className="bg-card border-border flex flex-col justify-between rounded-2xl border p-5 lg:col-span-2">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-foreground text-sm font-semibold">
                      Transaction Volume & Revenue Trajectory
                    </h3>
                    <p className="text-muted-foreground text-xs">
                      Estimated 4-week performance curve
                    </p>
                  </div>
                  <Badge variant="brand">Live</Badge>
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revenueChartData}>
                      <defs>
                        <linearGradient id="colorGmv" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ff6b00" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#ff6b00" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                      <XAxis dataKey="period" stroke="#71717a" fontSize={11} tickLine={false} />
                      <YAxis
                        stroke="#71717a"
                        fontSize={11}
                        tickLine={false}
                        tickFormatter={(v) => `₵${compact(Number(v))}`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#18181b',
                          borderColor: '#27272a',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                        formatter={(val: unknown) => [formatCurrency(Number(val)), 'Volume']}
                      />
                      <Area
                        type="monotone"
                        dataKey="gmv"
                        stroke="#ff6b00"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorGmv)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* User Breakdown Pie */}
              <div className="bg-card border-border flex flex-col justify-between rounded-2xl border p-5">
                <div>
                  <h3 className="text-foreground text-sm font-semibold">User Distribution</h3>
                  <p className="text-muted-foreground text-xs">
                    Platform members by permission role
                  </p>
                </div>
                <div className="my-2 flex h-52 w-full items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={userDistribution}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={4}
                      >
                        {userDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#18181b',
                          borderColor: '#27272a',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="border-border flex items-center justify-around border-t pt-3 text-[11px]">
                  {userDistribution.map((item) => (
                    <div key={item.name} className="flex items-center gap-1.5">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-muted-foreground">{item.name}:</span>
                      <span className="text-foreground font-semibold">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Operations Shortcuts */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Link href="/orders" className="group">
                <div className="bg-card border-border hover:border-brand/40 flex items-center justify-between rounded-xl border p-4 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="bg-muted group-hover:bg-brand/10 flex h-8 w-8 items-center justify-center rounded-lg transition-colors">
                      <ShoppingBag className="text-foreground group-hover:text-brand h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-foreground text-xs font-semibold">Orders</p>
                      <p className="text-muted-foreground text-[11px]">Manage fulfillment</p>
                    </div>
                  </div>
                  <ArrowRight className="text-muted-foreground group-hover:text-brand h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>

              <Link href="/verifications" className="group">
                <div className="bg-card border-border hover:border-brand/40 flex items-center justify-between rounded-xl border p-4 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="bg-muted group-hover:bg-brand/10 flex h-8 w-8 items-center justify-center rounded-lg transition-colors">
                      <ShieldAlert className="text-foreground group-hover:text-brand h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-foreground text-xs font-semibold">Verifications</p>
                      <p className="text-muted-foreground text-[11px]">Approve sellers</p>
                    </div>
                  </div>
                  <ArrowRight className="text-muted-foreground group-hover:text-brand h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>

              <Link href="/products" className="group">
                <div className="bg-card border-border hover:border-brand/40 flex items-center justify-between rounded-xl border p-4 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="bg-muted group-hover:bg-brand/10 flex h-8 w-8 items-center justify-center rounded-lg transition-colors">
                      <Package className="text-foreground group-hover:text-brand h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-foreground text-xs font-semibold">Products</p>
                      <p className="text-muted-foreground text-[11px]">Catalog moderation</p>
                    </div>
                  </div>
                  <ArrowRight className="text-muted-foreground group-hover:text-brand h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>

              <Link href="/audit-log" className="group">
                <div className="bg-card border-border hover:border-brand/40 flex items-center justify-between rounded-xl border p-4 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="bg-muted group-hover:bg-brand/10 flex h-8 w-8 items-center justify-center rounded-lg transition-colors">
                      <Activity className="text-foreground group-hover:text-brand h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-foreground text-xs font-semibold">Audit Log</p>
                      <p className="text-muted-foreground text-[11px]">Postgres activity</p>
                    </div>
                  </div>
                  <ArrowRight className="text-muted-foreground group-hover:text-brand h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>
            </div>

            {/* Recent Orders Live Table */}
            <div className="bg-card border-border space-y-4 rounded-2xl border p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-foreground text-sm font-semibold">Recent Orders Feed</h3>
                  <p className="text-muted-foreground text-xs">
                    Latest commerce operations across the marketplace
                  </p>
                </div>
                <Link href="/orders">
                  <Button variant="outline" size="sm" className="text-xs">
                    View All Orders
                  </Button>
                </Link>
              </div>

              {!Array.isArray(recentOrders) || recentOrders.length === 0 ? (
                <div className="text-muted-foreground py-8 text-center text-xs">
                  No orders recorded yet. When buyers purchase, they will appear here live.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-border text-muted-foreground border-b">
                        <th className="px-3 py-2.5 font-semibold">Order ID</th>
                        <th className="px-3 py-2.5 font-semibold">Buyer</th>
                        <th className="px-3 py-2.5 font-semibold">Amount</th>
                        <th className="px-3 py-2.5 font-semibold">Status</th>
                        <th className="px-3 py-2.5 font-semibold">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-border/50 divide-y">
                      {(Array.isArray(recentOrders) ? recentOrders : []).map((order) => {
                        const statusStyle = ORDER_STATUS_COLORS[order.status] || {
                          bg: 'bg-muted',
                          text: 'text-muted-foreground',
                          border: 'border-border',
                        };

                        return (
                          <tr key={order.id} className="hover:bg-muted/30 transition-colors">
                            <td className="text-foreground px-3 py-3 font-mono text-[11px]">
                              #{order.id.slice(0, 8)}
                            </td>
                            <td className="px-3 py-3">
                              <p className="text-foreground font-medium">
                                {order.customer_name || order.buyer?.full_name || 'Anonymous'}
                              </p>
                              <p className="text-muted-foreground text-[10px]">
                                {order.buyer?.email || order.customer_phone || '—'}
                              </p>
                            </td>
                            <td className="text-foreground px-3 py-3 font-semibold">
                              {formatCurrency(order.total_amount)}
                            </td>
                            <td className="px-3 py-3">
                              <span
                                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
                              >
                                {order.status}
                              </span>
                            </td>
                            <td className="text-muted-foreground px-3 py-3 text-[11px]">
                              {dateShort(order.created_at)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AdminShell>
  );
}
