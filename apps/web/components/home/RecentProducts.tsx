'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { ArrowRight, Clock } from 'lucide-react';
import ProductGridSection from './ProductGridSection';
import { sortByRecent } from '@/lib/home/discount';
import { filterRailProducts } from '@/lib/product-visibility';
import type { HomeProduct } from '@/hooks/useHomeData';

interface RecentProductsProps {
  products: HomeProduct[];
  limit?: number;
}

export default function RecentProducts({ products, limit = 20 }: RecentProductsProps) {
  const recent = useMemo(
    () => sortByRecent(filterRailProducts(products)).slice(0, limit),
    [products, limit],
  );
  if (!recent.length) return null;

  return (
    <ProductGridSection
      products={recent}
      eyebrow={
        <>
          <Clock className="h-3.5 w-3.5" />
          Just In
        </>
      }
      title="Recently Added"
      description={`The freshest ${recent.length} products on the platform.`}
      action={
        <Link
          href="/products"
          className="bg-surface text-foreground hover:bg-foreground hover:text-background inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-colors"
        >
          <span>Browse Shop</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      }
    />
  );
}
