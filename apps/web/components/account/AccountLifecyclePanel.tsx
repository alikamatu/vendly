'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Download,
  Trash2,
  PauseCircle,
  RotateCcw,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  ShieldAlert,
  Clock,
  Lock,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/contexts/auth-context';
import { authApi, type AccountLifecycleStatus, type LifecycleBlocker } from '@/lib/api/auth';

interface AccountLifecyclePanelProps {
  backHref: string;
  backLabel: string;
}

function BlockerList({ blockers }: { blockers: LifecycleBlocker[] }) {
  if (blockers.length === 0) return null;
  return (
    <div className="space-y-2 rounded-2xl bg-amber-500/10 p-4">
      <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 dark:text-amber-300">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>Resolve these items first</span>
      </div>
      <ul className="space-y-2">
        {blockers.map((b) => (
          <li
            key={b.code}
            className="flex flex-col justify-between gap-2 text-xs leading-relaxed text-amber-800/90 sm:flex-row sm:items-center dark:text-amber-200/90"
          >
            <span>{b.label}</span>
            {b.href && (
              <Link
                href={b.href}
                className="inline-flex shrink-0 items-center gap-1 font-semibold underline underline-offset-4 hover:opacity-80"
              >
                <span>View</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function AccountLifecyclePanel({ backHref, backLabel }: AccountLifecyclePanelProps) {
  const { user, token, logout, refreshUser } = useAuth();
  const router = useRouter();

  const [lifecycle, setLifecycle] = useState<AccountLifecycleStatus | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [activeAction, setActiveAction] = useState<'disable' | 'delete' | null>(null);
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  const loadStatus = useCallback(async () => {
    if (!token) return;
    setIsLoadingStatus(true);
    try {
      const data = await authApi.getAccountLifecycleStatus(token);
      setLifecycle(data);
    } catch (err: any) {
      setNotice({ ok: false, text: err?.message || 'Could not load account status.' });
    } finally {
      setIsLoadingStatus(false);
    }
  }, [token]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  if (!user || !token) return null;

  const isSeller = lifecycle?.is_seller ?? user.role === 'SELLER';
  const hasPassword = lifecycle?.has_password ?? user.has_password ?? true;

  const handleExportData = async () => {
    setIsExporting(true);
    setNotice(null);
    try {
      const data = await authApi.exportData(token);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `verndly-data-export-${user.id}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setNotice({ ok: true, text: 'Your account data export has been downloaded.' });
    } catch (err: any) {
      setNotice({ ok: false, text: err?.message || 'Failed to export data.' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDisable = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setNotice(null);
    try {
      const res = await authApi.disableAccount(token, hasPassword ? { password } : { confirmText });
      toast.success(res.message);
      logout();
      router.push('/login');
    } catch (err: any) {
      setNotice({ ok: false, text: err?.message || 'Could not disable your account.' });
      setSubmitting(false);
    }
  };

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setNotice(null);
    try {
      const res = await authApi.deleteAccount(token, hasPassword ? { password } : { confirmText });
      toast.success(res.message);
      logout();
      router.push('/');
    } catch (err: any) {
      setNotice({ ok: false, text: err?.message || 'Could not delete your account.' });
      setSubmitting(false);
    }
  };

  const handleRestore = async (mode: 'reactivate' | 'cancel-deletion') => {
    setRestoring(true);
    setNotice(null);
    try {
      const res =
        mode === 'cancel-deletion'
          ? await authApi.cancelAccountDeletion(token)
          : await authApi.reactivateAccount(token);
      toast.success(res.message);
      setNotice({ ok: true, text: res.message });
      await Promise.all([refreshUser(), loadStatus()]);
    } catch (err: any) {
      setNotice({ ok: false, text: err?.message || 'Could not update account status.' });
    } finally {
      setRestoring(false);
    }
  };

  const scheduledDateText = lifecycle?.deletion_scheduled_for
    ? new Date(lifecycle.deletion_scheduled_for).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '';

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-20">
      <Link
        href={backHref}
        className="group inline-flex items-center gap-2 text-xs font-medium text-[var(--color-muted)] transition-colors hover:text-[var(--color-foreground)]"
      >
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
        <span>Back to {backLabel}</span>
      </Link>

      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight text-[var(--color-foreground)] sm:text-2xl">
          Data, Privacy &amp; Account Status
        </h1>
        <p className="text-xs leading-relaxed text-[var(--color-muted)] sm:text-sm">
          Export a copy of your data, temporarily disable your account, or permanently delete it.
        </p>
      </div>

      <AnimatePresence>
        {notice && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`flex items-start gap-3 rounded-2xl px-4 py-3.5 text-xs font-medium leading-relaxed ${
              notice.ok
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                : 'bg-red-500/10 text-red-600 dark:text-red-400'
            }`}
          >
            {notice.ok ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <span>{notice.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Current Pending-Deletion / Disabled Status Card */}
      {lifecycle?.status === 'PENDING_DELETION' && (
        <div className="space-y-4 rounded-3xl bg-red-500/10 p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-red-500/15 text-red-600">
              <Clock className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-red-700 dark:text-red-300">
                Permanent Deletion Scheduled for {scheduledDateText}
              </h2>
              <p className="text-xs leading-relaxed text-red-700/80 dark:text-red-200/80">
                Your storefront and {lifecycle.product_count} product
                {lifecycle.product_count === 1 ? '' : 's'} are currently hidden from buyers. On{' '}
                <strong>{scheduledDateText}</strong>, all of your products will be permanently
                deleted and your store link will be retired.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleRestore('cancel-deletion')}
            disabled={restoring}
            className="bg-foreground text-background inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-5 text-xs font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {restoring ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4" />
            )}
            <span>Cancel Deletion &amp; Restore Storefront</span>
          </button>
        </div>
      )}

      {lifecycle?.status === 'DISABLED' && (
        <div className="space-y-4 rounded-3xl bg-amber-500/10 p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-700 dark:text-amber-300">
              <PauseCircle className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                Your Account Is Currently Disabled
              </h2>
              <p className="text-xs leading-relaxed text-amber-800/80 dark:text-amber-200/80">
                {isSeller
                  ? 'Your storefront and product listings are paused and hidden from buyers. Reactivate whenever you are ready to sell again.'
                  : 'Your account is currently paused. Reactivate anytime with one click.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleRestore('reactivate')}
            disabled={restoring}
            className="bg-foreground text-background inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-5 text-xs font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {restoring ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4" />
            )}
            <span>Reactivate Account</span>
          </button>
        </div>
      )}

      {/* 1. Export Data */}
      <section className="space-y-4 rounded-3xl bg-[var(--color-surface)] p-6">
        <div className="flex items-start gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Download className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-[var(--color-foreground)]">
              Export your data
            </h2>
            <p className="text-xs leading-relaxed text-[var(--color-muted)]">
              Download a JSON archive of your profile, saved items, addresses, and order history. We
              recommend exporting before deleting your account.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleExportData}
          disabled={isExporting}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--color-background)] text-xs font-semibold text-[var(--color-foreground)] transition-opacity hover:opacity-85 disabled:opacity-50 sm:w-auto sm:px-6"
        >
          {isExporting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Preparing Export…
            </>
          ) : (
            <>
              <Download className="h-4 w-4" /> Download Data Export
            </>
          )}
        </button>
      </section>

      {/* 2. Disable Account (Reversible) */}
      {lifecycle?.status === 'ACTIVE' && (
        <section className="space-y-4 rounded-3xl bg-[var(--color-surface)] p-6">
          <div className="flex items-start gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <PauseCircle className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-[var(--color-foreground)]">
                Disable Account (Temporary)
              </h2>
              <p className="text-xs leading-relaxed text-[var(--color-muted)]">
                {isSeller
                  ? 'Pause your seller account without losing your products or store link. Your storefront and listings will be hidden from buyers immediately, and you can reactivate anytime by signing back in.'
                  : 'Temporarily pause your account. Nothing is deleted, and you can reactivate anytime simply by signing back in.'}
              </p>
            </div>
          </div>

          {isLoadingStatus ? (
            <div className="flex items-center gap-2 text-xs text-[var(--color-muted)]">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking account eligibility…
            </div>
          ) : (
            <>
              <BlockerList blockers={lifecycle.disable_blockers} />

              {activeAction === 'disable' ? (
                <form
                  onSubmit={handleDisable}
                  className="space-y-3 rounded-2xl bg-[var(--color-background)] p-4"
                >
                  <p className="text-xs font-medium text-[var(--color-foreground)]">
                    {hasPassword
                      ? 'Enter your password to disable your account:'
                      : 'Type DISABLE to confirm disabling your account:'}
                  </p>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-muted)]" />
                    {hasPassword ? (
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Current password"
                        className="h-11 w-full rounded-xl bg-[var(--color-surface)] pl-9 pr-3.5 text-xs text-[var(--color-foreground)] outline-none"
                      />
                    ) : (
                      <input
                        type="text"
                        required
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        placeholder="Type DISABLE"
                        className="h-11 w-full rounded-xl bg-[var(--color-surface)] pl-9 pr-3.5 text-xs text-[var(--color-foreground)] outline-none"
                      />
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 text-xs font-semibold text-neutral-950 transition-opacity hover:opacity-90 disabled:opacity-50"
                    >
                      {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      <span>Confirm Disable</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveAction(null);
                        setPassword('');
                        setConfirmText('');
                      }}
                      disabled={submitting}
                      className="inline-flex h-10 items-center justify-center rounded-xl bg-[var(--color-surface)] px-4 text-xs font-medium text-[var(--color-foreground)]"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  type="button"
                  disabled={!lifecycle.can_disable}
                  onClick={() => {
                    setActiveAction('disable');
                    setPassword('');
                    setConfirmText('');
                    setNotice(null);
                  }}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-amber-500/15 px-5 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-500/25 disabled:cursor-not-allowed disabled:opacity-40 dark:text-amber-300"
                >
                  <PauseCircle className="h-4 w-4" />
                  <span>Disable Account</span>
                </button>
              )}
            </>
          )}
        </section>
      )}

      {/* 3. Delete Account (Immediate for Buyers, 14-Day Grace Period for Sellers) */}
      {lifecycle?.status !== 'PENDING_DELETION' && (
        <section className="space-y-4 rounded-3xl bg-red-500/5 p-6">
          <div className="flex items-start gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-red-500/10 text-red-600">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-semibold text-red-600 dark:text-red-400">
                  Delete Account Permanently
                </h2>
                <span className="rounded-full bg-red-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-red-600 dark:text-red-400">
                  {isSeller ? '14-Day Grace Period' : 'Immediate'}
                </span>
              </div>
              {isSeller ? (
                <p className="text-xs leading-relaxed text-[var(--color-muted)]">
                  Seller account deletion takes <strong>14 calendar days</strong> to finalize. Your
                  storefront and{' '}
                  <strong>
                    {lifecycle?.product_count ?? 0} product
                    {(lifecycle?.product_count ?? 0) === 1 ? '' : 's'}
                  </strong>{' '}
                  are hidden immediately, a reminder email is sent 3 days before completion, and on
                  Day 14 all products are permanently deleted and your store link is retired. You
                  cannot delete your account while standing orders, 3-day escrow holds, open
                  returns, or unsettled payouts remain.
                </p>
              ) : (
                <p className="text-xs leading-relaxed text-[var(--color-muted)]">
                  Your buyer account will be deleted <strong>immediately</strong> once we confirm
                  you have no active orders or open return claims. Past order history is anonymized
                  for accounting records, and your email address is freed up if you ever return.
                </p>
              )}
            </div>
          </div>

          {isLoadingStatus ? (
            <div className="flex items-center gap-2 text-xs text-[var(--color-muted)]">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking orders &amp; payouts…
            </div>
          ) : lifecycle ? (
            <>
              <BlockerList blockers={lifecycle.delete_blockers} />

              {activeAction === 'delete' ? (
                <form
                  onSubmit={handleDelete}
                  className="space-y-3 rounded-2xl bg-[var(--color-background)] p-4"
                >
                  <p className="text-xs font-medium text-red-600 dark:text-red-400">
                    {isSeller
                      ? hasPassword
                        ? 'Enter your password to schedule permanent deletion in 14 days:'
                        : 'Type DELETE to schedule permanent deletion in 14 days:'
                      : hasPassword
                        ? 'Enter your password to permanently delete your account right now:'
                        : 'Type DELETE to permanently delete your account right now:'}
                  </p>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-muted)]" />
                    {hasPassword ? (
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Current password"
                        className="h-11 w-full rounded-xl bg-[var(--color-surface)] pl-9 pr-3.5 text-xs text-[var(--color-foreground)] outline-none"
                      />
                    ) : (
                      <input
                        type="text"
                        required
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        placeholder="Type DELETE"
                        className="h-11 w-full rounded-xl bg-[var(--color-surface)] pl-9 pr-3.5 text-xs text-[var(--color-foreground)] outline-none"
                      />
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                    >
                      {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      <span>
                        {isSeller ? 'Schedule 14-Day Deletion' : 'Permanently Delete Account'}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveAction(null);
                        setPassword('');
                        setConfirmText('');
                      }}
                      disabled={submitting}
                      className="inline-flex h-10 items-center justify-center rounded-xl bg-[var(--color-surface)] px-4 text-xs font-medium text-[var(--color-foreground)]"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  type="button"
                  disabled={!lifecycle.can_delete}
                  onClick={() => {
                    setActiveAction('delete');
                    setPassword('');
                    setConfirmText('');
                    setNotice(null);
                  }}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-red-500/15 px-5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-40 dark:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>{isSeller ? 'Delete Seller Account (14 Days)' : 'Delete Account'}</span>
                </button>
              )}
            </>
          ) : null}
        </section>
      )}
    </div>
  );
}
