import { useCallback, useEffect, useState } from 'react';

import type { Product } from '@/lib/api';
import { jsonStorage } from '@/lib/storage';

const STORAGE_KEY = 'vendly_recently_viewed';
const MAX_ITEMS = 12;

export function useRecentlyViewed() {
  const [items, setItems] = useState<Product[]>([]);

  useEffect(() => {
    jsonStorage.get<Product[]>(STORAGE_KEY, []).then((stored) => {
      if (Array.isArray(stored)) setItems(stored);
    });
  }, []);

  const recordView = useCallback((product: Product) => {
    setItems((prev) => {
      const next = [product, ...prev.filter((p) => p.id !== product.id)].slice(0, MAX_ITEMS);
      void jsonStorage.set(STORAGE_KEY, next);
      return next;
    });
  }, []);

  return { items, recordView };
}
