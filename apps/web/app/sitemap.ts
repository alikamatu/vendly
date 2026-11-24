import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';
import { ALL_BLOG_POSTS } from '@/lib/content/blog-posts';
import { slugifyCategory } from '@/lib/content/categories';
import { isPubliclyVisibleInStock } from '@/lib/product-visibility';
import { getProductPath } from '@/lib/product-slug';

/**
 * Dynamic sitemap. Static informational routes, editorial guides, stocked
 * category landing pages, approved in-stock slug product URLs, and all public
 * storefronts are included automatically from the API.
 */
const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1000').replace(/\/$/, '');

interface ProductSlim {
  id: string;
  slug?: string;
  title?: string;
  category?: string;
  status?: string;
  quantity_available?: number;
  seller?: {
    store_link?: string | null;
    store_name?: string | null;
  } | null;
  updated_at?: string;
  created_at?: string;
}
interface StoreSlim {
  store_link?: string;
  updated_at?: string;
  created_at?: string;
}

async function safeFetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { next: { revalidate: 60 * 30 } });
    if (!res.ok) return null;
    const json = await res.json();
    return (json && typeof json === 'object' && 'data' in json ? (json as any).data : json) as T;
  } catch {
    return null;
  }
}

const STATIC_ROUTES: Array<{
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'];
  priority: number;
}> = [
  { path: '/', changeFrequency: 'daily', priority: 1.0 },
  { path: '/sell', changeFrequency: 'weekly', priority: 0.95 },
  { path: '/products', changeFrequency: 'hourly', priority: 0.95 },
  { path: '/buyer-protection', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/blog', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/categories', changeFrequency: 'daily', priority: 0.9 },
  { path: '/stores', changeFrequency: 'daily', priority: 0.9 },
  { path: '/returns', changeFrequency: 'weekly', priority: 0.8 },
  { path: '/faq', changeFrequency: 'weekly', priority: 0.8 },
  { path: '/shipping', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/about', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/contact', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/help', changeFrequency: 'weekly', priority: 0.5 },
  { path: '/privacy', changeFrequency: 'monthly', priority: 0.4 },
  { path: '/terms', changeFrequency: 'monthly', priority: 0.4 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((r) => ({
    url: `${SITE_URL}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  // Editorial Guides & Comparisons (/blog/[slug])
  const blogEntries: MetadataRoute.Sitemap = ALL_BLOG_POSTS.map((post) => ({
    url: `${SITE_URL}/blog/${post.slug}`,
    lastModified: new Date(post.updatedAt || post.publishedAt),
    changeFrequency: 'weekly' as const,
    priority: post.rank <= 5 ? 0.9 : 0.8,
  }));

  // Products: take the first ~5000 to keep the sitemap under 50k entries.
  const productsResp = await safeFetchJson<{ data?: ProductSlim[] } | ProductSlim[]>(
    `${API_URL}/products?page=1&limit=5000`,
  );
  const products: ProductSlim[] = Array.isArray(productsResp)
    ? productsResp
    : (productsResp as any)?.data || [];

  const inStockProducts = products.filter(isPubliclyVisibleInStock);

  // Dedicated Category Landing Pages (/categories/[slug]):
  // Include only categories with >= 1 approved, in-stock listing (CT-02 / TX-01).
  const stockedCategorySlugs = new Set<string>();
  for (const p of inStockProducts) {
    if (p.category && p.category.trim()) {
      stockedCategorySlugs.add(slugifyCategory(p.category));
    }
  }
  const categoryEntries: MetadataRoute.Sitemap = Array.from(stockedCategorySlugs).map((slug) => ({
    url: `${SITE_URL}/categories/${slug}`,
    lastModified: now,
    changeFrequency: 'daily' as const,
    priority: 0.85,
  }));

  const productEntries: MetadataRoute.Sitemap = inStockProducts.map((p) => ({
    url: `${SITE_URL}${getProductPath(p)}`,
    lastModified: p.updated_at
      ? new Date(p.updated_at)
      : p.created_at
        ? new Date(p.created_at)
        : now,
    changeFrequency: 'daily' as const,
    priority: 0.85,
  }));

  // Public Stores (/s/{store_link}) — API returns { stores, total, ... } (TX-01).
  const storesResp = await safeFetchJson<
    { stores?: StoreSlim[]; data?: { stores?: StoreSlim[] } } | StoreSlim[]
  >(`${API_URL}/stores?page=1&limit=500`);
  const stores: StoreSlim[] = Array.isArray(storesResp)
    ? storesResp
    : Array.isArray(storesResp?.stores)
      ? storesResp.stores
      : Array.isArray(storesResp?.data?.stores)
        ? storesResp.data.stores
        : [];
  const storeEntries: MetadataRoute.Sitemap = stores.flatMap((s) =>
    s.store_link
      ? [
          {
            url: `${SITE_URL}/s/${encodeURIComponent(s.store_link)}`,
            lastModified: s.updated_at ? new Date(s.updated_at) : now,
            changeFrequency: 'daily' as const,
            priority: 0.8,
          },
        ]
      : [],
  );

  return [...staticEntries, ...blogEntries, ...categoryEntries, ...productEntries, ...storeEntries];
}
