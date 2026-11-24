'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Wallet,
  TrendingUp,
  Percent,
  CheckCircle2,
  Clock,
  ArrowDownToLine,
  RotateCcw,
  RefreshCw,
  Building2,
  ExternalLink,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/contexts/auth-context';
import { paymentApi } from '@/lib/api/payment';
import { storeApi } from '@/lib/api/store';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import clsx from '@/utils/clsx';

export default function SellerPayoutsPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [financials, setFinancials] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const load = async () => {
    if (!token) return;
    try {
      setIsLoading(true);
      setError(null);
      const [payoutsRes, statsRes] = await Promise.all([
        paymentApi.getPayouts(token, { page: 1, limit: 100 }),
        storeApi.getStoreStats(token).catch(() => null),
      ]);
      setItems(payoutsRes?.items || []);
      if (statsRes?.financials) {
        setFinancials(statsRes.financials);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load payouts.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [token]);

  const retryPayout = async (id: string) => {
    if (!token || retryingId) return;
    setRetryingId(id);
    setNotice(null);
    try {
      await paymentApi.retryPayout(token, id);
      setNotice({ type: 'success', text: 'Payout retry queued successfully.' });
      await load();
    } catch (err: any) {
      setNotice({ type: 'error', text: err.message || 'Failed to retry payout.' });
    } finally {
      setRetryingId(null);
    }
  };

  const settled = items.filter((p) => p.status === 'SUCCESS');
  const totalPaidOut = settled.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const pendingCount = items.filter(
    (p) => p.status === 'PENDING' || p.status === 'PROCESSING',
  ).length;

  const availableBalance = financials?.available_balance ?? 0;
  const totalWithdrawn = financials?.total_withdrawn ?? totalPaidOut;
  const totalPlatformFees = financials?.total_platform_fees ?? (totalWithdrawn / 0.96) * 0.04;

  return (
    <div className="w-full space-y-6">
      {/* Header & Sub-nav */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="space-y-1">
          <h1 className="text-foreground text-xl font-semibold tracking-tight sm:text-2xl">
            Disbursements &amp; Payouts
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm">
            Track bank and mobile money settlements · 96% net disbursements after 4% platform
            commission.
          </p>
        </div>

        {/* Quick Tabs to Transactions */}
        <div className="flex items-center gap-2">
          <Link href="/dashboard/transactions">
            <Button
              variant="secondary"
              size="sm"
              className="h-9 rounded-xl px-4 text-xs font-semibold"
            >
              Transactions
            </Button>
          </Link>
          <Link href="/dashboard/payouts">
            <Button
              size="sm"
              className="bg-primary text-primary-foreground h-9 rounded-xl px-4 text-xs font-semibold shadow-none"
            >
              Payouts
            </Button>
          </Link>
          <Button
            onClick={load}
            variant="secondary"
            size="sm"
            className="flex h-9 w-9 items-center justify-center rounded-xl p-0"
            title="Refresh Payouts"
          >
            <RefreshCw className={clsx('h-3.5 w-3.5', isLoading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* Notice Banner */}
      {notice && (
        <div
          className={clsx(
            'flex items-center justify-between rounded-2xl p-4 text-xs font-medium',
            notice.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-600'
              : 'bg-red-500/10 text-red-600',
          )}
        >
          <span>{notice.text}</span>
          <button onClick={() => setNotice(null)} className="text-[11px] underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Balances Grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card
          className="bg-surface/40 space-y-1.5 rounded-2xl border-0 p-5 shadow-none"
          hoverEffect={false}
        >
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
              Available Balance
            </span>
            <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-600">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <p className="font-mono text-xl font-bold text-emerald-600 dark:text-emerald-400">
            GH₵ {availableBalance.toFixed(2)}
          </p>
          <p className="text-muted-foreground text-[10px]">Ready for automated transfer</p>
        </Card>

        <Card
          className="bg-surface/40 space-y-1.5 rounded-2xl border-0 p-5 shadow-none"
          hoverEffect={false}
        >
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
              Total Disbursed (96%)
            </span>
            <div className="rounded-xl bg-blue-500/10 p-2 text-blue-600">
              <ArrowDownToLine className="h-4 w-4" />
            </div>
          </div>
          <p className="text-foreground font-mono text-xl font-bold">
            GH₵ {totalWithdrawn.toFixed(2)}
          </p>
          <p className="text-muted-foreground text-[10px]">Net paid to your bank/MoMo</p>
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
            GH₵ {totalPlatformFees.toFixed(2)}
          </p>
          <p className="text-muted-foreground text-[10px]">Total platform fee retained</p>
        </Card>

        <Card
          className="bg-surface/40 space-y-1.5 rounded-2xl border-0 p-5 shadow-none"
          hoverEffect={false}
        >
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
              Disbursements
            </span>
            <div className="rounded-xl bg-amber-500/10 p-2 text-amber-600">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <p className="text-foreground font-mono text-xl font-bold">{settled.length}</p>
          <p className="text-muted-foreground text-[10px]">
            {pendingCount > 0 ? `${pendingCount} pending queue` : 'All settled'}
          </p>
        </Card>
      </div>

      {/* Settlement Account Info Box */}
      <div className="bg-surface/30 flex flex-col justify-between gap-4 rounded-2xl border-0 p-5 shadow-none sm:flex-row sm:items-center">
        <div className="flex items-start gap-3 sm:items-center">
          <div className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-foreground text-xs font-semibold">
              Automated Paystack Settlements
            </h4>
            <p className="text-muted-foreground mt-0.5 text-[11px]">
              Net earnings are automatically credited to your linked Mobile Money or Bank account
              upon customer delivery confirmation.
            </p>
          </div>
        </div>
        <Link href="/dashboard/settings">
          <Button
            variant="secondary"
            size="sm"
            className="h-9 shrink-0 rounded-xl px-4 text-xs font-semibold"
          >
            Bank Settings
          </Button>
        </Link>
      </div>

      {/* Payouts History */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20">
          <Loader2 className="text-primary h-8 w-8 animate-spin" />
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
            Loading payout settlements...
          </p>
        </div>
      ) : error ? (
        <div className="space-y-3 rounded-3xl bg-red-500/10 p-8 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-red-500" />
          <p className="text-xs font-semibold text-red-600">{error}</p>
          <Button onClick={load} size="sm" variant="secondary" className="rounded-xl">
            Retry
          </Button>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-surface/20 space-y-3 rounded-3xl border-0 py-20 text-center">
          <Wallet className="text-muted-foreground/30 mx-auto h-12 w-12" />
          <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
            No payout settlements yet
          </p>
          <p className="text-muted-foreground text-[11px]">
            When customer orders are completed, automated disbursements and bank transfers will be
            recorded here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {items.map((payout, idx) => {
              const netAmount = Number(payout.amount || 0);
              const grossAmount = payout.gross_amount ?? Number((netAmount / 0.96).toFixed(2));
              const platformFee = payout.platform_fee ?? Number((grossAmount * 0.04).toFixed(2));

              return (
                <motion.div
                  key={payout.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ delay: idx * 0.02 }}
                  className="bg-surface/40 hover:bg-surface/60 space-y-3 rounded-2xl border-0 p-5 shadow-none transition-colors"
                >
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    {/* Left: Reference & Status */}
                    <div className="flex min-w-0 items-start gap-3">
                      <div
                        className={clsx(
                          'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                          payout.status === 'SUCCESS'
                            ? 'bg-emerald-500/10 text-emerald-600'
                            : payout.status === 'FAILED'
                              ? 'bg-red-500/10 text-red-600'
                              : 'bg-amber-500/10 text-amber-600',
                        )}
                      >
                        <ArrowDownToLine className="h-5 w-5" />
                      </div>

                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-foreground font-mono text-xs font-bold tracking-tight">
                            {payout.reference}
                          </span>

                          <span
                            className={clsx(
                              'rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider',
                              payout.status === 'SUCCESS'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                : payout.status === 'FAILED'
                                  ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
                            )}
                          >
                            {payout.status === 'SUCCESS' ? 'Disbursed' : payout.status}
                          </span>

                          <span className="bg-muted rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider">
                            {payout.mode === 'AUTO' ? 'Paystack Auto Split' : 'Manual Transfer'}
                          </span>
                        </div>

                        <p className="text-muted-foreground flex flex-wrap items-center gap-2 text-[11px]">
                          <span>
                            Date:{' '}
                            {new Date(payout.created_at).toLocaleDateString(undefined, {
                              dateStyle: 'medium',
                            })}
                          </span>
                          {payout.processed_at && (
                            <>
                              <span>•</span>
                              <span>
                                Completed: {new Date(payout.processed_at).toLocaleDateString()}
                              </span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Right: Net Disbursed & Retry */}
                    <div className="flex items-center justify-between gap-4 sm:justify-end">
                      <div className="space-y-0.5 text-right">
                        <span className="text-muted-foreground block text-[9px] font-semibold uppercase tracking-wider">
                          Net Payout (96%)
                        </span>
                        <span className="font-mono text-base font-bold text-emerald-600 dark:text-emerald-400">
                          GH₵ {netAmount.toFixed(2)}
                        </span>
                        <span className="text-muted-foreground block font-mono text-[10px]">
                          (Gross: GH₵{grossAmount.toFixed(2)} - 4% Fee: GH₵{platformFee.toFixed(2)})
                        </span>
                      </div>

                      {payout.status !== 'SUCCESS' && (
                        <Button
                          onClick={() => retryPayout(payout.id)}
                          disabled={retryingId === payout.id}
                          variant="secondary"
                          size="sm"
                          className="flex h-8 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold"
                        >
                          {retryingId === payout.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <RotateCcw className="h-3 w-3" />
                          )}
                          <span>Retry</span>
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Failure reason if any */}
                  {payout.failure_reason && (
                    <div className="flex items-center gap-1.5 pt-2 text-[11px] text-red-500">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>Issue: {payout.failure_reason}</span>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
