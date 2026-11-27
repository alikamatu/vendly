'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import ProductGridSection from './ProductGridSection';
import type { TopSellingCategory } from '@/lib/api/product';
import type { HomeProduct } from '@/hooks/useHomeData';
import {
  getShoppingHabits,
  extractHabitQuerySignals,
  recordShoppingHabit,
  HABITS_UPDATED_EVENT,
} from '@/lib/cookies/shopping-habits';

interface HomeCategorySectionsProps {
  topSellingCategories: TopSellingCategory[];
  allProducts: HomeProduct[];
  /** Number of homepage category sections to render. Defaults to 3. */
  sectionCount?: number;
  productsPerSection?: number;
}

interface CuratedSection {
  key: string;
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  ctaLabel: string;
  categoryName?: string;
  subcategoryName?: string;
  kind: 'top' | 'random';
  products: HomeProduct[];
}

const RANDOM_TITLE_TEMPLATES = [
  (label: string) => `${label} picked just for you`,
  (label: string) => `${label} spotlight for you`,
  (label: string) => `Fresh ${label} picks today`,
  (label: string) => `Explore top ${label}`,
];

/**
 * Renders 3 dynamic category product sections on the homepage:
 *  - Sections 1 & 2: Top-selling categories (intelligently prioritizing the shopper's
 *    cookie-learned category affinity when available).
 *  - Section 3: A lively randomized spotlight from the remaining top-10 categories or
 *    subcategories (e.g. "Laptops picked just for you", "Shoes picked just for you").
 */
export default function HomeCategorySections({
  topSellingCategories,
  allProducts,
  sectionCount = 3,
  productsPerSection = 10,
}: HomeCategorySectionsProps) {
  // Hydration-safe random seed chosen once on the client per visit
  const [randomSeed, setRandomSeed] = useState<number>(0);
  const [habitCategories, setHabitCategories] = useState<string[]>([]);

  useEffect(() => {
    setRandomSeed(Math.floor(Math.random() * 1000));
    const syncHabits = () => {
      const sig = extractHabitQuerySignals(getShoppingHabits());
      setHabitCategories(sig.categories);
    };
    syncHabits();
    window.addEventListener(HABITS_UPDATED_EVENT, syncHabits);
    return () => window.removeEventListener(HABITS_UPDATED_EVENT, syncHabits);
  }, []);

  const sections: CuratedSection[] = useMemo(() => {
    // Build unified category buckets from topSellingCategories, falling back to allProducts
    const categoryPool: Array<{
      name: string;
      units_sold: number;
      subcategories: Array<{ name: string; count: number }>;
      products: HomeProduct[];
    }> = [];

    if (topSellingCategories.length > 0) {
      for (const c of topSellingCategories) {
        const items = (c.products || []) as unknown as HomeProduct[];
        if (items.length > 0) {
          categoryPool.push({
            name: c.name,
            units_sold: c.units_sold,
            subcategories: c.subcategories || [],
            products: items,
          });
        }
      }
    }

    if (categoryPool.length < sectionCount && allProducts.length > 0) {
      const existing = new Set(categoryPool.map((c) => c.name.toLowerCase()));
      const byCat = new Map<string, HomeProduct[]>();
      for (const p of allProducts) {
        if (!p.category) continue;
        if (existing.has(p.category.toLowerCase())) continue;
        if (!byCat.has(p.category)) byCat.set(p.category, []);
        byCat.get(p.category)!.push(p);
      }
      for (const [name, items] of Array.from(byCat.entries()).sort(
        (a, b) => b[1].length - a[1].length,
      )) {
        categoryPool.push({
          name,
          units_sold: 0,
          subcategories: [],
          products: items,
        });
      }
    }

    if (!categoryPool.length) return [];

    // Reorder pool gently if shopper has cookie category affinities (keep top sellers strong)
    const habitSet = new Map(habitCategories.map((c, idx) => [c.toLowerCase(), idx]));
    const prioritized = [...categoryPool].sort((a, b) => {
      const hA = habitSet.has(a.name.toLowerCase()) ? habitSet.get(a.name.toLowerCase())! : 99;
      const hB = habitSet.has(b.name.toLowerCase()) ? habitSet.get(b.name.toLowerCase())! : 99;
      if (hA !== hB) return hA - hB;
      return 0;
    });

    const chosen: CuratedSection[] = [];
    const usedCategoryKeys = new Set<string>();

    // First (sectionCount - 1) sections: Top-selling / habit-boosted categories
    const coreCount = Math.max(1, sectionCount - 1);
    for (const cat of prioritized) {
      if (chosen.length >= coreCount) break;
      const key = cat.name.toLowerCase();
      if (usedCategoryKeys.has(key)) continue;
      usedCategoryKeys.add(key);

      const isPersonalizedCat = habitSet.has(key);
      chosen.push({
        key: `cat-${cat.name}`,
        eyebrow: isPersonalizedCat ? 'Because you browse this category' : 'Top-selling category',
        title: cat.name,
        description:
          cat.units_sold > 0
            ? `Customer favorites in ${cat.name} — ${cat.units_sold}+ units sold across verified Ghanaian stores.`
            : `Fresh in-stock picks in ${cat.name} from verified Verndly stores.`,
        href: `/products?category=${encodeURIComponent(cat.name)}`,
        ctaLabel: `Shop ${cat.name}`,
        categoryName: cat.name,
        kind: 'top',
        products: cat.products.slice(0, productsPerSection),
      });
    }

    // Final section: Random discovery spotlight (subcategory like "Laptops picked just for you"
    // or a random category from the remaining top-10 pool!)
    const subcatCandidates: Array<{
      subcategory: string;
      category: string;
      products: HomeProduct[];
    }> = [];
    const subMap = new Map<string, { category: string; products: HomeProduct[] }>();
    for (const p of allProducts) {
      const sub =
        typeof p.attributes?.subcategory === 'string' ? p.attributes.subcategory.trim() : '';
      if (!sub) continue;
      if (!subMap.has(sub)) {
        subMap.set(sub, { category: p.category || '', products: [] });
      }
      subMap.get(sub)!.products.push(p);
    }
    for (const [subcategory, info] of subMap.entries()) {
      if (info.products.length >= 2) {
        subcatCandidates.push({
          subcategory,
          category: info.category,
          products: info.products,
        });
      }
    }

    const remainingCategories = categoryPool.filter(
      (c) => !usedCategoryKeys.has(c.name.toLowerCase()),
    );

    if (chosen.length < sectionCount) {
      if (
        subcatCandidates.length > 0 &&
        (randomSeed % 2 === 0 || remainingCategories.length === 0)
      ) {
        const pick = subcatCandidates[randomSeed % subcatCandidates.length];
        const template = RANDOM_TITLE_TEMPLATES[randomSeed % RANDOM_TITLE_TEMPLATES.length];
        chosen.push({
          key: `random-sub-${pick.subcategory}`,
          eyebrow: 'Discovery spotlight',
          title: template(pick.subcategory),
          description: `Hand-selected ${pick.subcategory.toLowerCase()} in stock right now with 3-day Paystack escrow protection.`,
          href: `/products?subcategory=${encodeURIComponent(pick.subcategory)}`,
          ctaLabel: `Browse ${pick.subcategory}`,
          categoryName: pick.category || undefined,
          subcategoryName: pick.subcategory,
          kind: 'random',
          products: pick.products.slice(0, productsPerSection),
        });
      } else if (remainingCategories.length > 0) {
        const pick = remainingCategories[randomSeed % remainingCategories.length];
        const template = RANDOM_TITLE_TEMPLATES[randomSeed % RANDOM_TITLE_TEMPLATES.length];
        chosen.push({
          key: `random-cat-${pick.name}`,
          eyebrow: 'Discovery spotlight',
          title: template(pick.name),
          description: `Curated ${pick.name.toLowerCase()} picks from trusted Verndly merchants.`,
          href: `/products?category=${encodeURIComponent(pick.name)}`,
          ctaLabel: `Shop ${pick.name}`,
          categoryName: pick.name,
          kind: 'random',
          products: pick.products.slice(0, productsPerSection),
        });
      }
    }

    return chosen;
  }, [
    topSellingCategories,
    allProducts,
    habitCategories,
    randomSeed,
    sectionCount,
    productsPerSection,
  ]);

  if (!sections.length) return null;

  return (
    <div className="space-y-16 md:space-y-20">
      {sections.map((section) => (
        <ProductGridSection
          key={section.key}
          products={section.products}
          limit={productsPerSection}
          eyebrow={section.eyebrow}
          title={section.title}
          description={section.description}
          action={
            <Link
              href={section.href}
              onClick={() =>
                recordShoppingHabit('browse_category', {
                  category: section.categoryName || null,
                  subcategory: section.subcategoryName || null,
                })
              }
              className="text-muted hover:text-foreground inline-flex items-center gap-1 text-xs font-semibold transition-colors"
            >
              <span>{section.ctaLabel}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        />
      ))}
    </div>
  );
}
