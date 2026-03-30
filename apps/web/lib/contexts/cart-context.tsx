"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export interface CartItem {
  productId: string;
  title: string;
  price: string;
  imageUrl: string;
  videoUrl?: string | null;
  quantity: number;
  storeLink: string;
  storeName: string;
  logoUrl?: string | null;
}

type CartState = CartItem[];

const STORAGE_KEY = "vendly_cart";

function loadCart(): CartState {
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

function saveCart(items: CartState) {
  if (typeof window === "undefined") return;
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

export function groupCartByVendor(items: CartItem[]): GroupedCart[] {
  const byStore = new Map<string, { storeName: string; logoUrl?: string | null; items: CartItem[] }>();
  for (const item of items) {
    const key = item.storeLink || "unknown";
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
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  itemCount: number;
  totalPrice: number;
  groupedByVendor: GroupedCart[];
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
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

  const addItem = useCallback((item: Omit<CartItem, "quantity">) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === item.productId);
      if (existing) {
        return prev.map((i) =>
          i.productId === item.productId ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity < 1) {
      setItems((prev) => prev.filter((i) => i.productId !== productId));
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.productId === productId ? { ...i, quantity } : i))
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const itemCount = useMemo(() => items.reduce((n, i) => n + i.quantity, 0), [items]);
  const totalPrice = useMemo(
    () => items.reduce((sum, i) => sum + parseFloat(String(i.price)) * i.quantity, 0),
    [items]
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
    [items, addItem, removeItem, updateQuantity, clearCart, itemCount, totalPrice, groupedByVendor]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
