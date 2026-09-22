'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { Spinner } from './spinner';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-primary-foreground hover:opacity-90 active:opacity-80',
  secondary: 'bg-muted text-foreground border border-border hover:bg-muted/80 active:bg-muted/60',
  outline:
    'bg-transparent text-foreground border border-border hover:bg-muted/50 active:bg-muted/70',
  ghost: 'text-foreground hover:bg-muted active:bg-muted/80',
  destructive: 'bg-destructive text-destructive-foreground hover:opacity-90 active:opacity-80',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-[var(--radius-md)]',
  md: 'h-10 px-4 text-sm gap-2 rounded-[var(--radius-lg)]',
  lg: 'h-11 px-5 text-sm gap-2 rounded-[var(--radius-lg)]',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      fullWidth = false,
      disabled,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'relative inline-flex items-center justify-center font-medium',
          'transition-all duration-150 ease-out',
          'focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2',
          'disabled:pointer-events-none disabled:opacity-50',
          'cursor-pointer select-none',
          variantStyles[variant],
          sizeStyles[size],
          fullWidth && 'w-full',
          className,
        )}
        {...props}
      >
        {isLoading && <Spinner size={size === 'sm' ? 'sm' : 'md'} className="absolute" />}
        <span className={cn('flex items-center gap-2', isLoading && 'invisible')}>{children}</span>
      </button>
    );
  },
);

Button.displayName = 'Button';
