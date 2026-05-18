"use client";

import React from "react";
import { Loader2, SlidersHorizontal } from "lucide-react";
import SortDropdown from "./SortDropdown";
import ViewToggle, { type ViewMode } from "./ViewToggle";
import type { BrowseSort } from "@/lib/api/product";

interface ResultsHeaderProps {
  total: number;
  isRefreshing: boolean;
  sort: BrowseSort;
  onSortChange: (v: BrowseSort) => void;
  view: ViewMode;
  onViewChange: (v: ViewMode) => void;
  onOpenFilters: () => void;
}

export default function ResultsHeader({
  total,
  isRefreshing,
  sort,
  onSortChange,
  view,
  onViewChange,
  onOpenFilters,
}: ResultsHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <p className="text-[12px] text-[var(--color-muted)] inline-flex items-center gap-2">
        <span className="font-black text-[var(--color-foreground)] tabular-nums">
          {total.toLocaleString()}
        </span>
        product{total === 1 ? "" : "s"}
        {isRefreshing && <Loader2 className="w-3 h-3 animate-spin" />}
      </p>

      <div className="flex items-center gap-2 ml-auto">
        <button
          type="button"
          onClick={onOpenFilters}
          className="lg:hidden inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[12px] font-bold text-[var(--color-foreground)] hover:border-[var(--color-accent)]/40 transition-colors"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Filters
        </button>
        <SortDropdown value={sort} onChange={onSortChange} />
        <div className="hidden sm:block">
          <ViewToggle value={view} onChange={onViewChange} />
        </div>
      </div>
    </div>
  );
}
