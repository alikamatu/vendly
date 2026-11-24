/**
 * Shared product slug & path helpers (T15: PD-07).
 * Mirrors `apps/api/src/product/product-slug.ts` so links, canonicals, OG tags,
 * JSON-LD, and sitemap URLs always agree.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ProductSlugLike {
  id: string;
  slug?: string | null;
  title?: string | null;
  seller?: {
    store_link?: string | null;
    store_name?: string | null;
  } | null;
  store_link?: string | null;
  storeName?: string | null;
  storeLink?: string | null;
}

export function isUuid(value?: string | null): boolean {
  return Boolean(value && UUID_RE.test(value.trim()));
}

export function slugifySegment(text?: string | null): string {
  if (!text) return '';
  return text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’`]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

export function buildProductSlug(product?: ProductSlugLike | null, disambiguate = false): string {
  if (!product) return '';
  if (product.slug && !isUuid(product.slug)) return product.slug;

  const titlePart = slugifySegment(product.title).slice(0, 64).replace(/-+$/g, '');
  const storeSource =
    product.seller?.store_link ||
    product.store_link ||
    product.storeLink ||
    product.seller?.store_name ||
    product.storeName ||
    '';
  const storePart = slugifySegment(storeSource).slice(0, 40).replace(/-+$/g, '');

  const base =
    titlePart && storePart ? `${titlePart}-${storePart}` : titlePart || String(product.id);
  if (!disambiguate || base === String(product.id)) return base;
  const suffix = String(product.id).replace(/-/g, '').slice(0, 6).toLowerCase();
  return `${base}-${suffix}`;
}

export function getProductPath(product?: ProductSlugLike | null): string {
  if (!product) return '/products';
  const slug = buildProductSlug(product);
  return `/product/${encodeURIComponent(slug || product.id)}`;
}
