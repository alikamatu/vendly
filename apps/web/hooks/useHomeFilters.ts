"use client";

import { useEffect, useMemo, useState } from "react";
import type { HomeProduct } from "./useHomeData";

export type SortKey = "newest" | "price_asc" | "price_desc" | "alpha";

export interface HomeFiltersState {
  activeCategory: string | null;
  setActiveCategory: (v: string | null) => void;
  activeBrand: string | null;
  setActiveBrand: (v: string | null) => void;
  priceRange: [number, number];
  setPriceRange: (v: [number, number]) => void;
  sortBy: SortKey;
  setSortBy: (v: SortKey) => void;
  featured: HomeProduct[];
  regular: HomeProduct[];
  visible: HomeProduct[];
  hasActiveFilter: boolean;
  clearAll: () => void;
}

const DEFAULT_PRICE: [number, number] = [0, 100000];

function sortFn(sortBy: SortKey) {
  return (a: HomeProduct, b: HomeProduct) => {
    if (sortBy === "price_asc") return parseFloat(a.price) - parseFloat(b.price);
    if (sortBy === "price_desc") return parseFloat(b.price) - parseFloat(a.price);
    if (sortBy === "alpha") return a.title.localeCompare(b.title);
    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
  };
}

export function useHomeFilters(products: HomeProduct[]): HomeFiltersState {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeBrand, setActiveBrand] = useState<string | null>(null);
  const [priceRange, setPriceRange] = useState<[number, number]>(DEFAULT_PRICE);
  const [sortBy, setSortBy] = useState<SortKey>("newest");

  // Hydrate from URL params on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const p = new URLSearchParams(window.location.search);
    const cat = p.get("category");
    const brand = p.get("brand");
    if (cat) setActiveCategory(cat);
    if (brand) setActiveBrand(brand);
  }, []);

  const { featured, regular, visible } = useMemo(() => {
    let result = products.slice();
    if (activeCategory) result = result.filter((p) => p.category === activeCategory);
    if (activeBrand) result = result.filter((p) => p.brand === activeBrand);
    result = result.filter((p) => {
      const price = parseFloat(p.price);
      return price >= priceRange[0] && price <= priceRange[1];
    });

    const sorter = sortFn(sortBy);
    const featuredList = result.filter((p) => p.is_featured).sort(sorter);
    const regularList = result.filter((p) => !p.is_featured).sort(sorter);

    return { featured: featuredList, regular: regularList, visible: result.sort(sorter) };
  }, [products, activeCategory, activeBrand, priceRange, sortBy]);

  const hasActiveFilter = Boolean(
    activeCategory || activeBrand || priceRange[0] !== DEFAULT_PRICE[0] || priceRange[1] !== DEFAULT_PRICE[1],
  );

  return {
    activeCategory,
    setActiveCategory,
    activeBrand,
    setActiveBrand,
    priceRange,
    setPriceRange,
    sortBy,
    setSortBy,
    featured,
    regular,
    visible,
    hasActiveFilter,
    clearAll: () => {
      setActiveCategory(null);
      setActiveBrand(null);
      setPriceRange(DEFAULT_PRICE);
      setSortBy("newest");
    },
  };
}

export { DEFAULT_PRICE };
