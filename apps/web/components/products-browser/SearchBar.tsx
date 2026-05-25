"use client";

import React, { useEffect, useRef, useState } from "react";
import { Search, X, Clock } from "lucide-react";
import { useSearchHistory } from "@/hooks/useSearchHistory";

interface SearchBarProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

export default function SearchBar({
  value,
  onChange,
  placeholder = "Search products, brands, tags...",
}: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const { suggest, record, remove, clear } = useSearchHistory();
  const suggestions = suggest(value);

  // Press "/" to focus
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  // Debounce-record after user pauses typing.
  useEffect(() => {
    if (!value || value.trim().length < 2) return;
    const id = window.setTimeout(() => record(value), 800);
    return () => window.clearTimeout(id);
  }, [value, record]);

  const pick = (q: string) => {
    onChange(q);
    record(q);
    setOpen(false);
    setActive(-1);
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      pick(suggestions[active].q);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="relative" ref={wrapRef}>
      <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-muted)] pointer-events-none" />
      <input
        ref={inputRef}
        type="search"
        inputMode="search"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKey}
        placeholder={placeholder}
        className="w-full h-12 pl-11 pr-20 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted)]/60 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30 focus:border-[var(--color-accent)]/50 transition-all"
        autoComplete="off"
      />
      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label="Clear search"
            className="p-1.5 rounded-lg text-[var(--color-muted)] hover:bg-[var(--color-border)]/40 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        <kbd className="hidden md:inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-background)] text-[10px] font-normal text-[var(--color-muted)]">
          /
        </kbd>
      </div>

      {open && suggestions.length > 0 && (
        <div className="absolute z-40 mt-1 left-0 right-0 rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] shadow-xl overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--color-border)]/60">
            <span className="text-[10px] uppercase tracking-wider text-[var(--color-muted)] flex items-center gap-1">
              <Clock className="w-3 h-3" /> Recent searches
            </span>
            <button
              onClick={() => {
                clear();
                setOpen(false);
              }}
              className="text-[10px] text-[var(--color-muted)] hover:text-[var(--color-foreground)] uppercase tracking-wider"
            >
              Clear
            </button>
          </div>
          <ul className="max-h-72 overflow-y-auto">
            {suggestions.map((s, i) => (
              <li key={s.q}>
                <div
                  className={`flex items-center justify-between px-3 py-2 cursor-pointer text-sm ${
                    i === active
                      ? "bg-[var(--color-surface)]"
                      : "hover:bg-[var(--color-surface)]/60"
                  }`}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pick(s.q);
                  }}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <Clock className="w-3 h-3 text-[var(--color-muted)] shrink-0" />
                    <span className="truncate">{s.q}</span>
                  </span>
                  <button
                    aria-label={`Remove ${s.q}`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      remove(s.q);
                    }}
                    className="p-1 rounded hover:bg-[var(--color-border)]/40 text-[var(--color-muted)]"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
