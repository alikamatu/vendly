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
  Building2,
  PauseCircle,
  PlayCircle,
  Ban,
  Plus,
  Mail,
  ShieldAlert,
  Undo2,
  X,
  Download,
  Terminal,
  Settings2,
  Unlock,
  Eye,
  Pencil,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { AdminShell } from '@/components/layout/AdminShell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Alert } from '@/components/ui/alert';
import { formatCurrency, dateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useConfirm } from '@/contexts/ConfirmContext';
import {
  VendlyPaymentService,
  type SellerSubaccountRow,
  type PaystackBalanceInfo,
} from '@/services/payment.service';
import type { EnhancedTransaction, VendlyPayout, PromotionPayment } from '@/types/operations';
import {
  WalletsAndLedgerTab,
  RefundsTab,
  WebhookLogsTab,
  PaymentRulesModal,
  exportRowsToCsv,
} from '@/components/payments/PaymentsAdvancedTabs';

type PaymentsTab =
  | 'transactions'
  | 'payouts'
  | 'wallets'
  | 'refunds'
  | 'subaccounts'
  | 'promotions'
  | 'logs';

const GHANA_PROVIDERS = [
  { code: 'MTN', name: 'MTN Mobile Money' },
  { code: 'VOD', name: 'Telecel Cash' },
  { code: 'ATL', name: 'AirtelTigo Money' },
  { code: '040100', name: 'GCB Bank' },
  { code: '130100', name: 'Ecobank Ghana' },
  { code: '280100', name: 'Fidelity Bank' },
  { code: '190100', name: 'Stanbic Bank' },
  { code: '120100', name: 'Zenith Bank' },
  { code: '140100', name: 'CalBank' },
  { code: '030100', name: 'Absa Bank Ghana' },
  { code: '110100', name: 'GTBank Ghana' },
  { code: '210100', name: 'Access Bank Ghana' },
  { code: '080100', name: 'UBA Ghana' },
];

export default function PaymentsPage() {
  const [activeTab, setActiveTab] = useState<PaymentsTab>('transactions');
  const [paystackBalance, setPaystackBalance] = useState<PaystackBalanceInfo | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);

  const loadBalance = useCallback(async () => {
    setBalanceLoading(true);
    try {
      const info = await VendlyPaymentService.getPaystackBalance();
      setPaystackBalance(info);
    } catch {
      setPaystackBalance(null);
    } finally {
      setBalanceLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBalance();
  }, [loadBalance]);

  return (
    <AdminShell>
      <div className="space-y-6">
        {/* Header + Live Paystack Balance + Payment Rules */}
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <h2 className="text-foreground text-xl font-bold tracking-tight sm:text-2xl">
              Full Payment Command Center
            </h2>
            <p className="text-muted-foreground mt-0.5 text-xs sm:text-sm">
              Complete Super Admin control over Paystack transactions, escrow, seller wallets,
              master ledger, payouts, refunds, subaccounts, promotions, and webhooks.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="bg-card border-border flex items-center gap-2.5 rounded-xl border px-3.5 py-2 text-xs">
              <div>
                <p className="text-muted-foreground text-[9px] font-semibold uppercase tracking-wider">
                  Paystack Balance
                </p>
                {paystackBalance?.live && paystackBalance.available !== null ? (
                  <p className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(paystackBalance.available, paystackBalance.currency)}
                  </p>
                ) : (
                  <p className="text-muted-foreground text-[11px]">
                    {balanceLoading ? 'Checking…' : 'Unavailable'}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => void loadBalance()}
                title="Refresh live Paystack balance"
                className="text-muted-foreground hover:text-foreground rounded-lg p-1"
              >
                <RefreshCw className={cn('h-3.5 w-3.5', balanceLoading && 'animate-spin')} />
              </button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setRulesOpen(true)}
              className="h-10 gap-1.5"
            >
              <Settings2 className="h-3.5 w-3.5" />
              Payment Rules
            </Button>
          </div>
        </div>

        {/* 7-Tab Navigation */}
        <div className="bg-muted/50 border-border flex w-full flex-wrap items-center gap-1 rounded-[var(--radius-lg)] border p-1 sm:w-fit">
          {(
            [
              { key: 'transactions', label: 'Transactions', icon: CreditCard },
              { key: 'payouts', label: 'Payouts', icon: ArrowDownToLine },
              { key: 'wallets', label: 'Wallets & Ledger', icon: Wallet },
              { key: 'refunds', label: 'Refunds', icon: Undo2 },
              { key: 'subaccounts', label: 'Subaccounts', icon: Building2 },
              { key: 'promotions', label: 'Promotions', icon: Zap },
              { key: 'logs', label: 'Webhook Logs', icon: Terminal },
            ] as const
          ).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={cn(
                'relative flex cursor-pointer items-center gap-1.5 rounded-[var(--radius-md)] px-3.5 py-2 text-xs font-medium transition-all',
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
            {activeTab === 'wallets' && <WalletsAndLedgerTab />}
            {activeTab === 'refunds' && <RefundsTab />}
            {activeTab === 'subaccounts' && <SubaccountsTab />}
            {activeTab === 'promotions' && <PromotionsTab />}
            {activeTab === 'logs' && <WebhookLogsTab />}
          </motion.div>
        </AnimatePresence>

        <PaymentRulesModal open={rulesOpen} onClose={() => setRulesOpen(false)} />
      </div>
    </AdminShell>
  );
}

/* ─── Modal Wrapper ───────────────────────────────────────────────────── */

function AdminModal({
  open,
  title,
  subtitle,
  onClose,
  maxWidth = 'max-w-md',
  children,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  maxWidth?: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div
        className={cn(
          'bg-card border-border max-h-[90vh] w-full overflow-y-auto rounded-2xl border p-5 shadow-2xl',
          maxWidth,
        )}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-foreground text-sm font-bold">{title}</h3>
            {subtitle && <p className="text-muted-foreground mt-0.5 text-xs">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground rounded-lg p-1 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ─── 1. Transactions Tab ─────────────────────────────────────────────── */

function TransactionsTab() {
  const { confirm } = useConfirm();
  const [transactions, setTransactions] = useState<EnhancedTransaction[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'ALL' | 'SUCCESS' | 'PENDING' | 'FAILED' | 'REFUNDED'
  >('ALL');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  // Refund & Inspect modals
  const [refundTarget, setRefundTarget] = useState<EnhancedTransaction | null>(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [refundLoading, setRefundLoading] = useState(false);

  const [inspectTx, setInspectTx] = useState<any | null>(null);
  const [inspectLoading, setInspectLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await VendlyPaymentService.getTransactions({
        page,
        limit: 50,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
      });
      setTransactions(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages || 1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load transactions.');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleCopy = (text: string, id: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleVerifyPaystack = async (tx: EnhancedTransaction) => {
    setBusyId(tx.id);
    setNotice(null);
    try {
      const res = await VendlyPaymentService.verifyTransactionWithPaystack(tx.id);
      setNotice({
        kind: 'success',
        text: `Live Paystack verification for ${tx.reference}: gateway status = ${res.verification?.status || 'checked'}.`,
      });
      await fetchData();
    } catch (err: unknown) {
      setNotice({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Live Paystack verification failed.',
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleReleaseEscrow = async (tx: EnhancedTransaction) => {
    if (!tx.order_id) return;
    const ok = await confirm({
      title: 'Release Order Escrow Immediately',
      description:
        'Release funds from pending escrow to seller available balance and queue payout now (skipping any remaining inspection window)?',
      details: `Order: ${tx.order_id} · Ref: ${tx.reference}`,
      confirmText: 'Release Escrow Now',
      variant: 'warning',
    });
    if (!ok) return;
    setBusyId(tx.id);
    setNotice(null);
    try {
      const res = await VendlyPaymentService.releaseOrderEscrow(tx.order_id);
      setNotice({ kind: 'success', text: res.message || 'Escrow released to seller.' });
      await fetchData();
    } catch (err: unknown) {
      setNotice({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Escrow release failed.',
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleInspect = async (tx: EnhancedTransaction) => {
    setInspectLoading(true);
    setInspectTx(tx);
    try {
      const detail = await VendlyPaymentService.getTransactionById(tx.id);
      setInspectTx(detail || tx);
    } catch {
      // keep basic tx data
    } finally {
      setInspectLoading(false);
    }
  };

  const handleReconcile = async (id: string, status: string) => {
    const ok = await confirm({
      title: 'Reconcile Transaction',
      description: `Manually force-update this transaction status to ${status}?`,
      details: `Transaction ID: ${id} → Status: ${status}`,
      confirmText: `Reconcile to ${status}`,
      variant: status === 'FAILED' ? 'danger' : 'warning',
    });
    if (!ok) return;
    setBusyId(id);
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
      setBusyId(null);
    }
  };

  const openRefundModal = (tx: EnhancedTransaction) => {
    const gross = Number(tx.gross_amount ?? tx.amount ?? 0);
    setRefundTarget(tx);
    setRefundAmount(gross > 0 ? String(gross) : '');
    setRefundReason('');
  };

  const submitRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundTarget) return;
    const gross = Number(refundTarget.gross_amount ?? refundTarget.amount ?? 0);
    const parsed = refundAmount.trim() ? Number(refundAmount) : undefined;
    if (parsed !== undefined && (Number.isNaN(parsed) || parsed <= 0 || parsed > gross)) {
      setNotice({
        kind: 'error',
        text: `Refund amount must be between GH₵0.01 and ${formatCurrency(gross)}.`,
      });
      return;
    }

    setRefundLoading(true);
    setNotice(null);
    try {
      await VendlyPaymentService.refundTransaction(refundTarget.id, {
        amount: parsed && parsed < gross ? parsed : undefined,
        reason: refundReason.trim() || 'Super Admin refund',
      });
      setNotice({
        kind: 'success',
        text: `Refund initiated for transaction ${refundTarget.reference}.`,
      });
      setRefundTarget(null);
      await fetchData();
    } catch (err: unknown) {
      setNotice({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Failed to issue refund.',
      });
    } finally {
      setRefundLoading(false);
    }
  };

  const filtered = transactions.filter((t) => {
    const q = search.toLowerCase();
    return (
      !q ||
      t.reference?.toLowerCase().includes(q) ||
      t.provider_ref?.toLowerCase().includes(q) ||
      t.payer?.name?.toLowerCase().includes(q) ||
      t.receiver?.store_name?.toLowerCase().includes(q) ||
      t.order_id?.toLowerCase().includes(q)
    );
  });

  const successTxs = transactions.filter((t) => t.status === 'SUCCESS');
  const pendingTxs = transactions.filter((t) => t.status === 'PENDING');
  const totalGross = successTxs.reduce((a, t) => a + Number(t.gross_amount ?? t.amount ?? 0), 0);
  const platformFees = totalGross * 0.04;
  const netVendor = totalGross * 0.96;
  const pendingVolume = pendingTxs.reduce((a, t) => a + Number(t.gross_amount ?? t.amount ?? 0), 0);

  const stats = [
    {
      label: 'Page Gross Volume',
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
      label: 'Vendor Share (96%)',
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
            placeholder="Search reference, order, store..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-muted border-border focus:ring-primary/20 h-9 w-full rounded-[var(--radius-md)] border pl-9 pr-3 text-xs transition-all focus:outline-none focus:ring-2"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as typeof statusFilter);
            setPage(1);
          }}
          className="bg-muted border-border h-9 cursor-pointer rounded-[var(--radius-md)] border px-3 text-xs font-medium focus:outline-none"
        >
          <option value="ALL">All Statuses</option>
          <option value="SUCCESS">Success</option>
          <option value="PENDING">Pending</option>
          <option value="FAILED">Failed</option>
          <option value="REFUNDED">Refunded</option>
        </select>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            exportRowsToCsv(
              `verndly-transactions-p${page}.csv`,
              ['Date', 'Reference', 'Provider', 'Status', 'Gross', 'Buyer', 'Store', 'Order ID'],
              filtered.map((t) => [
                t.created_at,
                t.reference,
                t.provider,
                t.status,
                t.gross_amount ?? t.amount,
                t.payer?.name || '',
                t.receiver?.store_name || '',
                t.order_id || '',
              ]),
            )
          }
          className="gap-1.5"
        >
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </Button>
        <Button variant="outline" size="sm" onClick={() => void fetchData()} className="gap-1.5">
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          Refresh
        </Button>
        <span className="text-muted-foreground ml-auto text-xs">{total} total</span>
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
            const isBusy = busyId === tx.id;

            return (
              <div
                key={tx.id}
                className={cn(
                  'bg-card hover:bg-muted/30 space-y-3 rounded-xl border p-4 transition-all',
                  tx.status === 'SUCCESS'
                    ? 'border-emerald-500/20'
                    : tx.status === 'FAILED'
                      ? 'border-rose-500/20'
                      : tx.status === 'REFUNDED'
                        ? 'border-purple-500/20'
                        : 'border-border',
                )}
              >
                {/* Row 1 */}
                <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                  <div className="flex min-w-0 items-start gap-3">
                    <div
                      className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border',
                        tx.status === 'SUCCESS'
                          ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500'
                          : tx.status === 'FAILED'
                            ? 'border-rose-500/20 bg-rose-500/10 text-rose-500'
                            : tx.status === 'REFUNDED'
                              ? 'border-purple-500/20 bg-purple-500/10 text-purple-500'
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
                                : tx.status === 'REFUNDED'
                                  ? 'default'
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

                {/* Row 2: Super Admin actions */}
                <div className="border-border/40 text-muted-foreground flex flex-wrap items-center justify-between gap-2 border-t pt-2.5 text-xs">
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
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void handleInspect(tx)}
                      className="h-7 gap-1 px-2 text-[10px]"
                    >
                      <Eye className="h-3 w-3" />
                      Inspect
                    </Button>
                    {!isCash && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void handleVerifyPaystack(tx)}
                        disabled={isBusy}
                        className="h-7 gap-1 border-blue-500/30 px-2 text-[10px] text-blue-600 hover:bg-blue-500/10"
                      >
                        <ShieldCheck className="h-3 w-3" />
                        Verify Paystack
                      </Button>
                    )}
                    {tx.status === 'SUCCESS' && tx.order_id && !tx.payout && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void handleReleaseEscrow(tx)}
                        disabled={isBusy}
                        className="h-7 gap-1 border-emerald-500/30 px-2 text-[10px] text-emerald-600 hover:bg-emerald-500/10"
                      >
                        <Unlock className="h-3 w-3" />
                        Release Escrow
                      </Button>
                    )}
                    {tx.status === 'SUCCESS' && !isCash && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openRefundModal(tx)}
                        className="h-7 gap-1 border-purple-500/30 px-2.5 text-[10px] text-purple-600 hover:bg-purple-500/10"
                      >
                        <Undo2 className="h-3 w-3" />
                        Refund
                      </Button>
                    )}
                    {tx.status !== 'SUCCESS' && tx.status !== 'REFUNDED' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void handleReconcile(tx.id, 'SUCCESS')}
                        disabled={isBusy}
                        className="h-7 border-emerald-500/30 px-2 text-[10px] text-emerald-600 hover:bg-emerald-500/10"
                      >
                        Mark Succeeded
                      </Button>
                    )}
                    {tx.status !== 'FAILED' &&
                      tx.status !== 'SUCCESS' &&
                      tx.status !== 'REFUNDED' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void handleReconcile(tx.id, 'FAILED')}
                          disabled={isBusy}
                          className="h-7 border-rose-500/30 px-2 text-[10px] text-rose-600 hover:bg-rose-500/10"
                        >
                          Mark Failed
                        </Button>
                      )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 text-xs">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span>
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Inspect Transaction Modal */}
      <AdminModal
        open={Boolean(inspectTx)}
        title={`Transaction ${inspectTx?.reference || ''}`}
        subtitle={inspectTx ? `Status: ${inspectTx.status} · Provider: ${inspectTx.provider}` : ''}
        maxWidth="max-w-2xl"
        onClose={() => setInspectTx(null)}
      >
        {inspectLoading ? (
          <div className="flex justify-center py-8">
            <Spinner size="md" />
          </div>
        ) : (
          <pre className="bg-muted border-border max-h-[60vh] overflow-auto rounded-xl border p-3 font-mono text-[11px] leading-relaxed">
            {inspectTx ? JSON.stringify(inspectTx, null, 2) : ''}
          </pre>
        )}
      </AdminModal>

      {/* Refund Modal */}
      <AdminModal
        open={Boolean(refundTarget)}
        title="Issue Paystack Refund"
        subtitle={
          refundTarget
            ? `Ref: ${refundTarget.reference} · Max: ${formatCurrency(Number(refundTarget.gross_amount ?? refundTarget.amount ?? 0))}`
            : undefined
        }
        onClose={() => !refundLoading && setRefundTarget(null)}
      >
        <form onSubmit={(e) => void submitRefund(e)} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider">
              Refund Amount (GH₵) — leave full for full refund
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              className="bg-muted border-border h-9 w-full rounded-lg border px-3 font-mono text-xs focus:outline-none"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider">
              Audit Reason
            </label>
            <textarea
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              placeholder="e.g. Order disputed and resolved in buyer's favour"
              rows={3}
              required
              className="bg-muted border-border w-full rounded-lg border p-2.5 text-xs focus:outline-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={refundLoading}
              onClick={() => setRefundTarget(null)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={refundLoading}>
              Confirm Refund
            </Button>
          </div>
        </form>
      </AdminModal>
    </div>
  );
}

/* ─── 2. Payouts Tab (Full Super Admin Control + Bulk Ops) ────────────── */

function PayoutsTab() {
  const { confirm } = useConfirm();
  const [payouts, setPayouts] = useState<VendlyPayout[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'ALL' | 'SUCCESS' | 'PENDING' | 'FAILED' | 'PROCESSING' | 'ON_HOLD'
  >('ALL');
  const [runningQueue, setRunningQueue] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  // Action Modals
  const [holdTarget, setHoldTarget] = useState<VendlyPayout | null>(null);
  const [holdReason, setHoldReason] = useState('');

  const [cancelTarget, setCancelTarget] = useState<VendlyPayout | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const [offlineTarget, setOfflineTarget] = useState<VendlyPayout | null>(null);
  const [offlineRef, setOfflineRef] = useState('');
  const [offlineNote, setOfflineNote] = useState('');

  // Create Manual Payout Modal
  const [createOpen, setCreateOpen] = useState(false);
  const [stores, setStores] = useState<SellerSubaccountRow[]>([]);
  const [storesLoading, setStoresLoading] = useState(false);
  const [selectedSellerId, setSelectedSellerId] = useState('');
  const [manualAmount, setManualAmount] = useState('');
  const [manualReason, setManualReason] = useState('');
  const [executeNow, setExecuteNow] = useState(false);
  const [modalSubmitting, setModalSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await VendlyPaymentService.getPayouts({
        page,
        limit: 50,
        status: statusFilter === 'ALL' || statusFilter === 'ON_HOLD' ? undefined : statusFilter,
      });
      setPayouts(res.data);
      setTotalPages(res.totalPages || 1);
      setSelectedIds([]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load payouts.');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const openCreateModal = async () => {
    setCreateOpen(true);
    if (stores.length > 0) return;
    setStoresLoading(true);
    try {
      const res = await VendlyPaymentService.getSubaccounts({ page: 1, limit: 200 });
      setStores(res.data);
      const firstConfigured = res.data.find((s) => s.bank_code && s.account_number);
      if (firstConfigured) setSelectedSellerId(firstConfigured.seller_id);
    } catch {
      // Handled inline
    } finally {
      setStoresLoading(false);
    }
  };

  const runQueue = async () => {
    if (runningQueue) return;
    const ok = await confirm({
      title: 'Process Payout Queue',
      description:
        'Process all eligible (non-held) pending vendor payouts now via Paystack Transfers API? Payouts currently ON HOLD will be automatically skipped.',
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

  const runBulkPayoutAction = async (action: 'settle' | 'hold' | 'release') => {
    if (!selectedIds.length || bulkBusy) return;
    const ok = await confirm({
      title: `Bulk ${action.toUpperCase()} (${selectedIds.length} payouts)`,
      description: `Apply "${action}" to ${selectedIds.length} selected payout(s)?`,
      confirmText: `Confirm ${action}`,
      variant: action === 'hold' ? 'warning' : 'info',
    });
    if (!ok) return;

    setBulkBusy(true);
    setNotice(null);
    let okCount = 0;
    let failCount = 0;
    for (const id of selectedIds) {
      try {
        if (action === 'settle') await VendlyPaymentService.settlePayout(id);
        else if (action === 'hold') await VendlyPaymentService.holdPayout(id, 'Bulk admin hold');
        else await VendlyPaymentService.releasePayoutHold(id);
        okCount++;
      } catch {
        failCount++;
      }
    }
    setNotice({
      kind: failCount > 0 && okCount === 0 ? 'error' : 'success',
      text: `Bulk ${action}: ${okCount} succeeded${failCount > 0 ? `, ${failCount} skipped/failed` : ''}.`,
    });
    setBulkBusy(false);
    await fetchData();
  };

  const retryPayout = async (id: string) => {
    if (busyId) return;
    const ok = await confirm({
      title: 'Retry Vendor Payout',
      description: 'Re-queue this failed payout for immediate transfer attempt?',
      details: `Payout ID: ${id}`,
      confirmText: 'Retry Payout',
      variant: 'info',
    });
    if (!ok) return;
    setBusyId(id);
    setNotice(null);
    try {
      await VendlyPaymentService.retryPayout(id);
      setNotice({ kind: 'success', text: 'Payout retry successfully triggered.' });
      await fetchData();
    } catch (err: unknown) {
      setNotice({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Failed to retry payout.',
      });
    } finally {
      setBusyId(null);
    }
  };

  const settlePayout = async (id: string) => {
    if (busyId) return;
    const ok = await confirm({
      title: 'Execute Paystack Transfer',
      description:
        'Send funds immediately to the seller bank/MoMo account via Paystack Transfers API and email the receipt?',
      details: `Payout ID: ${id}`,
      confirmText: 'Transfer Now',
      variant: 'success',
      icon: 'check',
    });
    if (!ok) return;
    setBusyId(id);
    setNotice(null);
    try {
      await VendlyPaymentService.settlePayout(id);
      setNotice({ kind: 'success', text: 'Payout transferred via Paystack and receipt sent.' });
      await fetchData();
    } catch (err: unknown) {
      setNotice({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Failed to settle payout.',
      });
    } finally {
      setBusyId(null);
    }
  };

  const releaseHold = async (id: string) => {
    if (busyId) return;
    setBusyId(id);
    setNotice(null);
    try {
      await VendlyPaymentService.releasePayoutHold(id);
      setNotice({ kind: 'success', text: 'Payout hold released — eligible for disbursement.' });
      await fetchData();
    } catch (err: unknown) {
      setNotice({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Failed to release hold.',
      });
    } finally {
      setBusyId(null);
    }
  };

  const resendReceipt = async (id: string) => {
    if (busyId) return;
    setBusyId(id);
    setNotice(null);
    try {
      const res = await VendlyPaymentService.resendPayoutReceipt(id);
      setNotice({ kind: 'success', text: res.message || 'Receipt email re-sent.' });
    } catch (err: unknown) {
      setNotice({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Failed to resend receipt.',
      });
    } finally {
      setBusyId(null);
    }
  };

  const submitHold = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holdTarget || !holdReason.trim()) return;
    setModalSubmitting(true);
    setNotice(null);
    try {
      await VendlyPaymentService.holdPayout(holdTarget.id, holdReason.trim());
      setNotice({ kind: 'success', text: `Payout ${holdTarget.reference} placed ON HOLD.` });
      setHoldTarget(null);
      setHoldReason('');
      await fetchData();
    } catch (err: unknown) {
      setNotice({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Failed to place payout on hold.',
      });
    } finally {
      setModalSubmitting(false);
    }
  };

  const submitCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelTarget || !cancelReason.trim()) return;
    setModalSubmitting(true);
    setNotice(null);
    try {
      await VendlyPaymentService.cancelPayout(cancelTarget.id, cancelReason.trim());
      setNotice({ kind: 'success', text: `Payout ${cancelTarget.reference} cancelled.` });
      setCancelTarget(null);
      setCancelReason('');
      await fetchData();
    } catch (err: unknown) {
      setNotice({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Failed to cancel payout.',
      });
    } finally {
      setModalSubmitting(false);
    }
  };

  const submitOfflineSettle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!offlineTarget) return;
    setModalSubmitting(true);
    setNotice(null);
    try {
      await VendlyPaymentService.markPayoutSettledOffline(offlineTarget.id, {
        external_ref: offlineRef.trim() || undefined,
        note: offlineNote.trim() || undefined,
      });
      setNotice({
        kind: 'success',
        text: `Payout ${offlineTarget.reference} marked settled offline and receipt emailed.`,
      });
      setOfflineTarget(null);
      setOfflineRef('');
      setOfflineNote('');
      await fetchData();
    } catch (err: unknown) {
      setNotice({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Failed to mark payout settled offline.',
      });
    } finally {
      setModalSubmitting(false);
    }
  };

  const submitManualCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(manualAmount);
    if (!selectedSellerId || Number.isNaN(amt) || amt <= 0 || !manualReason.trim()) return;
    setModalSubmitting(true);
    setNotice(null);
    try {
      await VendlyPaymentService.createManualPayout({
        seller_id: selectedSellerId,
        amount: amt,
        reason: manualReason.trim(),
        execute_now: executeNow,
      });
      setNotice({
        kind: 'success',
        text: executeNow
          ? 'Manual payout created and dispatched via Paystack.'
          : 'Manual payout created and queued as PENDING.',
      });
      setCreateOpen(false);
      setManualAmount('');
      setManualReason('');
      setExecuteNow(false);
      await fetchData();
    } catch (err: unknown) {
      setNotice({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Failed to create manual payout.',
      });
    } finally {
      setModalSubmitting(false);
    }
  };

  const filtered = payouts.filter((p) => {
    const q = search.toLowerCase();
    const isHeld = Boolean(p.metadata?.on_hold);
    const matchSearch =
      !q ||
      p.reference?.toLowerCase().includes(q) ||
      p.seller?.store_name?.toLowerCase().includes(q) ||
      p.seller?.bank_name?.toLowerCase().includes(q) ||
      p.seller?.account_number?.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'ON_HOLD' ? isHeld : true;
    return matchSearch && matchStatus;
  });

  const settled = payouts.filter((p) => p.status === 'SUCCESS');
  const pendingEligible = payouts.filter(
    (p) => (p.status === 'PENDING' || p.status === 'PROCESSING') && !p.metadata?.on_hold,
  );
  const onHoldCount = payouts.filter((p) => Boolean(p.metadata?.on_hold)).length;
  const failed = payouts.filter((p) => p.status === 'FAILED');
  const totalPaidOut = settled.reduce((a, p) => a + Number(p.amount || 0), 0);
  const pendingVolume = pendingEligible.reduce((a, p) => a + Number(p.amount || 0), 0);

  const stats = [
    {
      label: 'Total Paid Out',
      value: formatCurrency(totalPaidOut),
      icon: TrendingUp,
      color: 'text-emerald-500',
    },
    {
      label: 'Ready in Queue',
      value: formatCurrency(pendingVolume),
      icon: Clock,
      color: 'text-amber-500',
    },
    {
      label: 'Payouts On Hold',
      value: onHoldCount.toString(),
      icon: PauseCircle,
      color: 'text-orange-500',
    },
    {
      label: 'Failed / Cancelled',
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
          onChange={(e) => {
            setStatusFilter(e.target.value as typeof statusFilter);
            setPage(1);
          }}
          className="bg-muted border-border h-9 cursor-pointer rounded-[var(--radius-md)] border px-3 text-xs font-medium focus:outline-none"
        >
          <option value="ALL">All Statuses</option>
          <option value="SUCCESS">Completed</option>
          <option value="PENDING">Pending</option>
          <option value="PROCESSING">Processing</option>
          <option value="ON_HOLD">On Hold</option>
          <option value="FAILED">Failed / Cancelled</option>
        </select>
        <Button
          variant="primary"
          size="sm"
          onClick={() => void runQueue()}
          disabled={runningQueue || pendingEligible.length === 0}
          className="gap-1.5"
        >
          {runningQueue ? (
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Play className="h-3.5 w-3.5" />
          )}
          Run Queue ({pendingEligible.length})
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void openCreateModal()}
          className="gap-1.5 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10"
        >
          <Plus className="h-3.5 w-3.5" />
          Create Manual Payout
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            exportRowsToCsv(
              `verndly-payouts-p${page}.csv`,
              ['Date', 'Reference', 'Store', 'Bank', 'Account', 'Net Amount', 'Status', 'Mode'],
              filtered.map((p) => [
                p.created_at,
                p.reference,
                p.seller?.store_name || '',
                p.seller?.bank_name || '',
                p.seller?.account_number || '',
                p.amount,
                p.status,
                p.mode || '',
              ]),
            )
          }
          className="gap-1.5"
        >
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </Button>
        <Button variant="outline" size="sm" onClick={() => void fetchData()} className="gap-1.5">
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Bulk Bar */}
      {selectedIds.length > 0 && (
        <div className="bg-card border-primary/40 flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3 text-xs">
          <div className="flex items-center gap-2">
            <Badge variant="info">{selectedIds.length} payout(s) selected</Badge>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="text-muted-foreground underline"
            >
              Clear
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Button
              size="sm"
              variant="outline"
              disabled={bulkBusy}
              onClick={() => void runBulkPayoutAction('settle')}
              className="h-7 border-emerald-500/30 px-2.5 text-[11px] text-emerald-600"
            >
              Batch Paystack Transfer
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={bulkBusy}
              onClick={() => void runBulkPayoutAction('hold')}
              className="h-7 border-orange-500/30 px-2.5 text-[11px] text-orange-600"
            >
              Batch Hold
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={bulkBusy}
              onClick={() => void runBulkPayoutAction('release')}
              className="h-7 px-2.5 text-[11px]"
            >
              Batch Release Hold
            </Button>
          </div>
        </div>
      )}

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
            const isHeld = Boolean(p.metadata?.on_hold);
            const isCancelled = Boolean(p.metadata?.cancelled);
            const isOffline = Boolean(p.metadata?.settled_offline);
            const isBusy = busyId === p.id;
            const isSelected = selectedIds.includes(p.id);

            return (
              <div
                key={p.id}
                className={cn(
                  'bg-card hover:bg-muted/30 space-y-3 rounded-xl border p-4 transition-all',
                  isSelected
                    ? 'border-primary/50'
                    : isHeld
                      ? 'border-orange-500/40'
                      : p.status === 'SUCCESS'
                        ? 'border-emerald-500/20'
                        : p.status === 'FAILED'
                          ? 'border-rose-500/20'
                          : 'border-border',
                )}
              >
                <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                  {/* Left: Checkbox + Identification */}
                  <div className="flex min-w-0 items-start gap-3">
                    {p.status !== 'SUCCESS' && !isCancelled && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() =>
                          setSelectedIds((prev) =>
                            prev.includes(p.id) ? prev.filter((x) => x !== p.id) : [...prev, p.id],
                          )
                        }
                        className="mt-2.5 h-3.5 w-3.5 cursor-pointer rounded"
                      />
                    )}
                    <div
                      className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border',
                        isHeld
                          ? 'border-orange-500/30 bg-orange-500/10 text-orange-500'
                          : p.status === 'SUCCESS'
                            ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500'
                            : p.status === 'FAILED'
                              ? 'border-rose-500/20 bg-rose-500/10 text-rose-500'
                              : 'border-amber-500/20 bg-amber-500/10 text-amber-500',
                      )}
                    >
                      {isHeld ? (
                        <PauseCircle className="h-4 w-4" />
                      ) : (
                        <ArrowDownToLine className="h-4 w-4" />
                      )}
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
                          {isCancelled ? 'CANCELLED' : p.status}
                        </Badge>
                        {isHeld && (
                          <Badge variant="warning" dot>
                            ON HOLD
                          </Badge>
                        )}
                        {isOffline && <Badge variant="info">Settled Offline</Badge>}
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

                  {/* Right: Amount */}
                  <div className="space-y-0.5 text-left lg:text-right">
                    <p className="text-muted-foreground text-[9px] font-semibold uppercase tracking-wider">
                      Net Disbursed
                    </p>
                    <p className="font-mono text-base font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(netAmount)}
                    </p>
                    <p className="text-muted-foreground font-mono text-[10px]">
                      (Gross: {formatCurrency(grossAmount)} − Fee: {formatCurrency(platformFee)})
                    </p>
                  </div>
                </div>

                {/* Super Admin Action Bar */}
                <div className="border-border/40 flex flex-wrap items-center justify-between gap-2 border-t pt-2.5 text-[11px]">
                  <div className="text-muted-foreground flex flex-wrap items-center gap-2">
                    {isHeld && p.metadata?.hold_reason && (
                      <span className="flex items-center gap-1 font-medium text-orange-500">
                        <ShieldAlert className="h-3 w-3" />
                        Hold: {String(p.metadata.hold_reason)}
                      </span>
                    )}
                    {p.failure_reason && (
                      <span className="flex items-center gap-1 text-rose-500">
                        <AlertCircle className="h-3 w-3" />
                        {p.failure_reason}
                      </span>
                    )}
                    {isOffline && p.metadata?.settled_offline_ref && (
                      <span>
                        Offline Ref:{' '}
                        <code className="text-foreground font-mono">
                          {String(p.metadata.settled_offline_ref)}
                        </code>
                      </span>
                    )}
                    {p.transaction?.reference && !p.failure_reason && (
                      <span>
                        Tx:{' '}
                        <code className="text-foreground font-mono">{p.transaction.reference}</code>
                      </span>
                    )}
                    {p.processed_at && <span>• Processed: {dateTime(p.processed_at)}</span>}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {p.status === 'FAILED' && !isCancelled && !isHeld && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void retryPayout(p.id)}
                        disabled={isBusy}
                        isLoading={isBusy}
                        className="h-7 gap-1 border-rose-500/30 px-2.5 text-[10px] text-rose-600 hover:bg-rose-500/10"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Retry
                      </Button>
                    )}

                    {(p.status === 'PENDING' || p.status === 'PROCESSING') && !isHeld && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void settlePayout(p.id)}
                        disabled={isBusy}
                        isLoading={isBusy}
                        className="h-7 gap-1 border-emerald-500/30 px-2.5 text-[10px] text-emerald-600 hover:bg-emerald-500/10"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        Paystack Transfer
                      </Button>
                    )}

                    {p.status !== 'SUCCESS' && !isCancelled && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setOfflineTarget(p);
                          setOfflineRef('');
                          setOfflineNote('');
                        }}
                        disabled={isBusy}
                        className="h-7 gap-1 border-blue-500/30 px-2.5 text-[10px] text-blue-600 hover:bg-blue-500/10"
                      >
                        <Banknote className="h-3 w-3" />
                        Mark Settled Offline
                      </Button>
                    )}

                    {(p.status === 'PENDING' || p.status === 'FAILED') &&
                      !isCancelled &&
                      (isHeld ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void releaseHold(p.id)}
                          disabled={isBusy}
                          className="h-7 gap-1 border-emerald-500/30 px-2.5 text-[10px] text-emerald-600 hover:bg-emerald-500/10"
                        >
                          <PlayCircle className="h-3 w-3" />
                          Release Hold
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setHoldTarget(p);
                            setHoldReason('');
                          }}
                          disabled={isBusy}
                          className="h-7 gap-1 border-orange-500/30 px-2.5 text-[10px] text-orange-600 hover:bg-orange-500/10"
                        >
                          <PauseCircle className="h-3 w-3" />
                          Hold
                        </Button>
                      ))}

                    {(p.status === 'PENDING' || p.status === 'FAILED') && !isCancelled && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setCancelTarget(p);
                          setCancelReason('');
                        }}
                        disabled={isBusy}
                        className="h-7 gap-1 border-rose-500/30 px-2.5 text-[10px] text-rose-600 hover:bg-rose-500/10"
                      >
                        <Ban className="h-3 w-3" />
                        Cancel
                      </Button>
                    )}

                    {p.status === 'SUCCESS' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void resendReceipt(p.id)}
                        disabled={isBusy}
                        className="h-7 gap-1 px-2.5 text-[10px]"
                      >
                        <Mail className="h-3 w-3" />
                        Resend Receipt
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 text-xs">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span>
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Hold Modal */}
      <AdminModal
        open={Boolean(holdTarget)}
        title="Place Payout On Hold"
        subtitle={holdTarget ? `Ref: ${holdTarget.reference}` : undefined}
        onClose={() => !modalSubmitting && setHoldTarget(null)}
      >
        <form onSubmit={(e) => void submitHold(e)} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider">
              Hold Reason (Required)
            </label>
            <textarea
              value={holdReason}
              onChange={(e) => setHoldReason(e.target.value)}
              placeholder="e.g. Open buyer dispute or suspicious account change under review"
              rows={3}
              required
              className="bg-muted border-border w-full rounded-lg border p-2.5 text-xs focus:outline-none"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={modalSubmitting}
              onClick={() => setHoldTarget(null)}
            >
              Close
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={modalSubmitting}>
              Confirm Hold
            </Button>
          </div>
        </form>
      </AdminModal>

      {/* Cancel Modal */}
      <AdminModal
        open={Boolean(cancelTarget)}
        title="Cancel Payout"
        subtitle={cancelTarget ? `Ref: ${cancelTarget.reference}` : undefined}
        onClose={() => !modalSubmitting && setCancelTarget(null)}
      >
        <form onSubmit={(e) => void submitCancel(e)} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider">
              Cancellation Reason (Audited)
            </label>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Order refunded to buyer; payout voided"
              rows={3}
              required
              className="bg-muted border-border w-full rounded-lg border p-2.5 text-xs focus:outline-none"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={modalSubmitting}
              onClick={() => setCancelTarget(null)}
            >
              Back
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={modalSubmitting}>
              Cancel Payout
            </Button>
          </div>
        </form>
      </AdminModal>

      {/* Mark Settled Offline Modal */}
      <AdminModal
        open={Boolean(offlineTarget)}
        title="Mark Payout Settled Offline"
        subtitle={
          offlineTarget
            ? `Ref: ${offlineTarget.reference} · Amount: ${formatCurrency(Number(offlineTarget.amount || 0))}`
            : undefined
        }
        onClose={() => !modalSubmitting && setOfflineTarget(null)}
      >
        <form onSubmit={(e) => void submitOfflineSettle(e)} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider">
              External Bank / MoMo Transaction Ref
            </label>
            <input
              type="text"
              value={offlineRef}
              onChange={(e) => setOfflineRef(e.target.value)}
              placeholder="e.g. MOMO-TXN-894210"
              className="bg-muted border-border h-9 w-full rounded-lg border px-3 font-mono text-xs focus:outline-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider">
              Admin Settlement Note
            </label>
            <textarea
              value={offlineNote}
              onChange={(e) => setOfflineNote(e.target.value)}
              placeholder="e.g. Sent directly via MTN MoMo merchant portal"
              rows={2}
              className="bg-muted border-border w-full rounded-lg border p-2.5 text-xs focus:outline-none"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={modalSubmitting}
              onClick={() => setOfflineTarget(null)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={modalSubmitting}>
              Mark Settled &amp; Email Receipt
            </Button>
          </div>
        </form>
      </AdminModal>

      {/* Create Manual Payout Modal */}
      <AdminModal
        open={createOpen}
        title="Create Manual Seller Payout"
        subtitle="Create an ad-hoc payout for any seller with configured bank/MoMo details."
        onClose={() => !modalSubmitting && setCreateOpen(false)}
      >
        <form onSubmit={(e) => void submitManualCreate(e)} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider">
              Seller Store
            </label>
            {storesLoading ? (
              <div className="text-muted-foreground flex items-center gap-2 text-xs">
                <Spinner size="sm" /> Loading stores...
              </div>
            ) : (
              <select
                value={selectedSellerId}
                onChange={(e) => setSelectedSellerId(e.target.value)}
                required
                className="bg-muted border-border h-9 w-full rounded-lg border px-3 text-xs focus:outline-none"
              >
                <option value="">Select seller store...</option>
                {stores.map((s) => (
                  <option
                    key={s.seller_id}
                    value={s.seller_id}
                    disabled={!s.bank_code || !s.account_number}
                  >
                    {s.store_name}{' '}
                    {s.bank_code && s.account_number
                      ? `(${s.bank_name || s.bank_code} · ${s.account_number})`
                      : '(No payout account)'}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="space-y-1.5">
            <label className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider">
              Payout Amount (GH₵)
            </label>
            <input
              type="number"
              step="0.01"
              min="1"
              value={manualAmount}
              onChange={(e) => setManualAmount(e.target.value)}
              placeholder="e.g. 250.00"
              required
              className="bg-muted border-border h-9 w-full rounded-lg border px-3 font-mono text-xs focus:outline-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider">
              Reason / Reference Note
            </label>
            <input
              type="text"
              value={manualReason}
              onChange={(e) => setManualReason(e.target.value)}
              placeholder="e.g. Weekly balance release / promotional bonus"
              required
              className="bg-muted border-border h-9 w-full rounded-lg border px-3 text-xs focus:outline-none"
            />
          </div>
          <label className="bg-muted/60 border-border flex cursor-pointer items-center gap-2.5 rounded-lg border p-3 text-xs">
            <input
              type="checkbox"
              checked={executeNow}
              onChange={(e) => setExecuteNow(e.target.checked)}
              className="h-4 w-4 rounded"
            />
            <span>Execute Paystack Transfer immediately upon creation</span>
          </label>
          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={modalSubmitting}
              onClick={() => setCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={modalSubmitting}>
              {executeNow ? 'Create & Transfer Now' : 'Queue Payout'}
            </Button>
          </div>
        </form>
      </AdminModal>
    </div>
  );
}

/* ─── 5. Subaccounts & Retries Tab (With Admin Bank Override) ─────────── */

function SubaccountsTab() {
  const { confirm } = useConfirm();
  const [rows, setRows] = useState<SellerSubaccountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'MISSING' | 'UNCONFIGURED'>(
    'ALL',
  );
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [retryingAll, setRetryingAll] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  // Admin Bank Override modal
  const [editTarget, setEditTarget] = useState<SellerSubaccountRow | null>(null);
  const [editBankCode, setEditBankCode] = useState('');
  const [editAccount, setEditAccount] = useState('');
  const [editReason, setEditReason] = useState('');
  const [resolvedName, setResolvedName] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const [savingBank, setSavingBank] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await VendlyPaymentService.getSubaccounts({ page: 1, limit: 200 });
      setRows(res.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load seller subaccounts.');
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

  const handleSync = async (row: SellerSubaccountRow) => {
    setSyncingId(row.seller_id);
    setNotice(null);
    try {
      const res = await VendlyPaymentService.syncSellerSubaccount(row.seller_id);
      setNotice({
        kind: 'success',
        text: `${row.store_name}: Paystack subaccount ${res.action} (${res.subaccount_code || 'OK'}).`,
      });
      await fetchData();
    } catch (err: unknown) {
      setNotice({
        kind: 'error',
        text: err instanceof Error ? err.message : `Failed to sync ${row.store_name}.`,
      });
    } finally {
      setSyncingId(null);
    }
  };

  const handleResolveEditAccount = async () => {
    if (!editBankCode || !editAccount.trim()) return;
    setResolving(true);
    setResolvedName(null);
    try {
      const res = await VendlyPaymentService.resolveBankAccount(editBankCode, editAccount.trim());
      if (res.account_name) {
        setResolvedName(res.account_name);
      } else {
        setNotice({
          kind: 'success',
          text: res.warning || 'Account format verified (MoMo name lookup skipped).',
        });
      }
    } catch (err) {
      setNotice({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Could not verify bank account.',
      });
    } finally {
      setResolving(false);
    }
  };

  const submitBankOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget || !editBankCode || !editAccount.trim()) return;
    const providerName = GHANA_PROVIDERS.find((p) => p.code === editBankCode)?.name || editBankCode;
    setSavingBank(true);
    setNotice(null);
    try {
      const res = await VendlyPaymentService.overrideSellerBank(editTarget.seller_id, {
        bank_name: providerName,
        bank_code: editBankCode,
        account_number: editAccount.trim(),
        reason: editReason.trim() || 'Super Admin payout account correction',
      });
      setNotice({
        kind: 'success',
        text: `${editTarget.store_name}: Bank updated & Paystack subaccount synced (${res.subaccount_code || res.subaccount_status}). Security email sent to seller.`,
      });
      setEditTarget(null);
      await fetchData();
    } catch (err) {
      setNotice({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Failed to override bank details.',
      });
    } finally {
      setSavingBank(false);
    }
  };

  const handleRetryAll = async () => {
    const ok = await confirm({
      title: 'Retry All Missing / Failed Subaccounts',
      description:
        'Attempt to create Paystack subaccounts for every seller with configured bank/MoMo details who is missing a subaccount code?',
      confirmText: 'Sync All Missing',
      variant: 'info',
    });
    if (!ok) return;
    setRetryingAll(true);
    setNotice(null);
    try {
      const res = await VendlyPaymentService.retryAllSubaccounts();
      setNotice({
        kind: res.failed > 0 ? 'error' : 'success',
        text: `Processed ${res.total} store(s): ${res.synced} synced, ${res.failed} failed.`,
      });
      await fetchData();
    } catch (err: unknown) {
      setNotice({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Batch subaccount sync failed.',
      });
    } finally {
      setRetryingAll(false);
    }
  };

  const filtered = rows.filter((r) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      r.store_name.toLowerCase().includes(q) ||
      r.owner?.full_name?.toLowerCase().includes(q) ||
      r.owner?.email?.toLowerCase().includes(q) ||
      r.paystack_subaccount_code?.toLowerCase().includes(q) ||
      r.account_number?.toLowerCase().includes(q);
    const matchStatus =
      statusFilter === 'ALL'
        ? true
        : statusFilter === 'ACTIVE'
          ? r.subaccount_status === 'ACTIVE'
          : statusFilter === 'MISSING'
            ? r.subaccount_status === 'PENDING_RETRY' || r.subaccount_status === 'FAILED'
            : r.subaccount_status === 'UNCONFIGURED';
    return matchSearch && matchStatus;
  });

  const activeCount = rows.filter((r) => r.subaccount_status === 'ACTIVE').length;
  const missingCount = rows.filter(
    (r) => r.subaccount_status === 'PENDING_RETRY' || r.subaccount_status === 'FAILED',
  ).length;
  const unconfiguredCount = rows.filter((r) => r.subaccount_status === 'UNCONFIGURED').length;

  const stats = [
    { label: 'Total Stores', value: String(rows.length), icon: Building2, color: 'text-blue-500' },
    {
      label: 'Active Subaccounts',
      value: String(activeCount),
      icon: CheckCircle2,
      color: 'text-emerald-500',
    },
    {
      label: 'Missing / Retry Queue',
      value: String(missingCount),
      icon: AlertCircle,
      color: 'text-rose-500',
    },
    {
      label: 'Unconfigured Payouts',
      value: String(unconfiguredCount),
      icon: Clock,
      color: 'text-amber-500',
    },
  ];

  return (
    <div className="space-y-6">
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

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-64">
          <Search className="text-muted-foreground absolute left-3 top-2.5 h-4 w-4" />
          <input
            type="text"
            placeholder="Search store, owner, ACCT_..."
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
          <option value="ALL">All Subaccount States</option>
          <option value="ACTIVE">Active Subaccount</option>
          <option value="MISSING">Missing / Failed Retry</option>
          <option value="UNCONFIGURED">No Payout Account Yet</option>
        </select>
        <Button
          variant="primary"
          size="sm"
          onClick={() => void handleRetryAll()}
          disabled={retryingAll || missingCount === 0}
          isLoading={retryingAll}
          className="gap-1.5"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Retry All Missing ({missingCount})
        </Button>
        <Button variant="outline" size="sm" onClick={() => void fetchData()} className="gap-1.5">
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {notice && (
        <Alert variant={notice.kind === 'success' ? 'success' : 'error'} dismissible>
          {notice.text}
        </Alert>
      )}

      {loading ? (
        <div className="flex flex-col items-center gap-2 py-20">
          <Spinner size="lg" className="text-brand" />
          <p className="text-muted-foreground text-xs">Loading seller subaccounts...</p>
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
          <Building2 className="text-muted-foreground/20 mx-auto mb-3 h-10 w-10" />
          <p className="text-muted-foreground text-xs">No matching seller stores found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((row) => {
            const canSync = Boolean(row.bank_code && row.account_number);
            return (
              <div
                key={row.seller_id}
                className={cn(
                  'bg-card hover:bg-muted/30 space-y-3 rounded-xl border p-4 transition-all',
                  row.subaccount_status === 'ACTIVE'
                    ? 'border-emerald-500/20'
                    : row.subaccount_status === 'FAILED'
                      ? 'border-rose-500/30'
                      : 'border-border',
                )}
              >
                <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-foreground text-sm font-semibold">
                        {row.store_name}
                      </span>
                      <Badge
                        variant={
                          row.subaccount_status === 'ACTIVE'
                            ? 'success'
                            : row.subaccount_status === 'FAILED'
                              ? 'danger'
                              : row.subaccount_status === 'PENDING_RETRY'
                                ? 'warning'
                                : 'default'
                        }
                        dot
                      >
                        {row.subaccount_status.replace(/_/g, ' ')}
                      </Badge>
                      {!row.is_seller_verified && (
                        <Badge variant="warning">Pending Verification</Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground text-[11px]">
                      Owner: <span className="text-foreground">{row.owner?.full_name || '—'}</span>{' '}
                      ({row.owner?.email || '—'})
                    </p>
                  </div>

                  <div className="border-border/40 grid grid-cols-1 gap-3 text-xs sm:grid-cols-2 lg:border-x lg:px-6">
                    <div>
                      <p className="text-muted-foreground text-[9px] font-semibold uppercase tracking-wider">
                        Payout Account
                      </p>
                      {canSync ? (
                        <>
                          <p className="text-foreground font-medium">
                            {row.bank_name || row.bank_code}
                          </p>
                          <p className="text-muted-foreground font-mono text-[11px]">
                            {row.account_number} ({row.bank_code})
                          </p>
                        </>
                      ) : (
                        <p className="text-muted-foreground italic">Not configured yet</p>
                      )}
                    </div>
                    <div>
                      <p className="text-muted-foreground text-[9px] font-semibold uppercase tracking-wider">
                        Paystack Subaccount
                      </p>
                      {row.paystack_subaccount_code ? (
                        <div className="flex items-center gap-1.5">
                          <code className="font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            {row.paystack_subaccount_code}
                          </code>
                          <button
                            type="button"
                            onClick={() => handleCopy(row.paystack_subaccount_code!, row.seller_id)}
                            className="text-muted-foreground hover:text-foreground"
                            title="Copy subaccount code"
                          >
                            {copiedId === row.seller_id ? (
                              <Check className="h-3 w-3 text-emerald-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-[11px]">Not created</p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 lg:justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditTarget(row);
                        setEditBankCode(row.bank_code || 'MTN');
                        setEditAccount(row.account_number || '');
                        setEditReason('');
                        setResolvedName(null);
                      }}
                      className="h-8 gap-1 px-2.5 text-xs"
                    >
                      <Pencil className="h-3 w-3" />
                      Edit Bank
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!canSync || syncingId === row.seller_id}
                      isLoading={syncingId === row.seller_id}
                      onClick={() => void handleSync(row)}
                      className="h-8 gap-1.5 px-3 text-xs"
                    >
                      <RefreshCw className="h-3 w-3" />
                      {row.paystack_subaccount_code ? 'Re-Sync' : 'Create Subaccount'}
                    </Button>
                  </div>
                </div>

                {row.retry?.last_error && (
                  <div className="border-border/40 flex flex-wrap items-center justify-between gap-2 border-t pt-2 text-[11px] text-rose-500">
                    <span className="flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      Last Paystack error (attempts: {row.retry.attempts}): {row.retry.last_error}
                    </span>
                    <span className="text-muted-foreground">
                      Updated {dateTime(row.retry.updated_at)}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Super Admin Bank Override Modal */}
      <AdminModal
        open={Boolean(editTarget)}
        title="Override Seller Payout Account"
        subtitle={
          editTarget
            ? `${editTarget.store_name} · Immediately syncs Paystack subaccount & alerts seller by email.`
            : undefined
        }
        onClose={() => !savingBank && setEditTarget(null)}
      >
        <form onSubmit={(e) => void submitBankOverride(e)} className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="text-muted-foreground text-[10px] font-semibold uppercase">
              Bank / Mobile Money Provider
            </label>
            <select
              value={editBankCode}
              onChange={(e) => {
                setEditBankCode(e.target.value);
                setResolvedName(null);
              }}
              required
              className="bg-muted border-border h-9 w-full rounded-lg border px-3 text-xs"
            >
              {GHANA_PROVIDERS.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.name} ({p.code})
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-muted-foreground text-[10px] font-semibold uppercase">
              Account / MoMo Number (9–16 digits)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={editAccount}
                onChange={(e) => {
                  setEditAccount(e.target.value);
                  setResolvedName(null);
                }}
                required
                placeholder="e.g. 0244123456"
                className="bg-muted border-border h-9 flex-1 rounded-lg border px-3 font-mono text-xs"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                isLoading={resolving}
                onClick={() => void handleResolveEditAccount()}
              >
                Verify Name
              </Button>
            </div>
            {resolvedName && (
              <p className="pt-1 font-medium text-emerald-600 dark:text-emerald-400">
                ✓ Account Holder: {resolvedName}
              </p>
            )}
          </div>
          <div className="space-y-1">
            <label className="text-muted-foreground text-[10px] font-semibold uppercase">
              Audit Reason
            </label>
            <input
              type="text"
              value={editReason}
              onChange={(e) => setEditReason(e.target.value)}
              required
              placeholder="e.g. Verified seller support request #104"
              className="bg-muted border-border h-9 w-full rounded-lg border px-3 text-xs"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={savingBank}
              onClick={() => setEditTarget(null)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={savingBank}>
              Save &amp; Sync Subaccount
            </Button>
          </div>
        </form>
      </AdminModal>
    </div>
  );
}

/* ─── 6. Promotions Tab (With Manual Reconciliation) ──────────────────── */

function PromotionsTab() {
  const { confirm } = useConfirm();
  const [promotions, setPromotions] = useState<PromotionPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SUCCESS' | 'PENDING' | 'FAILED'>('ALL');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

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

  const handleReconcilePromo = async (promo: PromotionPayment, status: 'SUCCESS' | 'FAILED') => {
    const ok = await confirm({
      title: status === 'SUCCESS' ? 'Confirm & Activate Promotion' : 'Mark Promotion Failed',
      description:
        status === 'SUCCESS'
          ? `Mark ${promo.reference} as SUCCESS and immediately activate its ${promo.category === 'BOOST' ? 'product boost' : '30-day Pro plan'}?`
          : `Mark ${promo.reference} as FAILED?`,
      confirmText: status === 'SUCCESS' ? 'Confirm & Activate' : 'Mark Failed',
      variant: status === 'FAILED' ? 'danger' : 'success',
    });
    if (!ok) return;
    setBusyId(promo.id);
    setNotice(null);
    try {
      const res = await VendlyPaymentService.reconcilePromotion(promo.id, { status });
      setNotice({ kind: 'success', text: res.message });
      await fetchData();
    } catch (err) {
      setNotice({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Failed to reconcile promotion.',
      });
    } finally {
      setBusyId(null);
    }
  };

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
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            exportRowsToCsv(
              'verndly-promotions.csv',
              ['Date', 'Reference', 'Category', 'Product', 'Amount', 'Status'],
              filtered.map((p) => [
                p.created_at,
                p.reference,
                p.category,
                p.product?.title || '',
                p.amount,
                p.status,
              ]),
            )
          }
          className="gap-1.5"
        >
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </Button>
        <Button variant="outline" size="sm" onClick={() => void fetchData()} className="gap-1.5">
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {notice && (
        <Alert variant={notice.kind === 'success' ? 'success' : 'error'} dismissible>
          {notice.text}
        </Alert>
      )}

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
                'bg-card hover:bg-muted/30 space-y-3 rounded-xl border p-4 transition-all',
                promo.status === 'SUCCESS'
                  ? 'border-amber-500/20'
                  : promo.status === 'FAILED'
                    ? 'border-rose-500/20'
                    : 'border-border',
              )}
            >
              <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
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
                        {promo.product?.title || 'Verndly Pro Subscription'}
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

                <div className="flex items-center gap-6 text-xs">
                  <div>
                    <p className="text-muted-foreground mb-1 text-[9px] font-semibold uppercase tracking-wider">
                      Payment Date
                    </p>
                    <p className="text-foreground">{dateTime(promo.created_at)}</p>
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

                <div className="flex items-center justify-between gap-3 lg:justify-end">
                  <div className="text-left lg:text-right">
                    <p className="text-muted-foreground mb-1 text-[9px] font-semibold uppercase tracking-wider">
                      Revenue
                    </p>
                    <p className="font-mono text-lg font-bold text-amber-500">
                      {formatCurrency(promo.amount)}
                    </p>
                  </div>
                  {promo.status === 'PENDING' && (
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busyId === promo.id}
                        onClick={() => void handleReconcilePromo(promo, 'SUCCESS')}
                        className="h-7 border-emerald-500/30 px-2 text-[10px] text-emerald-600"
                      >
                        Confirm &amp; Activate
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busyId === promo.id}
                        onClick={() => void handleReconcilePromo(promo, 'FAILED')}
                        className="h-7 border-rose-500/30 px-2 text-[10px] text-rose-600"
                      >
                        Mark Failed
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
