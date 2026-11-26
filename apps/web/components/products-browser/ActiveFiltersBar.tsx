'use client';

import React from 'react';
import { X } from 'lucide-react';
import type { ActiveChip } from '@/hooks/useProductsBrowser';

interface ActiveFiltersBarProps {
  chips: ActiveChip[];
  onClearAll: () => void;
}

export default function ActiveFiltersBar({ chips, onClearAll }: ActiveFiltersBarProps) {
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={chip.onClear}
          className="bg-surface text-foreground hover:bg-foreground/[0.08] group inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-[11px] font-medium transition-colors"
        >
          <span className="max-w-[160px] truncate">{chip.label}</span>
          <X className="text-muted group-hover:text-foreground h-3 w-3" />
        </button>
      ))}
      {chips.length > 1 && (
        <button
          type="button"
          onClick={onClearAll}
          className="text-muted hover:text-foreground ml-1 text-[11px] font-medium transition-colors"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
