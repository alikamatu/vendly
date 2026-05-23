'use client';

import React from 'react';
import { X, Trash2 } from 'lucide-react';
import type { ActiveChip } from '@/hooks/useStoresBrowser';

interface StoresActiveFiltersBarProps {
  chips: ActiveChip[];
  onClearAll: () => void;
}

export default function StoresActiveFiltersBar({ chips, onClearAll }: StoresActiveFiltersBarProps) {
  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 py-1.5">
      <span className="mr-1 text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted)]">
        Active Filters:
      </span>
      <div className="flex flex-wrap items-center gap-2">
        {chips.map((chip) => (
          <div
            key={chip.key}
            className="shadow-xs inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] py-1 pl-3 pr-2 text-xs text-[var(--color-foreground)] transition-colors duration-200"
          >
            <span className="mr-0.5 text-[10px] font-medium uppercase text-[var(--color-muted)]">
              {chip.key === 'q' || chip.key === 'search' ? 'Search' : chip.key}:
            </span>
            <span className="text-xs font-semibold tracking-tight">{chip.label}</span>
            <button
              onClick={chip.onClear}
              className="rounded-full p-0.5 text-[var(--color-muted)] transition-all duration-200 hover:bg-[var(--color-border)] hover:text-[var(--color-foreground)] active:scale-95"
              aria-label={`Remove filter ${chip.label}`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        <button
          onClick={onClearAll}
          className="ml-1 inline-flex items-center gap-1 rounded-full border border-red-500/10 bg-red-500/5 px-3 py-1 text-[11px] font-semibold text-red-500 transition-all hover:bg-red-500/10 hover:text-red-600 active:scale-95"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Clear All
        </button>
      </div>
    </div>
  );
}
