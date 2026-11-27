'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { ArrowRight, RotateCcw } from 'lucide-react';
import ProductGridSection from './ProductGridSection';
import {
  productApi,
  type TopSellingCategory,
  type PersonalizedRecommendationsResponse,
} from '@/lib/api/product';
import {
  getShoppingHabits,
  extractHabitQuerySignals,
  clearShoppingHabits,
  HABITS_UPDATED_EVENT,
} from '@/lib/cookies/shopping-habits';
import type { HomeProduct } from '@/hooks/useHomeData';

interface PersonalizedRecommendationsProps {
  fallbackProducts: HomeProduct[];
  topSellingCategories: TopSellingCategory[];
  limit?: number;
}

/**
 * Cookie-driven "Picked just for you" homepage section.
 * Learns from product views, searches, category clicks, favorites, and cart adds
 * stored in the `verndly_shopping_habits` cookie to surface tailored recommendations
 * (e.g. "Laptops picked just for you").
 */
export default function PersonalizedRecommendations({
  fallbackProducts,
  topSellingCategories,
  limit = 10,
}: PersonalizedRecommendationsProps) {
  const [rec, setRec] = useState<PersonalizedRecommendationsResponse | null>(null);
  const [hasHabits, setHasHabits] = useState(false);

  const loadRecommendations = useCallback(async () => {
    const profile = getShoppingHabits();
    const signals = extractHabitQuerySignals(profile);
    setHasHabits(signals.hasHabits);

    if (!signals.hasHabits) {
      setRec(null);
      return;
    }

    try {
      const data = await productApi.getRecommendations({
        categories: signals.categories,
        subcategories: signals.subcategories,
        brands: signals.brands,
        tags: signals.tags,
        exclude: signals.recentIds.slice(0, 4),
        minPrice: signals.minPrice,
        maxPrice: signals.maxPrice,
        limit,
      });
      if (data && Array.isArray(data.items) && data.items.length > 0) {
        setRec(data);
      } else {
        setRec(null);
      }
    } catch {
      setRec(null);
    }
  }, [limit]);

  useEffect(() => {
    void loadRecommendations();
    const onUpdated = () => void loadRecommendations();
    window.addEventListener(HABITS_UPDATED_EVENT, onUpdated);
    return () => window.removeEventListener(HABITS_UPDATED_EVENT, onUpdated);
  }, [loadRecommendations]);

  // Fallback personalized-style discovery spotlight when a brand-new visitor has no cookies yet
  const fallbackSpotlight = useMemo(() => {
    if (hasHabits || !fallbackProducts.length) return null;
    const subcatBuckets = new Map<string, HomeProduct[]>();
    for (const p of fallbackProducts) {
      const sub =
        typeof p.attributes?.subcategory === 'string' ? p.attributes.subcategory.trim() : '';
      if (sub) {
        if (!subcatBuckets.has(sub)) subcatBuckets.set(sub, []);
        subcatBuckets.get(sub)!.push(p);
      }
    }
    const richSubcats = Array.from(subcatBuckets.entries()).filter(
      ([, items]) => items.length >= 3,
    );
    if (richSubcats.length > 0) {
      const [subName, items] = richSubcats[0];
      return {
        headline: `${subName} picked just for you`,
        href: `/products?subcategory=${encodeURIComponent(subName)}`,
        items: items.slice(0, limit),
      };
    }
    const firstCat = topSellingCategories[0];
    if (firstCat && firstCat.products.length > 0) {
      return {
        headline: `${firstCat.name} picked just for you`,
        href: `/products?category=${encodeURIComponent(firstCat.name)}`,
        items: firstCat.products.slice(0, limit) as unknown as HomeProduct[],
      };
    }
    return null;
  }, [hasHabits, fallbackProducts, topSellingCategories, limit]);

  const displayItems =
    rec && rec.items.length > 0
      ? (rec.items as unknown as HomeProduct[])
      : fallbackSpotlight?.items || [];

  if (!displayItems.length) return null;

  const title = rec?.headline || fallbackSpotlight?.headline || 'Picked just for you';
  const viewMoreHref = rec?.focus_label
    ? rec.focus_type === 'subcategory'
      ? `/products?subcategory=${encodeURIComponent(rec.focus_label)}`
      : rec.focus_type === 'brand'
        ? `/products?brand=${encodeURIComponent(rec.focus_label)}`
        : `/products?category=${encodeURIComponent(rec.focus_label)}`
    : fallbackSpotlight?.href || '/products';

  return (
    <ProductGridSection
      products={displayItems}
      limit={limit}
      eyebrow={hasHabits ? 'Tailored from your shopping habits' : 'Curated for you'}
      title={title}
      description={
        hasHabits
          ? 'Smart recommendations learned privately in your browser cookies from items you browse, search, and save.'
          : 'Hand-picked highlights from verified Verndly stores across Ghana.'
      }
      action={
        <div className="flex items-center gap-3">
          {hasHabits && (
            <button
              type="button"
              onClick={() => {
                clearShoppingHabits();
                setRec(null);
                setHasHabits(false);
              }}
              title="Reset personalized recommendations"
              className="text-muted hover:text-foreground inline-flex items-center gap-1 text-[11px] font-medium transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset picks</span>
            </button>
          )}
          <Link
            href={viewMoreHref}
            className="text-muted hover:text-foreground inline-flex items-center gap-1 text-xs font-semibold transition-colors"
          >
            <span>See more</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      }
    />
  );
}
