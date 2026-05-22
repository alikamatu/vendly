"use client";

import React from "react";

interface EmptyResultsProps {
  onClear: () => void;
  title?: string;
  description?: string;
  actionLabel?: string;
}

export default function EmptyResults({
  onClear,
  title = "No items match your filters",
  description = "Try adjusting your price range or category to find more amazing great deals.",
  actionLabel = "Clear all filters",
}: EmptyResultsProps) {
  return (
    <div className="py-24 md:py-32 text-center space-y-6 border-2 border-dashed border-border rounded-[2rem] md:rounded-[3rem] bg-muted/20">
      <div className="space-y-2">
        <h3 className="text-lg md:text-xl uppercase tracking-tight">{title}</h3>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto">{description}</p>
      </div>
      <button
        onClick={onClear}
        className="text-[10px] uppercase tracking-[0.2em] text-primary hover:underline"
      >
        {actionLabel}
      </button>
    </div>
  );
}
