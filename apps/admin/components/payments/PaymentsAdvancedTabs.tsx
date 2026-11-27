'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  RefreshCw,
  AlertCircle,
  Wallet,
  BookOpen,
  ArrowUpRight,
  ArrowDownLeft,
  Sliders,
  Unlock,
  Undo2,
  Download,
  Terminal,
  Eye,
  ChevronLeft,
  ChevronRight,
  Settings2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Alert } from '@/components/ui/alert';
import { formatCurrency, dateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import {
  VendlyPaymentService,
  type AdminWalletRow,
  type AdminLedgerRow,
  type AdminRefundRow,
  type AdminPaymentLogRow,
} from '@/services/payment.service';
import { VendlySettingsService } from '@/services/settings.service';

function SimpleModal({
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
            className="text-muted-foreground hover:text-foreground rounded-lg p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function exportRowsToCsv(filename: string, headers: string[], rows: unknown[][]) {
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [headers.join(','), ...rows.map((r) => r.map(esc).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ─── Wallets & Master Ledger Tab ─────────────────────────────────────── */

export function WalletsAndLedgerTab() {
  const [view, setView] = useState<'wallets' | 'ledger'>('wallets');
  const [notice, setNotice] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  // Wallets state
  const [wallets, setWallets] = useState<AdminWalletRow[]>([]);
  const [walletSummary, setWalletSummary] = useState({
    total_available: 0,
    total_pending: 0,
    total_earned: 0,
    total_withdrawn: 0,
  });
  const [walletSearch, setWalletSearch] = useState('');
  const [walletPage, setWalletPage] = useState(1);
  const [walletTotalPages, setWalletTotalPages] = useState(1);
  const [walletsLoading, setWalletsLoading] = useState(true);

  // Ledger state
  const [ledger, setLedger] = useState<AdminLedgerRow[]>([]);
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerType, setLedgerType] = useState<'ALL' | 'CREDIT' | 'DEBIT'>('ALL');
  const [ledgerSource, setLedgerSource] = useState<string>('ALL');
  const [ledgerSellerId, setLedgerSellerId] = useState<string>('');
  const [ledgerPage, setLedgerPage] = useState(1);
  const [ledgerTotalPages, setLedgerTotalPages] = useState(1);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  // Adjust Wallet Modal
  const [adjustTarget, setAdjustTarget] = useState<AdminWalletRow | null>(null);
  const [adjustType, setAdjustType] = useState<'CREDIT' | 'DEBIT'>('CREDIT');
  const [adjustBucket, setAdjustBucket] = useState<'available' | 'pending'>('available');
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Release Pending Modal
  const [releaseTarget, setReleaseTarget] = useState<AdminWalletRow | null>(null);
  const [releaseAmount, setReleaseAmount] = useState('');
  const [releaseReason, setReleaseReason] = useState('');

  const fetchWallets = useCallback(async () => {
    setWalletsLoading(true);
    try {
      const res = await VendlyPaymentService.getWallets({
        search: walletSearch.trim() || undefined,
        page: walletPage,
        limit: 50,
      });
      setWallets(res.data);
      setWalletTotalPages(res.totalPages || 1);
      if (res.summary) setWalletSummary(res.summary);
    } catch (err) {
      setNotice({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Failed to load seller wallets.',
      });
    } finally {
      setWalletsLoading(false);
    }
  }, [walletSearch, walletPage]);

  const fetchLedger = useCallback(async () => {
    setLedgerLoading(true);
    try {
      const res = await VendlyPaymentService.getLedger({
        seller_id: ledgerSellerId || undefined,
        type: ledgerType === 'ALL' ? undefined : ledgerType,
        source_type: ledgerSource === 'ALL' ? undefined : ledgerSource,
        search: ledgerSearch.trim() || undefined,
        page: ledgerPage,
        limit: 50,
      });
      setLedger(res.data);
      setLedgerTotalPages(res.totalPages || 1);
    } catch (err) {
      setNotice({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Failed to load ledger entries.',
      });
    } finally {
      setLedgerLoading(false);
    }
  }, [ledgerSellerId, ledgerType, ledgerSource, ledgerSearch, ledgerPage]);

  useEffect(() => {
    void fetchWallets();
  }, [fetchWallets]);

  useEffect(() => {
    if (view === 'ledger') {
      void fetchLedger();
    }
  }, [view, fetchLedger]);

  const submitAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustTarget) return;
    const amt = Number(adjustAmount);
    if (!Number.isFinite(amt) || amt <= 0 || !adjustReason.trim()) return;
    setSubmitting(true);
    setNotice(null);
    try {
      const res = await VendlyPaymentService.adjustWallet(adjustTarget.seller_id, {
        type: adjustType,
        bucket: adjustBucket,
        amount: amt,
        reason: adjustReason.trim(),
      });
      setNotice({
        kind: 'success',
        text: `${adjustTarget.store_name}: ${adjustType} ${formatCurrency(amt)} (${adjustBucket}) applied. Ref: ${res.reference}`,
      });
      setAdjustTarget(null);
      setAdjustAmount('');
      setAdjustReason('');
      await fetchWallets();
      if (view === 'ledger') await fetchLedger();
    } catch (err) {
      setNotice({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Wallet adjustment failed.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const submitReleasePending = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!releaseTarget) return;
    setSubmitting(true);
    setNotice(null);
    try {
      const amt = releaseAmount.trim() ? Number(releaseAmount) : undefined;
      const res = await VendlyPaymentService.releaseWalletPending(releaseTarget.seller_id, {
        amount: amt,
        reason: releaseReason.trim() || 'Super Admin early escrow release',
      });
      setNotice({
        kind: 'success',
        text: `Released ${formatCurrency(res.released_amount)} from pending escrow to available for ${releaseTarget.store_name}.`,
      });
      setReleaseTarget(null);
      setReleaseAmount('');
      setReleaseReason('');
      await fetchWallets();
    } catch (err) {
      setNotice({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Failed to release pending balance.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const summaryCards = [
    {
      label: 'Total Available to Payout',
      value: formatCurrency(walletSummary.total_available),
      color: 'text-emerald-500',
    },
    {
      label: 'Total Held in Escrow',
      value: formatCurrency(walletSummary.total_pending),
      color: 'text-amber-500',
    },
    {
      label: 'Lifetime Seller Earnings',
      value: formatCurrency(walletSummary.total_earned),
      color: 'text-blue-500',
    },
    {
      label: 'Lifetime Withdrawn',
      value: formatCurrency(walletSummary.total_withdrawn),
      color: 'text-purple-500',
    },
  ];

  return (
    <div className="space-y-5">
      {/* Platform Wallet Totals */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((c) => (
          <div key={c.label} className="bg-card border-border rounded-xl border p-4">
            <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-widest">
              {c.label}
            </p>
            <p className={cn('mt-1.5 font-mono text-lg font-bold', c.color)}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Sub-view switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="bg-muted/60 border-border inline-flex rounded-lg border p-1">
          <button
            type="button"
            onClick={() => setView('wallets')}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium',
              view === 'wallets'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Wallet className="h-3.5 w-3.5" />
            Seller Wallets
          </button>
          <button
            type="button"
            onClick={() => setView('ledger')}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium',
              view === 'ledger'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <BookOpen className="h-3.5 w-3.5" />
            Master Ledger
          </button>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (view === 'wallets') {
              exportRowsToCsv(
                'verndly-seller-wallets.csv',
                [
                  'Store',
                  'Owner',
                  'Available',
                  'Pending Escrow',
                  'Total Earned',
                  'Withdrawn',
                  'Subaccount',
                ],
                wallets.map((w) => [
                  w.store_name,
                  w.owner?.email || '',
                  w.available_balance,
                  w.pending_balance,
                  w.total_earned,
                  w.total_withdrawn,
                  w.paystack_subaccount_code || '',
                ]),
              );
            } else {
              exportRowsToCsv(
                'verndly-master-ledger.csv',
                ['Date', 'Reference', 'Store', 'Type', 'Source', 'Amount', 'Description'],
                ledger.map((l) => [
                  l.created_at,
                  l.reference,
                  l.seller?.store_name || '',
                  l.type,
                  l.source_type,
                  l.amount,
                  l.description || '',
                ]),
              );
            }
          }}
          className="gap-1.5"
        >
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </Button>
      </div>

      {notice && (
        <Alert variant={notice.kind === 'success' ? 'success' : 'error'} dismissible>
          {notice.text}
        </Alert>
      )}

      {view === 'wallets' ? (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="text-muted-foreground absolute left-3 top-2.5 h-4 w-4" />
              <input
                type="text"
                placeholder="Search store, owner, email, account..."
                value={walletSearch}
                onChange={(e) => {
                  setWalletSearch(e.target.value);
                  setWalletPage(1);
                }}
                className="bg-muted border-border h-9 w-full rounded-lg border pl-9 pr-3 text-xs focus:outline-none"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void fetchWallets()}
              className="gap-1.5"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', walletsLoading && 'animate-spin')} />
              Refresh
            </Button>
          </div>

          {walletsLoading ? (
            <div className="flex flex-col items-center gap-2 py-16">
              <Spinner size="lg" className="text-brand" />
              <p className="text-muted-foreground text-xs">Loading seller wallets...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {wallets.map((w) => (
                <div
                  key={w.seller_id}
                  className="bg-card border-border hover:bg-muted/20 flex flex-col justify-between gap-4 rounded-xl border p-4 lg:flex-row lg:items-center"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-foreground text-sm font-semibold">{w.store_name}</span>
                      {w.paystack_subaccount_code ? (
                        <Badge variant="success">Sub: {w.paystack_subaccount_code}</Badge>
                      ) : (
                        <Badge variant="warning">No Subaccount</Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground text-[11px]">
                      {w.owner?.full_name || '—'} ({w.owner?.email || '—'}) • {w.ledger_count}{' '}
                      ledger entries • {w.payouts_count} payouts
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs sm:grid-cols-4">
                    <div>
                      <p className="text-muted-foreground text-[9px] font-semibold uppercase">
                        Available
                      </p>
                      <p className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(w.available_balance)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-[9px] font-semibold uppercase">
                        Pending Escrow
                      </p>
                      <p className="font-mono font-bold text-amber-500">
                        {formatCurrency(w.pending_balance)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-[9px] font-semibold uppercase">
                        Earned
                      </p>
                      <p className="text-foreground font-mono font-semibold">
                        {formatCurrency(w.total_earned)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-[9px] font-semibold uppercase">
                        Withdrawn
                      </p>
                      <p className="text-muted-foreground font-mono">
                        {formatCurrency(w.total_withdrawn)}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setAdjustTarget(w);
                        setAdjustType('CREDIT');
                        setAdjustBucket('available');
                        setAdjustAmount('');
                        setAdjustReason('');
                      }}
                      className="h-7 gap-1 px-2.5 text-[11px]"
                    >
                      <Sliders className="h-3 w-3" />
                      Credit / Debit
                    </Button>
                    {w.pending_balance > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setReleaseTarget(w);
                          setReleaseAmount(String(w.pending_balance));
                          setReleaseReason('');
                        }}
                        className="h-7 gap-1 border-emerald-500/30 px-2.5 text-[11px] text-emerald-600"
                      >
                        <Unlock className="h-3 w-3" />
                        Release Escrow
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setLedgerSellerId(w.seller_id);
                        setLedgerPage(1);
                        setView('ledger');
                      }}
                      className="h-7 px-2 text-[11px]"
                    >
                      Ledger →
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {walletTotalPages > 1 && (
            <div className="flex items-center justify-end gap-2 text-xs">
              <Button
                variant="outline"
                size="sm"
                disabled={walletPage <= 1}
                onClick={() => setWalletPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span>
                Page {walletPage} of {walletTotalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={walletPage >= walletTotalPages}
                onClick={() => setWalletPage((p) => p + 1)}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative w-full sm:w-64">
              <Search className="text-muted-foreground absolute left-3 top-2.5 h-4 w-4" />
              <input
                type="text"
                placeholder="Search reference, store, note..."
                value={ledgerSearch}
                onChange={(e) => {
                  setLedgerSearch(e.target.value);
                  setLedgerPage(1);
                }}
                className="bg-muted border-border h-9 w-full rounded-lg border pl-9 pr-3 text-xs focus:outline-none"
              />
            </div>
            <select
              value={ledgerType}
              onChange={(e) => {
                setLedgerType(e.target.value as typeof ledgerType);
                setLedgerPage(1);
              }}
              className="bg-muted border-border h-9 rounded-lg border px-2.5 text-xs"
            >
              <option value="ALL">All Types</option>
              <option value="CREDIT">Credits (+)</option>
              <option value="DEBIT">Debits (−)</option>
            </select>
            <select
              value={ledgerSource}
              onChange={(e) => {
                setLedgerSource(e.target.value);
                setLedgerPage(1);
              }}
              className="bg-muted border-border h-9 rounded-lg border px-2.5 text-xs"
            >
              <option value="ALL">All Sources</option>
              <option value="ORDER">Order</option>
              <option value="FEE">Platform Fee</option>
              <option value="PAYOUT">Payout</option>
              <option value="REFUND">Refund</option>
              <option value="ADJUSTMENT">Admin Adjustment</option>
              <option value="PROMOTION">Promotion</option>
            </select>
            {ledgerSellerId && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLedgerSellerId('')}
                className="h-9 text-xs"
              >
                Clear Store Filter ×
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => void fetchLedger()}
              className="gap-1.5"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', ledgerLoading && 'animate-spin')} />
              Refresh
            </Button>
          </div>

          {ledgerLoading ? (
            <div className="flex flex-col items-center gap-2 py-16">
              <Spinner size="lg" className="text-brand" />
              <p className="text-muted-foreground text-xs">Loading ledger...</p>
            </div>
          ) : ledger.length === 0 ? (
            <div className="border-border text-muted-foreground rounded-xl border border-dashed py-14 text-center text-xs">
              No ledger entries match this filter.
            </div>
          ) : (
            <div className="space-y-2">
              {ledger.map((entry) => {
                const isCredit = entry.type === 'CREDIT';
                return (
                  <div
                    key={entry.id}
                    className="bg-card border-border flex flex-col justify-between gap-3 rounded-xl border p-3.5 sm:flex-row sm:items-center"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border',
                          isCredit
                            ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500'
                            : 'border-rose-500/20 bg-rose-500/10 text-rose-500',
                        )}
                      >
                        {isCredit ? (
                          <ArrowDownLeft className="h-4 w-4" />
                        ) : (
                          <ArrowUpRight className="h-4 w-4" />
                        )}
                      </div>
                      <div className="space-y-0.5 text-xs">
                        <div className="flex flex-wrap items-center gap-2">
                          <code className="text-foreground font-mono text-[11px] font-bold">
                            {entry.reference}
                          </code>
                          <Badge variant={isCredit ? 'success' : 'danger'}>{entry.type}</Badge>
                          <Badge variant="default">{entry.source_type}</Badge>
                        </div>
                        <p className="text-muted-foreground text-[11px]">
                          <strong className="text-foreground">
                            {entry.seller?.store_name || 'Seller'}
                          </strong>{' '}
                          • {entry.description || 'Ledger movement'} • {dateTime(entry.created_at)}
                        </p>
                      </div>
                    </div>
                    <p
                      className={cn(
                        'font-mono text-sm font-bold',
                        isCredit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500',
                      )}
                    >
                      {isCredit ? '+' : '−'}
                      {formatCurrency(entry.amount, entry.currency)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {ledgerTotalPages > 1 && (
            <div className="flex items-center justify-end gap-2 text-xs">
              <Button
                variant="outline"
                size="sm"
                disabled={ledgerPage <= 1}
                onClick={() => setLedgerPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span>
                Page {ledgerPage} of {ledgerTotalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={ledgerPage >= ledgerTotalPages}
                onClick={() => setLedgerPage((p) => p + 1)}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </>
      )}

      {/* Adjust Wallet Modal */}
      <SimpleModal
        open={Boolean(adjustTarget)}
        title="Super Admin Wallet Adjustment"
        subtitle={
          adjustTarget
            ? `${adjustTarget.store_name} · Avail: ${formatCurrency(adjustTarget.available_balance)} · Pending: ${formatCurrency(adjustTarget.pending_balance)}`
            : undefined
        }
        onClose={() => !submitting && setAdjustTarget(null)}
      >
        <form onSubmit={(e) => void submitAdjust(e)} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-muted-foreground text-[10px] font-semibold uppercase">
                Direction
              </label>
              <select
                value={adjustType}
                onChange={(e) => setAdjustType(e.target.value as 'CREDIT' | 'DEBIT')}
                className="bg-muted border-border h-9 w-full rounded-lg border px-2.5 text-xs"
              >
                <option value="CREDIT">Credit (+ Add Funds)</option>
                <option value="DEBIT">Debit (− Deduct Funds)</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-muted-foreground text-[10px] font-semibold uppercase">
                Balance Bucket
              </label>
              <select
                value={adjustBucket}
                onChange={(e) => setAdjustBucket(e.target.value as 'available' | 'pending')}
                className="bg-muted border-border h-9 w-full rounded-lg border px-2.5 text-xs"
              >
                <option value="available">Available Balance</option>
                <option value="pending">Pending Escrow</option>
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-muted-foreground text-[10px] font-semibold uppercase">
              Amount (GH₵)
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={adjustAmount}
              onChange={(e) => setAdjustAmount(e.target.value)}
              required
              placeholder="e.g. 50.00"
              className="bg-muted border-border h-9 w-full rounded-lg border px-3 font-mono text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="text-muted-foreground text-[10px] font-semibold uppercase">
              Mandatory Audit Reason
            </label>
            <textarea
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              rows={2}
              required
              placeholder="e.g. Dispute clawback / Promotional rebate / Fee waiver"
              className="bg-muted border-border w-full rounded-lg border p-2.5 text-xs"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={submitting}
              onClick={() => setAdjustTarget(null)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={submitting}>
              Apply Adjustment
            </Button>
          </div>
        </form>
      </SimpleModal>

      {/* Release Pending Escrow Modal */}
      <SimpleModal
        open={Boolean(releaseTarget)}
        title="Release Pending Escrow to Available"
        subtitle={
          releaseTarget
            ? `${releaseTarget.store_name} · Pending: ${formatCurrency(releaseTarget.pending_balance)}`
            : undefined
        }
        onClose={() => !submitting && setReleaseTarget(null)}
      >
        <form onSubmit={(e) => void submitReleasePending(e)} className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="text-muted-foreground text-[10px] font-semibold uppercase">
              Amount to Release (GH₵)
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={releaseTarget?.pending_balance}
              value={releaseAmount}
              onChange={(e) => setReleaseAmount(e.target.value)}
              required
              className="bg-muted border-border h-9 w-full rounded-lg border px-3 font-mono text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="text-muted-foreground text-[10px] font-semibold uppercase">
              Audit Reason
            </label>
            <input
              type="text"
              value={releaseReason}
              onChange={(e) => setReleaseReason(e.target.value)}
              placeholder="e.g. Verified delivery with buyer via support"
              className="bg-muted border-border h-9 w-full rounded-lg border px-3 text-xs"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={submitting}
              onClick={() => setReleaseTarget(null)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={submitting}>
              Release Funds
            </Button>
          </div>
        </form>
      </SimpleModal>
    </div>
  );
}

/* ─── Refunds Tab ─────────────────────────────────────────────────────── */

export function RefundsTab() {
  const [refunds, setRefunds] = useState<AdminRefundRow[]>([]);
  const [summary, setSummary] = useState({
    total_refunded_amount: 0,
    success_count: 0,
    pending_count: 0,
    failed_count: 0,
  });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await VendlyPaymentService.getRefunds({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        search: search.trim() || undefined,
        page,
        limit: 50,
      });
      setRefunds(res.data);
      setTotalPages(res.totalPages || 1);
      if (res.summary) setSummary(res.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load refunds.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, page]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-card border-border rounded-xl border p-4">
          <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-widest">
            Total Refunded Volume
          </p>
          <p className="mt-1.5 font-mono text-lg font-bold text-purple-500">
            {formatCurrency(summary.total_refunded_amount)}
          </p>
        </div>
        <div className="bg-card border-border rounded-xl border p-4">
          <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-widest">
            Completed Refunds
          </p>
          <p className="mt-1.5 text-lg font-bold text-emerald-500">{summary.success_count}</p>
        </div>
        <div className="bg-card border-border rounded-xl border p-4">
          <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-widest">
            Pending / Processing
          </p>
          <p className="mt-1.5 text-lg font-bold text-amber-500">{summary.pending_count}</p>
        </div>
        <div className="bg-card border-border rounded-xl border p-4">
          <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-widest">
            Failed Refunds
          </p>
          <p className="mt-1.5 text-lg font-bold text-rose-500">{summary.failed_count}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-64">
          <Search className="text-muted-foreground absolute left-3 top-2.5 h-4 w-4" />
          <input
            type="text"
            placeholder="Search refund ref, tx ref, reason..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="bg-muted border-border h-9 w-full rounded-lg border pl-9 pr-3 text-xs focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="bg-muted border-border h-9 rounded-lg border px-3 text-xs"
        >
          <option value="ALL">All Statuses</option>
          <option value="SUCCESS">Success</option>
          <option value="PENDING">Pending</option>
          <option value="PROCESSING">Processing</option>
          <option value="FAILED">Failed</option>
        </select>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            exportRowsToCsv(
              'verndly-refunds.csv',
              ['Date', 'Refund Ref', 'Tx Ref', 'Amount', 'Status', 'Buyer', 'Reason'],
              refunds.map((r) => [
                r.created_at,
                r.reference,
                r.transaction?.reference || '',
                r.amount,
                r.status,
                r.order?.buyer?.email || r.order?.customer_name || '',
                r.reason || '',
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

      {error && <Alert variant="error">{error}</Alert>}

      {loading ? (
        <div className="flex flex-col items-center gap-2 py-16">
          <Spinner size="lg" className="text-brand" />
          <p className="text-muted-foreground text-xs">Loading refunds...</p>
        </div>
      ) : refunds.length === 0 ? (
        <div className="border-border rounded-xl border border-dashed py-14 text-center">
          <Undo2 className="text-muted-foreground/20 mx-auto mb-2 h-8 w-8" />
          <p className="text-muted-foreground text-xs">No refunds recorded yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {refunds.map((r) => {
            const storeName = r.order?.items?.[0]?.product?.seller?.store_name;
            return (
              <div
                key={r.id}
                className="bg-card border-border flex flex-col justify-between gap-3 rounded-xl border p-4 lg:flex-row lg:items-center"
              >
                <div className="space-y-1 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="text-foreground font-mono font-bold">{r.reference}</code>
                    <Badge
                      variant={
                        r.status === 'SUCCESS'
                          ? 'success'
                          : r.status === 'FAILED'
                            ? 'danger'
                            : 'warning'
                      }
                      dot
                    >
                      {r.status}
                    </Badge>
                    <Badge variant="info">{r.provider}</Badge>
                  </div>
                  <p className="text-muted-foreground text-[11px]">
                    Tx:{' '}
                    <code className="text-foreground font-mono">
                      {r.transaction?.reference || '—'}
                    </code>{' '}
                    • Buyer:{' '}
                    <span className="text-foreground">
                      {r.order?.buyer?.full_name || r.order?.customer_name || '—'}
                    </span>
                    {storeName && (
                      <>
                        {' '}
                        • Store: <span className="text-primary">{storeName}</span>
                      </>
                    )}
                  </p>
                  {r.reason && (
                    <p className="text-muted-foreground text-[11px]">Reason: {r.reason}</p>
                  )}
                  <p className="text-muted-foreground text-[10px]">
                    {dateTime(r.created_at)}
                    {r.provider_ref ? ` • Provider Ref: ${r.provider_ref}` : ''}
                  </p>
                </div>
                <div className="text-left lg:text-right">
                  <p className="text-muted-foreground text-[9px] font-semibold uppercase">
                    Refunded
                  </p>
                  <p className="font-mono text-base font-bold text-purple-500">
                    {formatCurrency(r.amount, r.currency)}
                  </p>
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
    </div>
  );
}

/* ─── Paystack Webhook & Payment Event Logs Tab ───────────────────────── */

export function WebhookLogsTab() {
  const [logs, setLogs] = useState<AdminPaymentLogRow[]>([]);
  const [eventFilter, setEventFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [inspectLog, setInspectLog] = useState<AdminPaymentLogRow | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await VendlyPaymentService.getPaymentLogs({
        event: eventFilter === 'ALL' ? undefined : eventFilter,
        search: search.trim() || undefined,
        page,
        limit: 50,
      });
      setLogs(res.data);
      setTotalPages(res.totalPages || 1);
    } finally {
      setLoading(false);
    }
  }, [eventFilter, search, page]);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-64">
          <Search className="text-muted-foreground absolute left-3 top-2.5 h-4 w-4" />
          <input
            type="text"
            placeholder="Search event or event_id..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="bg-muted border-border h-9 w-full rounded-lg border pl-9 pr-3 text-xs focus:outline-none"
          />
        </div>
        <select
          value={eventFilter}
          onChange={(e) => {
            setEventFilter(e.target.value);
            setPage(1);
          }}
          className="bg-muted border-border h-9 rounded-lg border px-3 text-xs"
        >
          <option value="ALL">All Events</option>
          <option value="charge.success">charge.success</option>
          <option value="charge.failed">charge.failed</option>
          <option value="transfer.success">transfer.success</option>
          <option value="transfer.failed">transfer.failed</option>
          <option value="refund">refund.*</option>
        </select>
        <Button variant="outline" size="sm" onClick={() => void fetchLogs()} className="gap-1.5">
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center gap-2 py-16">
          <Spinner size="lg" className="text-brand" />
          <p className="text-muted-foreground text-xs">Loading Paystack webhook logs...</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="border-border rounded-xl border border-dashed py-14 text-center">
          <Terminal className="text-muted-foreground/20 mx-auto mb-2 h-8 w-8" />
          <p className="text-muted-foreground text-xs">No payment webhook logs found.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <div
              key={log.id}
              className="bg-card border-border flex flex-col justify-between gap-2 rounded-xl border p-3.5 sm:flex-row sm:items-center"
            >
              <div className="space-y-0.5 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant={
                      log.event.includes('success') || log.event.includes('processed')
                        ? 'success'
                        : log.event.includes('fail')
                          ? 'danger'
                          : 'info'
                    }
                  >
                    {log.event}
                  </Badge>
                  {log.event_id && (
                    <code className="text-muted-foreground font-mono text-[10px]">
                      ID: {log.event_id}
                    </code>
                  )}
                </div>
                <p className="text-muted-foreground text-[11px]">{dateTime(log.created_at)}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInspectLog(log)}
                className="h-7 gap-1 px-2.5 text-[11px]"
              >
                <Eye className="h-3 w-3" />
                Inspect Payload
              </Button>
            </div>
          ))}
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

      <SimpleModal
        open={Boolean(inspectLog)}
        title={inspectLog ? `Webhook Event: ${inspectLog.event}` : 'Webhook Payload'}
        subtitle={inspectLog ? dateTime(inspectLog.created_at) : undefined}
        maxWidth="max-w-2xl"
        onClose={() => setInspectLog(null)}
      >
        <pre className="bg-muted border-border max-h-[60vh] overflow-auto rounded-xl border p-3 font-mono text-[11px] leading-relaxed">
          {inspectLog ? JSON.stringify(inspectLog.payload, null, 2) : ''}
        </pre>
      </SimpleModal>
    </div>
  );
}

/* ─── Payment Rules Quick Settings Modal ──────────────────────────────── */

export function PaymentRulesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [feePercent, setFeePercent] = useState('4');
  const [escrowDays, setEscrowDays] = useState('3');
  const [minPayout, setMinPayout] = useState('20');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setMsg(null);
    VendlySettingsService.getSettings()
      .then((s) => {
        setFeePercent(String(s.platform_fee_percent ?? 4));
        setEscrowDays(String(s.escrow_release_days ?? 3));
        setMinPayout(String(s.min_payout_amount ?? 20));
      })
      .catch((err) => {
        setMsg({
          kind: 'error',
          text: err instanceof Error ? err.message : 'Failed to load payment rules.',
        });
      })
      .finally(() => setLoading(false));
  }, [open]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      await VendlySettingsService.updateSettings({
        platform_fee_percent: Number(feePercent),
        escrow_release_days: Number(escrowDays),
        min_payout_amount: Number(minPayout),
      });
      setMsg({ kind: 'success', text: 'Platform payment rules saved!' });
    } catch (err) {
      setMsg({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Failed to update settings.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SimpleModal
      open={open}
      title="Platform Payment & Escrow Rules"
      subtitle="Live configuration for commission rate, buyer inspection escrow window, and payout minimums."
      onClose={() => !saving && onClose()}
    >
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Spinner size="md" />
        </div>
      ) : (
        <form onSubmit={(e) => void handleSave(e)} className="space-y-4 text-xs">
          {msg && <Alert variant={msg.kind === 'success' ? 'success' : 'error'}>{msg.text}</Alert>}
          <div className="space-y-1">
            <label className="text-muted-foreground text-[10px] font-semibold uppercase">
              Platform Commission Fee (%)
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="30"
              value={feePercent}
              onChange={(e) => setFeePercent(e.target.value)}
              required
              className="bg-muted border-border h-9 w-full rounded-lg border px-3 font-mono text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="text-muted-foreground text-[10px] font-semibold uppercase">
              Escrow Auto-Release Window (Days after Delivery)
            </label>
            <input
              type="number"
              step="1"
              min="0"
              max="30"
              value={escrowDays}
              onChange={(e) => setEscrowDays(e.target.value)}
              required
              className="bg-muted border-border h-9 w-full rounded-lg border px-3 font-mono text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="text-muted-foreground text-[10px] font-semibold uppercase">
              Minimum Payout Amount (GH₵)
            </label>
            <input
              type="number"
              step="1"
              min="1"
              value={minPayout}
              onChange={(e) => setMinPayout(e.target.value)}
              required
              className="bg-muted border-border h-9 w-full rounded-lg border px-3 font-mono text-xs"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={saving} className="gap-1">
              <Settings2 className="h-3.5 w-3.5" />
              Save Rules
            </Button>
          </div>
        </form>
      )}
    </SimpleModal>
  );
}
