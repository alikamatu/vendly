"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "verndly_recently_viewed";
const MAX_ITEMS = 24;

export interface RecentlyViewedItem {
  id: string;
  title: string;
  price?: string | number;
  image?: string | null;
  storeName?: string | null;
  storeLink?: string | null;
  viewedAt: number;
}

function read(): RecentlyViewedItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(items: RecentlyViewedItem[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
  } catch {
    // quota / SSR safe noop
  }
}

/**
 * Tracks recently viewed products in localStorage. Returns the list and a
 * `record` callback. Components on detail pages call `record(product)` once
 * the product loads; rails call `useRecentlyViewed()` to read.
 */
export function useRecentlyViewed() {
  const [items, setItems] = useState<RecentlyViewedItem[]>([]);

  useEffect(() => {
    setItems(read());
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setItems(read());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const record = useCallback((item: Omit<RecentlyViewedItem, "viewedAt">) => {
    if (!item?.id) return;
    const cur = read();
    const next: RecentlyViewedItem[] = [
      { ...item, viewedAt: Date.now() },
      ...cur.filter((x) => x.id !== item.id),
    ].slice(0, MAX_ITEMS);
    write(next);
    setItems(next);
  }, []);

  const clear = useCallback(() => {
    write([]);
    setItems([]);
  }, []);

  return { items, record, clear };
}
