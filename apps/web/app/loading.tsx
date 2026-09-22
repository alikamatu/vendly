'use client';

import React from 'react';

export default function Loading() {
  const skeletons = Array.from({ length: 10 });

  return (
    <div className="bg-background animate-fade-in min-h-screen space-y-8 p-4 md:p-8">
      {/* Header Skeleton */}
      <div className="mx-auto max-w-7xl space-y-3">
        <div className="bg-surface h-4 w-28 animate-pulse rounded-md" />
        <div className="bg-surface h-8 w-56 animate-pulse rounded-xl" />
      </div>

      {/* Grid Skeleton */}
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 md:gap-4 lg:grid-cols-5">
        {skeletons.map((_, i) => (
          <div
            key={i}
            className="bg-surface border-border/60 flex flex-col space-y-3 overflow-hidden rounded-2xl border p-3.5"
          >
            {/* Image Placeholder */}
            <div
              className="bg-border/30 w-full animate-pulse rounded-xl"
              style={{ height: `${[180, 220, 200, 240][i % 4]}px` }}
            />

            {/* Content lines */}
            <div className="space-y-2 pt-1">
              <div className="bg-border/30 h-3 w-4/5 animate-pulse rounded" />
              <div className="flex items-center justify-between pt-1">
                <div className="bg-border/30 h-3.5 w-16 animate-pulse rounded" />
                <div className="bg-border/20 h-3 w-12 animate-pulse rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
