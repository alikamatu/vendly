"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/contexts/auth-context";
import { paymentApi } from "@/lib/api/payment";

export default function PayoutsPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const load = async () => {
    if (!token) return;
    try {
      setIsLoading(true);
      const res = await paymentApi.getPayouts(token, { page: 1, limit: 50 });
      setItems(res.items || []);
    } catch (err: any) {
      setError(err.message || "Failed to load payouts");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [token]);

  const retryPayout = async (id: string) => {
    if (!token) return;
    try {
      setRetryingId(id);
      await paymentApi.retryPayout(token, id);
      await load();
    } catch (err: any) {
      setError(err.message || "Failed to retry payout");
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/dashboard" className="text-muted hover:text-foreground">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-lg font-black uppercase tracking-widest">Payouts</h1>
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-red-500 text-sm">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {!isLoading && !error && (
        <div className="space-y-3">
          {items.length === 0 ? (
            <div className="text-sm text-muted">No payouts yet.</div>
          ) : (
            items.map((payout) => (
              <div key={payout.id} className="border border-border/50 rounded-xl p-4 bg-surface/40">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase">{payout.reference}</p>
                    <p className="text-[11px] text-muted">
                      {payout.mode} • {payout.status}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold">GHS {Number(payout.amount).toFixed(2)}</p>
                    {payout.status !== "SUCCESS" && (
                      <button
                        onClick={() => retryPayout(payout.id)}
                        disabled={retryingId === payout.id}
                        className="text-[10px] text-primary font-bold uppercase mt-1 disabled:opacity-50"
                      >
                        {retryingId === payout.id ? "Retrying..." : "Retry"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
