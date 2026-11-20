import ProductDetailClient from '@/components/product-detail/ProductDetailClient';
import { fetchProductByIdServer } from '@/lib/server-api';

export default async function ProductDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const initialProduct = await fetchProductByIdServer(id);

  return <ProductDetailClient initialProduct={initialProduct} productId={id} />;
}
