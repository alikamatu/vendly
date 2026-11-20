'use client';

import { useEffect, useState } from 'react';
import { productApi } from '@/lib/api/product';
import { storeApi, TopProVendor } from '@/lib/api/store';

export interface HomeCategory {
  id?: string;
  name: string;
  description?: string | null;
  image_url?: string | null;
  fields?: any[];
}

export interface HomeBrand {
  id?: string;
  name: string;
  image_url?: string | null;
  category_id?: string;
}

export interface HomeProduct {
  id: string;
  title: string;
  price: string;
  original_price?: string | number | null;
  category?: string;
  brand?: string | null;
  is_featured?: boolean;
  created_at?: string;
  image_urls: string[];
  video_url?: string | null;
  seller: {
    store_name: string;
    logo_url?: string;
    store_link: string;
  };
  [key: string]: any;
}

export interface InitialHomeData {
  products?: HomeProduct[];
  categories?: HomeCategory[];
  brands?: HomeBrand[];
  topProVendors?: TopProVendor[];
}

interface HomeData {
  products: HomeProduct[];
  categories: HomeCategory[];
  brands: HomeBrand[];
  topProVendors: TopProVendor[];
  isLoading: boolean;
  error: string | null;
  reload: () => void;
}

export function useHomeData(initial?: InitialHomeData): HomeData {
  const hasInitial = Boolean(initial);
  const [products, setProducts] = useState<HomeProduct[]>(initial?.products ?? []);
  const [categories, setCategories] = useState<HomeCategory[]>(initial?.categories ?? []);
  const [brands, setBrands] = useState<HomeBrand[]>(initial?.brands ?? []);
  const [topProVendors, setTopProVendors] = useState<TopProVendor[]>(initial?.topProVendors ?? []);
  // Never block SSR with a full-screen loading spinner when server data was handed down.
  const [isLoading, setIsLoading] = useState(!hasInitial);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    if (!hasInitial || tick > 0) {
      setIsLoading(true);
    }
    setError(null);

    (async () => {
      try {
        const [p, c, b, v] = await Promise.all([
          productApi.getProducts(),
          productApi.getCategories(),
          productApi.getBrands(),
          storeApi.getTopProVendors(6).catch(() => [] as TopProVendor[]),
        ]);
        if (cancelled) return;
        if (Array.isArray(p) && p.length > 0) setProducts(p as HomeProduct[]);
        if (Array.isArray(c) && c.length > 0) setCategories(c as HomeCategory[]);
        if (Array.isArray(b) && b.length > 0) setBrands(b as HomeBrand[]);
        if (Array.isArray(v) && v.length > 0) setTopProVendors(v);
      } catch (err: any) {
        if (cancelled) return;
        setError(err?.message || 'Failed to load');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tick, hasInitial]);

  return {
    products,
    categories,
    brands,
    topProVendors,
    isLoading,
    error,
    reload: () => setTick((t) => t + 1),
  };
}
