"use client";

import React from "react";
import { BadgePercent } from "lucide-react";
import StockBadge from "./StockBadge";

interface PriceBlockProps {
  price: string | number;
  originalPrice?: string | number | null;
  currency?: string;
  quantityAvailable?: number;
}

export default function PriceBlock({
  price,
  originalPrice,
  currency = "GH₵",
  quantityAvailable,
}: PriceBlockProps) {
  const cur = Number(price);
  const orig = originalPrice != null ? Number(originalPrice) : null;
  const hasDiscount =
    orig != null && Number.isFinite(orig) && Number.isFinite(cur) && orig > cur && orig > 0;
  const pct = hasDiscount ? Math.round(((orig! - cur) / orig!) * 100) : null;
  const savings = hasDiscount ? orig! - cur : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-baseline flex-wrap gap-3">
        <span className="text-3xl md:text-4xl font-medium text-red-500 tabular-nums">
          {currency}
          {cur.toLocaleString()}
        </span>
        {hasDiscount && (
          <>
            <span className="text-lg text-muted-foreground line-through tabular-nums">
              {currency}
              {orig!.toLocaleString()}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium uppercase tracking-wider bg-emerald-500/15 text-emerald-600">
              <BadgePercent className="w-3 h-3" />−{pct}%
            </span>
          </>
        )}
        <StockBadge quantity={quantityAvailable} />
      </div>
      {hasDiscount && (
        <p className="text-[11px] font-normal text-emerald-600">
          You save {currency}
          {savings.toLocaleString()}
        </p>
      )}
    </div>
  );
}
