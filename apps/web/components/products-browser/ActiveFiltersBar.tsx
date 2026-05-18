"use client";

import React from "react";
import { X } from "lucide-react";
import type { ActiveChip } from "@/hooks/useProductsBrowser";

interface ActiveFiltersBarProps {
  chips: ActiveChip[];
  onClearAll: () => void;
}

export default function ActiveFiltersBar({ chips, onClearAll }: ActiveFiltersBarProps) {
  if (chips.length === 0) return null;
  return (
    <div className="flex items-center flex-wrap gap-2">
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={chip.onClear}
          className="group inline-flex items-center gap-1.5 px-3 h-8 rounded-full bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/25 text-[var(--color-accent)] text-[11px] font-bold transition-all hover:bg-[var(--color-accent)]/15"
        >
          <span className="truncate max-w-[160px]">{chip.label}</span>
          <X className="w-3 h-3 opacity-70 group-hover:opacity-100" />
        </button>
      ))}
      {chips.length > 1 && (
        <button
          type="button"
          onClick={onClearAll}
          className="text-[11px] font-bold text-[var(--color-muted)] hover:text-[var(--color-foreground)] underline underline-offset-2 ml-1"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
