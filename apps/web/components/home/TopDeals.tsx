'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import ProductGridSection from './ProductGridSection';
import { filterByMinDiscount, getDiscountPercent } from '@/lib/home/discount';
import { filterRailProducts } from '@/lib/product-visibility';
import type { HomeProduct } from '@/hooks/useHomeData';

interface TopDealsProps {
  products: HomeProduct[];
  /** Minimum discount percent (inclusive). Defaults to 20. */
  minDiscount?: number;
  limit?: number;
}

export default function TopDeals({ products, minDiscount = 20, limit = 20 }: TopDealsProps) {
  const deals = useMemo(() => {
    const visibleInStock = filterRailProducts(products);
    const filtered = filterByMinDiscount(visibleInStock, minDiscount);
    return filtered
      .sort((a, b) => (getDiscountPercent(b as any) ?? 0) - (getDiscountPercent(a as any) ?? 0))
      .slice(0, limit);
  }, [products, minDiscount, limit]);

  if (!deals.length) return null;

  return (
    <ProductGridSection
      products={deals}
      eyebrow="Save more"
      title={`Top Deals · ${minDiscount}% off or more`}
      description="Limited-time markdowns from verified sellers."
      action={
        <Link
          href="/products?has_discount=1"
          className="bg-surface text-foreground hover:bg-foreground hover:text-background inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-colors"
        >
          <span>Browse Shop</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      }
    />
  );
}
