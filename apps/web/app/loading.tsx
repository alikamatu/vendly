"use client";

import React from "react";

export default function Loading() {
  const skeletons = Array.from({ length: 8 });

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 space-y-8 animate-fade-in">
      {/* Header Skeleton */}
      <div className="max-w-7xl mx-auto space-y-3">
        <div className="h-4 w-28 bg-surface rounded-md animate-pulse" />
        <div className="h-8 w-56 bg-surface rounded-xl animate-pulse" />
      </div>

      {/* Grid Skeleton */}
      <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {skeletons.map((_, i) => (
          <div
            key={i}
            className="rounded-2xl bg-surface border border-border/60 overflow-hidden flex flex-col space-y-3 p-3.5"
          >
            {/* Image Placeholder */}
            <div
              className="w-full bg-border/30 rounded-xl animate-pulse"
              style={{ height: `${[180, 220, 200, 240][i % 4]}px` }}
            />

            {/* Content lines */}
            <div className="space-y-2 pt-1">
              <div className="h-3 w-4/5 bg-border/30 rounded animate-pulse" />
              <div className="flex items-center justify-between pt-1">
                <div className="h-3.5 w-16 bg-border/30 rounded animate-pulse" />
                <div className="h-3 w-12 bg-border/20 rounded animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

