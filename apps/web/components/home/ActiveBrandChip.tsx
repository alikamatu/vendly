"use client";

import React from "react";
import { X } from "lucide-react";

interface ActiveBrandChipProps {
  brand: string;
  onClear: () => void;
}

export default function ActiveBrandChip({ brand, onClear }: ActiveBrandChipProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full w-fit">
      <span className="text-xs font-normal text-foreground">Brand: {brand}</span>
      <button
        onClick={onClear}
        className="p-0.5 rounded-full bg-primary/20 hover:bg-primary/45 text-foreground transition-all flex items-center justify-center"
        aria-label="Remove brand filter"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}
