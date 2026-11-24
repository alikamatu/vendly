/**
 * Product badge rules and Ghana-accurate service area labels (T12: PD-06).
 * Thresholds are intentionally conservative so 0-view / 0-review products
 * never display a misleading "Trending Now" badge.
 */

export const TRENDING_THRESHOLDS = {
  minViews7d: 50,
  minOrders7d: 5,
  minTotalViews: 100,
  minRatingCount: 3,
} as const;

export interface TrendingCheckProduct {
  views_7d?: number | null;
  orders_7d?: number | null;
  views_count?: number | null;
  rating_count?: number | null;
  quantity_available?: number | null;
}

export function isProductTrending(product?: TrendingCheckProduct | null): boolean {
  if (!product) return false;
  if (typeof product.quantity_available === 'number' && product.quantity_available <= 0) {
    return false;
  }

  const views7d = Number(product.views_7d ?? 0);
  const orders7d = Number(product.orders_7d ?? 0);
  if (views7d >= TRENDING_THRESHOLDS.minViews7d || orders7d >= TRENDING_THRESHOLDS.minOrders7d) {
    return true;
  }

  const totalViews = Number(product.views_count ?? 0);
  const ratingCount = Number(product.rating_count ?? 0);
  return (
    totalViews >= TRENDING_THRESHOLDS.minTotalViews &&
    ratingCount >= TRENDING_THRESHOLDS.minRatingCount
  );
}

/**
 * Ghana uses regions, not states (PD-06), and delivery coverage is seller-configured (T08).
 */
export const SERVICE_AREA_LABELS: Record<string, string> = {
  SAME_CITY: 'Same city only',
  NEARBY_STATES: 'Nearby areas',
  NATIONWIDE: 'Delivery set by seller',
};

export function getServiceAreaLabel(serviceArea?: string | null): string | null {
  if (!serviceArea) return null;
  return SERVICE_AREA_LABELS[serviceArea] ?? serviceArea;
}
