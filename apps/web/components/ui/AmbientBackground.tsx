'use client';

import React from 'react';

interface AmbientBackgroundProps {
  className?: string;
  hidePatternOnMobile?: boolean;
}

export default function AmbientBackground({
  className = '',
  hidePatternOnMobile = true,
}: AmbientBackgroundProps) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 z-0 select-none overflow-hidden ${className}`}
      aria-hidden="true"
    >
      {/* Soft warm ambient glow at the top using Verndly's secondary red color */}
      <div className="absolute -top-32 left-1/2 h-[360px] w-[850px] -translate-x-1/2 rounded-full bg-red-500/[0.045] blur-[120px] dark:bg-red-500/[0.065]" />

      {/* Visible, ultra-refined geometric dot grid + micro-cross SVG pattern (hidden on mobile to ensure crisp text readability) */}
      <svg
        className={`absolute inset-0 h-full w-full [mask-image:radial-gradient(ellipse_85%_70%_at_50%_15%,#000_40%,transparent_90%)] ${
          hidePatternOnMobile ? 'hidden sm:block' : ''
        }`}
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
