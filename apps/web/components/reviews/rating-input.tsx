'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';

const LABELS: Record<number, string> = {
  1: 'Poor',
  2: 'Fair',
  3: 'Good',
  4: 'Great',
  5: 'Excellent',
};

export function RatingInput({
  value,
  onChange,
  size = 28,
}: {
  value: number;
  onChange: (v: number) => void;
  size?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? value;

  return (
    <div className="flex items-center gap-3">
      <div
        className="inline-flex items-center"
        role="radiogroup"
        aria-label="Rating"
        onMouseLeave={() => setHover(null)}
      >
        {[1, 2, 3, 4, 5].map((v) => {
          const filled = v <= shown;
          return (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={v === value}
              aria-label={`${v} star${v === 1 ? '' : 's'} — ${LABELS[v]}`}
              onMouseEnter={() => setHover(v)}
              onFocus={() => setHover(v)}
              onClick={() => onChange(v)}
              className="grid place-items-center rounded-md p-1 transition-transform hover:scale-110 active:scale-95"
            >
              <Star
                size={size}
                strokeWidth={1.6}
                className={filled ? 'text-amber-400' : 'text-amber-300/40'}
                fill={filled ? 'currentColor' : 'none'}
              />
            </button>
          );
        })}
      </div>
      <span className="text-foreground/80 min-w-[3.5rem] text-[12.5px] font-medium">
        {shown ? LABELS[shown] : 'Tap to rate'}
      </span>
    </div>
  );
}
