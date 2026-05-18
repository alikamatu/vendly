"use client";

import React from "react";
import { Check, AlertTriangle, XCircle } from "lucide-react";

interface StockBadgeProps {
  quantity?: number | null;
  /** Threshold below which "low stock" is shown. Default 5. */
  lowThreshold?: number;
}

export default function StockBadge({ quantity, lowThreshold = 5 }: StockBadgeProps) {
  if (quantity == null) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-500">
        <Check className="w-3 h-3" /> In stock
      </span>
    );
  }
  if (quantity <= 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-500/10 text-red-500">
        <XCircle className="w-3 h-3" /> Out of stock
      </span>
    );
  }
  if (quantity <= lowThreshold) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600">
        <AlertTriangle className="w-3 h-3" /> Only {quantity} left
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-500">
      <Check className="w-3 h-3" /> In stock · {quantity}
    </span>
  );
}
