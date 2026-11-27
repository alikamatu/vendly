/**
 * Server-side data fetching utilities for Next.js Server Components.
 * Uses ISR caching (5 min) and graceful fallbacks so SSR HTML always renders
 * cleanly for search crawlers and users without failing builds when the API is offline.
 */

import { isPubliclyVisible, isPubliclyVisibleInStock } from '@/lib/product-visibility';

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1000').replace(/\/$/, '');

async function safeFetch<T>(path: string, fallback: T, revalidate = 300): Promise<T> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${API_URL}${path}`, {
      next: { revalidate },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return fallback;
    const json = await res.json();
    if (json && typeof json === 'object' && 'data' in json) {
      return (json as { data: T }).data ?? fallback;
    }
    return (json as T) ?? fallback;
  } catch {
    return fallback;
  }
}

export async function fetchCategoriesServer<T = any[]>(): Promise<T> {
  const data = await safeFetch<any>('/categories', []);
  return (Array.isArray(data) ? data : []) as T;
}

export async function fetchTopSellingCategoriesServer<T = any[]>(
  limit = 10,
  productsPerCategory = 10,
): Promise<T> {
  const data = await safeFetch<any>(
    `/products/top-selling-categories?limit=${limit}&products_per_category=${productsPerCategory}`,
    [],
  );
  return (Array.isArray(data) ? data : []) as T;
}

export async function fetchBrandsServer<T = any[]>(): Promise<T> {
  const data = await safeFetch<any>('/brands', []);
  return (Array.isArray(data) ? data : []) as T;
}

export async function fetchTopProVendorsServer<T = any[]>(limit = 6): Promise<T> {
  const data = await safeFetch<any>(`/stores/top-pro?limit=${limit}`, []);
  return (Array.isArray(data) ? data : []) as T;
}

export async function fetchHomeProductsServer<T = any[]>(limit = 48): Promise<T> {
  const raw = await safeFetch<any>(`/products?page=1&limit=${limit}&in_stock=true`, []);
  const list = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
  return list as T;
}

export async function fetchBrowseProductsServer(params?: {
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
  sort?: string;
  inStock?: boolean;
}): Promise<{
  data: any[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}> {
  const qs = new URLSearchParams();
  qs.set('page', String(params?.page || 1));
  qs.set('limit', String(params?.limit || 24));
  if (params?.inStock) qs.set('in_stock', 'true');
  if (params?.category) qs.set('category', params.category);
  if (params?.search) qs.set('search', params.search);
  if (params?.sort) qs.set('sort', params.sort);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${API_URL}/products?${qs.toString()}`, {
      next: { revalidate: 300 },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) {
      return { data: [], meta: { total: 0, page: 1, limit: params?.limit || 24, totalPages: 1 } };
    }
    const json = await res.json();
    const payload =
      json && typeof json === 'object' && 'data' in json && !Array.isArray(json.data)
        ? json.data
        : json;
    const rawItems = Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload)
        ? payload
        : [];
    const items = rawItems.filter(params?.inStock ? isPubliclyVisibleInStock : isPubliclyVisible);
    const meta = payload?.meta || {
      total: items.length,
      page: params?.page || 1,
      limit: params?.limit || 24,
      totalPages: Math.max(1, Math.ceil(items.length / (params?.limit || 24))),
    };
    return { data: items, meta };
  } catch {
    return { data: [], meta: { total: 0, page: 1, limit: params?.limit || 24, totalPages: 1 } };
  }
}

export async function fetchBrowseStoresServer(limit = 12): Promise<{
  stores: any[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${API_URL}/stores?page=1&limit=${limit}`, {
      next: { revalidate: 300 },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) {
      return { stores: [], meta: { total: 0, page: 1, limit, totalPages: 1 } };
    }
    const json = await res.json();
    const payload =
      json && typeof json === 'object' && 'data' in json && !Array.isArray(json.data)
        ? json.data
        : json;
    const stores = Array.isArray(payload?.stores)
      ? payload.stores
      : Array.isArray(payload)
        ? payload
        : [];
    return {
      stores,
      meta: {
        total: payload?.total ?? stores.length,
        page: payload?.page ?? 1,
        limit: payload?.limit ?? limit,
        totalPages: payload?.totalPages ?? Math.max(1, Math.ceil(stores.length / limit)),
      },
    };
  } catch {
    return { stores: [], meta: { total: 0, page: 1, limit, totalPages: 1 } };
  }
}

export async function fetchProductByIdServer(id: string): Promise<any | null> {
  return safeFetch<any | null>(`/products/${encodeURIComponent(id)}`, null);
}

export async function fetchStoreBySlugServer(slug: string): Promise<any | null> {
  return safeFetch<any | null>(`/stores/link/${encodeURIComponent(slug)}`, null);
}

export async function fetchStoreProductsServer(slug: string): Promise<any[]> {
  const data = await safeFetch<any>(`/products/store/${encodeURIComponent(slug)}`, []);
  return Array.isArray(data) ? data : [];
}
