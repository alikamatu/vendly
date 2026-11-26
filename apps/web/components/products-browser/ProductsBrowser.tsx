'use client';

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { SlidersHorizontal, X } from 'lucide-react';
import { toast } from 'sonner';
import Header from '@/components/layout/Header';
import ProductCard from '@/components/products/ProductCard';
import Alert from '@/components/ui/Alert';
import VerndlyAiIcon from '@/components/ai/VerndlyAiIcon';
import VerndlyAiOverlay from '@/components/ai/VerndlyAiOverlay';
import { useProductsBrowser, type InitialProductsBrowserData } from '@/hooks/useProductsBrowser';
import { productApi, type BrowseSort } from '@/lib/api/product';
import { aiApi, type AiBuyerSearchResponse } from '@/lib/api/ai';
import { isBrandAllowedPublicly } from '@/lib/brand-guard';
import { getProductPath } from '@/lib/product-slug';
import type { HomeCategory } from '@/hooks/useHomeData';
import type { ViewMode } from './ViewToggle';

import VerndlyAiShopBar from './VerndlyAiShopBar';
import ActiveFiltersBar from './ActiveFiltersBar';
import MobileFilterDrawer from './MobileFilterDrawer';
import ResultsHeader from './ResultsHeader';
import Pagination from './Pagination';
import EmptyState from './EmptyState';
import ProductListRow from './ProductListRow';

const AI_QUICK_PROMPTS = [
  { label: 'Under GH₵ 300', query: 'popular products under 300 cedis' },
  { label: 'Best deals', query: 'best discounted products on sale' },
  { label: 'Gift ideas', query: 'thoughtful gift ideas under 400 cedis' },
];

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

  // Verndly AI Personal Shopper state
  const [isAskingAi, setIsAskingAi] = useState(false);
  const [aiResult, setAiResult] = useState<AiBuyerSearchResponse | null>(null);

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
      setBrands(
        Array.from(
          new Set(
            (b as any[])
              .map((x: any) => x?.name)
              .filter((name: any) => Boolean(name) && isBrandAllowedPublicly(name)),
          ),
        ),
      );
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

  // Scroll to top when page changes
  useEffect(() => {
    if (typeof window !== 'undefined' && state.page > 1) {
      const el = document.getElementById('products-top');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [state.page]);

  const handleAskVerndlyAi = useCallback(async (prompt: string) => {
    const clean = prompt.trim();
    if (!clean) return;
    setFiltersOpen(false);
    setIsAskingAi(true);
    try {
      const res = await aiApi.buyerSearch(clean, 24);
      setAiResult(res);
      if (res.products.length === 0) {
        toast.info('Verndly AI found no exact matches — try broadening your price or words.');
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Verndly AI is busy right now. Try again shortly.',
      );
    } finally {
      setIsAskingAi(false);
    }
  }, []);

  const handleApplyAiToFilters = useCallback(() => {
    if (!aiResult) return;
    const f = aiResult.filters;
    state.setSearch(f.keywords.join(' '));
    state.setCategory(f.category || null);
    state.setPrice(f.min_price, f.max_price);
    state.setCondition(f.condition || null);
    state.setInStock(Boolean(f.in_stock_only));
    if (f.sort) {
      state.setSort(f.sort as BrowseSort);
    }
    setAiResult(null);
    setFiltersOpen(true);
  }, [aiResult, state]);

  const handleSelectCategory = (catName: string | null) => {
    setAiResult(null);
    state.setCategory(catName);
  };

  const handleClearAll = () => {
    setAiResult(null);
    state.clearAll();
  };

  const displayedProducts = aiResult ? (aiResult.products as any[]) : state.data;
  const displayedTotal = aiResult ? aiResult.total : state.meta.total;
  const showEmpty = !state.isLoading && !isAskingAi && displayedProducts.length === 0;

  return (
    <div className="bg-background min-h-screen">
      <Header />

      <VerndlyAiOverlay
        isOpen={isAskingAi}
        messages={[
          'Understanding what you’re shopping for…',
          'Checking prices, categories, and verified Ghana stores…',
          'Curating your best Verndly matches…',
        ]}
        subtitle="Verndly AI Shopping Assistant"
      />

      {/* Full-bleed edge-to-edge canvas so products fill the whole page */}
      <main id="products-top" className="w-full space-y-4 px-3 pb-24 pt-3 sm:px-5 lg:px-8">
        {/* Minimal Single-Row Top Bar: Search + Verndly AI + Hideable Filters Trigger */}
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:gap-3">
          <VerndlyAiShopBar
            value={state.search}
            onChange={(val) => {
              if (aiResult && !val.trim()) setAiResult(null);
              state.setSearch(val);
            }}
            onAskAi={handleAskVerndlyAi}
            isAskingAi={isAskingAi}
            hasAiResult={Boolean(aiResult)}
          />

          <div className="shrink-0">
            <ResultsHeader
              total={displayedTotal}
              isRefreshing={state.isRefreshing}
              sort={state.sort}
              onSortChange={(nextSort) => {
                setAiResult(null);
                state.setSort(nextSort);
              }}
              view={view}
              onViewChange={setView}
              onOpenFilters={() => setFiltersOpen(true)}
              activeFilterCount={state.activeChips.length}
            />
          </div>
        </div>

        {/* Minimal Horizontal Strip: 1-tap Verndly AI Shopping Prompts + Categories */}
        <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto pb-0.5">
          {AI_QUICK_PROMPTS.map((chip) => {
            const active = aiResult?.query === chip.query;
            return (
              <button
                key={chip.label}
                type="button"
                onClick={() => {
                  state.setSearch(chip.query);
                  handleAskVerndlyAi(chip.query);
                }}
                className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[11px] font-semibold transition-colors ${
                  active
                    ? 'bg-foreground text-background'
                    : 'bg-surface text-foreground hover:bg-foreground/[0.08]'
                }`}
              >
                <VerndlyAiIcon size={15} mood={active ? 'happy' : 'idle'} />
                <span>{chip.label}</span>
              </button>
            );
          })}

          {categories.length > 0 && (
            <span className="bg-foreground/15 mx-1 h-4 w-px shrink-0" aria-hidden="true" />
          )}

          <button
            type="button"
            onClick={() => handleSelectCategory(null)}
            className={`inline-flex h-8 shrink-0 items-center rounded-full px-3 text-[11px] font-semibold transition-colors ${
              !state.category && !aiResult
                ? 'bg-foreground text-background'
                : 'bg-surface text-muted hover:text-foreground'
            }`}
          >
            All
          </button>

          {categories.map((cat) => {
            const active = !aiResult && state.category === cat.name;
            return (
              <button
                key={cat.id || cat.name}
                type="button"
                onClick={() => handleSelectCategory(active ? null : cat.name)}
                className={`inline-flex h-8 shrink-0 items-center rounded-full px-3 text-[11px] font-medium transition-colors ${
                  active
                    ? 'bg-foreground text-background'
                    : 'bg-surface text-muted hover:text-foreground'
                }`}
              >
                {cat.name}
              </button>
            );
          })}
        </div>

        {/* Active Verndly AI Curated Strip */}
        {aiResult && (
          <div className="bg-surface flex flex-col gap-3 rounded-2xl px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <VerndlyAiIcon size={28} mood="happy" />
              <div className="min-w-0">
                <p className="text-foreground text-xs font-semibold leading-snug sm:text-sm">
                  {aiResult.summary}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  {aiResult.filters.category && (
                    <span className="bg-background text-muted rounded-full px-2.5 py-0.5 text-[10px] font-medium">
                      {aiResult.filters.category}
                    </span>
                  )}
                  {aiResult.filters.min_price != null && (
                    <span className="bg-background text-muted rounded-full px-2.5 py-0.5 text-[10px] font-medium">
                      Min GH₵ {aiResult.filters.min_price.toLocaleString()}
                    </span>
                  )}
                  {aiResult.filters.max_price != null && (
                    <span className="bg-background text-muted rounded-full px-2.5 py-0.5 text-[10px] font-medium">
                      Max GH₵ {aiResult.filters.max_price.toLocaleString()}
                    </span>
                  )}
                  {aiResult.filters.condition && (
                    <span className="bg-background text-muted rounded-full px-2.5 py-0.5 text-[10px] font-medium capitalize">
                      {aiResult.filters.condition}
                    </span>
                  )}
                  {aiResult.relaxed && (
                    <span className="bg-background text-muted rounded-full px-2.5 py-0.5 text-[10px] font-medium">
                      Closest matches included
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={handleApplyAiToFilters}
                className="bg-background text-foreground inline-flex h-8 items-center gap-1.5 rounded-xl px-3 text-[11px] font-semibold transition-opacity hover:opacity-85"
              >
                <SlidersHorizontal className="h-3 w-3" />
                <span>Refine</span>
              </button>
              <button
                type="button"
                onClick={() => setAiResult(null)}
                aria-label="Clear Verndly AI results"
                className="bg-background text-muted hover:text-foreground inline-flex h-8 w-8 items-center justify-center rounded-xl transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {!aiResult && <ActiveFiltersBar chips={state.activeChips} onClearAll={handleClearAll} />}

        {state.error && <Alert variant="error" message={state.error} />}

        {/* Full-Width Product Feed */}
        {state.isLoading && !aiResult ? (
          <LoadingSkeleton view={view} />
        ) : showEmpty ? (
          <EmptyState onReset={handleClearAll} />
        ) : view === 'grid' ? (
          <div className="columns-2 gap-3 sm:columns-3 sm:gap-4 md:columns-4 lg:columns-5 2xl:columns-6">
            {displayedProducts.map((product, idx) => (
              <div key={product.id} className="mb-3 break-inside-avoid sm:mb-4">
                <ProductCard product={product} index={idx} />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {displayedProducts.map((product) => (
              <ProductListRow key={product.id} product={product} />
            ))}
          </div>
        )}

        {!aiResult && !state.isLoading && state.data.length > 0 && (
          <Pagination
            page={state.page}
            totalPages={state.meta.totalPages}
            onChange={state.setPage}
          />
        )}
      </main>

      {/* Hideable Filter Drawer (Hidden by default on ALL screens; opens on will) */}
      <MobileFilterDrawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        state={state}
        categories={categories}
        brands={brands}
      />
    </div>
  );
}

function LoadingSkeleton({ view }: { view: ViewMode }) {
  if (view === 'grid') {
    return (
      <div className="columns-2 gap-3 sm:columns-3 sm:gap-4 md:columns-4 lg:columns-5 2xl:columns-6">
        {Array.from({ length: 15 }).map((_, i) => (
          <div
            key={i}
            className="bg-surface mb-3 break-inside-avoid overflow-hidden rounded-3xl sm:mb-4"
          >
            <div
              className="bg-foreground/[0.06] w-full animate-pulse"
              style={{ height: 180 + (i % 4) * 40 }}
            />
            <div className="space-y-2 p-3.5">
              <div className="bg-foreground/[0.06] h-3 w-3/4 animate-pulse rounded" />
              <div className="bg-foreground/[0.06] h-3 w-1/3 animate-pulse rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="bg-surface h-20 animate-pulse rounded-2xl" />
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
  const ssrItems = initialData?.data ?? [];

  return (
    <Suspense
      fallback={
        <div className="bg-background min-h-screen">
          <Header />
          <main className="w-full space-y-6 px-3 pb-24 pt-4 sm:px-5 lg:px-8">
            {ssrItems.length > 0 && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6">
                {ssrItems.map((product: any) => (
                  <article
                    key={product.id}
                    className="bg-surface overflow-hidden rounded-3xl p-2.5"
                  >
                    <Link href={getProductPath(product)} className="block space-y-2">
                      <div className="bg-background aspect-square overflow-hidden rounded-2xl">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={product.image_urls?.[0] || '/placeholder-product.png'}
                          alt={product.title}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="space-y-1 px-1">
                        <h2 className="text-foreground line-clamp-2 text-xs font-medium">
                          {product.title}
                        </h2>
                        <p className="text-foreground text-sm font-semibold tabular-nums">
                          GH₵{Number(product.price).toLocaleString()}
                        </p>
                      </div>
                    </Link>
                  </article>
                ))}
              </div>
            )}
          </main>
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
