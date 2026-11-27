'use client';

import React from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { getProductPath } from '@/lib/product-slug';

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
          <div className="text-muted text-[10px] uppercase tracking-[0.15em]">Recently viewed</div>
          <h2
            className={
              isCompact
                ? 'mt-1 text-lg tracking-tight md:text-xl'
                : 'mt-1 text-2xl tracking-tight md:text-3xl'
            }
          >
            {headline}
          </h2>
        </div>
        <button
          onClick={clear}
          className="text-muted hover:text-foreground inline-flex items-center gap-1 text-[10px] uppercase tracking-wider transition"
        >
          <X className="h-3 w-3" /> Clear
        </button>
      </div>

      <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
        <div
          className={
            isCompact
              ? 'flex min-w-max gap-3'
              : 'flex min-w-max gap-3 md:grid md:min-w-0 md:grid-cols-6 md:gap-4'
          }
        >
          {list.map((p) => (
            <Link
              key={p.id}
              href={getProductPath(p)}
              className="border-border/40 hover:border-primary/40 bg-surface/40 hover:bg-surface group w-[150px] shrink-0 overflow-hidden rounded-2xl border transition md:w-auto"
            >
              <div className="aspect-square overflow-hidden bg-neutral-100 dark:bg-neutral-900">
                {p.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.image}
                    alt={p.title}
                    className="h-full w-full object-cover transition group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="h-full w-full" />
                )}
              </div>
              <div className="p-2.5">
                <div className="group-hover:text-primary line-clamp-2 text-xs font-medium leading-tight transition">
                  {p.title}
                </div>
                {p.storeName && (
                  <div className="text-muted mt-1 truncate text-[10px]">{p.storeName}</div>
                )}
                {p.price !== undefined && (
                  <div className="mt-1 text-xs font-semibold">{`GHS ${p.price}`}</div>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
