"use client";

import React from "react";
import { SearchX } from "lucide-react";

interface EmptyStateProps {
  onReset: () => void;
}

export default function EmptyState({ onReset }: EmptyStateProps) {
  return (
    <div className="py-20 md:py-28 px-6 text-center border-2 border-dashed border-[var(--color-border)] rounded-3xl bg-[var(--color-surface)]/40 space-y-5">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[var(--color-border)]/40 text-[var(--color-muted)]">
        <SearchX className="w-6 h-6" />
      </div>
      <div className="space-y-2 max-w-sm mx-auto">
        <h3 className="text-base md:text-lg font-extrabold tracking-tight text-[var(--color-foreground)]">
          No products match your filters
        </h3>
        <p className="text-[12px] text-[var(--color-muted)] leading-relaxed">
          Try broadening your search, removing a filter, or clearing everything to see all
          available products.
        </p>
      </div>
      <button
        onClick={onReset}
        className="inline-flex items-center justify-center h-10 px-5 rounded-xl bg-[var(--color-foreground)] text-[var(--color-background)] text-[11px] font-black uppercase tracking-widest hover:opacity-90 transition-opacity"
      >
        Clear all filters
      </button>
    </div>
  );
}
