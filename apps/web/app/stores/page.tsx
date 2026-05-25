import StoresBrowser from '@/components/stores-browser/StoresBrowser';
import RecentlyViewed from '@/components/home/RecentlyViewed';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Discover independent stores',
  description:
    'Explore verified vendor stores on Vendly. Support young local entrepreneurs, check active product showcases, and visit curated storefronts.',
  path: '/stores',
  keywords: ['independent stores', 'Ghana sellers', 'small businesses', 'vendors'],
});

export default function StoresPage() {
  return (
    <>
      <StoresBrowser />
      <section className="max-w-7xl mx-auto px-4 md:px-8 py-12">
        <RecentlyViewed limit={12} title="Products you were looking at" />
      </section>
    </>
  );
}
