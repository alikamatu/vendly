"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, X } from "lucide-react";
import { clsx } from "@/utils/clsx";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
  className?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search...",
  debounceMs = 300,
  className,
}: SearchInputProps) {
  const [localValue, setLocalValue] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Sync external value changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setLocalValue(next);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onChange(next), debounceMs);
  };

  const handleClear = () => {
    setLocalValue("");
    onChange("");
  };

  return (
    <div className={clsx("relative flex items-center", className)}>
      <Search
        size={15}
        className="absolute left-3 text-[--color-foreground]/40 pointer-events-none"
      />
      <input
        type="text"
        value={localValue}
        onChange={handleChange}
        placeholder={placeholder}
        className={clsx(
          "w-full pl-9 pr-10 py-2.5 text-sm rounded-xl",
          "bg-[--color-foreground]/5 border-none",
          "focus:bg-[--color-foreground]/[0.08] focus:outline-none focus:ring-1 focus:ring-[--color-primary]/20",
          "placeholder:text-[--color-foreground]/40",
          "transition-all duration-200",
          className
        )}
      />
      {localValue && (
        <button
          onClick={handleClear}
          className="absolute right-2.5 p-0.5 rounded-full hover:bg-[--color-foreground]/10 transition-colors"
          aria-label="Clear search"
        >
          <X size={12} className="text-[--color-foreground]/50" />
        </button>
      )}
    </div>
  );
}
