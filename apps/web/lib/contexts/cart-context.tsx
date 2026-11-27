'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/contexts/auth-context';
import { isOwnStore } from '@/lib/utils/ownership';

export interface CartItem {
  productId: string;
  /** Optional ProductVariant.id when the product has size/colour variants. */
  variantId?: string | null;
  /** Human-readable description of the chosen variant, e.g. "Size M · Red". */
  variantLabel?: string | null;
  title: string;
  price: string;
  imageUrl: string;
  videoUrl?: string | null;
  quantity: number;
  /** Latest known available inventory for this product/variant. */
  maxStock?: number | null;
  storeLink: string;
  storeName: string;
  logoUrl?: string | null;
}

/** Composite key — items with different variantIds are distinct cart entries. */
function cartKey(productId: string, variantId?: string | null) {
  return variantId ? `${productId}::${variantId}` : productId;
}
function itemKey(i: CartItem) {
  return cartKey(i.productId, i.variantId ?? null);
}

type CartState = CartItem[];

const STORAGE_KEY = 'vendly_cart';

function loadCart(): CartState {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCart(items: CartState) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

interface GroupedCart {
  storeLink: string;
  storeName: string;
  logoUrl?: string | null;
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
}

function groupCartByVendor(items: CartItem[]): GroupedCart[] {
  const byStore = new Map<
    string,
    { storeName: string; logoUrl?: string | null; items: CartItem[] }
  >();
  for (const item of items) {
    const key = item.storeLink || 'unknown';
    if (!byStore.has(key)) {
      byStore.set(key, { storeName: item.storeName, logoUrl: item.logoUrl, items: [] });
    }
    byStore.get(key)!.items.push(item);
  }
  return Array.from(byStore.entries()).map(([storeLink, data]) => ({
    storeLink,
    storeName: data.storeName,
    logoUrl: data.logoUrl,
    items: data.items,
    totalItems: data.items.reduce((sum, i) => sum + i.quantity, 0),
    totalPrice: data.items.reduce((sum, i) => sum + parseFloat(String(i.price)) * i.quantity, 0),
  }));
}

interface CartContextValue {
  items: CartItem[];
  /** Returns true when item was added/incremented, false when blocked by stock or ownership. */
  addItem: (item: Omit<CartItem, 'quantity'>) => boolean;
  /** productId or full composite key produced by `cartKey(productId, variantId)`. */
  removeItem: (key: string) => void;
  updateQuantity: (key: string, quantity: number, maxStockOverride?: number | null) => void;
  clearCart: () => void;
  itemCount: number;
  totalPrice: number;
  groupedByVendor: GroupedCart[];
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<CartState>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setItems(loadCart());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveCart(items);
  }, [items, hydrated]);

  const addItem = useCallback(
    (item: Omit<CartItem, 'quantity'>): boolean => {
      if (isOwnStore(user, { store_link: item.storeLink })) {
        toast.error('You cannot purchase your own product.');
        return false;
      }
      const key = cartKey(item.productId, item.variantId ?? null);
      const incomingMax =
        typeof item.maxStock === 'number' && Number.isFinite(item.maxStock)
          ? Math.max(0, Math.floor(item.maxStock))
          : null;

      if (incomingMax !== null && incomingMax <= 0) {
        toast.error(`${item.title} is out of stock.`);
        return false;
      }

      const existing = items.find((i) => itemKey(i) === key);
      const effectiveMax =
        incomingMax !== null
          ? incomingMax
          : typeof existing?.maxStock === 'number' && Number.isFinite(existing.maxStock)
            ? Math.max(0, Math.floor(existing.maxStock))
            : null;

      if (existing) {
        if (effectiveMax !== null && existing.quantity >= effectiveMax) {
          toast.error(
            effectiveMax === 1
              ? `Only 1 of "${item.title}" is available in stock.`
              : `Only ${effectiveMax} of "${item.title}" available in stock.`,
          );
          return false;
        }
        setItems((prev) =>
          prev.map((i) =>
            itemKey(i) === key
              ? {
                  ...i,
                  quantity:
                    effectiveMax !== null ? Math.min(effectiveMax, i.quantity + 1) : i.quantity + 1,
                  ...(effectiveMax !== null ? { maxStock: effectiveMax } : {}),
                }
              : i,
          ),
        );
        return true;
      }

      setItems((prev) => [
        ...prev,
        {
          ...item,
          quantity: 1,
          ...(effectiveMax !== null ? { maxStock: effectiveMax } : {}),
        },
      ]);
      return true;
    },
    [user, items],
  );

  const removeItem = useCallback((key: string) => {
    setItems((prev) => prev.filter((i) => itemKey(i) !== key && i.productId !== key));
  }, []);

  const updateQuantity = useCallback(
    (key: string, quantity: number, maxStockOverride?: number | null) => {
      const nextInt = Math.floor(quantity);
      if (nextInt < 1) {
        setItems((prev) => prev.filter((i) => itemKey(i) !== key && i.productId !== key));
        return;
      }
      const target = items.find((i) => itemKey(i) === key || i.productId === key);
      const resolvedMax =
        typeof maxStockOverride === 'number' && Number.isFinite(maxStockOverride)
          ? Math.max(0, Math.floor(maxStockOverride))
          : typeof target?.maxStock === 'number' && Number.isFinite(target.maxStock)
            ? Math.max(0, Math.floor(target.maxStock))
            : null;

      if (resolvedMax !== null && resolvedMax <= 0) {
        toast.error(target ? `"${target.title}" is out of stock.` : 'This item is out of stock.');
        return;
      }

      let clamped = nextInt;
      if (resolvedMax !== null && nextInt > resolvedMax) {
        clamped = resolvedMax;
        toast.error(`Only ${resolvedMax} of "${target?.title || 'this item'}" available in stock.`);
      }

      setItems((prev) =>
        prev.map((i) =>
          itemKey(i) === key || i.productId === key
            ? {
                ...i,
                quantity: clamped,
                ...(resolvedMax !== null ? { maxStock: resolvedMax } : {}),
              }
            : i,
        ),
      );
    },
    [items],
  );

  const clearCart = useCallback(() => setItems([]), []);

  const itemCount = useMemo(() => items.reduce((n, i) => n + i.quantity, 0), [items]);
  const totalPrice = useMemo(
    () => items.reduce((sum, i) => sum + parseFloat(String(i.price)) * i.quantity, 0),
    [items],
  );
  const groupedByVendor = useMemo(() => groupCartByVendor(items), [items]);

  const value: CartContextValue = useMemo(
    () => ({
      items,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      itemCount,
      totalPrice,
      groupedByVendor,
    }),
    [items, addItem, removeItem, updateQuantity, clearCart, itemCount, totalPrice, groupedByVendor],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
