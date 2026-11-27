'use client';

import React from 'react';
import Link from 'next/link';
import SectionHeader from './SectionHeader';
import FeaturedCategories from './FeaturedCategories';
import type { HomeCategory, HomeProduct } from '@/hooks/useHomeData';

interface CategoryShowcaseProps {
  categories: HomeCategory[];
  products: HomeProduct[];
  activeCategory: string | null;
  onSelect: (name: string | null) => void;
}

function CategoryShowcase({
  categories,
  products,
  activeCategory,
  onSelect,
}: CategoryShowcaseProps) {
  if (!categories.length) return null;

  return (
    <section className="relative z-10 mx-auto max-w-7xl space-y-8 px-4 pb-6 pt-12 md:space-y-10 md:px-8 md:pt-16">
      <SectionHeader
        eyebrow="Browse the catalog"
        title="Shop by category"
        description="A curated catalog from verified young entrepreneurs and small businesses."
        action={
          <Link
            href="/categories"
            className="border-border hover:bg-primary/10 hover:border-primary/30 group inline-flex items-center gap-2 rounded-full border bg-[var(--color-surface,theme(colors.muted.DEFAULT))] px-5 py-3 text-xs font-normal transition-all"
          >
            <span>View all categories</span>
          </Link>
        }
      />

      <FeaturedCategories
        categories={categories}
        products={products}
        activeCategory={activeCategory}
        onSelect={onSelect}
      />
    </section>
  );
}

export default React.memo(CategoryShowcase);
