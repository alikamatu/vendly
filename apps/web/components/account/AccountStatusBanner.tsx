'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, PauseCircle, RotateCcw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/contexts/auth-context';
import { authApi } from '@/lib/api/auth';

export default function AccountStatusBanner() {
  const { user, token, refreshUser } = useAuth();
  const [busy, setBusy] = useState(false);

  if (!user || !token) return null;

  const isPendingDeletion = Boolean(user.deletion_scheduled_for);
  const isDisabled = !isPendingDeletion && Boolean(user.disabled_at);

  if (!isPendingDeletion && !isDisabled) return null;

  const formattedDate = user.deletion_scheduled_for
    ? new Date(user.deletion_scheduled_for).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '';

  const settingsHref = user.role === 'SELLER' ? '/dashboard/settings/data' : '/account/data';

  const handleRestore = async () => {
    setBusy(true);
    try {
      if (isPendingDeletion) {
        const res = await authApi.cancelAccountDeletion(token);
        toast.success(res.message || 'Scheduled deletion cancelled.');
      } else {
        const res = await authApi.reactivateAccount(token);
        toast.success(res.message || 'Your account is active again.');
      }
      await refreshUser();
    } catch (err: any) {
      toast.error(err?.message || 'Could not update your account status.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="status"
      className={isPendingDeletion ? 'bg-red-600 text-white' : 'bg-amber-500 text-neutral-950'}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-2.5 px-4 py-3 text-xs sm:flex-row sm:items-center sm:justify-between md:px-8">
        <div className="flex items-start gap-2.5 sm:items-center">
          {isPendingDeletion ? (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 sm:mt-0" />
          ) : (
            <PauseCircle className="mt-0.5 h-4 w-4 shrink-0 sm:mt-0" />
          )}
          <p className="leading-snug">
            {isPendingDeletion ? (
              <>
                <strong>Account scheduled for permanent deletion on {formattedDate}.</strong> Your
                storefront and listings are hidden. All products will be permanently deleted on that
                date unless you cancel.
              </>
            ) : (
              <>
                <strong>Your account is currently disabled.</strong>{' '}
                {user.role === 'SELLER'
                  ? 'Your storefront and listings are hidden from buyers.'
                  : 'Reactivate anytime to resume full access.'}
              </>
            )}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            href={settingsHref}
            className="rounded-full bg-black/15 px-3 py-1.5 text-[11px] font-medium transition-opacity hover:opacity-85"
          >
            Manage
          </Link>
          <button
            type="button"
            onClick={handleRestore}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-[11px] font-semibold text-neutral-950 transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RotateCcw className="h-3.5 w-3.5" />
            )}
            <span>{isPendingDeletion ? 'Cancel Deletion' : 'Reactivate Account'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
