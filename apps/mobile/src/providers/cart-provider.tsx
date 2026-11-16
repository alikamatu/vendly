import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { jsonStorage } from '@/lib/storage';

/** Same shape as apps/web/lib/contexts/cart-context.tsx. */
export interface CartItem {
  productId: string;
  variantId?: string | null;
  variantLabel?: string | null;
  title: string;
  price: string;
  imageUrl: string;
  quantity: number;
  storeLink: string;
  storeName: string;
  logoUrl?: string | null;
}

export interface CartGroup {
  storeLink: string;
  storeName: string;
  logoUrl?: string | null;
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
}

export function cartKey(productId: string, variantId?: string | null) {
  return variantId ? `${productId}::${variantId}` : productId;
}
const itemKey = (i: CartItem) => cartKey(i.productId, i.variantId ?? null);

function groupByVendor(items: CartItem[]): CartGroup[] {
  const byStore = new Map<string, CartGroup>();
  for (const item of items) {
    const key = item.storeLink || 'unknown';
    let group = byStore.get(key);
    if (!group) {
      group = {
        storeLink: key,
        storeName: item.storeName,
        logoUrl: item.logoUrl,
        items: [],
        totalItems: 0,
        totalPrice: 0,
      };
      byStore.set(key, group);
    }
    group.items.push(item);
    group.totalItems += item.quantity;
    group.totalPrice += parseFloat(item.price) * item.quantity;
  }
  return Array.from(byStore.values());
}

const STORAGE_KEY = 'vendly_cart';

interface CartContextValue {
  items: CartItem[];
  groups: CartGroup[];
  itemCount: number;
  totalPrice: number;
  addItem: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void;
  updateQuantity: (key: string, quantity: number) => void;
  removeItem: (key: string) => void;
  removeStore: (storeLink: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    jsonStorage.get<CartItem[]>(STORAGE_KEY, []).then((stored) => {
      setItems(Array.isArray(stored) ? stored : []);
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (hydrated) void jsonStorage.set(STORAGE_KEY, items);
  }, [items, hydrated]);

  const addItem = useCallback<CartContextValue['addItem']>((item, quantity = 1) => {
    const key = cartKey(item.productId, item.variantId ?? null);
    setItems((prev) => {
      const existing = prev.find((i) => itemKey(i) === key);
      if (existing) {
        return prev.map((i) =>
          itemKey(i) === key ? { ...i, quantity: i.quantity + quantity } : i,
        );
      }
      return [...prev, { ...item, quantity }];
    });
  }, []);

  const removeItem = useCallback((key: string) => {
    setItems((prev) => prev.filter((i) => itemKey(i) !== key));
  }, []);

  const updateQuantity = useCallback((key: string, quantity: number) => {
    setItems((prev) =>
      quantity < 1
        ? prev.filter((i) => itemKey(i) !== key)
        : prev.map((i) => (itemKey(i) === key ? { ...i, quantity } : i)),
    );
  }, []);

  const removeStore = useCallback((storeLink: string) => {
    setItems((prev) => prev.filter((i) => i.storeLink !== storeLink));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartContextValue>(() => {
    const groups = groupByVendor(items);
    return {
      items,
      groups,
      itemCount: items.reduce((n, i) => n + i.quantity, 0),
      totalPrice: groups.reduce((sum, g) => sum + g.totalPrice, 0),
      addItem,
      updateQuantity,
      removeItem,
      removeStore,
      clear,
    };
  }, [items, addItem, updateQuantity, removeItem, removeStore, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
