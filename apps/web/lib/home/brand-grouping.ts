import type { HomeBrand, HomeProduct } from "@/hooks/useHomeData";

export interface BrandBucket {
  id: string;
  name: string;
  logoUrl: string | null;
  totalCount: number;
  products: HomeProduct[];
}

/**
 * Groups products by brand and ranks them by product count (descending).
 * - Only brands with at least one product appear.
 * - `productsLimit` caps the products returned per bucket (default 10).
 * - `brandsLimit` caps the number of buckets (default: no cap).
 */
export function groupByBrand(
  products: HomeProduct[],
  brandRefs: HomeBrand[] = [],
  opts: { productsLimit?: number; brandsLimit?: number } = {},
): BrandBucket[] {
  const productsLimit = opts.productsLimit ?? 10;

  const buckets = new Map<string, HomeProduct[]>();
  for (const p of products) {
    const name = (p.brand || "").trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(p);
  }

  const refByName = new Map<string, HomeBrand>();
  for (const b of brandRefs) refByName.set(b.name.toLowerCase(), b);

  const list: BrandBucket[] = [];
  for (const [key, items] of buckets) {
    const name = items[0].brand || key;
    const ref = refByName.get(key);
    list.push({
      id: ref?.id ?? key,
      name,
      logoUrl: ref?.image_url ?? null,
      totalCount: items.length,
      products: items.slice(0, productsLimit),
    });
  }

  list.sort((a, b) => b.totalCount - a.totalCount);
  return opts.brandsLimit ? list.slice(0, opts.brandsLimit) : list;
}
