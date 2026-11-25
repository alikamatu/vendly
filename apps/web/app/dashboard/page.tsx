'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ShoppingBag,
  Package,
  Users,
  Plus,
  Clock,
  TrendingUp,
  Loader2,
  AlertCircle,
  Percent,
  Wallet,
  ArrowUpRight,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/contexts/auth-context';
import { storeApi } from '@/lib/api/store';
import { adminApi } from '@/lib/api/admin';
import ProFeaturesSection from '@/components/dashboard/ProFeaturesSection';
import VerndlyAiIcon from '@/components/ai/VerndlyAiIcon';

const IconMap: Record<string, React.ElementType> = {
  ShoppingBag,
  Package,
  Users,
  TrendingUp,
  Percent,
  Wallet,
};

const EASE_SMOOTH = [0.22, 1, 0.36, 1] as const;

interface DashboardStat {
  label: string;
  value: string | number;
  icon: string;
  color?: string;
  change?: string;
  isPositive?: boolean;
}

interface RecentOrder {
  id: string;
  customer: string;
  product: string;
  amount: string;
  date: string;
}

interface HotSalesRow {
  id: string;
  amount: number | string;
  status: string;
  reference: string;
  product: { title: string };
  seller: { store_name: string };
}

export default function DashboardPage() {
  const { user, token } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{
    stats: DashboardStat[];
    recentOrders: RecentOrder[];
  } | null>(null);
  const [hotSalesStats, setHotSalesStats] = useState<{
    totalSubscriptions: number;
    successfulSubscriptions: number;
    activeHotSalesProducts: number;
    totalRevenueGhs: number;
  } | null>(null);
  const [hotSalesRows, setHotSalesRows] = useState<HotSalesRow[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      if (!token) return;
      try {
        if (user?.role === 'ADMIN') {
          const [stats, rows] = await Promise.all([
            adminApi.getHotSalesStats(token),
            adminApi.getHotSalesSubscriptions(token, 1, 8),
          ]);
          setHotSalesStats(stats);
          setHotSalesRows(rows.data || []);
        } else {
          const statsData = await storeApi.getStoreStats(token);
          setData(statsData);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load dashboard metrics';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [token, user?.role]);

  if (isLoading) {
    return (
      <div className="flex h-[55vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="text-foreground h-6 w-6 animate-spin" />
          <p className="text-muted text-xs font-medium">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[55vh] items-center justify-center p-4 text-center">
        <div className="bg-surface w-full max-w-sm space-y-4 rounded-3xl p-6">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10">
            <AlertCircle className="h-6 w-6 text-red-500" />
          </div>
          <div className="space-y-1">
            <h3 className="text-foreground text-base font-semibold">Couldn&apos;t load metrics</h3>
            <p className="text-muted text-xs leading-relaxed">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="bg-foreground text-background h-10 w-full rounded-xl text-xs font-semibold transition-opacity hover:opacity-90"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const firstName = user?.full_name?.split(' ')[0] || 'Seller';

  return (
    <div className="w-full space-y-6 sm:space-y-8">
      {/* Greeting & Primary Actions — mobile-first stacked, desktop inline, zero borders */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-foreground text-2xl font-semibold tracking-tight sm:text-[28px]">
            Welcome back, {firstName}
          </h2>
          <p className="text-muted text-xs sm:text-sm">
            Real-time overview of your storefront performance and orders.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/dashboard/products/add"
            className="bg-foreground text-background group inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl px-4 text-xs font-semibold transition-opacity hover:opacity-90 sm:flex-none"
          >
            <Plus className="h-4 w-4 transition-transform duration-200 group-hover:rotate-90" />
            <span>Add Product</span>
          </Link>
          <Link
            href="/dashboard/payouts"
            className="bg-surface text-foreground hover:bg-foreground/[0.06] inline-flex h-10 items-center justify-center rounded-xl px-4 text-xs font-semibold transition-colors"
          >
            Payouts
          </Link>
          <Link
            href="/dashboard/transactions"
            className="bg-surface text-foreground hover:bg-foreground/[0.06] inline-flex h-10 items-center justify-center rounded-xl px-4 text-xs font-semibold transition-colors"
          >
            Transactions
          </Link>
        </div>
      </section>

      {/* KPI Metrics Grid */}
      {user?.role === 'ADMIN' && hotSalesStats ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {[
              { label: 'Total Subscriptions', value: hotSalesStats.totalSubscriptions },
              { label: 'Successful Payments', value: hotSalesStats.successfulSubscriptions },
              { label: 'Active Hot Sales', value: hotSalesStats.activeHotSalesProducts },
              {
                label: 'Revenue (GHS)',
                value: `GH₵ ${hotSalesStats.totalRevenueGhs.toFixed(2)}`,
              },
            ].map((stat, idx) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04, duration: 0.25, ease: EASE_SMOOTH }}
                className="bg-surface rounded-3xl p-4 sm:p-5"
              >
                <p className="text-muted text-xs font-medium">{stat.label}</p>
                <p className="text-foreground mt-2 text-xl font-semibold tracking-tight sm:text-2xl">
                  {stat.value}
                </p>
              </motion.div>
            ))}
          </div>

          <section className="bg-surface space-y-4 rounded-3xl p-5 sm:p-6">
            <h3 className="text-foreground text-sm font-semibold">Hot Sales Subscriptions</h3>
            <div className="space-y-2.5">
              {hotSalesRows.length > 0 ? (
                hotSalesRows.map((row) => (
                  <div
                    key={row.id}
                    className="bg-background flex items-center justify-between gap-3 rounded-2xl p-3.5"
                  >
                    <div className="min-w-0">
                      <p className="text-foreground truncate text-sm font-medium">
                        {row.product.title}
                      </p>
                      <p className="text-muted truncate text-xs">
                        {row.seller.store_name} · {row.reference}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-foreground text-sm font-semibold">GH₵ {row.amount}</p>
                      <p className="text-muted text-[11px] font-medium uppercase">{row.status}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted py-6 text-center text-xs">
                  No hot sales subscriptions yet.
                </p>
              )}
            </div>
          </section>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {data?.stats.map((stat, idx) => {
            const Icon = IconMap[stat.icon] || Package;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04, duration: 0.25, ease: EASE_SMOOTH }}
                className="bg-surface hover:bg-foreground/[0.04] rounded-3xl p-4 transition-colors sm:p-5"
              >
                <div className="mb-3.5 flex items-center justify-between gap-2">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                      stat.color || 'bg-background text-foreground'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  {stat.change && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        stat.isPositive
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'bg-red-500/10 text-red-500'
                      }`}
                    >
                      {stat.change}
                    </span>
                  )}
                </div>
                <p className="text-muted truncate text-xs font-medium">{stat.label}</p>
                <p className="text-foreground mt-1 truncate text-lg font-semibold tracking-tight sm:text-2xl">
                  {stat.value}
                </p>
              </motion.div>
            );
          })}
        </div>
      )}

      {user?.role === 'SELLER' && <ProFeaturesSection />}

      {/* Analytics & Recent Orders */}
      {user?.role !== 'ADMIN' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Analytics & Verndly AI Quick Launch */}
          <div className="space-y-4 lg:col-span-7 xl:col-span-8">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-foreground text-sm font-semibold">Growth &amp; Tools</h3>
              <Link
                href="/dashboard/analytics"
                className="text-muted hover:text-foreground inline-flex items-center gap-1 text-xs font-medium transition-colors"
              >
                <span>Open analytics</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Link
                href="/dashboard/analytics"
                className="bg-surface hover:bg-foreground/[0.05] group flex flex-col justify-between gap-6 rounded-3xl p-6 transition-colors"
              >
                <div className="bg-[var(--color-accent)]/12 flex h-11 w-11 items-center justify-center rounded-2xl text-[var(--color-accent)]">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-foreground text-base font-semibold">Store Analytics</h4>
                    <ArrowUpRight className="text-muted group-hover:text-foreground h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </div>
                  <p className="text-muted text-xs leading-relaxed">
                    Track revenue trends, conversion rate, top-performing items, and buyer
                    drop-offs.
                  </p>
                </div>
              </Link>

              <Link
                href="/dashboard/products/add"
                className="bg-surface hover:bg-foreground/[0.05] group flex flex-col justify-between gap-6 rounded-3xl p-6 transition-colors"
              >
                <VerndlyAiIcon size={44} />
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-foreground text-base font-semibold">
                      List with Verndly AI
                    </h4>
                    <ArrowUpRight className="text-muted group-hover:text-foreground h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </div>
                  <p className="text-muted text-xs leading-relaxed">
                    Drop multiple photos at once — Verndly AI groups products and drafts titles,
                    categories, and descriptions.
                  </p>
                </div>
              </Link>
            </div>
          </div>

          {/* Recent Orders */}
          <div className="space-y-4 lg:col-span-5 xl:col-span-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-foreground text-sm font-semibold">Recent Orders</h3>
              <Link
                href="/dashboard/orders"
                className="text-muted hover:text-foreground text-xs font-medium transition-colors"
              >
                See all
              </Link>
            </div>

            <div className="bg-surface rounded-3xl p-3 sm:p-4">
              {data?.recentOrders && data.recentOrders.length > 0 ? (
                <div className="space-y-2">
                  {data.recentOrders.map((order, idx) => (
                    <motion.div
                      key={order.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.08 + idx * 0.04, duration: 0.22, ease: EASE_SMOOTH }}
                    >
                      <Link
                        href={`/dashboard/orders/${order.id}`}
                        className="bg-background hover:bg-background/80 flex items-center justify-between gap-3 rounded-2xl p-3.5 transition-colors"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="bg-surface text-muted flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
                            <Clock className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-foreground truncate text-xs font-semibold">
                              {order.customer}
                            </p>
                            <p className="text-muted mt-0.5 truncate text-[11px]">
                              {order.product}
                            </p>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-foreground text-xs font-semibold">{order.amount}</p>
                          <p className="text-muted mt-0.5 text-[10px] font-medium">
                            {new Date(order.date).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </p>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                  <div className="bg-background text-muted flex h-11 w-11 items-center justify-center rounded-2xl">
                    <ShoppingBag className="h-5 w-5" />
                  </div>
                  <p className="text-foreground text-sm font-medium">No orders yet</p>
                  <p className="text-muted max-w-[220px] text-xs">
                    Your newest customer orders will show up here as soon as buyers check out.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
