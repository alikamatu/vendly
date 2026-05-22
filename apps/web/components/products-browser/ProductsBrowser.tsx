"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Suspense } from "react";
import { AlertCircle } from "lucide-react";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import ProductCard from "@/components/products/ProductCard";
import { useProductsBrowser } from "@/hooks/useProductsBrowser";
import { productApi } from "@/lib/api/product";
import type { HomeCategory } from "@/hooks/useHomeData";
import type { ViewMode } from "./ViewToggle";

import SearchBar from "./SearchBar";
import ActiveFiltersBar from "./ActiveFiltersBar";
import FiltersPanel from "./FiltersPanel";
import MobileFilterDrawer from "./MobileFilterDrawer";
import ResultsHeader from "./ResultsHeader";
import Pagination from "./Pagination";
import EmptyState from "./EmptyState";
import ProductListRow from "./ProductListRow";

function ProductsBrowserInner() {
  const state = useProductsBrowser();
  const [view, setView] = useState<ViewMode>("grid");
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Static lookups (categories + brands) are fetched once.
  const [categories, setCategories] = useState<HomeCategory[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
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
      const stored = localStorage.getItem("vendly_products_view") as ViewMode | null;
      if (stored === "grid" || stored === "list") setView(stored);
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("vendly_products_view", view);
    } catch {}
  }, [view]);

  const showEmpty = !state.isLoading && state.data.length === 0;

  // Scroll to top when page changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      const el = document.getElementById("products-top");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [state.page]);

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <DashboardHeader title="Products" />

      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-6 md:pt-10 pb-24 md:pb-32 space-y-6 md:space-y-8">
        <header className="space-y-3" id="products-top">
          <div className="space-y-1">
            <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-accent)]">
              Marketplace
            </p>
            <h1 className="text-2xl md:text-3xl font-medium tracking-tight text-[var(--color-foreground)]">
              Explore every product
            </h1>
            <p className="text-[12px] text-[var(--color-muted)]">
              Filter by category, brand, price, and condition. Press <kbd className="font-mono">/</kbd> to search.
            </p>
          </div>
          <SearchBar value={state.search} onChange={state.setSearch} />
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6 md:gap-8">
          {/* Desktop sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-20 space-y-5 max-h-[calc(100vh-6rem)] overflow-y-auto pr-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-[var(--color-border)] [&::-webkit-scrollbar-thumb]:rounded-full">
              <h2 className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-muted)] pb-2 border-b border-[var(--color-border)]/60">
                Filters
              </h2>
              <FiltersPanel state={state} categories={categories} brands={brands} />
            </div>
          </aside>

          {/* Results */}
          <div className="space-y-5 min-w-0">
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
              <div className="flex items-start gap-3 p-4 rounded-2xl border border-red-500/30 bg-red-500/5 text-red-600">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div className="space-y-2 flex-1">
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
            ) : view === "grid" ? (
              <div className="columns-2 md:columns-3 xl:columns-4 gap-4">
                {state.data.map((product, idx) => (
                  <div key={product.id} className="break-inside-avoid mb-4">
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
  if (view === "grid") {
    return (
      <div className="columns-2 md:columns-3 xl:columns-4 gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="break-inside-avoid mb-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] overflow-hidden"
          >
            <div
              className="w-full bg-[var(--color-border)]/40 animate-pulse"
              style={{ height: 180 + (i % 4) * 40 }}
            />
            <div className="p-3 space-y-2">
              <div className="h-3 w-3/4 rounded bg-[var(--color-border)]/40 animate-pulse" />
              <div className="h-3 w-1/3 rounded bg-[var(--color-border)]/40 animate-pulse" />
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
          className="h-20 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] animate-pulse"
        />
      ))}
    </div>
  );
}

export default function ProductsBrowser() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <ProductsBrowserInner />
    </Suspense>
  );
}
