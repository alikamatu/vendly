/**
 * Public brand display guard & feature flag (T02: HM-01, CT-01, PD-01, PD-02).
 *
 * - `SHOW_BRAND_RAIL` hides the homepage "Top Verndly Brands" rail and the
 *   /categories "Popular brands on Verndly" block until there are authorized
 *   brand values AND real product ratings.
 * - `RESTRICTED_BRAND_DENYLIST` prevents unverified third-party trademarked
 *   brand names (Apple, Nike, etc.) from rendering publicly unless the store
 *   is explicitly flagged `brand_authorized`.
 */

export const SHOW_BRAND_RAIL = process.env.NEXT_PUBLIC_SHOW_BRAND_RAIL === 'true';

const RESTRICTED_BRAND_DENYLIST = new Set([
  'apple',
  'nike',
  'adidas',
  'samsung',
  'sony',
  'gucci',
  'louis vuitton',
  'prada',
  'balenciaga',
  'rolex',
  'jordan',
  'air jordan',
  'puma',
  'zara',
  'h&m',
  'microsoft',
  'google',
  'dell',
  'hp',
  'lenovo',
  'xiaomi',
  'huawei',
  'chanel',
  'dior',
  'versace',
  'hermes',
  'cartier',
  'beats',
  'bose',
  'jbl',
  'nintendo',
  'playstation',
  'xbox',
  'canon',
  'nikon',
  'dyson',
]);

export interface BrandSellerLike {
  brand_authorized?: boolean | null;
  [key: string]: unknown;
}

/**
 * Returns `false` if `brand` matches a trademarked third-party name on the
 * deny-list and the seller is not explicitly flagged `brand_authorized`.
 */
export function isBrandAllowedPublicly(
  brand?: string | null,
  seller?: BrandSellerLike | null,
): boolean {
  const normalized = (brand || '').trim().toLowerCase();
  if (!normalized) return false;
  if (seller?.brand_authorized === true) return true;
  return !RESTRICTED_BRAND_DENYLIST.has(normalized);
}

/**
 * Returns the trimmed brand name if allowed for public display, or `null`
 * when it should be suppressed.
 */
export function getPublicBrand(
  brand?: string | null,
  seller?: BrandSellerLike | null,
): string | null {
  const trimmed = (brand || '').trim();
  if (!trimmed) return null;
  return isBrandAllowedPublicly(trimmed, seller) ? trimmed : null;
}
