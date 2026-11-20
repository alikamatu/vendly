'use client';

import { useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import ModernHero from '@/components/common/ModernHero';
import Loading from '@/app/loading';
import { useHomeData } from '@/hooks/useHomeData';
import { sortByRecent } from '@/lib/home/discount';
import CategoryShowcase from './CategoryShowcase';
import FeaturedMarketplace from './FeaturedMarketplace';
import BrandSectionsList from './BrandSectionsList';
import RecentProducts from './RecentProducts';
import RecentlyViewed from './RecentlyViewed';
import TopDeals from './TopDeals';
import TopProVendors from './TopProVendors';
import EmptyResults from './EmptyResults';

const FEATURED_LIMIT = 10;
const PRODUCTS_PER_BRAND = 10;
const RECENT_LIMIT = 20;
const DEALS_MIN_DISCOUNT = 20;
const DEALS_LIMIT = 20;
const DEFAULT_MIN_PRICE = 0;
const DEFAULT_MAX_PRICE = 100000;

function inDefaultPrice(price: string) {
  const value = parseFloat(price);
  return value >= DEFAULT_MIN_PRICE && value <= DEFAULT_MAX_PRICE;
}

export default function HomeView() {
  const router = useRouter();
  const { products, categories, brands, topProVendors, isLoading } = useHomeData();

  const featured = useMemo(
    () =>
      sortByRecent(
        products.filter((product) => product.is_featured && inDefaultPrice(product.price)),
      ),
    [products],
  );

  const hasResults = useMemo(
    () => products.some((product) => inDefaultPrice(product.price)),
    [products],
  );

  const goToProducts = useCallback(
    (params?: Record<string, string | undefined | null>) => {
      const qs = new URLSearchParams();
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          if (v) qs.set(k, v);
        }
      }
      const s = qs.toString();
      router.push(s ? `/products?${s}` : '/products');
    },
    [router],
  );

  const handleCategorySelect = useCallback(
    (name: string | null) => {
      if (!name) {
        goToProducts();
        return;
      }
      goToProducts({ category: name });
    },
    [goToProducts],
  );

  const handleBrandSelect = useCallback(
    (name: string) => goToProducts({ brand: name }),
    [goToProducts],
  );

  if (isLoading) return <Loading />;

  return (
    <div className="bg-background min-h-screen">
      <Header />
      <ModernHero />

      <CategoryShowcase
        categories={categories}
        products={products}
        activeCategory={null}
        onSelect={handleCategorySelect}
      />

      {topProVendors.length > 0 && (
        <section className="relative z-10 mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
          <TopProVendors vendors={topProVendors} />
        </section>
      )}

      <main
        id="marketplace"
        className="relative z-10 mx-auto max-w-7xl space-y-16 px-4 pb-24 md:space-y-20 md:px-8 md:pb-32"
      >
        <FeaturedMarketplace products={featured} limit={FEATURED_LIMIT} />

        {!hasResults && <EmptyResults onClear={() => undefined} />}

        {/* Always show recently viewed at the top of the marketplace area.
            It auto-hides when empty, so it doesn't add noise for new visitors. */}
        <RecentlyViewed limit={12} />

        <BrandSectionsList
          products={products}
          brands={brands}
          productsPerBrand={PRODUCTS_PER_BRAND}
          onBrandSelect={handleBrandSelect}
        />

        <RecentProducts products={products} limit={RECENT_LIMIT} />

        <TopDeals products={products} minDiscount={DEALS_MIN_DISCOUNT} limit={DEALS_LIMIT} />
      </main>
    </div>
  );
}
