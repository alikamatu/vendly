'use client';

import React from 'react';
import clsx from '@/utils/clsx';

export type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface SpinnerProps {
  size?: SpinnerSize;
  className?: string;
  label?: string;
}

const sizeClasses: Record<SpinnerSize, string> = {
  xs: 'h-3.5 w-3.5',
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-7 w-7',
  xl: 'h-10 w-10',
};

const strokeWidths: Record<SpinnerSize, number> = {
  xs: 2.5,
  sm: 2.5,
  md: 2.25,
  lg: 2,
  xl: 2,
};

/**
 * Apple & Linear inspired high-precision spinner.
 * Uses currentColor so it seamlessly inherits text color in buttons and dark/light surfaces.
 */
export default function Spinner({ size = 'md', className, label = 'Loading...' }: SpinnerProps) {
  const strokeWidth = strokeWidths[size];

  return (
    <span
      role="status"
      aria-label={label}
      className={clsx('inline-flex items-center justify-center shrink-0', sizeClasses[size], className)}
    >
      <svg
        className="animate-spin h-full w-full"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-20"
          cx="12"
          cy="12"
          r="9.5"
          stroke="currentColor"
          strokeWidth={strokeWidth}
        />
        <path
          className="opacity-90"
          fill="currentColor"
          d="M12 2.5A9.5 9.5 0 0 1 21.5 12h-2.5A7 7 0 0 0 12 5V2.5z"
        />
      </svg>
      <span className="sr-only">{label}</span>
    </span>
  );
}
