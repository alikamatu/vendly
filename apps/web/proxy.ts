import { NextRequest, NextResponse } from 'next/server';
import { buildProductSlug, isUuid } from '@/lib/product-slug';
import { isPubliclyVisible } from '@/lib/product-visibility';

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1000').replace(/\/$/, '');

/**
 * PD-07: 301-redirect legacy UUID product URLs (`/product/{uuid}`) to their
 * canonical human-readable slug (`/product/{slug}`).
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const match = pathname.match(/^\/product\/([^/]+)\/?$/);
  if (!match) return NextResponse.next();

  const segment = decodeURIComponent(match[1]);
  if (!isUuid(segment)) return NextResponse.next();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${API_URL}/products/${encodeURIComponent(segment)}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timeout);

    if (!res.ok) return NextResponse.next();
    const json = await res.json();
    const product = json && typeof json === 'object' && 'data' in json ? json.data : json;
    if (!product || !isPubliclyVisible(product)) return NextResponse.next();

    const slug = buildProductSlug(product);
    if (slug && slug !== segment && !isUuid(slug)) {
      const target = new URL(`/product/${encodeURIComponent(slug)}${search}`, request.url);
      return NextResponse.redirect(target, 301);
    }
  } catch {
    // If API is temporarily unreachable, fall through to the product route.
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/product/:id'],
};
