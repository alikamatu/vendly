import { notFound } from 'next/navigation';
import ProductDetailClient from '@/components/product-detail/ProductDetailClient';
import { fetchProductByIdServer } from '@/lib/server-api';
import { isPubliclyVisible } from '@/lib/product-visibility';

export default async function ProductDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const initialProduct = await fetchProductByIdServer(id);

  // Non-approved / rejected listings return 404 to public visitors and crawlers.
  if (initialProduct && !isPubliclyVisible(initialProduct)) {
    notFound();
  }

  return <ProductDetailClient initialProduct={initialProduct} productId={id} />;
}
