import StorefrontClient from '@/components/store/StorefrontClient';
import { fetchStoreBySlugServer, fetchStoreProductsServer } from '@/lib/server-api';
import { isPubliclyVisible } from '@/lib/product-visibility';

export default async function StorePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [initialStore, rawProducts] = await Promise.all([
    fetchStoreBySlugServer(slug),
    fetchStoreProductsServer(slug),
  ]);
  const initialProducts = rawProducts.filter(isPubliclyVisible);

  return (
    <StorefrontClient slug={slug} initialStore={initialStore} initialProducts={initialProducts} />
  );
}
