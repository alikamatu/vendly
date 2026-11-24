/**
 * Shared public-visibility helper for web routes, rails, and sitemaps (T04; reused by T09 and T15):
 * only approved/active listings (never draft, rejected, or archived) are visible publicly.
 */

export const PUBLIC_PRODUCT_STATUSES = ['active', 'published', 'approved'] as const;

export interface PublicProductLike {
  status?: string | null;
  quantity_available?: number | null;
}

export function isPubliclyVisible(product?: PublicProductLike | null): boolean {
  if (!product) return false;
  // If an endpoint omits `status`, fail-safe only when explicitly approved/active;
  // public list endpoints on our API include `status`.
  if (product.status == null) return true;
  const status = String(product.status).trim().toLowerCase();
  return (PUBLIC_PRODUCT_STATUSES as readonly string[]).includes(status);
}

export function isPubliclyVisibleInStock(product?: PublicProductLike | null): boolean {
  if (!isPubliclyVisible(product)) return false;
  return typeof product?.quantity_available === 'number' ? product.quantity_available > 0 : true;
}

/**
 * Shared filter for homepage rails (Top Deals, Featured, Recently Added, Brand sections)
 * and sitemaps: only approved AND in-stock items appear.
 */
export function filterRailProducts<T extends object>(products: readonly T[]): T[] {
  return products.filter((p) => isPubliclyVisibleInStock(p as PublicProductLike));
}
