'use client';

import { cn } from '@/lib/utils';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

const sizes = {
  sm: 'h-6 w-6',
  md: 'h-8 w-8',
  lg: 'h-10 w-10',
  xl: 'h-12 w-12',
};

export function Logo({ size = 'md', showText = true, className }: LogoProps) {
  return (
    <div className={cn('flex select-none items-center gap-2.5', className)}>
      {/* Original Brand Logo Image */}
      <img
        src="/logos/verndly.png"
        alt="Vendly"
        className={cn(sizes[size], 'shrink-0 object-contain')}
      />
      {/* Wordmark */}
      {showText && (
        <span
          className={cn(
            'text-foreground font-semibold tracking-tight',
            size === 'sm' && 'text-sm',
            size === 'md' && 'text-lg',
            size === 'lg' && 'text-xl',
            size === 'xl' && 'text-2xl',
          )}
        >
          Vendly
        </span>
      )}
    </div>
  );
}
