'use client';

import { Star } from 'lucide-react';

/** Read-only display of a 0–5 rating (supports halves). */
export function RatingStars({
  value,
  count,
  size = 14,
  showValue = false,
  showCount = false,
  className,
}: {
  value: number;
  count?: number;
  size?: number;
  showValue?: boolean;
  showCount?: boolean;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(5, value));
  const full = Math.floor(clamped);
  const half = clamped - full >= 0.25 && clamped - full < 0.75;
  const ceil = half ? full + 1 : full;

  return (
    <span
      className={`inline-flex items-center gap-1.5 ${className ?? ''}`}
      aria-label={`Rating: ${clamped.toFixed(1)} out of 5`}
    >
      <span className="inline-flex items-center">
        {Array.from({ length: 5 }).map((_, i) => {
          const isFilled = i < ceil;
          const isHalf = half && i === full;
          return (
            <span key={i} className="relative inline-flex" style={{ width: size, height: size }}>
              <Star
                size={size}
                strokeWidth={1.5}
                className="absolute inset-0 text-amber-300/40"
                fill="none"
              />
              {isFilled && (
                <span
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: isHalf ? '50%' : '100%' }}
                >
                  <Star
                    size={size}
                    strokeWidth={1.5}
                    className="text-amber-400"
                    fill="currentColor"
                  />
                </span>
              )}
            </span>
          );
        })}
      </span>
      {showValue && (
        <span className="text-foreground/90 text-[12.5px] font-medium tabular-nums">
          {clamped.toFixed(1)}
        </span>
      )}
      {showCount && typeof count === 'number' && (
        <span className="text-foreground/60 text-[12px] tabular-nums">
          ({count.toLocaleString()})
        </span>
      )}
    </span>
  );
}
