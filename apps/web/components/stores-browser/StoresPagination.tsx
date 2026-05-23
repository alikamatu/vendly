'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface StoresPaginationProps {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
}

export default function StoresPagination({ page, totalPages, onChange }: StoresPaginationProps) {
  // Generate pagination list
  const pages = React.useMemo(() => {
    const arr: (number | string)[] = [];
    const delta = 1;

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= page - delta && i <= page + delta)) {
        arr.push(i);
      } else if (arr[arr.length - 1] !== '...') {
        arr.push('...');
      }
    }
    return arr;
  }, [page, totalPages]);

  if (totalPages <= 1) return null;

  return (
    <nav className="border-[var(--color-border)]/40 mt-10 flex items-center justify-center gap-1.5 border-t pt-8">
      {/* Previous Button */}
      <button
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        className="hover:bg-[var(--color-border)]/20 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)] transition-all duration-200 hover:text-[var(--color-foreground)] active:scale-95 disabled:opacity-40 disabled:hover:bg-[var(--color-surface)] disabled:hover:text-[var(--color-muted)]"
        aria-label="Previous page"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      {/* Pages list */}
      <div className="flex items-center gap-1">
        {pages.map((p, idx) => {
          if (p === '...') {
            return (
              <span
                key={`ellipsis-${idx}`}
                className="inline-flex h-10 w-10 select-none items-center justify-center text-xs font-semibold text-[var(--color-muted)]"
              >
                ...
              </span>
            );
          }

          const isCurrent = p === page;
          return (
            <button
              key={`page-${p}`}
              onClick={() => onChange(Number(p))}
              className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border text-xs font-semibold transition-all duration-200 active:scale-95 ${
                isCurrent
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-background)] shadow-sm'
                  : 'hover:bg-[var(--color-border)]/20 border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-foreground)]'
              }`}
              aria-label={`Page ${p}`}
              aria-current={isCurrent ? 'page' : undefined}
            >
              {p}
            </button>
          );
        })}
      </div>

      {/* Next Button */}
      <button
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        className="hover:bg-[var(--color-border)]/20 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)] transition-all duration-200 hover:text-[var(--color-foreground)] active:scale-95 disabled:opacity-40 disabled:hover:bg-[var(--color-surface)] disabled:hover:text-[var(--color-muted)]"
        aria-label="Next page"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </nav>
  );
}
