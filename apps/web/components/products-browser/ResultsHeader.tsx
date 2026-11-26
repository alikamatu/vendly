'use client';

import React from 'react';
import { SlidersHorizontal } from 'lucide-react';
import Spinner from '@/components/ui/Spinner';
import SortDropdown from './SortDropdown';
import ViewToggle, { type ViewMode } from './ViewToggle';
import type { BrowseSort } from '@/lib/api/product';

interface ResultsHeaderProps {
  total: number;
  isRefreshing: boolean;
  sort: BrowseSort;
  onSortChange: (v: BrowseSort) => void;
  view: ViewMode;
  onViewChange: (v: ViewMode) => void;
  onOpenFilters: () => void;
  activeFilterCount?: number;
}

export default function ResultsHeader({
  total,
  isRefreshing,
  sort,
  onSortChange,
  view,
  onViewChange,
  onOpenFilters,
  activeFilterCount = 0,
}: ResultsHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenFilters}
          className={`inline-flex h-10 items-center gap-2 rounded-xl px-3.5 text-xs font-semibold transition-colors ${
            activeFilterCount > 0
              ? 'bg-foreground text-background'
              : 'bg-surface text-foreground hover:bg-foreground/[0.08]'
          }`}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span>Filters</span>
          {activeFilterCount > 0 && (
            <span className="bg-background text-foreground inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold">
              {activeFilterCount}
            </span>
          )}
        </button>

        <p className="text-muted inline-flex items-center gap-1.5 text-xs">
          <span className="text-foreground font-semibold tabular-nums">
            {total.toLocaleString()}
          </span>
          <span className="hidden sm:inline">product{total === 1 ? '' : 's'}</span>
          {isRefreshing && <Spinner size="xs" />}
        </p>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <SortDropdown value={sort} onChange={onSortChange} />
        <div className="hidden sm:block">
          <ViewToggle value={view} onChange={onViewChange} />
        </div>
      </div>
    </div>
  );
}
