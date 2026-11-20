import StorefrontClient from '@/components/store/StorefrontClient';
import { fetchStoreBySlugServer, fetchStoreProductsServer } from '@/lib/server-api';

export default async function StorePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [initialStore, initialProducts] = await Promise.all([
    fetchStoreBySlugServer(slug),
    fetchStoreProductsServer(slug),
  ]);

  return (
    <StorefrontClient slug={slug} initialStore={initialStore} initialProducts={initialProducts} />
  );
}
