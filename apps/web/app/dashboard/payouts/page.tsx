"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
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
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/contexts/auth-context";
import { paymentApi } from "@/lib/api/payment";
import { storeApi } from "@/lib/api/store";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import clsx from "@/utils/clsx";

export default function SellerPayoutsPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [financials, setFinancials] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

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
      setError(err.message || "Failed to load payouts.");
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
      setNotice({ type: "success", text: "Payout retry queued successfully." });
      await load();
    } catch (err: any) {
      setNotice({ type: "error", text: err.message || "Failed to retry payout." });
    } finally {
      setRetryingId(null);
    }
  };

  const settled = items.filter((p) => p.status === "SUCCESS");
  const totalPaidOut = settled.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const pendingCount = items.filter((p) => p.status === "PENDING" || p.status === "PROCESSING").length;

  const availableBalance = financials?.available_balance ?? 0;
  const totalWithdrawn = financials?.total_withdrawn ?? totalPaidOut;
  const totalPlatformFees = financials?.total_platform_fees ?? (totalWithdrawn / 0.96) * 0.04;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20">
      {/* Header & Sub-nav */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <Link
              href="/dashboard"
              className="w-8 h-8 rounded-xl bg-surface/60 hover:bg-surface flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-xl font-bold uppercase tracking-tight text-foreground">
              Disbursements &amp; Payouts
            </h1>
          </div>
          <p className="text-xs text-muted-foreground">
            Track bank and mobile money settlements · 96% net disbursements after 4% platform commission.
          </p>
        </div>

        {/* Quick Tabs to Transactions */}
        <div className="flex items-center gap-2">
          <Link href="/dashboard/transactions">
            <Button variant="secondary" size="sm" className="h-9 px-4 rounded-xl text-xs font-semibold">
              Transactions
            </Button>
          </Link>
          <Link href="/dashboard/payouts">
            <Button size="sm" className="h-9 px-4 rounded-xl text-xs font-semibold bg-primary text-primary-foreground shadow-none">
              Payouts
            </Button>
          </Link>
          <Button
            onClick={load}
            variant="secondary"
            size="sm"
            className="h-9 w-9 p-0 rounded-xl flex items-center justify-center"
            title="Refresh Payouts"
          >
            <RefreshCw className={clsx("w-3.5 h-3.5", isLoading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Notice Banner */}
      {notice && (
        <div
          className={clsx(
            "p-4 rounded-2xl flex items-center justify-between text-xs font-medium border",
            notice.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600"
              : "bg-red-500/10 border-red-500/20 text-red-600"
          )}
        >
          <span>{notice.text}</span>
          <button onClick={() => setNotice(null)} className="underline text-[11px]">
            Dismiss
          </button>
        </div>
      )}

      {/* Balances Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 rounded-2xl bg-surface/40 border-0 shadow-none space-y-1.5" hoverEffect={false}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Available Balance
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            GH₵ {availableBalance.toFixed(2)}
          </p>
          <p className="text-[10px] text-muted-foreground">Ready for automated transfer</p>
        </Card>

        <Card className="p-5 rounded-2xl bg-surface/40 border-0 shadow-none space-y-1.5" hoverEffect={false}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Total Disbursed (96%)
            </span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600">
              <ArrowDownToLine className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-bold font-mono text-foreground">
            GH₵ {totalWithdrawn.toFixed(2)}
          </p>
          <p className="text-[10px] text-muted-foreground">Net paid to your bank/MoMo</p>
        </Card>

        <Card className="p-5 rounded-2xl bg-surface/40 border-0 shadow-none space-y-1.5" hoverEffect={false}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Platform Fee (4%)
            </span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-bold font-mono text-purple-600 dark:text-purple-400">
            GH₵ {totalPlatformFees.toFixed(2)}
          </p>
          <p className="text-[10px] text-muted-foreground">Total platform fee retained</p>
        </Card>

        <Card className="p-5 rounded-2xl bg-surface/40 border-0 shadow-none space-y-1.5" hoverEffect={false}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Disbursements
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-bold font-mono text-foreground">
            {settled.length}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {pendingCount > 0 ? `${pendingCount} pending queue` : "All settled"}
          </p>
        </Card>
      </div>

      {/* Settlement Account Info Box */}
      <div className="p-5 rounded-2xl bg-surface/30 border-0 shadow-none flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-foreground">
              Automated Paystack Settlements
            </h4>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Net earnings are automatically credited to your linked Mobile Money or Bank account upon customer delivery confirmation.
            </p>
          </div>
        </div>
        <Link href="/dashboard/settings">
          <Button variant="secondary" size="sm" className="h-9 px-4 rounded-xl text-xs font-semibold shrink-0">
            Bank Settings
          </Button>
        </Link>
      </div>

      {/* Payouts History */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
            Loading payout settlements...
          </p>
        </div>
      ) : error ? (
        <div className="p-8 rounded-2xl bg-red-500/10 border border-red-500/20 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
          <p className="text-xs font-semibold text-red-600">{error}</p>
          <Button onClick={load} size="sm" variant="secondary" className="rounded-xl">
            Retry
          </Button>
        </div>
      ) : items.length === 0 ? (
        <div className="py-20 text-center space-y-3 rounded-3xl bg-surface/20 border-0">
          <Wallet className="w-12 h-12 text-muted-foreground/30 mx-auto" />
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            No payout settlements yet
          </p>
          <p className="text-[11px] text-muted-foreground">
            When customer orders are completed, automated disbursements and bank transfers will be recorded here.
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
                  className="p-5 rounded-2xl bg-surface/40 hover:bg-surface/60 transition-colors border-0 shadow-none space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Left: Reference & Status */}
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={clsx(
                          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                          payout.status === "SUCCESS"
                            ? "bg-emerald-500/10 text-emerald-600"
                            : payout.status === "FAILED"
                            ? "bg-red-500/10 text-red-600"
                            : "bg-amber-500/10 text-amber-600"
                        )}
                      >
                        <ArrowDownToLine className="w-5 h-5" />
                      </div>

                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-xs text-foreground tracking-tight">
                            {payout.reference}
                          </span>

                          <span
                            className={clsx(
                              "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider",
                              payout.status === "SUCCESS"
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : payout.status === "FAILED"
                                ? "bg-red-500/10 text-red-600 dark:text-red-400"
                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            )}
                          >
                            {payout.status === "SUCCESS" ? "Disbursed" : payout.status}
                          </span>

                          <span className="px-2 py-0.5 rounded-full bg-muted text-[9px] font-mono uppercase tracking-wider">
                            {payout.mode === "AUTO" ? "Paystack Auto Split" : "Manual Transfer"}
                          </span>
                        </div>

                        <p className="text-[11px] text-muted-foreground flex items-center gap-2 flex-wrap">
                          <span>Date: {new Date(payout.created_at).toLocaleDateString(undefined, { dateStyle: "medium" })}</span>
                          {payout.processed_at && (
                            <>
                              <span>•</span>
                              <span>Completed: {new Date(payout.processed_at).toLocaleDateString()}</span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Right: Net Disbursed & Retry */}
                    <div className="flex items-center gap-4 justify-between sm:justify-end">
                      <div className="text-right space-y-0.5">
                        <span className="text-[9px] uppercase tracking-wider text-muted-foreground block font-semibold">
                          Net Payout (96%)
                        </span>
                        <span className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400">
                          GH₵ {netAmount.toFixed(2)}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono block">
                          (Gross: GH₵{grossAmount.toFixed(2)} - 4% Fee: GH₵{platformFee.toFixed(2)})
                        </span>
                      </div>

                      {payout.status !== "SUCCESS" && (
                        <Button
                          onClick={() => retryPayout(payout.id)}
                          disabled={retryingId === payout.id}
                          variant="secondary"
                          size="sm"
                          className="h-8 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5"
                        >
                          {retryingId === payout.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <RotateCcw className="w-3 h-3" />
                          )}
                          <span>Retry</span>
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Failure reason if any */}
                  {payout.failure_reason && (
                    <div className="pt-2 border-t border-border/30 text-[11px] text-red-500 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
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
