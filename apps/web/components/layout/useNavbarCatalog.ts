'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  productApi,
  type BrowseProduct,
  type PersonalizedRecommendationsResponse,
  type TopSellingCategory,
} from '@/lib/api/product';
import { resolveCategoryImage } from '@/lib/home/category-image';
import { getSubtabsForCategory } from '@/lib/catalog-subcategories';
import {
  extractHabitQuerySignals,
  getShoppingHabits,
  HABITS_UPDATED_EVENT,
} from '@/lib/cookies/shopping-habits';

export interface NavbarCategoryItem {
  id: string;
  name: string;
  imageUrl: string;
  productCount: number;
  unitsSold: number;
  rank: number | null;
  subcategories: string[];
  products: BrowseProduct[];
}

interface CatalogCache {
  categories: NavbarCategoryItem[];
  fetchedAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000;
let catalogCache: CatalogCache | null = null;
let inflightCatalogPromise: Promise<NavbarCategoryItem[]> | null = null;

async function fetchNavbarCategories(): Promise<NavbarCategoryItem[]> {
  if (catalogCache && Date.now() - catalogCache.fetchedAt < CACHE_TTL_MS) {
    return catalogCache.categories;
  }
  if (inflightCatalogPromise) {
    return inflightCatalogPromise;
  }

  inflightCatalogPromise = (async () => {
    const [topSelling, allCats] = await Promise.all([
      productApi.getTopSellingCategories(10, 4).catch(() => [] as TopSellingCategory[]),
      productApi.getCategories().catch(() => []),
    ]);

    const merged = new Map<string, NavbarCategoryItem>();

    // 1. Seed with top-selling categories first so hottest departments lead the dropdown
    for (const top of topSelling) {
      const key = top.name.trim().toLowerCase();
      if (!key) continue;
      const taxonomySubs = getSubtabsForCategory(top.name);
      const liveSubs = (top.subcategories || []).map((s) => s.name);
      const subcategories = Array.from(new Set([...liveSubs, ...taxonomySubs])).slice(0, 12);

      merged.set(key, {
        id: top.id || top.name,
        name: top.name,
        imageUrl: resolveCategoryImage(top.name, top.image_url),
        productCount: top.product_count ?? 0,
        unitsSold: top.units_sold ?? 0,
        rank: top.rank ?? null,
        subcategories,
        products: Array.isArray(top.products) ? top.products.slice(0, 4) : [],
      });
    }

    // 2. Append remaining catalog categories so every department is browsable
    for (const cat of allCats || []) {
      const key = cat.name?.trim().toLowerCase();
      if (!key) continue;
      const existing = merged.get(key);
      if (existing) {
        if (cat.image_url && existing.imageUrl !== cat.image_url) {
          existing.imageUrl = resolveCategoryImage(cat.name, cat.image_url);
        }
        continue;
      }
      merged.set(key, {
        id: cat.id || cat.name,
        name: cat.name,
        imageUrl: resolveCategoryImage(cat.name, cat.image_url),
        productCount: 0,
        unitsSold: 0,
        rank: null,
        subcategories: getSubtabsForCategory(cat.name).slice(0, 12),
        products: [],
      });
    }

    const list = Array.from(merged.values());
    catalogCache = { categories: list, fetchedAt: Date.now() };
    return list;
  })().finally(() => {
    inflightCatalogPromise = null;
  });

  return inflightCatalogPromise;
}

export function useNavbarCatalog(enabled: boolean) {
  const [categories, setCategories] = useState<NavbarCategoryItem[]>(
    () => catalogCache?.categories ?? [],
  );
  const [recommendations, setRecommendations] =
    useState<PersonalizedRecommendationsResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const loadRecommendations = useCallback(async () => {
    try {
      const profile = getShoppingHabits();
      const signals = extractHabitQuerySignals(profile);
      const data = await productApi.getRecommendations({
        categories: signals.categories,
        subcategories: signals.subcategories,
        brands: signals.brands,
        tags: signals.tags,
        exclude: signals.recentIds.slice(0, 3),
        minPrice: signals.minPrice,
        maxPrice: signals.maxPrice,
        limit: 4,
      });
      if (data && Array.isArray(data.items) && data.items.length > 0) {
        setRecommendations(data);
      }
    } catch {
      // Non-critical — fallback uses top category products
    }
  }, []);

  useEffect(() => {
    let active = true;
    // Fetch categories lazily on mount (lightweight & cached for 5 min across routes)
    const run = async () => {
      if (!catalogCache) setLoading(true);
      try {
        const list = await fetchNavbarCategories();
        if (active) setCategories(list);
      } finally {
        if (active) setLoading(false);
      }
    };
    void run();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const run = async () => {
      try {
        const profile = getShoppingHabits();
        const signals = extractHabitQuerySignals(profile);
        const data = await productApi.getRecommendations({
          categories: signals.categories,
          subcategories: signals.subcategories,
          brands: signals.brands,
          tags: signals.tags,
          exclude: signals.recentIds.slice(0, 3),
          minPrice: signals.minPrice,
          maxPrice: signals.maxPrice,
          limit: 4,
        });
        if (!cancelled && data && Array.isArray(data.items) && data.items.length > 0) {
          setRecommendations(data);
        }
      } catch {
        // Non-critical — fallback uses top category products
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  useEffect(() => {
    const onHabitsUpdated = () => {
      void loadRecommendations();
    };
    window.addEventListener(HABITS_UPDATED_EVENT, onHabitsUpdated);
    return () => window.removeEventListener(HABITS_UPDATED_EVENT, onHabitsUpdated);
  }, [loadRecommendations]);

  // Fallback recommendations when cookie-backed API returns nothing yet
  const fallbackRecProducts: BrowseProduct[] =
    recommendations?.items && recommendations.items.length > 0
      ? recommendations.items
      : categories
          .flatMap((c) => c.products)
          .filter((p, idx, arr) => arr.findIndex((x) => x.id === p.id) === idx)
          .slice(0, 4);

  const recommendationHeadline = recommendations?.headline || 'Recommended for you';

  return {
    categories,
    loading,
    recommendations,
    recommendedProducts: fallbackRecProducts,
    recommendationHeadline,
    isPersonalized: Boolean(recommendations?.personalized),
  };
}
