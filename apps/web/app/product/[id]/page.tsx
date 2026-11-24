import { notFound, permanentRedirect } from 'next/navigation';
import ProductDetailClient from '@/components/product-detail/ProductDetailClient';
import { fetchProductByIdServer } from '@/lib/server-api';
import { isPubliclyVisible } from '@/lib/product-visibility';
import { buildProductSlug, isUuid } from '@/lib/product-slug';

export default async function ProductDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const initialProduct = await fetchProductByIdServer(id);

  // Non-approved / rejected listings return 404 to public visitors and crawlers.
  if (initialProduct && !isPubliclyVisible(initialProduct)) {
    notFound();
  }

  // Fallback redirect if someone reaches a UUID URL directly (primary 301 is in proxy.ts).
  if (initialProduct && isUuid(id)) {
    const slug = buildProductSlug(initialProduct);
    if (slug && slug !== id && !isUuid(slug)) {
      permanentRedirect(`/product/${encodeURIComponent(slug)}`);
    }
  }

  return (
    <ProductDetailClient
      initialProduct={initialProduct}
      productId={initialProduct?.id ? String(initialProduct.id) : id}
    />
  );
}
