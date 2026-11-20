'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Suspense } from 'react';
import { AlertCircle } from 'lucide-react';
import Header from '@/components/layout/Header';
import ProductCard from '@/components/products/ProductCard';
import { useProductsBrowser, type InitialProductsBrowserData } from '@/hooks/useProductsBrowser';
import { productApi } from '@/lib/api/product';
import type { HomeCategory } from '@/hooks/useHomeData';
import type { ViewMode } from './ViewToggle';

import SearchBar from './SearchBar';
import ActiveFiltersBar from './ActiveFiltersBar';
import FiltersPanel from './FiltersPanel';
import MobileFilterDrawer from './MobileFilterDrawer';
import ResultsHeader from './ResultsHeader';
import Pagination from './Pagination';
import EmptyState from './EmptyState';
import ProductListRow from './ProductListRow';

function ProductsBrowserInner({
  initialData,
  initialCategories = [],
  initialBrands = [],
}: {
  initialData?: InitialProductsBrowserData;
  initialCategories?: HomeCategory[];
  initialBrands?: string[];
}) {
  const state = useProductsBrowser(initialData);
  const [view, setView] = useState<ViewMode>('grid');
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Static lookups (categories + brands) are hydrated from SSR then refreshed.
  const [categories, setCategories] = useState<HomeCategory[]>(initialCategories);
  const [brands, setBrands] = useState<string[]>(initialBrands);
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      productApi.getCategories().catch(() => [] as HomeCategory[]),
      productApi.getBrands().catch(() => [] as any[]),
    ]).then(([c, b]) => {
      if (cancelled) return;
      setCategories(c as HomeCategory[]);
      setBrands(Array.from(new Set((b as any[]).map((x: any) => x?.name).filter(Boolean))));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist view mode preference locally
  useEffect(() => {
    try {
      const stored = localStorage.getItem('vendly_products_view') as ViewMode | null;
      if (stored === 'grid' || stored === 'list') setView(stored);
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem('vendly_products_view', view);
    } catch {}
  }, [view]);

  const showEmpty = !state.isLoading && state.data.length === 0;

  // Scroll to top when page changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const el = document.getElementById('products-top');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [state.page]);

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <Header />

      <div className="mx-auto max-w-7xl space-y-6 px-4 pb-24 pt-6 md:space-y-8 md:px-8 md:pb-32 md:pt-10">
        <header className="space-y-3" id="products-top">
          <div className="space-y-1">
            <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-accent)]">
              Marketplace
            </p>
            <h1 className="text-2xl font-medium tracking-tight text-[var(--color-foreground)] md:text-3xl">
              Explore every product
            </h1>
            <p className="text-[12px] text-[var(--color-muted)]">
              Filter by category, brand, price, and condition. Press{' '}
              <kbd className="font-mono">/</kbd> to search.
            </p>
          </div>
          <SearchBar value={state.search} onChange={state.setSearch} />
        </header>

        <div className="grid grid-cols-1 gap-6 md:gap-8 lg:grid-cols-[260px_1fr]">
          {/* Desktop sidebar */}
          <aside className="hidden lg:block">
            <div className="no-scrollbar sticky top-20 max-h-[calc(100vh-6rem)] space-y-5 overflow-y-auto pr-2">
              <h2 className="border-[var(--color-border)]/60 border-b pb-2 text-[10px] font-medium uppercase tracking-wider text-[var(--color-muted)]">
                Filters
              </h2>
              <FiltersPanel state={state} categories={categories} brands={brands} />
            </div>
          </aside>

          {/* Results */}
          <div className="min-w-0 space-y-5">
            <ResultsHeader
              total={state.meta.total}
              isRefreshing={state.isRefreshing}
              sort={state.sort}
              onSortChange={state.setSort}
              view={view}
              onViewChange={setView}
              onOpenFilters={() => setFiltersOpen(true)}
            />

            <ActiveFiltersBar chips={state.activeChips} onClearAll={state.clearAll} />

            {state.error && (
              <div className="flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/5 p-4 text-red-600">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <p className="text-[12px] font-normal">{state.error}</p>
                  <button
                    onClick={state.reload}
                    className="text-[11px] font-normal underline underline-offset-2"
                  >
                    Try again
                  </button>
                </div>
              </div>
            )}

            {state.isLoading ? (
              <LoadingSkeleton view={view} />
            ) : showEmpty ? (
              <EmptyState onReset={state.clearAll} />
            ) : view === 'grid' ? (
              <div className="columns-2 gap-4 md:columns-3 xl:columns-4">
                {state.data.map((product, idx) => (
                  <div key={product.id} className="mb-4 break-inside-avoid">
                    <ProductCard product={product as any} index={idx} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {state.data.map((product) => (
                  <ProductListRow key={product.id} product={product} />
                ))}
              </div>
            )}

            {!state.isLoading && state.data.length > 0 && (
              <Pagination
                page={state.page}
                totalPages={state.meta.totalPages}
                onChange={state.setPage}
              />
            )}
          </div>
        </div>

        <MobileFilterDrawer
          open={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          state={state}
          categories={categories}
          brands={brands}
        />
      </div>
    </div>
  );
}

function LoadingSkeleton({ view }: { view: ViewMode }) {
  if (view === 'grid') {
    return (
      <div className="columns-2 gap-4 md:columns-3 xl:columns-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="mb-4 break-inside-avoid overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]"
          >
            <div
              className="bg-[var(--color-border)]/40 w-full animate-pulse"
              style={{ height: 180 + (i % 4) * 40 }}
            />
            <div className="space-y-2 p-3">
              <div className="bg-[var(--color-border)]/40 h-3 w-3/4 animate-pulse rounded" />
              <div className="bg-[var(--color-border)]/40 h-3 w-1/3 animate-pulse rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="h-20 animate-pulse rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]"
        />
      ))}
    </div>
  );
}

export default function ProductsBrowser({
  initialData,
  initialCategories = [],
  initialBrands = [],
}: {
  initialData?: InitialProductsBrowserData;
  initialCategories?: HomeCategory[];
  initialBrands?: string[];
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--color-background)]">
          <Header />
          <div className="mx-auto max-w-7xl space-y-6 px-4 pb-24 pt-6 md:px-8 md:pt-10">
            <header className="space-y-1">
              <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-accent)]">
                Marketplace
              </p>
              <h1 className="text-2xl font-medium tracking-tight text-[var(--color-foreground)] md:text-3xl">
                Explore every product
              </h1>
              <p className="text-[12px] text-[var(--color-muted)]">
                Browse verified products from independent Ghanaian stores backed by 7-day Paystack
                escrow.
              </p>
            </header>
          </div>
        </div>
      }
    >
      <ProductsBrowserInner
        initialData={initialData}
        initialCategories={initialCategories}
        initialBrands={initialBrands}
      />
    </Suspense>
  );
}
