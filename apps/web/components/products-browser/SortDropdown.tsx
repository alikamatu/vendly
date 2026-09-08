"use client";

import React from "react";
import { ArrowDownUp } from "lucide-react";
import type { BrowseSort } from "@/lib/api/product";
import Select from "@/components/ui/Select";

interface SortDropdownProps {
  value: BrowseSort;
  onChange: (v: BrowseSort) => void;
}

const OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "price_asc", label: "Price · Low → High" },
  { value: "price_desc", label: "Price · High → Low" },
  { value: "popular", label: "Most popular" },
  { value: "discount_desc", label: "Biggest discount" },
];

export default function SortDropdown({ value, onChange }: SortDropdownProps) {
  return (
    <div className="w-44 sm:w-48">
      <Select
        size="sm"
        value={value}
        onChange={(v) => onChange(v as BrowseSort)}
        options={OPTIONS}
        icon={<ArrowDownUp className="w-3.5 h-3.5" />}
      />
    </div>
  );
}
