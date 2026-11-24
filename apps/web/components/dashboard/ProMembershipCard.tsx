'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Sparkles, CheckCircle2, ChevronRight } from 'lucide-react';
import Spinner from '@/components/ui/Spinner';
import { useAuth } from '@/lib/contexts/auth-context';
import { useProStatus } from '@/hooks/useProStatus';
import { subscriptionApi, PRO_PRICE_GHS, type ProPlan } from '@/lib/api/subscription';
import { toast } from 'sonner';

const PRO_PERKS = [
  'Lower platform fees on every sale',
  'Featured placement in category listings',
  'Advanced analytics & stock alerts',
  'Priority support response',
];

export default function ProMembershipCard() {
  const { token, refreshUser } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { status, isLoading, reload } = useProStatus();
  const [starting, setStarting] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<ProPlan>('annual');

  // Verify after Paystack redirect: ?subscription=pro&reference=pro_xxx
  const verifyingRef = useRef(false);
  useEffect(() => {
    const sub = searchParams.get('subscription');
    const reference = searchParams.get('reference');
    if (sub !== 'pro' || !reference || !token || verifyingRef.current) return;
    verifyingRef.current = true;

    (async () => {
      try {
        const res = await subscriptionApi.verifyPro(token, reference);
        if (res.verified) {
          toast.success('Pro activated. Welcome aboard.');
          await Promise.all([reload(), refreshUser?.()]);
        } else {
          toast.error("Payment not yet confirmed. We'll retry on our side.");
        }
      } catch (e: any) {
        toast.error(e?.message || 'Could not verify payment');
      } finally {
        router.replace(pathname);
      }
    })();
  }, [searchParams, token, pathname, router, reload, refreshUser]);

  async function startUpgrade(plan: ProPlan = selectedPlan) {
    if (!token) return;
    setStarting(true);
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const callbackUrl = `${origin}${pathname}?subscription=pro`;
      const res = await subscriptionApi.initializePro(token, callbackUrl, plan);
      const url = res.data?.authorization_url;
      if (!url) throw new Error('No checkout URL returned');
      // Paystack appends ?reference= to the callback for us, so we don't need to attach it manually.
      window.location.href = url;
    } catch (e: any) {
      toast.error(e?.message || 'Failed to start checkout');
    } finally {
      setStarting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 rounded-3xl bg-[var(--color-surface)] p-4">
        <Spinner size="xs" />
        <span className="text-xs text-[var(--color-muted)]">Loading membership…</span>
      </div>
    );
  }

  const isPro = !!status?.is_pro;
  const expires = status?.pro_expires_at ? new Date(status.pro_expires_at) : null;
  const expiresLabel = expires
    ? expires.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    : null;

  const monthly = status?.plans?.monthly ?? {
    price_ghs: PRO_PRICE_GHS,
    duration_days: 30,
  };
  const annual = status?.plans?.annual;
  const selectedAmount = selectedPlan === 'annual' && annual ? annual.price_ghs : monthly.price_ghs;
  const ctaLabel = isPro
    ? selectedPlan === 'annual'
      ? 'Extend +1 year'
      : 'Extend +1 month'
    : `Upgrade · GH₵${selectedAmount}${selectedPlan === 'annual' ? '/yr' : '/mo'}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden rounded-3xl p-5 ${
        isPro ? 'bg-[var(--color-accent)]/10' : 'bg-[var(--color-surface)]'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div
            className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl ${
              isPro
                ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent)]'
                : 'bg-[var(--color-border)]/40 text-[var(--color-muted)]'
            }`}
          >
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-medium text-[var(--color-foreground)]">Verndly Pro</h2>
              {isPro ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-normal text-emerald-600">
                  <CheckCircle2 className="h-3 w-3" />
                  Active
                </span>
              ) : (
                <span className="bg-[var(--color-border)]/50 rounded-full px-2 py-0.5 text-[10px] font-normal text-[var(--color-muted)]">
                  Free plan
                </span>
              )}
            </div>
            <p className="text-[11px] leading-snug text-[var(--color-muted)]">
              {isPro && expiresLabel
                ? `Your Pro is active through ${expiresLabel}. Pick a plan to extend.`
                : `Unlock premium tools. Choose monthly or save with annual.`}
            </p>
          </div>
        </div>

        <button
          onClick={() => startUpgrade()}
          disabled={starting}
          className={`inline-flex h-10 flex-shrink-0 items-center gap-1.5 rounded-2xl px-4 text-xs font-medium transition-all ${
            isPro
              ? 'bg-[var(--color-foreground)] text-[var(--color-background)] hover:opacity-90'
              : 'bg-[var(--color-accent)] text-white hover:opacity-90'
          } disabled:cursor-not-allowed disabled:opacity-60`}
        >
          {starting ? (
            <>
              <Spinner size="xs" />
              Starting…
            </>
          ) : (
            <>
              {ctaLabel}
              <ChevronRight className="h-3.5 w-3.5" />
            </>
          )}
        </button>
      </div>

      {/* Plan picker */}
      <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setSelectedPlan('monthly')}
          className={`rounded-2xl p-3.5 text-left transition-colors ${
            selectedPlan === 'monthly'
              ? 'bg-[var(--color-accent)]/12'
              : 'hover:bg-[var(--color-background)]/80 bg-[var(--color-background)]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-[var(--color-muted)]">
              Monthly
            </span>
            {selectedPlan === 'monthly' && (
              <CheckCircle2 className="h-3.5 w-3.5 text-[var(--color-accent)]" />
            )}
          </div>
          <div className="mt-1 text-sm font-medium">
            GH₵{monthly.price_ghs}
            <span className="text-[11px] font-normal text-[var(--color-muted)]"> / month</span>
          </div>
          <div className="mt-0.5 text-[10px] text-[var(--color-muted)]">
            Pay as you go. Cancel anytime.
          </div>
        </button>

        <button
          type="button"
          onClick={() => setSelectedPlan('annual')}
          className={`relative rounded-2xl p-3.5 text-left transition-colors ${
            selectedPlan === 'annual'
              ? 'bg-[var(--color-accent)]/12'
              : 'hover:bg-[var(--color-background)]/80 bg-[var(--color-background)]'
          }`}
        >
          {annual && (
            <span className="absolute -top-2 right-3 rounded-full bg-emerald-500 px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider text-white">
              Save {annual.discount_pct}%
            </span>
          )}
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-[var(--color-muted)]">
              Annual
            </span>
            {selectedPlan === 'annual' && (
              <CheckCircle2 className="h-3.5 w-3.5 text-[var(--color-accent)]" />
            )}
          </div>
          <div className="mt-1 text-sm font-medium">
            GH₵{annual ? annual.price_ghs : monthly.price_ghs * 9}
            <span className="text-[11px] font-normal text-[var(--color-muted)]"> / year</span>
          </div>
          <div className="mt-0.5 text-[10px] text-[var(--color-muted)]">
            {annual ? (
              <>
                Just GH₵{annual.monthly_equivalent_ghs}/mo · save GH₵{annual.savings_ghs}
              </>
            ) : (
              <>Best value — 12 months upfront</>
            )}
          </div>
        </button>
      </div>

      <ul className="pl-13 mt-4 grid gap-x-4 gap-y-1.5 sm:grid-cols-2">
        {PRO_PERKS.map((perk) => (
          <li
            key={perk}
            className="text-[var(--color-foreground)]/80 flex items-start gap-2 text-[11px] leading-snug"
          >
            <CheckCircle2
              className={`mt-0.5 h-3.5 w-3.5 flex-shrink-0 ${
                isPro ? 'text-[var(--color-accent)]' : 'text-[var(--color-muted)]/60'
              }`}
            />
            {perk}
          </li>
        ))}
      </ul>
    </motion.div>
  );
}
