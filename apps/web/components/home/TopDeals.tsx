"use client";

import React, { useMemo } from "react";
import { Tag } from "lucide-react";
import ProductGridSection from "./ProductGridSection";
import { filterByMinDiscount, getDiscountPercent } from "@/lib/home/discount";
import type { HomeProduct } from "@/hooks/useHomeData";

interface TopDealsProps {
  products: HomeProduct[];
  /** Minimum discount percent (inclusive). Defaults to 20. */
  minDiscount?: number;
  limit?: number;
}

export default function TopDeals({ products, minDiscount = 20, limit = 20 }: TopDealsProps) {
  const deals = useMemo(() => {
    const filtered = filterByMinDiscount(products, minDiscount);
    return filtered
      .sort((a, b) => (getDiscountPercent(b as any) ?? 0) - (getDiscountPercent(a as any) ?? 0))
      .slice(0, limit);
  }, [products, minDiscount, limit]);

  if (!deals.length) return null;

  return (
    <ProductGridSection
      products={deals}
      eyebrow={
        <>
          <Tag className="w-3.5 h-3.5" />
          Save more
        </>
      }
      title={`Top Deals · ${minDiscount}% off or more`}
      description="Limited-time markdowns from verified campus sellers. Going fast."
    />
  );
}
