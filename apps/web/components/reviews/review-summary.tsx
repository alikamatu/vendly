'use client';

import { RatingStars } from './rating-stars';
import type { ReviewSummary as Summary } from '@/lib/api/review';

export function ReviewSummary({
  summary,
  className,
  onFilterRating,
  activeRating,
}: {
  summary: Summary;
  className?: string;
  onFilterRating?: (n: number | null) => void;
  activeRating?: number | null;
}) {
  const { count, average, distribution } = summary;

  return (
    <div className={`grid grid-cols-1 gap-6 sm:grid-cols-[180px_1fr] ${className ?? ''}`}>
      {/* Big number + stars */}
      <div className="bg-foreground/5 flex flex-col items-center justify-center rounded-2xl p-5">
        <div className="text-[40px] font-semibold leading-none tracking-tight">
          {count > 0 ? average.toFixed(1) : '—'}
        </div>
        <div className="mt-2">
          <RatingStars value={count > 0 ? average : 0} size={16} />
        </div>
        <div className="text-foreground/60 mt-1.5 text-[12px]">
          {count.toLocaleString()} review{count === 1 ? '' : 's'}
        </div>
      </div>

      {/* Distribution */}
      <div className="space-y-1.5">
        {[5, 4, 3, 2, 1].map((star) => {
          const n = distribution[star as 1 | 2 | 3 | 4 | 5];
          const pct = count > 0 ? (n / count) * 100 : 0;
          const active = activeRating === star;
          return (
            <button
              key={star}
              type="button"
              onClick={() => onFilterRating?.(active ? null : star)}
              className={`hover:bg-foreground/5 flex w-full items-center gap-3 rounded-md px-2 py-1 text-left transition-colors ${
                active ? 'bg-foreground/5 ring-1 ring-amber-300/40' : ''
              }`}
              aria-pressed={active}
            >
              <span className="text-foreground/70 flex w-6 items-center justify-end gap-1 text-[12px] tabular-nums">
                {star}
              </span>
              <span className="bg-foreground/10 relative block h-2 flex-1 overflow-hidden rounded-full">
                <span
                  className="absolute inset-y-0 left-0 rounded-full bg-amber-400 transition-[width] duration-500 ease-out"
                  style={{ width: `${pct}%` }}
                />
              </span>
              <span className="text-foreground/60 w-12 text-right text-[12px] tabular-nums">
                {n.toLocaleString()}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
