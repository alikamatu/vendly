"use client";

import React from "react";
import Link from "next/link";
import { Eye, X } from "lucide-react";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";

interface Props {
  limit?: number;
  /** Hide this product id (use on detail pages to avoid linking to current). */
  excludeId?: string;
  /**
   * `rail` — horizontal scroll on mobile, 6-col grid on desktop (default; home).
   * `compact` — small horizontal scroll only, fewer items, slimmer headline.
   */
  variant?: 'rail' | 'compact';
  /** Custom headline. Defaults to "Pick up where you left off." */
  title?: string;
  className?: string;
}

export default function RecentlyViewed({
  limit = 12,
  excludeId,
  variant = 'rail',
  title,
  className = '',
}: Props) {
  const { items, clear } = useRecentlyViewed();
  const list = items.filter((p) => p.id !== excludeId).slice(0, limit);
  if (!list.length) return null;

  const headline = title ?? 'Pick up where you left off';
  const isCompact = variant === 'compact';

  return (
    <section className={`space-y-4 ${className}`}>
      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.15em] text-muted">
            <Eye className="w-3.5 h-3.5" />
            Recently viewed
          </div>
          <h2
            className={
              isCompact
                ? 'text-lg md:text-xl tracking-tight mt-1'
                : 'text-2xl md:text-3xl tracking-tight mt-1'
            }
          >
            {headline}
          </h2>
        </div>
        <button
          onClick={clear}
          className="text-[10px] uppercase tracking-wider text-muted hover:text-foreground transition inline-flex items-center gap-1"
        >
          <X className="w-3 h-3" /> Clear
        </button>
      </div>

      <div className="-mx-4 px-4 md:mx-0 md:px-0 overflow-x-auto">
        <div
          className={
            isCompact
              ? 'flex gap-3 min-w-max'
              : 'flex gap-3 md:grid md:grid-cols-6 md:gap-4 min-w-max md:min-w-0'
          }
        >
          {list.map((p) => (
            <Link
              key={p.id}
              href={`/product/${p.id}`}
              className="group w-[150px] md:w-auto shrink-0 rounded-2xl border border-border/40 hover:border-primary/40 bg-surface/40 hover:bg-surface transition overflow-hidden"
            >
              <div className="aspect-square bg-neutral-100 dark:bg-neutral-900 overflow-hidden">
                {p.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.image}
                    alt={p.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full" />
                )}
              </div>
              <div className="p-2.5">
                <div className="text-xs font-medium leading-tight line-clamp-2 group-hover:text-primary transition">
                  {p.title}
                </div>
                {p.storeName && (
                  <div className="text-[10px] text-muted mt-1 truncate">{p.storeName}</div>
                )}
                {p.price !== undefined && (
                  <div className="text-xs font-semibold mt-1">
                    {typeof p.price === "number" ? `GHS ${p.price}` : `GHS ${p.price}`}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
