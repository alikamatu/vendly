'use client';

import React, { useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';

interface StoresSearchBarProps {
  value: string;
  onChange: (v: string) => void;
}

export default function StoresSearchBar({ value, onChange }: StoresSearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Global hotkey to focus search when "/" is pressed (if not typing in another input)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="group relative w-full">
      <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-[var(--color-muted)] transition-colors duration-200 group-focus-within:text-[var(--color-accent)]">
        <Search className="h-5 w-5" />
      </div>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search for stores by name or description... (Press '/' to focus)"
        className="h-13 focus:ring-[var(--color-accent)]/10 hover:border-[var(--color-border)]/80 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] pl-12 pr-12 text-sm text-[var(--color-foreground)] placeholder-[var(--color-muted)] transition-all duration-200 focus:border-[var(--color-accent)] focus:bg-[var(--color-background)] focus:outline-none focus:ring-4"
      />
      {value && (
        <button
          onClick={() => {
            onChange('');
            inputRef.current?.focus();
          }}
          className="absolute inset-y-0 right-4 flex items-center text-[var(--color-muted)] transition-colors duration-200 hover:text-[var(--color-foreground)]"
          type="button"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
