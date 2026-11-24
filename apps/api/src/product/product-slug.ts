/**
 * Deterministic, collision-safe product URL slugs (T15: PD-07).
 * Format: `<slugified-title>-<slugified-store-link>` (e.g. `chill-hoodie-the-hoodies`),
 * with `-<first-6-hex-of-id>` appended when two products in the same store collide.
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ProductSlugInput {
  id: string;
  title?: string | null;
  slug?: string | null;
  seller?: {
    store_link?: string | null;
    store_name?: string | null;
  } | null;
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

export function buildBaseProductSlug(product: ProductSlugInput): string {
  const titlePart = slugifySegment(product.title)
    .slice(0, 64)
    .replace(/-+$/g, '');
  const storePart = slugifySegment(
    product.seller?.store_link || product.seller?.store_name || '',
  )
    .slice(0, 40)
    .replace(/-+$/g, '');

  if (titlePart && storePart) return `${titlePart}-${storePart}`;
  if (titlePart) return titlePart;
  return product.id;
}

export function buildProductSlug(
  product: ProductSlugInput,
  disambiguate = false,
): string {
  if (product.slug && !isUuid(product.slug)) return product.slug;
  const base = buildBaseProductSlug(product);
  if (!disambiguate || base === product.id) return base;
  const suffix = product.id.replace(/-/g, '').slice(0, 6).toLowerCase();
  return `${base}-${suffix}`;
}

export function attachProductSlugs<T extends ProductSlugInput>(
  products: T[],
): Array<T & { slug: string }> {
  const counts = new Map<string, number>();
  for (const p of products) {
    const base = buildBaseProductSlug(p);
    counts.set(base, (counts.get(base) || 0) + 1);
  }
  return products.map((p) => {
    const base = buildBaseProductSlug(p);
    const hasCollision = (counts.get(base) || 0) > 1;
    return {
      ...p,
      slug: buildProductSlug(p, hasCollision),
    };
  });
}
