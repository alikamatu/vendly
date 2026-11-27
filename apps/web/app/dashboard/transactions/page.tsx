'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  CreditCard,
  Search,
  CheckCircle2,
  Clock,
  TrendingUp,
  Percent,
  Wallet,
  Banknote,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/contexts/auth-context';
import { paymentApi } from '@/lib/api/payment';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import clsx from '@/utils/clsx';

export default function SellerTransactionsPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SUCCESS' | 'PENDING' | 'FAILED'>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = async () => {
    if (!token) return;
    try {
      setIsLoading(true);
      setError(null);
      const res = await paymentApi.getTransactions(token, { page: 1, limit: 100 });
      setItems(res?.items || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load transactions.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [token]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const filteredItems = items.filter((tx) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      tx.reference?.toLowerCase().includes(q) ||
      tx.provider_ref?.toLowerCase().includes(q) ||
      tx.payer?.name?.toLowerCase().includes(q) ||
      tx.order?.customer_name?.toLowerCase().includes(q);

    const matchesStatus = statusFilter === 'ALL' || tx.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const successful = items.filter((t) => t.status === 'SUCCESS');
  const totalGross = successful.reduce(
    (sum, t) => sum + (t.gross_amount || Number(t.amount) || 0),
    0,
  );
  const totalFees = totalGross * 0.04;
  const totalNet = totalGross * 0.96;

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-20">
      {/* Header & Sub-nav */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <Link
              href="/dashboard"
              className="bg-surface/60 hover:bg-surface text-muted-foreground hover:text-foreground flex h-8 w-8 items-center justify-center rounded-xl transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-foreground text-xl font-bold uppercase tracking-tight">
              Transactions &amp; Fees
            </h1>
          </div>
          <p className="text-muted-foreground text-xs">
            Complete breakdown of sales revenue, 4% platform fees, and net payouts.
          </p>
        </div>

        {/* Quick Tabs to Payouts */}
        <div className="flex items-center gap-2">
          <Link href="/dashboard/transactions">
            <Button
              size="sm"
              className="bg-primary text-primary-foreground h-9 rounded-xl px-4 text-xs font-semibold shadow-none"
            >
              Transactions
            </Button>
          </Link>
          <Link href="/dashboard/payouts">
            <Button
              variant="secondary"
              size="sm"
              className="h-9 rounded-xl px-4 text-xs font-semibold"
            >
              Payouts
            </Button>
          </Link>
          <Button
            onClick={load}
            variant="secondary"
            size="sm"
            className="flex h-9 w-9 items-center justify-center rounded-xl p-0"
            title="Refresh Transactions"
          >
            <RefreshCw className={clsx('h-3.5 w-3.5', isLoading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* Financial Metrics Summary */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card
          className="bg-surface/40 space-y-1.5 rounded-2xl border-0 p-5 shadow-none"
          hoverEffect={false}
        >
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
              Net Earnings (96%)
            </span>
            <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-600">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <p className="font-mono text-xl font-bold text-emerald-600 dark:text-emerald-400">
            GH₵ {totalNet.toFixed(2)}
          </p>
          <p className="text-muted-foreground text-[10px]">Your actual take-home revenue</p>
        </Card>

        <Card
          className="bg-surface/40 space-y-1.5 rounded-2xl border-0 p-5 shadow-none"
          hoverEffect={false}
        >
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
              Gross Sales (100%)
            </span>
            <div className="rounded-xl bg-blue-500/10 p-2 text-blue-600">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <p className="text-foreground font-mono text-xl font-bold">GH₵ {totalGross.toFixed(2)}</p>
          <p className="text-muted-foreground text-[10px]">Total customer order sum</p>
        </Card>

        <Card
          className="bg-surface/40 space-y-1.5 rounded-2xl border-0 p-5 shadow-none"
          hoverEffect={false}
        >
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
              Platform Fee (4%)
            </span>
            <div className="rounded-xl bg-purple-500/10 p-2 text-purple-600">
              <Percent className="h-4 w-4" />
            </div>
          </div>
          <p className="font-mono text-xl font-bold text-purple-600 dark:text-purple-400">
            -GH₵ {totalFees.toFixed(2)}
          </p>
          <p className="text-muted-foreground text-[10px]">Automated platform commission</p>
        </Card>

        <Card
          className="bg-surface/40 space-y-1.5 rounded-2xl border-0 p-5 shadow-none"
          hoverEffect={false}
        >
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
              Completed Sales
            </span>
            <div className="rounded-xl bg-amber-500/10 p-2 text-amber-600">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <p className="text-foreground font-mono text-xl font-bold">{successful.length}</p>
          <p className="text-muted-foreground text-[10px]">Successfully processed orders</p>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col items-center justify-between gap-3 pt-2 sm:flex-row">
        <div className="relative w-full sm:w-80">
          <Search className="text-muted-foreground pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search Reference, Paystack ID, Customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-surface/60 text-foreground placeholder:text-muted-foreground focus:ring-primary/30 h-10 w-full rounded-xl border-0 pl-9 pr-4 text-xs font-medium outline-none focus:ring-1"
          />
        </div>

        <div className="w-full sm:w-48">
          <Select
            value={statusFilter}
            onChange={(val) => setStatusFilter(val as any)}
            options={[
              { value: 'ALL', label: 'All Statuses' },
              { value: 'SUCCESS', label: 'Success / Paid' },
              { value: 'PENDING', label: 'Pending Settlement' },
              { value: 'FAILED', label: 'Failed' },
            ]}
            size="sm"
          />
        </div>
      </div>

      {/* Transactions List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20">
          <Loader2 className="text-primary h-8 w-8 animate-spin" />
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
            Loading your transactions...
          </p>
        </div>
      ) : error ? (
        <div className="space-y-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-8 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-red-500" />
          <p className="text-xs font-semibold text-red-600">{error}</p>
          <Button onClick={load} size="sm" variant="secondary" className="rounded-xl">
            Retry
          </Button>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-surface/20 space-y-3 rounded-3xl border-0 py-20 text-center">
          <CreditCard className="text-muted-foreground/30 mx-auto h-12 w-12" />
          <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
            {searchQuery ? 'No matching transactions found' : 'No transactions recorded yet'}
          </p>
          <p className="text-muted-foreground text-[11px]">
            When buyers place orders in your store, their payment logs and 4% fee breakdowns will
            appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filteredItems.map((tx, idx) => {
              const gross = Number(tx.gross_amount ?? tx.amount ?? 0);
              const fee = Number(tx.platform_fee ?? (gross * 0.04).toFixed(2));
              const net = Number(tx.net_amount ?? (gross - fee).toFixed(2));
              const isCash = tx.provider === 'CASH' || tx.provider === 'CASH_ON_DELIVERY';
              const customerName = tx.payer?.name || tx.order?.customer_name || 'Customer';

              return (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ delay: idx * 0.02 }}
                  className="bg-surface/40 hover:bg-surface/60 space-y-3 rounded-2xl border-0 p-5 shadow-none transition-colors"
                >
                  <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                    {/* Channel & Reference */}
                    <div className="flex min-w-0 items-start gap-3">
                      <div
                        className={clsx(
                          'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                          tx.status === 'SUCCESS'
                            ? 'bg-emerald-500/10 text-emerald-600'
                            : tx.status === 'FAILED'
                              ? 'bg-red-500/10 text-red-600'
                              : 'bg-amber-500/10 text-amber-600',
                        )}
                      >
                        {isCash ? (
                          <Banknote className="h-5 w-5" />
                        ) : (
                          <CreditCard className="h-5 w-5" />
                        )}
                      </div>

                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-foreground font-mono text-xs font-bold tracking-tight">
                            {tx.reference}
                          </span>
                          <button
                            onClick={() => handleCopy(tx.reference, tx.id)}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            title="Copy Reference"
                          >
                            {copiedId === tx.id ? (
                              <Check className="h-3.5 w-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>

                          <span
                            className={clsx(
                              'rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider',
                              tx.status === 'SUCCESS'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                : tx.status === 'FAILED'
                                  ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
                            )}
                          >
                            {tx.status === 'SUCCESS' ? 'Paid' : tx.status}
                          </span>

                          <span
                            className={clsx(
                              'rounded-full px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider',
                              isCash
                                ? 'bg-amber-500/10 text-amber-600'
                                : 'bg-blue-500/10 text-blue-600',
                            )}
                          >
                            {isCash ? 'Cash on Delivery' : 'Paystack Online'}
                          </span>
                        </div>

                        <p className="text-muted-foreground flex flex-wrap items-center gap-2 text-[11px]">
                          <span>
                            Buyer:{' '}
                            <strong className="text-foreground font-medium">{customerName}</strong>
                          </span>
                          <span>•</span>
                          <span>
                            {new Date(tx.created_at).toLocaleDateString(undefined, {
                              dateStyle: 'medium',
                            })}
                          </span>
                          {tx.provider_ref && (
                            <>
                              <span>•</span>
                              <span>
                                Paystack ID:{' '}
                                <code className="text-foreground font-mono">{tx.provider_ref}</code>
                              </span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* 3-Way Financial Calculation: Gross - 4% = Net */}
                    <div className="border-border/30 flex items-center justify-between gap-4 border-t pt-3 sm:gap-6 lg:justify-end lg:border-t-0 lg:pt-0">
                      <div className="space-y-0.5 text-left lg:text-right">
                        <span className="text-muted-foreground block text-[9px] font-semibold uppercase tracking-wider">
                          Gross Order
                        </span>
                        <span className="text-foreground font-mono text-xs font-semibold">
                          GH₵ {gross.toFixed(2)}
                        </span>
                      </div>

                      <div className="space-y-0.5 rounded-xl bg-purple-500/10 px-3 py-1.5 text-left text-purple-600 lg:text-right dark:text-purple-400">
                        <span className="block text-[9px] font-bold uppercase tracking-wider">
                          4% Platform Fee
                        </span>
                        <span className="font-mono text-xs font-bold">-GH₵ {fee.toFixed(2)}</span>
                      </div>

                      <div className="space-y-0.5 text-right">
                        <span className="text-muted-foreground block text-[9px] font-semibold uppercase tracking-wider">
                          Net Earnings (96%)
                        </span>
                        <span className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">
                          +GH₵ {net.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Order linkage bar */}
                  <div className="border-border/30 text-muted-foreground flex items-center justify-between border-t pt-2.5 text-[11px]">
                    <div className="flex items-center gap-2">
                      <span>
                        Order:{' '}
                        <code className="text-foreground font-mono">
                          #ORD-{tx.order_id?.slice(-6)?.toUpperCase()}
                        </code>
                      </span>
                      {tx.payout && (
                        <>
                          <span>•</span>
                          <span>
                            Payout:{' '}
                            <strong className="text-foreground text-[10px] uppercase">
                              {tx.payout.status}
                            </strong>
                          </span>
                        </>
                      )}
                    </div>

                    <Link
                      href={`/dashboard/orders`}
                      className="text-primary inline-flex items-center gap-1 text-[11px] font-semibold hover:underline"
                    >
                      <span>View Orders</span>
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
