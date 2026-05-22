"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import SectionHeader from "./SectionHeader";
import FeaturedCategories from "./FeaturedCategories";
import { resolveCategoryImage } from "@/lib/home/category-image";
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

  // Rank by product count and split: top 3 featured, rest in the standard grid.
  const ranked = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of products) {
      if (!p.category) continue;
      counts.set(p.category, (counts.get(p.category) || 0) + 1);
    }
    const withCount = categories.map((c) => ({
      cat: c,
      count: counts.get(c.name) || 0,
    }));
    const sorted = [...withCount].sort((a, b) => b.count - a.count);
    const topNames = new Set(sorted.slice(0, 3).map((x) => x.cat.name));
    const rest = categories.filter((c) => !topNames.has(c.name));
    return { rest };
  }, [categories, products]);

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
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[var(--color-surface,theme(colors.muted.DEFAULT))] border border-border hover:bg-primary/10 hover:border-primary/30 text-xs font-bold transition-all group"
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

      {/* {ranked.rest.length > 0 && (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
        {ranked.rest.map((cat, index) => {
          const imageUrl = resolveCategoryImage(cat.name, cat.image_url);
          const isSelected = activeCategory === cat.name;
          const count = products.filter((p) => p.category === cat.name).length;

          return (
            <motion.div
              key={cat.id || cat.name}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: Math.min(index * 0.04, 0.4) }}
            >
              <button
                onClick={() => {
                  onSelect(isSelected ? null : cat.name);
                  const el = document.getElementById("marketplace");
                  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className={`relative h-36 md:h-44 w-full rounded-[1.5rem] md:rounded-[2rem] overflow-hidden group border transition-all text-left flex flex-col justify-end p-4 md:p-5 active:scale-[0.98] hover:scale-[1.02] duration-300 ${
                  isSelected
                    ? "border-primary ring-4 ring-primary/20 shadow-lg shadow-primary/10"
                    : "border-border/40 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5"
                }`}
                aria-label={`Browse ${cat.name} category`}
                aria-pressed={isSelected}
              >
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-out group-hover:scale-110"
                  style={{ backgroundImage: `url(${imageUrl})` }}
                  role="img"
                  aria-label={cat.name}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                <div
                  className={`absolute inset-0 bg-primary/20 transition-opacity duration-300 ${
                    isSelected ? "opacity-30" : "opacity-0 group-hover:opacity-100"
                  }`}
                />
                <div className="relative z-10 space-y-1.5">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white bg-primary/95 backdrop-blur-md px-3 py-1.5 rounded-full inline-block">
                    {cat.name}
                  </span>
                  <p className="text-[10px] text-white/70 line-clamp-1 group-hover:text-white transition-colors">
                    {count} items
                  </p>
                </div>
              </button>
            </motion.div>
          );
        })}
      </div>
      )} */}
    </section>
  );
}

export default React.memo(CategoryShowcase);
