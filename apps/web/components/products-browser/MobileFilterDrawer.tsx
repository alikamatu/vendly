'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import FiltersPanel from './FiltersPanel';
import type { ProductsBrowserState } from '@/hooks/useProductsBrowser';
import type { HomeCategory } from '@/hooks/useHomeData';

interface MobileFilterDrawerProps {
  open: boolean;
  onClose: () => void;
  state: ProductsBrowserState;
  categories: HomeCategory[];
  brands: string[];
}

/**
 * Responsive hideable filter drawer (bottom sheet on mobile, slide-over side
 * panel on desktop). Hidden by default so products fill 100% of the page;
 * opens on demand and auto-closes on Escape, backdrop click, or Apply.
 */
export default function MobileFilterDrawer({
  open,
  onClose,
  state,
  categories,
  brands,
}: MobileFilterDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[70] flex items-end justify-end bg-black/45 lg:items-stretch"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Filters"
        className="bg-background flex max-h-[88vh] w-full flex-col overflow-hidden rounded-t-3xl lg:h-full lg:max-h-none lg:w-[340px] lg:rounded-l-3xl lg:rounded-tr-none"
      >
        <header className="relative flex items-center justify-between px-5 pb-3 pt-4">
          <span className="bg-foreground/15 absolute left-1/2 top-2 block h-1 w-10 -translate-x-1/2 rounded-full lg:hidden" />
          <div className="flex items-center gap-2">
            <h2 className="text-foreground text-sm font-semibold tracking-tight">Filters</h2>
            {state.activeChips.length > 0 && (
              <span className="bg-surface text-muted rounded-full px-2 py-0.5 text-[10px] font-semibold">
                {state.activeChips.length}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close filters"
            className="bg-surface text-muted hover:text-foreground flex h-8 w-8 items-center justify-center rounded-full transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="no-scrollbar flex-1 overflow-y-auto px-5 py-3">
          <FiltersPanel state={state} categories={categories} brands={brands} compact />
        </div>

        <footer className="bg-surface flex items-center gap-2 px-5 py-3.5">
          <button
            type="button"
            onClick={state.clearAll}
            className="bg-background text-foreground h-11 flex-1 rounded-xl text-xs font-semibold transition-opacity hover:opacity-80"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={onClose}
            className="bg-foreground text-background h-11 flex-[2] rounded-xl text-xs font-semibold transition-opacity hover:opacity-90"
          >
            Show {state.meta.total.toLocaleString()} results
          </button>
        </footer>
      </div>
    </div>
  );
}
