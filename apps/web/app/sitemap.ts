import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

/**
 * Dynamic sitemap. Static informational routes are hardcoded; products,
 * stores, and categories are fetched from the API at build/request time.
 *
 * Each fetch is wrapped in a try/catch so a temporarily-down API can't
 * fail the entire sitemap response — Google will just see the static
 * routes for that request.
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:1000";

interface ProductSlim { id: string; updated_at?: string; created_at?: string }
interface StoreSlim { store_link?: string; updated_at?: string; created_at?: string }
interface CategorySlim { name?: string }

async function safeFetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { next: { revalidate: 60 * 30 } });
    if (!res.ok) return null;
    const json = await res.json();
    return (json && typeof json === "object" && "data" in json
      ? (json as any).data
      : json) as T;
  } catch {
    return null;
  }
}

const STATIC_ROUTES: Array<{ path: string; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]; priority: number }> = [
  { path: "/", changeFrequency: "daily", priority: 1.0 },
  { path: "/products", changeFrequency: "hourly", priority: 0.9 },
  { path: "/stores", changeFrequency: "daily", priority: 0.8 },
  { path: "/categories", changeFrequency: "weekly", priority: 0.7 },
  { path: "/about", changeFrequency: "monthly", priority: 0.5 },
  { path: "/contact", changeFrequency: "monthly", priority: 0.5 },
  { path: "/help", changeFrequency: "monthly", priority: 0.4 },
  { path: "/faq", changeFrequency: "monthly", priority: 0.4 },
  { path: "/shipping", changeFrequency: "monthly", priority: 0.3 },
  { path: "/returns", changeFrequency: "monthly", priority: 0.3 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.3 },
  { path: "/login", changeFrequency: "yearly", priority: 0.2 },
  { path: "/register", changeFrequency: "yearly", priority: 0.2 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((r) => ({
    url: `${SITE_URL}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  // Products: take the first ~5000 to keep the sitemap under 50k entries.
  // For very large catalogs, split into multiple sitemap routes later.
  const productsResp = await safeFetchJson<{ data?: ProductSlim[] } | ProductSlim[]>(
    `${API_URL}/products?page=1&limit=5000`,
  );
  const products: ProductSlim[] = Array.isArray(productsResp)
    ? productsResp
    : (productsResp as any)?.data || [];

  const productEntries: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${SITE_URL}/product/${p.id}`,
    lastModified: p.updated_at ? new Date(p.updated_at) : p.created_at ? new Date(p.created_at) : now,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // Stores
  const stores = (await safeFetchJson<StoreSlim[]>(`${API_URL}/stores`)) || [];
  const storeEntries: MetadataRoute.Sitemap = (Array.isArray(stores) ? stores : []).flatMap((s) =>
    s.store_link
      ? [
          {
            url: `${SITE_URL}/s/${s.store_link}`,
            lastModified: s.updated_at ? new Date(s.updated_at) : now,
            changeFrequency: "weekly" as const,
            priority: 0.6,
          },
        ]
      : [],
  );

  // Categories
  const cats = (await safeFetchJson<CategorySlim[]>(`${API_URL}/categories`)) || [];
  const categoryEntries: MetadataRoute.Sitemap = (Array.isArray(cats) ? cats : []).flatMap((c) =>
    c.name
      ? [
          {
            url: `${SITE_URL}/products?category=${encodeURIComponent(c.name)}`,
            lastModified: now,
            changeFrequency: "daily" as const,
            priority: 0.6,
          },
        ]
      : [],
  );

  return [...staticEntries, ...productEntries, ...storeEntries, ...categoryEntries];
}
