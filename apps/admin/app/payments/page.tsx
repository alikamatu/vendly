'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  ArrowDownToLine,
  Wallet,
  Play,
  RefreshCw,
  Percent,
  RotateCcw,
  Copy,
  Check,
  Banknote,
  Zap,
  Layers,
} from 'lucide-react';
import { AdminShell } from '@/components/layout/AdminShell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Alert } from '@/components/ui/alert';
import { formatCurrency, dateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useConfirm } from '@/contexts/ConfirmContext';
import { VendlyPaymentService } from '@/services/payment.service';
import type { EnhancedTransaction, VendlyPayout, PromotionPayment } from '@/types/operations';

// ─── Tab type ────────────────────────────────────────────────────────────

type PaymentsTab = 'transactions' | 'payouts' | 'promotions';

// ─── Page component ──────────────────────────────────────────────────────

export default function PaymentsPage() {
  const [activeTab, setActiveTab] = useState<PaymentsTab>('transactions');

  return (
    <AdminShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-foreground text-xl font-bold tracking-tight sm:text-2xl">
              Payments & Ledger
            </h2>
            <p className="text-muted-foreground mt-0.5 text-xs sm:text-sm">
              Financial auditing, payout management, and promotion revenue tracking.
            </p>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="bg-muted/50 border-border flex w-fit items-center gap-1 rounded-[var(--radius-lg)] border p-1">
          {(
            [
              { key: 'transactions', label: 'Transactions', icon: CreditCard },
              { key: 'payouts', label: 'Payouts', icon: ArrowDownToLine },
              { key: 'promotions', label: 'Promotions', icon: Zap },
            ] as const
          ).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={cn(
                'relative flex cursor-pointer items-center gap-1.5 rounded-[var(--radius-md)] px-4 py-2 text-xs font-medium transition-all',
                activeTab === key
                  ? 'bg-card text-foreground border-border border shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'transactions' && <TransactionsTab />}
            {activeTab === 'payouts' && <PayoutsTab />}
            {activeTab === 'promotions' && <PromotionsTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </AdminShell>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// ── TRANSACTIONS TAB ─────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════

function TransactionsTab() {
  const { confirm } = useConfirm();
  const [transactions, setTransactions] = useState<EnhancedTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SUCCESS' | 'PENDING' | 'FAILED'>('ALL');
  const [reconcilingId, setReconcilingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await VendlyPaymentService.getTransactions({ page: 1, limit: 100 });
      setTransactions(res.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load transactions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleCopy = (text: string, id: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleReconcile = async (id: string, status: string) => {
    const ok = await confirm({
      title: 'Reconcile Transaction',
      description: `Are you sure you want to manually reconcile this transaction status to ${status}?`,
      details: `Transaction ID: ${id} → Status: ${status}`,
      confirmText: `Reconcile to ${status}`,
      variant: status === 'FAILED' ? 'danger' : 'warning',
    });
    if (!ok) return;
    setReconcilingId(id);
    setNotice(null);
    try {
      await VendlyPaymentService.reconcileTransaction(id, status);
      setNotice({ kind: 'success', text: `Transaction updated to ${status}.` });
      await fetchData();
    } catch (err: unknown) {
      setNotice({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Reconciliation failed.',
      });
    } finally {
      setReconcilingId(null);
    }
  };

  const filtered = transactions.filter((t) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      t.reference?.toLowerCase().includes(q) ||
      t.provider_ref?.toLowerCase().includes(q) ||
      t.payer?.name?.toLowerCase().includes(q) ||
      t.receiver?.store_name?.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'ALL' || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const successTxs = transactions.filter((t) => t.status === 'SUCCESS');
  const pendingTxs = transactions.filter((t) => t.status === 'PENDING');
  const totalGross = successTxs.reduce((a, t) => a + Number(t.gross_amount ?? t.amount ?? 0), 0);
  const platformFees = totalGross * 0.04;
  const netVendor = totalGross * 0.96;
  const pendingVolume = pendingTxs.reduce((a, t) => a + Number(t.gross_amount ?? t.amount ?? 0), 0);

  const stats = [
    {
      label: 'Gross Volume (GMV)',
      value: formatCurrency(totalGross),
      icon: TrendingUp,
      color: 'text-blue-500',
    },
    {
      label: 'Platform Revenue (4%)',
      value: formatCurrency(platformFees),
      icon: Percent,
      color: 'text-emerald-500',
    },
    {
      label: 'Vendor Payouts (96%)',
      value: formatCurrency(netVendor),
      icon: Wallet,
      color: 'text-purple-500',
    },
    {
      label: 'Pending Volume',
      value: formatCurrency(pendingVolume),
      icon: Clock,
      color: 'text-amber-500',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-card border-border rounded-xl border p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-widest">
                {stat.label}
              </p>
              <div className={cn('bg-muted/60 rounded-lg p-1.5', stat.color)}>
                <stat.icon className="h-3.5 w-3.5" />
              </div>
            </div>
            <p className="text-foreground text-lg font-bold tracking-tight">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-64">
          <Search className="text-muted-foreground absolute left-3 top-2.5 h-4 w-4" />
          <input
            type="text"
            placeholder="Search reference, store..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-muted border-border focus:ring-primary/20 h-9 w-full rounded-[var(--radius-md)] border pl-9 pr-3 text-xs transition-all focus:outline-none focus:ring-2"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="bg-muted border-border h-9 cursor-pointer rounded-[var(--radius-md)] border px-3 text-xs font-medium focus:outline-none"
        >
          <option value="ALL">All Statuses</option>
          <option value="SUCCESS">Success</option>
          <option value="PENDING">Pending</option>
          <option value="FAILED">Failed</option>
        </select>
        <Button variant="outline" size="sm" onClick={() => void fetchData()} className="gap-1.5">
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Notice */}
      {notice && (
        <Alert variant={notice.kind === 'success' ? 'success' : 'error'} dismissible>
          {notice.text}
        </Alert>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center gap-2 py-20">
          <Spinner size="lg" className="text-brand" />
          <p className="text-muted-foreground text-xs">Loading transactions...</p>
        </div>
      ) : error ? (
        <div className="border-destructive/20 bg-destructive/5 rounded-xl border border-dashed py-12 text-center">
          <AlertCircle className="text-destructive/40 mx-auto mb-3 h-8 w-8" />
          <p className="text-destructive mb-4 text-sm">{error}</p>
          <Button variant="outline" size="sm" onClick={() => void fetchData()}>
            Try Again
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="border-border rounded-xl border border-dashed py-16 text-center">
          <CreditCard className="text-muted-foreground/20 mx-auto mb-3 h-10 w-10" />
          <p className="text-muted-foreground text-xs">
            {search ? 'No matching transactions found' : 'No transactions recorded yet'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((tx) => {
            const gross = Number(tx.gross_amount ?? tx.amount ?? 0);
            const fee = Number(tx.platform_fee ?? (gross * 0.04).toFixed(2));
            const net = Number(tx.net_amount ?? (gross - fee).toFixed(2));
            const isCash = tx.provider === 'CASH' || tx.provider === 'CASH_ON_DELIVERY';

            return (
              <div
                key={tx.id}
                className={cn(
                  'bg-card hover:bg-muted/30 space-y-3 rounded-xl border p-4 transition-all',
                  tx.status === 'SUCCESS'
                    ? 'border-emerald-500/20'
                    : tx.status === 'FAILED'
                      ? 'border-rose-500/20'
                      : 'border-border',
                )}
              >
                {/* Row 1: Reference + Status + Parties + Amounts */}
                <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                  {/* Left: Identifier */}
                  <div className="flex min-w-0 items-start gap-3">
                    <div
                      className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border',
                        tx.status === 'SUCCESS'
                          ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500'
                          : tx.status === 'FAILED'
                            ? 'border-rose-500/20 bg-rose-500/10 text-rose-500'
                            : 'border-amber-500/20 bg-amber-500/10 text-amber-500',
                      )}
                    >
                      {isCash ? (
                        <Banknote className="h-4 w-4" />
                      ) : (
                        <CreditCard className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-foreground font-mono text-xs font-bold">
                          {tx.reference}
                        </span>
                        <button
                          onClick={() => handleCopy(tx.reference, tx.id)}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          title="Copy reference"
                        >
                          {copiedId === tx.id ? (
                            <Check className="h-3 w-3 text-emerald-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                        <Badge
                          variant={
                            tx.status === 'SUCCESS'
                              ? 'success'
                              : tx.status === 'FAILED'
                                ? 'danger'
                                : 'warning'
                          }
                          dot
                        >
                          {tx.status}
                        </Badge>
                        <Badge variant={isCash ? 'warning' : 'info'}>
                          {isCash ? 'Cash on Delivery' : 'Paystack'}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground flex items-center gap-2 text-[11px]">
                        <span>{dateTime(tx.created_at)}</span>
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

                  {/* Middle: Parties */}
                  {(tx.payer || tx.receiver) && (
                    <div className="border-border/40 grid grid-cols-2 gap-4 text-xs lg:border-x lg:px-6">
                      <div>
                        <p className="text-muted-foreground text-[9px] font-semibold uppercase tracking-wider">
                          Buyer
                        </p>
                        <p className="text-foreground truncate font-medium">
                          {tx.payer?.name || 'Customer'}
                        </p>
                        <p className="text-muted-foreground truncate text-[10px]">
                          {tx.payer?.phone || ''}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-[9px] font-semibold uppercase tracking-wider">
                          Seller Store
                        </p>
                        <p className="text-primary truncate font-medium">
                          {tx.receiver?.store_name || 'Store'}
                        </p>
                        <p className="text-muted-foreground truncate font-mono text-[10px]">
                          {tx.receiver?.subaccount ? `Sub: ${tx.receiver.subaccount}` : 'Direct'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Right: Financial split */}
                  <div className="flex items-center gap-3 text-right">
                    <div>
                      <p className="text-muted-foreground text-[9px] font-semibold uppercase tracking-wider">
                        Gross
                      </p>
                      <p className="text-foreground font-mono text-sm font-bold">
                        {formatCurrency(gross)}
                      </p>
                    </div>
                    <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-emerald-600 dark:text-emerald-400">
                      <p className="text-[9px] font-bold uppercase tracking-wider">4% Fee</p>
                      <p className="font-mono text-xs font-bold">+{formatCurrency(fee)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-[9px] font-semibold uppercase tracking-wider">
                        Net
                      </p>
                      <p className="text-primary font-mono text-sm font-bold">
                        {formatCurrency(net)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Row 2: Admin actions */}
                <div className="border-border/40 text-muted-foreground flex items-center justify-between border-t pt-2.5 text-xs">
                  <div className="flex items-center gap-2">
                    {tx.order_id && (
                      <span>
                        Order:{' '}
                        <code className="text-foreground font-mono text-[11px]">{tx.order_id}</code>
                      </span>
                    )}
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
                  <div className="flex items-center gap-2">
                    {tx.status !== 'SUCCESS' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void handleReconcile(tx.id, 'SUCCESS')}
                        disabled={reconcilingId === tx.id}
                        className="h-7 border-emerald-500/30 px-2.5 text-[10px] text-emerald-600 hover:bg-emerald-500/10"
                      >
                        {reconcilingId === tx.id ? 'Updating...' : 'Mark Succeeded'}
                      </Button>
                    )}
                    {tx.status !== 'FAILED' && tx.status !== 'SUCCESS' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void handleReconcile(tx.id, 'FAILED')}
                        disabled={reconcilingId === tx.id}
                        className="h-7 border-rose-500/30 px-2.5 text-[10px] text-rose-600 hover:bg-rose-500/10"
                      >
                        {reconcilingId === tx.id ? 'Updating...' : 'Mark Failed'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// ── PAYOUTS TAB ──────────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════

function PayoutsTab() {
  const { confirm } = useConfirm();
  const [payouts, setPayouts] = useState<VendlyPayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'ALL' | 'SUCCESS' | 'PENDING' | 'FAILED' | 'PROCESSING'
  >('ALL');
  const [runningQueue, setRunningQueue] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [settlingId, setSettlingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await VendlyPaymentService.getPayouts({ page: 1, limit: 100 });
      setPayouts(res.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load payouts.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const runQueue = async () => {
    if (runningQueue) return;
    const ok = await confirm({
      title: 'Process Payout Queue',
      description:
        'Are you sure you want to process all pending vendor payouts now via Paystack? This will trigger automated disbursements to sellers bank accounts.',
      confirmText: 'Execute Payouts Now',
      variant: 'warning',
      icon: 'alert',
    });
    if (!ok) return;
    setRunningQueue(true);
    setNotice(null);
    try {
      const res = await VendlyPaymentService.runPayoutQueue();
      const count = res?.processed ?? 0;
      setNotice({
        kind: 'success',
        text: `Payout queue processed: ${count} disbursements executed.`,
      });
      await fetchData();
    } catch (err: unknown) {
      setNotice({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Failed to run payout queue.',
      });
    } finally {
      setRunningQueue(false);
    }
  };

  const retryPayout = async (id: string) => {
    if (retryingId) return;
    const ok = await confirm({
      title: 'Retry Vendor Payout',
      description: 'Re-queue this failed payout for immediate transfer attempt?',
      details: `Payout ID: ${id}`,
      confirmText: 'Retry Payout',
      variant: 'info',
    });
    if (!ok) return;
    setRetryingId(id);
    setNotice(null);
    try {
      await VendlyPaymentService.retryPayout(id);
      setNotice({ kind: 'success', text: 'Payout retry successfully queued.' });
      await fetchData();
    } catch (err: unknown) {
      setNotice({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Failed to retry payout.',
      });
    } finally {
      setRetryingId(null);
    }
  };

  const settlePayout = async (id: string) => {
    if (settlingId) return;
    const ok = await confirm({
      title: 'Process Manual Payout',
      description:
        'Are you sure you want to process this payout via Paystack Transfers API? Funds will be sent to the merchant immediately.',
      details: `Payout ID: ${id}`,
      confirmText: 'Process Transfer',
      variant: 'success',
      icon: 'check',
    });
    if (!ok) return;
    setSettlingId(id);
    setNotice(null);
    try {
      await VendlyPaymentService.settlePayout(id);
      setNotice({ kind: 'success', text: 'Payout settled and receipt email sent to the seller.' });
      await fetchData();
    } catch (err: unknown) {
      setNotice({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Failed to settle payout.',
      });
    } finally {
      setSettlingId(null);
    }
  };

  const filtered = payouts.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      p.reference?.toLowerCase().includes(q) ||
      p.seller?.store_name?.toLowerCase().includes(q) ||
      p.seller?.bank_name?.toLowerCase().includes(q) ||
      p.seller?.account_number?.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'ALL' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const settled = payouts.filter((p) => p.status === 'SUCCESS');
  const pending = payouts.filter((p) => p.status === 'PENDING' || p.status === 'PROCESSING');
  const failed = payouts.filter((p) => p.status === 'FAILED');
  const totalPaidOut = settled.reduce((a, p) => a + Number(p.amount || 0), 0);
  const pendingVolume = pending.reduce((a, p) => a + Number(p.amount || 0), 0);
  const retained = settled.reduce(
    (a, p) => a + (p.platform_fee || (Number(p.amount || 0) / 0.96) * 0.04),
    0,
  );

  const stats = [
    {
      label: 'Total Paid Out (96%)',
      value: formatCurrency(totalPaidOut),
      icon: TrendingUp,
      color: 'text-emerald-500',
    },
    {
      label: 'Pending in Queue',
      value: formatCurrency(pendingVolume),
      icon: Clock,
      color: 'text-amber-500',
    },
    {
      label: 'Platform Retained (4%)',
      value: formatCurrency(retained),
      icon: Percent,
      color: 'text-purple-500',
    },
    {
      label: 'Failed Disbursements',
      value: failed.length.toString(),
      icon: AlertCircle,
      color: 'text-rose-500',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-card border-border rounded-xl border p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-widest">
                {stat.label}
              </p>
              <div className={cn('bg-muted/60 rounded-lg p-1.5', stat.color)}>
                <stat.icon className="h-3.5 w-3.5" />
              </div>
            </div>
            <p className="text-foreground text-lg font-bold tracking-tight">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-64">
          <Search className="text-muted-foreground absolute left-3 top-2.5 h-4 w-4" />
          <input
            type="text"
            placeholder="Search reference, store, bank..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-muted border-border focus:ring-primary/20 h-9 w-full rounded-[var(--radius-md)] border pl-9 pr-3 text-xs transition-all focus:outline-none focus:ring-2"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="bg-muted border-border h-9 cursor-pointer rounded-[var(--radius-md)] border px-3 text-xs font-medium focus:outline-none"
        >
          <option value="ALL">All Statuses</option>
          <option value="SUCCESS">Completed</option>
          <option value="PENDING">Pending</option>
          <option value="PROCESSING">Processing</option>
          <option value="FAILED">Failed</option>
        </select>
        <Button
          variant="primary"
          size="sm"
          onClick={() => void runQueue()}
          disabled={runningQueue || pending.length === 0}
          className="gap-1.5"
        >
          {runningQueue ? (
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Play className="h-3.5 w-3.5" />
          )}
          Run Queue ({pending.length})
        </Button>
        <Button variant="outline" size="sm" onClick={() => void fetchData()} className="gap-1.5">
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Notice */}
      {notice && (
        <Alert variant={notice.kind === 'success' ? 'success' : 'error'} dismissible>
          {notice.text}
        </Alert>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center gap-2 py-20">
          <Spinner size="lg" className="text-brand" />
          <p className="text-muted-foreground text-xs">Loading payouts...</p>
        </div>
      ) : error ? (
        <div className="border-destructive/20 bg-destructive/5 rounded-xl border border-dashed py-12 text-center">
          <AlertCircle className="text-destructive/40 mx-auto mb-3 h-8 w-8" />
          <p className="text-destructive mb-4 text-sm">{error}</p>
          <Button variant="outline" size="sm" onClick={() => void fetchData()}>
            Try Again
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="border-border rounded-xl border border-dashed py-16 text-center">
          <Wallet className="text-muted-foreground/20 mx-auto mb-3 h-10 w-10" />
          <p className="text-muted-foreground text-xs">
            {search ? 'No matching payouts found' : 'No payout settlements recorded yet'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => {
            const netAmount = Number(p.amount || 0);
            const grossAmount = p.gross_amount ?? Number((netAmount / 0.96).toFixed(2));
            const platformFee = p.platform_fee ?? Number((grossAmount * 0.04).toFixed(2));

            return (
              <div
                key={p.id}
                className={cn(
                  'bg-card hover:bg-muted/30 space-y-3 rounded-xl border p-4 transition-all',
                  p.status === 'SUCCESS'
                    ? 'border-emerald-500/20'
                    : p.status === 'FAILED'
                      ? 'border-rose-500/20'
                      : 'border-border',
                )}
              >
                <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                  {/* Left: Identification */}
                  <div className="flex min-w-0 items-start gap-3">
                    <div
                      className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border',
                        p.status === 'SUCCESS'
                          ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500'
                          : p.status === 'FAILED'
                            ? 'border-rose-500/20 bg-rose-500/10 text-rose-500'
                            : 'border-amber-500/20 bg-amber-500/10 text-amber-500',
                      )}
                    >
                      <ArrowDownToLine className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-foreground font-mono text-xs font-bold">
                          {p.reference}
                        </span>
                        <Badge
                          variant={
                            p.status === 'SUCCESS'
                              ? 'success'
                              : p.status === 'FAILED'
                                ? 'danger'
                                : 'warning'
                          }
                          dot
                        >
                          {p.status}
                        </Badge>
                        <Badge variant="default">
                          {p.mode === 'AUTO'
                            ? 'Paystack Subaccount (Auto)'
                            : 'Direct Transfer (Manual)'}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground flex flex-wrap items-center gap-2 text-[11px]">
                        <span>
                          Store:{' '}
                          <strong className="text-primary font-medium">
                            {p.seller?.store_name || 'Vendor'}
                          </strong>
                        </span>
                        <span>•</span>
                        <span>
                          {p.seller?.bank_name || 'Bank/MoMo'}:{' '}
                          <code className="text-foreground font-mono">
                            {p.seller?.account_number || '---'}
                          </code>
                        </span>
                        <span>•</span>
                        <span>{dateTime(p.created_at)}</span>
                      </p>
                    </div>
                  </div>

                  {/* Right: Amount + Actions */}
                  <div className="flex items-center justify-between gap-4 lg:justify-end">
                    <div className="space-y-0.5 text-right">
                      <p className="text-muted-foreground text-[9px] font-semibold uppercase tracking-wider">
                        Net Disbursed (96%)
                      </p>
                      <p className="font-mono text-base font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(netAmount)}
                      </p>
                      <p className="text-muted-foreground font-mono text-[10px]">
                        (Gross: {formatCurrency(grossAmount)} − Fee: {formatCurrency(platformFee)})
                      </p>
                    </div>

                    {p.status === 'FAILED' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void retryPayout(p.id)}
                        disabled={retryingId === p.id}
                        isLoading={retryingId === p.id}
                        className="gap-1.5 border-rose-500/30 text-rose-600 hover:bg-rose-500/10"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Retry
                      </Button>
                    )}

                    {(p.status === 'PENDING' || p.status === 'PROCESSING') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void settlePayout(p.id)}
                        disabled={settlingId === p.id}
                        isLoading={settlingId === p.id}
                        className="gap-1.5 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        Settle & Send Receipt
                      </Button>
                    )}

                    {p.status === 'SUCCESS' && (
                      <Badge variant="success" dot>
                        Receipt Sent
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Failure reason or linked transaction */}
                {(p.failure_reason || p.transaction) && (
                  <div className="border-border/40 text-muted-foreground flex items-center justify-between border-t pt-2.5 text-[11px]">
                    {p.failure_reason ? (
                      <p className="flex items-center gap-1 text-rose-500">
                        <AlertCircle className="h-3 w-3" />
                        Reason: {p.failure_reason}
                      </p>
                    ) : (
                      <p>
                        Linked Transaction:{' '}
                        <code className="text-foreground font-mono">
                          {p.transaction?.reference}
                        </code>
                      </p>
                    )}
                    {p.processed_at && <span>Processed: {dateTime(p.processed_at)}</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// ── PROMOTIONS TAB ───────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════

function PromotionsTab() {
  const [promotions, setPromotions] = useState<PromotionPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SUCCESS' | 'PENDING' | 'FAILED'>('ALL');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await VendlyPaymentService.getPromotions({ page: 1, limit: 100 });
      setPromotions(res.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load promotions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const filtered = promotions.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q || p.reference?.toLowerCase().includes(q) || p.product?.title?.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'ALL' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const successPromos = promotions.filter((p) => p.status === 'SUCCESS');
  const promoRevenue = successPromos.reduce((a, p) => a + Number(p.amount || 0), 0);
  const activeBoosts = successPromos.filter((p) => p.category === 'BOOST').length;
  const planSubs = successPromos.filter((p) => p.category === 'PLAN').length;
  const pendingCount = promotions.filter((p) => p.status === 'PENDING').length;

  const stats = [
    {
      label: 'Promotion Revenue',
      value: formatCurrency(promoRevenue),
      icon: TrendingUp,
      color: 'text-amber-500',
    },
    { label: 'Active Boosts', value: activeBoosts.toString(), icon: Zap, color: 'text-orange-500' },
    {
      label: 'Plan Subscriptions',
      value: planSubs.toString(),
      icon: Layers,
      color: 'text-blue-500',
    },
    {
      label: 'Pending Approval',
      value: pendingCount.toString(),
      icon: Clock,
      color: 'text-primary',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-card border-border rounded-xl border p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-widest">
                {stat.label}
              </p>
              <div className={cn('bg-muted/60 rounded-lg p-1.5', stat.color)}>
                <stat.icon className="h-3.5 w-3.5" />
              </div>
            </div>
            <p className="text-foreground text-lg font-bold tracking-tight">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-64">
          <Search className="text-muted-foreground absolute left-3 top-2.5 h-4 w-4" />
          <input
            type="text"
            placeholder="Search reference or product..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-muted border-border focus:ring-primary/20 h-9 w-full rounded-[var(--radius-md)] border pl-9 pr-3 text-xs transition-all focus:outline-none focus:ring-2"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="bg-muted border-border h-9 cursor-pointer rounded-[var(--radius-md)] border px-3 text-xs font-medium focus:outline-none"
        >
          <option value="ALL">All Statuses</option>
          <option value="SUCCESS">Success</option>
          <option value="PENDING">Pending</option>
          <option value="FAILED">Failed</option>
        </select>
        <Button variant="outline" size="sm" onClick={() => void fetchData()} className="gap-1.5">
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center gap-2 py-20">
          <Spinner size="lg" className="text-brand" />
          <p className="text-muted-foreground text-xs">Loading promotions...</p>
        </div>
      ) : error ? (
        <div className="border-destructive/20 bg-destructive/5 rounded-xl border border-dashed py-12 text-center">
          <AlertCircle className="text-destructive/40 mx-auto mb-3 h-8 w-8" />
          <p className="text-destructive mb-4 text-sm">{error}</p>
          <Button variant="outline" size="sm" onClick={() => void fetchData()}>
            Try Again
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="border-border rounded-xl border border-dashed py-16 text-center">
          <Zap className="text-muted-foreground/20 mx-auto mb-3 h-10 w-10" />
          <p className="text-muted-foreground text-xs">
            {search ? 'No matching promotion records found' : 'No promotion activity recorded'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((promo) => (
            <div
              key={promo.id}
              className={cn(
                'bg-card hover:bg-muted/30 rounded-xl border p-4 transition-all',
                promo.status === 'SUCCESS'
                  ? 'border-amber-500/20'
                  : promo.status === 'FAILED'
                    ? 'border-rose-500/20'
                    : 'border-border',
              )}
            >
              <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                {/* Left: Product & Category */}
                <div className="flex min-w-0 shrink-0 items-center gap-3 lg:w-[40%]">
                  <div
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border',
                      promo.category === 'BOOST'
                        ? 'border-orange-500/20 bg-orange-500/10 text-orange-500'
                        : 'border-blue-500/20 bg-blue-500/10 text-blue-500',
                    )}
                  >
                    {promo.category === 'BOOST' ? (
                      <Zap className="h-4 w-4" />
                    ) : (
                      <Layers className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <h3 className="text-foreground truncate text-sm font-medium">
                        {promo.product?.title || 'Unknown Product'}
                      </h3>
                      <Badge
                        variant={
                          promo.status === 'SUCCESS'
                            ? 'success'
                            : promo.status === 'FAILED'
                              ? 'danger'
                              : 'warning'
                        }
                        dot
                      >
                        {promo.status}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground text-[11px] uppercase tracking-wide">
                      {promo.category} • REF: {promo.reference}
                    </p>
                  </div>
                </div>

                {/* Middle: Details */}
                <div className="flex items-center gap-6 text-xs">
                  <div>
                    <p className="text-muted-foreground mb-1 text-[9px] font-semibold uppercase tracking-wider">
                      Payment Date
                    </p>
                    <p className="text-foreground">{dateTime(promo.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1 text-[9px] font-semibold uppercase tracking-wider">
                      Method
                    </p>
                    <p className="text-foreground text-[10px] uppercase tracking-widest">
                      {promo.provider || 'PAYSTACK'}
                    </p>
                  </div>
                  {promo.paid_at && (
                    <div>
                      <p className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-emerald-500/80">
                        Confirmed
                      </p>
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                        {dateTime(promo.paid_at)}
                      </p>
                    </div>
                  )}
                </div>

                {/* Right: Amount */}
                <div className="text-right">
                  <p className="text-muted-foreground mb-1 text-[9px] font-semibold uppercase tracking-wider">
                    Revenue
                  </p>
                  <p className="font-mono text-lg font-bold text-amber-500">
                    {formatCurrency(promo.amount)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
