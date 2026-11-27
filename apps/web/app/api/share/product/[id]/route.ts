import { NextRequest } from 'next/server';
import { isPubliclyVisible } from '@/lib/product-visibility';
import { toShareImageUrl } from '@/lib/share/product-share';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1000').replace(/\/$/, '');

/**
 * Same-origin square JPEG of the product photo.
 * Used as the Open Graph image and as the file attached to the system share sheet,
 * so WhatsApp, iMessage, and X show the picture and title instead of a bare link.
 */
export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const product = await fetchProduct(id);
  const imageUrl = product?.image_urls?.find((url) => typeof url === 'string' && url.length > 0);
  if (!product || !isPubliclyVisible(product) || !imageUrl) {
    return new Response(null, { status: 404 });
  }

  try {
    const upstream = await fetch(toShareImageUrl(imageUrl), {
      headers: { Accept: 'image/jpeg,image/png,image/*' },
      next: { revalidate: 3600 },
    });
    if (!upstream.ok) return new Response(null, { status: 404 });
    const bytes = await upstream.arrayBuffer();
    if (bytes.byteLength === 0) return new Response(null, { status: 404 });
    const rawType = upstream.headers.get('content-type')?.split(';')[0]?.trim() || 'image/jpeg';
    const type = rawType === 'image/jpg' ? 'image/jpeg' : rawType;
    return new Response(bytes, {
      headers: {
        'Content-Type': type.startsWith('image/') ? type : 'image/jpeg',
        'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}

async function fetchProduct(id: string): Promise<{
  status?: string | null;
  quantity_available?: number | null;
  image_urls?: string[];
} | null> {
  try {
    const res = await fetch(`${API_URL}/products/${encodeURIComponent(id)}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json && typeof json === 'object' && 'data' in json ? json.data : json;
  } catch {
    return null;
  }
}
