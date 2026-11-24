import StoresBrowser from '@/components/stores-browser/StoresBrowser';
import RecentlyViewed from '@/components/home/RecentlyViewed';
import { buildMetadata } from '@/lib/seo';
import BreadcrumbJsonLd from '@/components/seo/BreadcrumbJsonLd';
import { fetchBrowseStoresServer } from '@/lib/server-api';

export const revalidate = 300;

export const metadata = buildMetadata({
  title: 'Discover independent stores',
  description:
    'Explore verified independent stores in Accra on Verndly Ghana. Browse active catalogs, dispatch timelines, and shop with 7-day Paystack escrow.',
  path: '/stores',
  keywords: ['independent stores ghana', 'Ghana sellers', 'verified small businesses', 'vendors'],
});

export default async function StoresPage() {
  const initialData = await fetchBrowseStoresServer(12);

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', path: '/' },
          { name: 'Stores', path: '/stores' },
        ]}
      />
      <StoresBrowser initialData={initialData} />
      <section className="mx-auto max-w-7xl px-4 py-12 md:px-8">
        <RecentlyViewed limit={12} title="Products you were looking at" />
      </section>
    </>
  );
}
