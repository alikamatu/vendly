import type { HomeProduct } from "@/hooks/useHomeData";

/**
 * Returns the discount percent of a product (0–100) or null if there is no
 * valid discount. A valid discount requires `original_price > price`.
 */
export function getDiscountPercent(product: {
  price: string | number;
  original_price?: string | number | null;
}): number | null {
  const original = product.original_price != null ? Number(product.original_price) : NaN;
  const current = Number(product.price);
  if (!Number.isFinite(original) || !Number.isFinite(current)) return null;
  if (original <= current || original <= 0) return null;
  return ((original - current) / original) * 100;
}

/** Filters products whose discount is at least `min` percent. */
export function filterByMinDiscount(products: HomeProduct[], min: number): HomeProduct[] {
  return products.filter((p) => {
    const d = getDiscountPercent(p as any);
    return d !== null && d >= min;
  });
}

/** Sorts most-recent first by `created_at`. Stable for ties. */
export function sortByRecent<T extends { created_at?: string }>(items: T[]): T[] {
  return [...items].sort(
    (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime(),
  );
}
