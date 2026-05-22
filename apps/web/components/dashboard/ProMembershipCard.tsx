"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Sparkles, CheckCircle2, Loader2, ChevronRight } from "lucide-react";
import { useAuth } from "@/lib/contexts/auth-context";
import { useProStatus } from "@/hooks/useProStatus";
import { subscriptionApi, PRO_PRICE_GHS } from "@/lib/api/subscription";
import { toast } from "sonner";

const PRO_PERKS = [
  "Lower platform fees on every sale",
  "Featured placement in category listings",
  "Advanced analytics & stock alerts",
  "Priority support response",
];

export default function ProMembershipCard() {
  const { token, refreshUser } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { status, isLoading, reload } = useProStatus();
  const [starting, setStarting] = useState(false);

  // Verify after Paystack redirect: ?subscription=pro&reference=pro_xxx
  const verifyingRef = useRef(false);
  useEffect(() => {
    const sub = searchParams.get("subscription");
    const reference = searchParams.get("reference");
    if (sub !== "pro" || !reference || !token || verifyingRef.current) return;
    verifyingRef.current = true;

    (async () => {
      try {
        const res = await subscriptionApi.verifyPro(token, reference);
        if (res.verified) {
          toast.success("Pro activated. Welcome aboard.");
          await Promise.all([reload(), refreshUser?.()]);
        } else {
          toast.error("Payment not yet confirmed. We'll retry on our side.");
        }
      } catch (e: any) {
        toast.error(e?.message || "Could not verify payment");
      } finally {
        router.replace(pathname);
      }
    })();
  }, [searchParams, token, pathname, router, reload, refreshUser]);

  async function startUpgrade() {
    if (!token) return;
    setStarting(true);
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const callbackUrl = `${origin}${pathname}?subscription=pro`;
      const res = await subscriptionApi.initializePro(token, callbackUrl);
      const url = res.data?.authorization_url;
      if (!url) throw new Error("No checkout URL returned");
      // Paystack appends ?reference= to the callback for us, so we don't need to attach it manually.
      window.location.href = url;
    } catch (e: any) {
      toast.error(e?.message || "Failed to start checkout");
    } finally {
      setStarting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 flex items-center gap-3">
        <Loader2 className="w-4 h-4 animate-spin text-[var(--color-muted)]" />
        <span className="text-xs text-[var(--color-muted)]">Loading membership…</span>
      </div>
    );
  }

  const isPro = !!status?.is_pro;
  const expires = status?.pro_expires_at ? new Date(status.pro_expires_at) : null;
  const expiresLabel = expires
    ? expires.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden rounded-3xl border p-5 ${
        isPro
          ? "border-[var(--color-accent)]/40 bg-gradient-to-br from-[var(--color-accent)]/10 via-[var(--color-surface)] to-[var(--color-surface)]"
          : "border-[var(--color-border)] bg-[var(--color-surface)]"
      }`}
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${
              isPro
                ? "bg-[var(--color-accent)]/15 text-[var(--color-accent)]"
                : "bg-[var(--color-border)]/40 text-[var(--color-muted)]"
            }`}
          >
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-medium text-[var(--color-foreground)]">Vendly Pro</h2>
              {isPro ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-normal bg-emerald-500/10 text-emerald-600">
                  <CheckCircle2 className="w-3 h-3" />
                  Active
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-normal bg-[var(--color-border)]/50 text-[var(--color-muted)]">
                  Free plan
                </span>
              )}
            </div>
            <p className="text-[11px] text-[var(--color-muted)] leading-snug">
              {isPro && expiresLabel
                ? `Renews on ${expiresLabel}. Tap to extend by another month.`
                : `Unlock premium tools for GH₵${PRO_PRICE_GHS}/month. Cancel anytime.`}
            </p>
          </div>
        </div>

        <button
          onClick={startUpgrade}
          disabled={starting}
          className={`flex-shrink-0 inline-flex items-center gap-1.5 h-10 px-4 rounded-2xl text-xs font-medium transition-all
            ${
              isPro
                ? "bg-[var(--color-foreground)] text-[var(--color-background)] hover:opacity-90"
                : "bg-[var(--color-accent)] text-white hover:opacity-90"
            }
            disabled:opacity-60 disabled:cursor-not-allowed`}
        >
          {starting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Starting…
            </>
          ) : isPro ? (
            <>
              Extend <ChevronRight className="w-3.5 h-3.5" />
            </>
          ) : (
            <>
              Upgrade · GH₵{PRO_PRICE_GHS}
              <ChevronRight className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </div>

      <ul className="grid sm:grid-cols-2 gap-x-4 gap-y-1.5 mt-4 pl-13">
        {PRO_PERKS.map((perk) => (
          <li
            key={perk}
            className="flex items-start gap-2 text-[11px] text-[var(--color-foreground)]/80 leading-snug"
          >
            <CheckCircle2
              className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${
                isPro ? "text-[var(--color-accent)]" : "text-[var(--color-muted)]/60"
              }`}
            />
            {perk}
          </li>
        ))}
      </ul>
    </motion.div>
  );
}
