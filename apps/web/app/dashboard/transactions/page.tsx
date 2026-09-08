"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
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
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/contexts/auth-context";
import { paymentApi } from "@/lib/api/payment";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import clsx from "@/utils/clsx";

export default function SellerTransactionsPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "SUCCESS" | "PENDING" | "FAILED">("ALL");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = async () => {
    if (!token) return;
    try {
      setIsLoading(true);
      setError(null);
      const res = await paymentApi.getTransactions(token, { page: 1, limit: 100 });
      setItems(res?.items || []);
    } catch (err: any) {
      setError(err.message || "Failed to load transactions.");
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

    const matchesStatus = statusFilter === "ALL" || tx.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const successful = items.filter((t) => t.status === "SUCCESS");
  const totalGross = successful.reduce((sum, t) => sum + (t.gross_amount || Number(t.amount) || 0), 0);
  const totalFees = totalGross * 0.04;
  const totalNet = totalGross * 0.96;

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
              Transactions &amp; Fees
            </h1>
          </div>
          <p className="text-xs text-muted-foreground">
            Complete breakdown of sales revenue, 4% platform fees, and net payouts.
          </p>
        </div>

        {/* Quick Tabs to Payouts */}
        <div className="flex items-center gap-2">
          <Link href="/dashboard/transactions">
            <Button size="sm" className="h-9 px-4 rounded-xl text-xs font-semibold bg-primary text-primary-foreground shadow-none">
              Transactions
            </Button>
          </Link>
          <Link href="/dashboard/payouts">
            <Button variant="secondary" size="sm" className="h-9 px-4 rounded-xl text-xs font-semibold">
              Payouts
            </Button>
          </Link>
          <Button
            onClick={load}
            variant="secondary"
            size="sm"
            className="h-9 w-9 p-0 rounded-xl flex items-center justify-center"
            title="Refresh Transactions"
          >
            <RefreshCw className={clsx("w-3.5 h-3.5", isLoading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* 4% Fee Policy Transparency Banner */}
      <div className="p-4 rounded-2xl border border-primary/20 bg-primary/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-start sm:items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Percent className="w-4 h-4" />
          </div>
          <div>
            <span className="font-semibold text-foreground">Transparent 4% Platform Fee: </span>
            <span className="text-muted-foreground">
              Verndly charges a flat 4% platform commission on completed orders. You keep 96% net, disbursed straight to your bank or mobile money account.
            </span>
          </div>
        </div>
        <Link href="/dashboard/settings/terms" className="text-[11px] font-semibold text-primary hover:underline shrink-0">
          View Terms
        </Link>
      </div>

      {/* Financial Metrics Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 rounded-2xl bg-surface/40 border-0 shadow-none space-y-1.5" hoverEffect={false}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Net Earnings (96%)
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            GH₵ {totalNet.toFixed(2)}
          </p>
          <p className="text-[10px] text-muted-foreground">Your actual take-home revenue</p>
        </Card>

        <Card className="p-5 rounded-2xl bg-surface/40 border-0 shadow-none space-y-1.5" hoverEffect={false}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Gross Sales (100%)
            </span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-bold font-mono text-foreground">
            GH₵ {totalGross.toFixed(2)}
          </p>
          <p className="text-[10px] text-muted-foreground">Total customer order sum</p>
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
            -GH₵ {totalFees.toFixed(2)}
          </p>
          <p className="text-[10px] text-muted-foreground">Automated platform commission</p>
        </Card>

        <Card className="p-5 rounded-2xl bg-surface/40 border-0 shadow-none space-y-1.5" hoverEffect={false}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Completed Sales
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-bold font-mono text-foreground">
            {successful.length}
          </p>
          <p className="text-[10px] text-muted-foreground">Successfully processed orders</p>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Search Reference, Paystack ID, Customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-9 pr-4 rounded-xl bg-surface/60 border-0 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/30 font-medium"
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
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
            Loading your transactions...
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
      ) : filteredItems.length === 0 ? (
        <div className="py-20 text-center space-y-3 rounded-3xl bg-surface/20 border-0">
          <CreditCard className="w-12 h-12 text-muted-foreground/30 mx-auto" />
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {searchQuery ? "No matching transactions found" : "No transactions recorded yet"}
          </p>
          <p className="text-[11px] text-muted-foreground">
            When buyers place orders in your store, their payment logs and 4% fee breakdowns will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filteredItems.map((tx, idx) => {
              const gross = Number(tx.gross_amount ?? tx.amount ?? 0);
              const fee = Number(tx.platform_fee ?? (gross * 0.04).toFixed(2));
              const net = Number(tx.net_amount ?? (gross - fee).toFixed(2));
              const isCash = tx.provider === "CASH" || tx.provider === "CASH_ON_DELIVERY";
              const customerName = tx.payer?.name || tx.order?.customer_name || "Customer";

              return (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ delay: idx * 0.02 }}
                  className="p-5 rounded-2xl bg-surface/40 hover:bg-surface/60 transition-colors border-0 shadow-none space-y-3"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Channel & Reference */}
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={clsx(
                          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                          tx.status === "SUCCESS"
                            ? "bg-emerald-500/10 text-emerald-600"
                            : tx.status === "FAILED"
                            ? "bg-red-500/10 text-red-600"
                            : "bg-amber-500/10 text-amber-600"
                        )}
                      >
                        {isCash ? <Banknote className="w-5 h-5" /> : <CreditCard className="w-5 h-5" />}
                      </div>

                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-xs text-foreground tracking-tight">
                            {tx.reference}
                          </span>
                          <button
                            onClick={() => handleCopy(tx.reference, tx.id)}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            title="Copy Reference"
                          >
                            {copiedId === tx.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>

                          <span
                            className={clsx(
                              "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider",
                              tx.status === "SUCCESS"
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : tx.status === "FAILED"
                                ? "bg-red-500/10 text-red-600 dark:text-red-400"
                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            )}
                          >
                            {tx.status === "SUCCESS" ? "Paid" : tx.status}
                          </span>

                          <span
                            className={clsx(
                              "px-2 py-0.5 rounded-full text-[9px] font-medium uppercase tracking-wider",
                              isCash ? "bg-amber-500/10 text-amber-600" : "bg-blue-500/10 text-blue-600"
                            )}
                          >
                            {isCash ? "Cash on Delivery" : "Paystack Online"}
                          </span>
                        </div>

                        <p className="text-[11px] text-muted-foreground flex items-center gap-2 flex-wrap">
                          <span>Buyer: <strong className="text-foreground font-medium">{customerName}</strong></span>
                          <span>•</span>
                          <span>{new Date(tx.created_at).toLocaleDateString(undefined, { dateStyle: "medium" })}</span>
                          {tx.provider_ref && (
                            <>
                              <span>•</span>
                              <span>Paystack ID: <code className="font-mono text-foreground">{tx.provider_ref}</code></span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* 3-Way Financial Calculation: Gross - 4% = Net */}
                    <div className="flex items-center gap-4 sm:gap-6 justify-between lg:justify-end border-t lg:border-t-0 pt-3 lg:pt-0 border-border/30">
                      <div className="text-left lg:text-right space-y-0.5">
                        <span className="text-[9px] uppercase tracking-wider text-muted-foreground block font-semibold">
                          Gross Order
                        </span>
                        <span className="text-xs font-semibold font-mono text-foreground">
                          GH₵ {gross.toFixed(2)}
                        </span>
                      </div>

                      <div className="text-left lg:text-right space-y-0.5 px-3 py-1.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                        <span className="text-[9px] uppercase tracking-wider block font-bold">
                          4% Platform Fee
                        </span>
                        <span className="text-xs font-bold font-mono">
                          -GH₵ {fee.toFixed(2)}
                        </span>
                      </div>

                      <div className="text-right space-y-0.5">
                        <span className="text-[9px] uppercase tracking-wider text-muted-foreground block font-semibold">
                          Net Earnings (96%)
                        </span>
                        <span className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">
                          +GH₵ {net.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Order linkage bar */}
                  <div className="pt-2.5 border-t border-border/30 flex items-center justify-between text-[11px] text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <span>Order: <code className="font-mono text-foreground">#ORD-{tx.order_id?.slice(-6)?.toUpperCase()}</code></span>
                      {tx.payout && (
                        <>
                          <span>•</span>
                          <span>Payout: <strong className="text-foreground uppercase text-[10px]">{tx.payout.status}</strong></span>
                        </>
                      )}
                    </div>

                    <Link
                      href={`/dashboard/orders`}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                    >
                      <span>View Orders</span>
                      <ExternalLink className="w-3 h-3" />
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
