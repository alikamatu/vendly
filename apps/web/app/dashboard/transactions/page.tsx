"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/contexts/auth-context";
import { paymentApi } from "@/lib/api/payment";

export default function TransactionsPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!token) return;
      try {
        setIsLoading(true);
        const res = await paymentApi.getTransactions(token, { page: 1, limit: 50 });
        setItems(res.items || []);
      } catch (err: any) {
        setError(err.message || "Failed to load transactions");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [token]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/dashboard" className="text-muted hover:text-foreground">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-lg font-medium uppercase tracking-wider">Transactions</h1>
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
            <div className="text-sm text-muted">No transactions yet.</div>
          ) : (
            items.map((tx) => (
              <div key={tx.id} className="border border-border/50 rounded-xl p-4 bg-surface/40">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-normal uppercase">{tx.reference}</p>
                    <p className="text-[11px] text-muted">{tx.provider}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-normal">{tx.status}</p>
                    <p className="text-[11px] text-muted">GHS {Number(tx.amount).toFixed(2)}</p>
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
