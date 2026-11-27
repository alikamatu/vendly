'use client';

import React, { useMemo } from 'react';
import SectionHeader from './SectionHeader';
import BrandSection from './BrandSection';
import { groupByBrand } from '@/lib/home/brand-grouping';
import { SHOW_BRAND_RAIL } from '@/lib/brand-guard';
import { filterRailProducts } from '@/lib/product-visibility';
import type { HomeBrand, HomeProduct } from '@/hooks/useHomeData';

interface BrandSectionsListProps {
  products: HomeProduct[];
  brands: HomeBrand[];
  onBrandSelect: (brandName: string) => void;
  /** Per-brand product cap. Default 10. */
  productsPerBrand?: number;
  /** Max brand sections to render. Default unlimited. */
  maxBrands?: number;
}

export default function BrandSectionsList({
  products,
  brands,
  onBrandSelect,
  productsPerBrand = 10,
  maxBrands,
}: BrandSectionsListProps) {
  const buckets = useMemo(
    () =>
      SHOW_BRAND_RAIL
        ? groupByBrand(filterRailProducts(products), brands, {
            productsLimit: productsPerBrand,
            brandsLimit: maxBrands,
          })
        : [],
    [products, brands, productsPerBrand, maxBrands],
  );

  if (!SHOW_BRAND_RAIL || !buckets.length) return null;

  return (
    <section className="relative space-y-12 py-4">
      <SectionHeader
        eyebrow="Shop by Brand"
        title="Top Verndly Brands"
        description="Explore highly-rated brands chosen by independent sellers, ranked by what's in stock right now."
      />

      <div className="space-y-14">
        {buckets.map((bucket, idx) => (
          <BrandSection key={bucket.id} brand={bucket} rank={idx + 1} onViewAll={onBrandSelect} />
        ))}
      </div>
    </section>
  );
}
