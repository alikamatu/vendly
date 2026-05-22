"use client";

import React from "react";
import { ArrowDownUp } from "lucide-react";
import type { BrowseSort } from "@/lib/api/product";

interface SortDropdownProps {
  value: BrowseSort;
  onChange: (v: BrowseSort) => void;
}

const OPTIONS: { value: BrowseSort; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "price_asc", label: "Price · Low → High" },
  { value: "price_desc", label: "Price · High → Low" },
  { value: "popular", label: "Most popular" },
  { value: "discount_desc", label: "Biggest discount" },
];

export default function SortDropdown({ value, onChange }: SortDropdownProps) {
  return (
    <div className="relative">
      <ArrowDownUp className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)] pointer-events-none" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as BrowseSort)}
        aria-label="Sort products"
        className="h-10 pl-9 pr-7 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[12px] font-normal text-[var(--color-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30 focus:border-[var(--color-accent)]/50 appearance-none cursor-pointer"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
