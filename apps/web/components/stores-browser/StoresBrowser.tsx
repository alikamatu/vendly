'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { AlertCircle, ArrowUpDown, SlidersHorizontal, Store } from 'lucide-react';
import Header from '@/components/layout/Header';
import { useStoresBrowser } from '@/hooks/useStoresBrowser';
import StoreCard from './StoreCard';
import StoresSearchBar from './StoresSearchBar';
import StoresFiltersPanel from './StoresFiltersPanel';
import StoresActiveFiltersBar from './StoresActiveFiltersBar';
import StoresPagination from './StoresPagination';
import Spinner from '@/components/ui/Spinner';
import Select from '@/components/ui/Select';

function StoresBrowserInner() {
  const state = useStoresBrowser();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Scroll to top when page changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const el = document.getElementById('stores-top');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [state.page]);

  const showEmpty = !state.isLoading && state.data.length === 0;

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      {/* Dynamic Header */}
      <Header />

      {/* Hero Section */}
      <div className="border-[var(--color-border)]/40 relative overflow-hidden border-b bg-[var(--color-surface)] py-12 md:py-16">
        <div className="relative z-10 mx-auto max-w-7xl space-y-4 px-4 text-center md:px-8">
          <div className="bg-[var(--color-accent)]/10 border-[var(--color-accent)]/20 shadow-xs inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--color-accent)]">
            <Store className="h-3.5 w-3.5" />
            VERNDLY DIRECTORY
          </div>
          <h1 className="text-3xl font-semibold leading-none tracking-tight text-[var(--color-foreground)] md:text-5xl">
            Discover Verified <span className="text-[var(--color-accent)]">Entrepreneurs</span>
          </h1>
          <p className="mx-auto max-w-2xl text-sm leading-relaxed text-[var(--color-muted)]">
            Support local businesses and young creators. Browse certified store profiles, view
            active showcases, and explore premium shopping experiences.
          </p>
        </div>
      </div>

      {/* Main stores directory container */}
      <div className="mx-auto max-w-7xl space-y-6 px-4 pb-24 pt-8 md:px-8 md:pb-32" id="stores-top">
        {/* Search Bar section */}
        <div className="w-full">
          <StoresSearchBar value={state.search} onChange={state.setSearch} />
        </div>

        {/* Dynamic Responsive layout grid */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[260px_1fr]">
          {/* Desktop Filters Sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 max-h-[calc(100vh-8rem)] space-y-5 overflow-y-auto pr-2 no-scrollbar">
              <StoresFiltersPanel state={state} />
            </div>
          </aside>

          {/* Results column */}
          <div className="min-w-0 space-y-5">
            {/* Header controls for sort/mobile filters toggle */}
            <div className="border-[var(--color-border)]/40 flex flex-col justify-between gap-3 border-b pb-3 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold tracking-tight text-[var(--color-foreground)]">
                  {state.isLoading
                    ? 'Loading vendors...'
                    : `${state.meta.total} ${state.meta.total === 1 ? 'Store profile' : 'Store profiles'} found`}
                </p>
                {state.isRefreshing && (
                  <Spinner size="xs" />
                )}
              </div>

              <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-end">
                {/* Mobile Filter Toggle Button */}
                <button
                  onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
                  className="hover:bg-[var(--color-border)]/20 active:scale-98 inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-xs font-semibold transition-all lg:hidden"
                >
                  <SlidersHorizontal className="h-4 w-4 text-[var(--color-muted)]" />
                  Filters
                  {state.activeChips.length > 0 && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-accent)] text-[10px] text-white">
                      {state.activeChips.length}
                    </span>
                  )}
                </button>

                {/* Custom Sort selector */}
                <div className="w-full sm:w-48">
                  <Select
                    value={state.sort}
                    onChange={(val) => state.setSort(val)}
                    options={[
                      { value: 'default', label: 'Most Products (Default)' },
                      { value: 'newest', label: 'Newest Vendors' },
                      { value: 'alphabetical', label: 'Alphabetical (A–Z)' },
                    ]}
                    size="sm"
                  />
                </div>
              </div>
            </div>

            {/* Mobile filters expansion panel */}
            {mobileFiltersOpen && (
              <div className="bg-[var(--color-surface)] animate-slide-down space-y-4 rounded-2xl border border-[var(--color-border)] p-5 lg:hidden">
                <StoresFiltersPanel state={state} />
              </div>
            )}

            {/* Active filter chips */}
            <StoresActiveFiltersBar chips={state.activeChips} onClearAll={state.clearAll} />

            {/* Error notifications */}
            {state.error && (
              <div className="flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/5 p-4 text-red-600">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <div className="flex-1 space-y-1">
                  <p className="text-xs font-medium">{state.error}</p>
                  <button
                    onClick={state.reload}
                    className="text-[10px] font-semibold underline underline-offset-2"
                  >
                    Try again
                  </button>
                </div>
              </div>
            )}

            {/* Store card listings */}
            {state.isLoading ? (
              <LoadingSkeletons />
            ) : showEmpty ? (
              <EmptyState onReset={state.clearAll} />
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {state.data.map((store, idx) => (
                  <StoreCard key={store.id} store={store} index={idx} />
                ))}
              </div>
            )}

            {/* Pagination controls */}
            {!state.isLoading && state.data.length > 0 && (
              <StoresPagination
                page={state.page}
                totalPages={state.meta.totalPages}
                onChange={state.setPage}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function LoadingSkeletons() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse space-y-4 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
        >
          {/* Banner + Avatar skeleton */}
          <div className="flex items-center gap-3">
            <div className="bg-[var(--color-border)]/60 h-14 w-14 rounded-2xl" />
            <div className="flex-1 space-y-2">
              <div className="bg-[var(--color-border)]/60 h-4 w-3/4 rounded" />
              <div className="bg-[var(--color-border)]/60 h-3 w-1/2 rounded" />
            </div>
          </div>
          {/* Bio block skeleton */}
          <div className="space-y-1.5 pt-2">
            <div className="bg-[var(--color-border)]/60 h-3 w-full rounded" />
            <div className="bg-[var(--color-border)]/60 h-3 w-5/6 rounded" />
          </div>
          {/* Showcase placeholders skeleton */}
          <div className="grid grid-cols-3 gap-2 pt-2">
            <div className="bg-[var(--color-border)]/40 aspect-square rounded-xl" />
            <div className="bg-[var(--color-border)]/40 aspect-square rounded-xl" />
            <div className="bg-[var(--color-border)]/40 aspect-square rounded-xl" />
          </div>
          {/* CTA placeholder skeleton */}
          <div className="bg-[var(--color-border)]/60 h-10 w-full rounded-xl pt-2" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="mx-auto mt-6 flex max-w-lg flex-col items-center justify-center rounded-3xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center md:p-16">
      <div className="bg-[var(--color-accent)]/5 mb-5 flex h-16 w-16 items-center justify-center rounded-full text-[var(--color-accent)]">
        <Store className="h-8 w-8" />
      </div>
      <h3 className="mb-2 text-lg font-semibold tracking-tight text-[var(--color-foreground)]">
        No Stores Found
      </h3>
      <p className="mb-6 max-w-sm text-xs leading-relaxed text-[var(--color-muted)]">
        We couldn&apos;t find any vendor store matching your search criteria. Try modifying your
        filters or search term to discover more.
      </p>
      <button
        onClick={onReset}
        className="hover:bg-[var(--color-primary)]/90 shadow-xs inline-flex h-11 items-center justify-center rounded-xl bg-[var(--color-primary)] px-5 text-xs font-semibold text-[var(--color-background)] transition-all active:scale-[0.98]"
      >
        Clear All Filters
      </button>
    </div>
  );
}

export default function StoresBrowser() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--color-accent)] border-t-transparent" />
        </div>
      }
    >
      <StoresBrowserInner />
    </Suspense>
  );
}
