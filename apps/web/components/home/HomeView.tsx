"use client";

import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import ModernHero from "@/components/common/ModernHero";
import ProductFilters from "@/components/products/ProductFilters";
import Loading from "@/app/loading";
import { useHomeData } from "@/hooks/useHomeData";
import { useHomeFilters } from "@/hooks/useHomeFilters";
import CategoryShowcase from "./CategoryShowcase";
import FeaturedMarketplace from "./FeaturedMarketplace";
import BrandSectionsList from "./BrandSectionsList";
import RecentProducts from "./RecentProducts";
import TopDeals from "./TopDeals";
import TopProVendors from "./TopProVendors";
import ActiveBrandChip from "./ActiveBrandChip";
import EmptyResults from "./EmptyResults";
import HomeJsonLd from "./HomeJsonLd";

const FEATURED_LIMIT = 10;
const PRODUCTS_PER_BRAND = 10;
const RECENT_LIMIT = 20;
const DEALS_MIN_DISCOUNT = 20;
const DEALS_LIMIT = 20;

export default function HomeView() {
  const router = useRouter();
  const { products, categories, brands, topProVendors, isLoading } = useHomeData();
  const filters = useHomeFilters(products);

  // Redirect helpers — clicking a category or brand jumps to the full products page.
  const goToProducts = useCallback(
    (params?: Record<string, string | undefined | null>) => {
      const qs = new URLSearchParams();
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          if (v) qs.set(k, v);
        }
      }
      const s = qs.toString();
      router.push(s ? `/products?${s}` : "/products");
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

  // Smooth-scroll to marketplace when category arrives via URL (legacy path)
  useEffect(() => {
    if (filters.activeCategory && typeof window !== "undefined") {
      const el = document.getElementById("marketplace");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    // intentional: only once after data loads
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  if (isLoading) return <Loading />;

  const showBrandSections = !filters.activeCategory && !filters.activeBrand;
  const hasResults = filters.featured.length + filters.regular.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <HomeJsonLd categories={categories} />
      <DashboardHeader title="Home" />
      <ModernHero />

      <CategoryShowcase
        categories={categories}
        products={products}
        activeCategory={filters.activeCategory}
        onSelect={handleCategorySelect}
      />

      {topProVendors.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12 relative z-10">
          <TopProVendors vendors={topProVendors} />
        </section>
      )}

      <main
        id="marketplace"
        className="max-w-7xl mx-auto px-4 md:px-8 pb-24 md:pb-32 space-y-16 md:space-y-20 relative z-10"
      >
        <div className="bg-background/80 backdrop-blur-xl sticky top-16 md:top-20 z-30 py-4 md:py-6 -mx-4 px-4 border-b border-border/50 md:rounded-[2.5rem] md:border md:static md:bg-transparent md:backdrop-blur-none md:p-0 md:border-none">
          <ProductFilters
            categories={categories}
            currentCategory={filters.activeCategory}
            onCategoryChange={filters.setActiveCategory}
            priceRange={filters.priceRange}
            onPriceChange={filters.setPriceRange}
            sortBy={filters.sortBy}
            onSortChange={filters.setSortBy as any}
            resultsCount={filters.featured.length + filters.regular.length}
          />
        </div>

        {filters.activeBrand && (
          <ActiveBrandChip
            brand={filters.activeBrand}
            onClear={() => filters.setActiveBrand(null)}
          />
        )}

        <FeaturedMarketplace products={filters.featured} limit={FEATURED_LIMIT} />

        {!hasResults && <EmptyResults onClear={filters.clearAll} />}

        {showBrandSections && (
          <>
            <BrandSectionsList
              products={products}
              brands={brands}
              productsPerBrand={PRODUCTS_PER_BRAND}
              onBrandSelect={handleBrandSelect}
            />

            <RecentProducts products={products} limit={RECENT_LIMIT} />

            <TopDeals
              products={products}
              minDiscount={DEALS_MIN_DISCOUNT}
              limit={DEALS_LIMIT}
            />
          </>
        )}
      </main>
    </div>
  );
}
