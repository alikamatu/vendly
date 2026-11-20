'use client';

import { useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, ShieldCheck, Percent, Store, Truck } from 'lucide-react';
import Header from '@/components/layout/Header';
import ModernHero from '@/components/common/ModernHero';
import Loading from '@/app/loading';
import { useHomeData, type InitialHomeData } from '@/hooks/useHomeData';
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

const MARKETPLACE_PILLARS = [
  {
    Icon: ShieldCheck,
    title: '7-Day Paystack Escrow',
    description:
      'Every Mobile Money and card payment stays safely in Paystack escrow until delivery and inspection.',
    href: '/buyer-protection',
    cta: 'Buyer protection',
  },
  {
    Icon: Percent,
    title: 'Flat 4% Seller Fee',
    description:
      'Keep 96% of every sale with Paystack included — compared to up to 20% commission plus shipping deductions elsewhere.',
    href: '/blog/jumia-seller-fees-ghana-2026-vs-verndly',
    cta: 'Compare fees',
  },
  {
    Icon: Store,
    title: 'Verified Ghanaian Stores',
    description:
      'Every merchant is identity-checked before listing, giving young entrepreneurs a trusted storefront in 24–48 hours.',
    href: '/sell',
    cta: 'Sell on Verndly',
  },
  {
    Icon: Truck,
    title: 'All 16 Regions Covered',
    description:
      'Same-day express in Accra & Kumasi, 24–48h transit to Takoradi & regional capitals, plus free store pickup.',
    href: '/blog/nationwide-delivery-ghana-accra-kumasi-takoradi-tamale',
    cta: 'Delivery guide',
  },
];

const FEATURED_CATEGORIES_LINKS = [
  { label: 'Fashion & Apparel', href: '/categories/fashion' },
  { label: 'Electronics & Gadgets', href: '/categories/electronics' },
  { label: 'Beauty & Personal Care', href: '/categories/beauty-personal-care' },
  { label: 'Home & Kitchen', href: '/categories/home-kitchen' },
  { label: 'Food & Beverages', href: '/categories/food-beverages' },
  { label: 'Books & Stationery', href: '/categories/books-stationery' },
];

export default function HomeView({ initialData }: { initialData?: InitialHomeData }) {
  const router = useRouter();
  const { products, categories, brands, topProVendors, isLoading } = useHomeData(initialData);

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

  if (isLoading && !initialData) return <Loading />;

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

        {!hasResults && products.length > 0 && <EmptyResults onClear={() => undefined} />}

        <RecentlyViewed limit={12} />

        <BrandSectionsList
          products={products}
          brands={brands}
          productsPerBrand={PRODUCTS_PER_BRAND}
          onBrandSelect={handleBrandSelect}
        />

        <RecentProducts products={products} limit={RECENT_LIMIT} />

        <TopDeals products={products} minDiscount={DEALS_MIN_DISCOUNT} limit={DEALS_LIMIT} />

        {/* Clean, borderless, shadowless SSR-rendered Trust & Discovery Section */}
        <section
          aria-label="Why buyers and sellers choose Verndly Ghana"
          className="space-y-12 pt-8"
        >
          <div className="max-w-2xl space-y-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--color-accent)]">
              Built for Ghana
            </p>
            <h2 className="text-foreground text-3xl font-medium tracking-tight md:text-4xl">
              Safe online shopping and fairer economics for independent brands.
            </h2>
            <p className="text-muted text-sm leading-relaxed md:text-base">
              Verndly connects shoppers across Ghana with identity-verified entrepreneurs and small
              businesses. Pay seamlessly with MTN Mobile Money, Telecel Cash, AirtelTigo Money, or
              bank card under 7-day Paystack escrow protection.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {MARKETPLACE_PILLARS.map(({ Icon, title, description, href, cta }) => (
              <Link
                key={title}
                href={href}
                className="bg-surface hover:bg-foreground/[0.05] group flex flex-col justify-between gap-6 rounded-3xl p-7 transition-colors"
              >
                <div className="space-y-4">
                  <div className="bg-background text-foreground flex h-10 w-10 items-center justify-center rounded-2xl">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-foreground text-base font-medium tracking-tight">
                      {title}
                    </h3>
                    <p className="text-muted text-xs leading-relaxed">{description}</p>
                  </div>
                </div>
                <span className="text-foreground inline-flex items-center gap-1.5 text-xs font-medium">
                  {cta}
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </div>

          {/* Crawl-friendly category directory & guides links */}
          <div className="bg-surface flex flex-col justify-between gap-6 rounded-3xl p-7 md:p-9 lg:flex-row lg:items-center">
            <div className="max-w-xl space-y-2">
              <h3 className="text-foreground text-lg font-medium tracking-tight">
                Browse verified categories or read our commerce guides
              </h3>
              <div className="flex flex-wrap gap-2 pt-2">
                {FEATURED_CATEGORIES_LINKS.map((cat) => (
                  <Link
                    key={cat.href}
                    href={cat.href}
                    className="bg-background text-foreground hover:bg-foreground hover:text-background rounded-full px-4 py-2 text-xs font-medium transition-colors"
                  >
                    {cat.label}
                  </Link>
                ))}
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap gap-3">
              <Link
                href="/blog"
                className="bg-background text-foreground inline-flex items-center gap-2 rounded-full px-5 py-3 text-xs font-medium transition-opacity hover:opacity-80"
              >
                Read Verndly Journal
              </Link>
              <Link
                href="/sell"
                className="bg-foreground text-background inline-flex items-center gap-2 rounded-full px-5 py-3 text-xs font-medium transition-opacity hover:opacity-90"
              >
                Sell at 4% flat
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
