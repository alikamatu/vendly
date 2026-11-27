'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, TrendingUp } from 'lucide-react';
import type { TopSellingCategory } from '@/lib/api/product';
import { resolveCategoryImage } from '@/lib/home/category-image';
import { recordShoppingHabit } from '@/lib/cookies/shopping-habits';

interface TopSellingCategoriesProps {
  categories: TopSellingCategory[];
  onSelect?: (name: string) => void;
}

/**
 * Displays the Top 10 most-selling categories across Verndly in a fast,
 * horizontally scrollable showcase rail with rank badges and live counts.
 */
export default function TopSellingCategories({ categories, onSelect }: TopSellingCategoriesProps) {
  const topTen = categories.slice(0, 10);
  if (!topTen.length) return null;

  return (
    <section
      aria-label="Top 10 most-selling categories"
      className="relative z-10 mx-auto max-w-7xl space-y-5 px-4 py-6 md:px-8 md:py-8"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <div className="text-primary text-[10px] font-semibold uppercase tracking-[0.16em]">
            Top 10 Most-Selling Categories
          </div>
          <h2 className="text-foreground text-xl font-semibold tracking-tight sm:text-2xl">
            What Ghana is shopping most
          </h2>
        </div>

        <Link
          href="/products"
          className="text-muted hover:text-foreground inline-flex items-center gap-1 text-xs font-semibold transition-colors"
        >
          <span>Explore Shop</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Horizontal pill/card strip on mobile, responsive 5-col x 2-row grid on desktop */}
      <div className="-mx-4 overflow-x-auto px-4 pb-2 md:mx-0 md:overflow-visible md:px-0 md:pb-0">
        <div className="flex min-w-max gap-2.5 md:grid md:min-w-0 md:grid-cols-5 md:gap-3">
          {topTen.map((cat) => {
            const imgUrl = resolveCategoryImage(cat.name, cat.image_url);
            const href = `/products?category=${encodeURIComponent(cat.name)}`;
            return (
              <Link
                key={cat.id || cat.name}
                href={href}
                onClick={() => {
                  recordShoppingHabit('browse_category', { category: cat.name });
                  onSelect?.(cat.name);
                }}
                className="bg-surface hover:border-primary/40 border-border/40 group relative flex w-[178px] shrink-0 items-center gap-3 overflow-hidden rounded-2xl border p-2.5 transition-all hover:-translate-y-0.5 md:w-auto"
              >
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-neutral-200 dark:bg-neutral-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imgUrl}
                    alt={cat.name}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <span className="absolute left-1 top-1 rounded-md bg-black/75 px-1.5 py-0.5 font-mono text-[9px] font-bold text-white">
                    #{cat.rank}
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-foreground group-hover:text-primary truncate text-xs font-semibold transition-colors">
                    {cat.name}
                  </p>
                  <p className="text-muted mt-0.5 flex items-center gap-1 text-[10px]">
                    {cat.units_sold > 0 ? (
                      <>
                        <TrendingUp className="h-2.5 w-2.5 text-emerald-500" />
                        <span>{cat.units_sold} sold</span>
                        <span>·</span>
                      </>
                    ) : null}
                    <span>
                      {cat.product_count} {cat.product_count === 1 ? 'item' : 'items'}
                    </span>
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
