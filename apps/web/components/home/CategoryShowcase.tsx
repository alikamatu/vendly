"use client";

import React from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import SectionHeader from "./SectionHeader";
import FeaturedCategories from "./FeaturedCategories";
import type { HomeCategory, HomeProduct } from "@/hooks/useHomeData";

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
    <section className="max-w-7xl mx-auto px-4 md:px-8 pt-12 md:pt-16 pb-6 space-y-8 md:space-y-10 relative z-10">
      <SectionHeader
        eyebrow={
          <>
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            Browse the catalog
          </>
        }
        title="Shop by category"
        description="A curated catalog from verified young entrepreneurs and small businesses."
        action={
          <Link
            href="/categories"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[var(--color-surface,theme(colors.muted.DEFAULT))] border border-border hover:bg-primary/10 hover:border-primary/30 text-xs font-normal transition-all group"
          >
            <span>View all categories</span>
            <Sparkles className="w-3.5 h-3.5 text-primary group-hover:scale-110 transition-transform" />
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
