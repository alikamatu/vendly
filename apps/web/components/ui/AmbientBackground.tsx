'use client';

import React from 'react';

interface AmbientBackgroundProps {
  className?: string;
}

export default function AmbientBackground({ className = '' }: AmbientBackgroundProps) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden select-none z-0 ${className}`}
      aria-hidden="true"
    >
      {/* Soft warm ambient glow at the top using Verndly's secondary red color */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[850px] h-[360px] bg-red-500/[0.045] dark:bg-red-500/[0.065] rounded-full blur-[120px]" />

      {/* Visible, ultra-refined geometric dot grid + micro-cross SVG pattern */}
      <svg
        className="absolute inset-0 h-full w-full [mask-image:radial-gradient(ellipse_85%_70%_at_50%_15%,#000_40%,transparent_90%)]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="verndly-ambient-grid"
            width="32"
            height="32"
            patternUnits="userSpaceOnUse"
            x="50%"
            y="-1"
          >
            {/* Subtle micro dots at grid intersections */}
            <circle
              cx="16"
              cy="16"
              r="1"
              className="fill-foreground/[0.14] dark:fill-white/[0.15]"
            />
            {/* Fine hairline grid lines */}
            <path
              d="M0 32V.5H32"
              fill="none"
              className="stroke-foreground/[0.05] dark:stroke-white/[0.06]"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" strokeWidth={0} fill="url(#verndly-ambient-grid)" />
      </svg>
    </div>
  );
}
