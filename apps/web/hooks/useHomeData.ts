"use client";

import { useEffect, useState } from "react";
import { productApi } from "@/lib/api/product";
import { storeApi, TopProVendor } from "@/lib/api/store";

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

interface HomeData {
  products: HomeProduct[];
  categories: HomeCategory[];
  brands: HomeBrand[];
  topProVendors: TopProVendor[];
  isLoading: boolean;
  error: string | null;
  reload: () => void;
}

export function useHomeData(): HomeData {
  const [products, setProducts] = useState<HomeProduct[]>([]);
  const [categories, setCategories] = useState<HomeCategory[]>([]);
  const [brands, setBrands] = useState<HomeBrand[]>([]);
  const [topProVendors, setTopProVendors] = useState<TopProVendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    (async () => {
      try {
        // Top-pro vendors are non-critical: failing here shouldn't kill the page.
        const [p, c, b, v] = await Promise.all([
          productApi.getProducts(),
          productApi.getCategories(),
          productApi.getBrands(),
          storeApi.getTopProVendors(6).catch(() => [] as TopProVendor[]),
        ]);
        if (cancelled) return;
        setProducts(p as HomeProduct[]);
        setCategories(c as HomeCategory[]);
        setBrands(b as HomeBrand[]);
        setTopProVendors(v);
      } catch (err: any) {
        if (cancelled) return;
        setError(err?.message || "Failed to load");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tick]);

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
