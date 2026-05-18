"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}

export default function Pagination({ page, totalPages, onChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const visible = pageRange(page, totalPages);

  return (
    <nav
      role="navigation"
      aria-label="Pagination"
      className="flex items-center justify-center gap-1.5 py-2 flex-wrap"
    >
      <PageButton
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        aria-label="Previous page"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
      </PageButton>

      {visible.map((p, idx) =>
        p === "..." ? (
          <span
            key={`gap-${idx}`}
            className="px-2 text-[var(--color-muted)] text-[12px] select-none"
          >
            …
          </span>
        ) : (
          <PageButton
            key={p}
            active={p === page}
            onClick={() => onChange(p)}
            aria-label={`Go to page ${p}`}
            aria-current={p === page ? "page" : undefined}
          >
            {p}
          </PageButton>
        ),
      )}

      <PageButton
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        aria-label="Next page"
      >
        <ChevronRight className="w-3.5 h-3.5" />
      </PageButton>
    </nav>
  );
}

function PageButton({
  active,
  disabled,
  onClick,
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      {...rest}
      className={`min-w-[36px] h-9 px-2 rounded-xl text-[12px] font-bold transition-colors disabled:opacity-30 disabled:pointer-events-none ${
        active
          ? "bg-[var(--color-foreground)] text-[var(--color-background)]"
          : "bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-foreground)] hover:border-[var(--color-accent)]/40 hover:text-[var(--color-accent)]"
      }`}
    >
      {children}
    </button>
  );
}

function pageRange(page: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out: (number | "...")[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(total - 1, page + 1);
  if (start > 2) out.push("...");
  for (let i = start; i <= end; i++) out.push(i);
  if (end < total - 1) out.push("...");
  out.push(total);
  return out;
}
