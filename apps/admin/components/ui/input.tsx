'use client';

import { forwardRef, useState, type InputHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
  inputSize?: 'md' | 'lg';
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, inputSize = 'lg', type, className, id, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="text-foreground block text-[13px] font-medium">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type={isPassword && showPassword ? 'text' : type}
            className={cn(
              'bg-input-bg border-input-border text-foreground w-full border',
              'placeholder:text-muted-foreground/60',
              'transition-colors duration-150 ease-out',
              'focus:border-input-focus focus:bg-background focus:outline-none',
              'disabled:cursor-not-allowed disabled:opacity-50',
              inputSize === 'lg'
                ? 'h-11 rounded-[var(--radius-lg)] px-3.5 text-sm'
                : 'h-9 rounded-[var(--radius-md)] px-3 text-[13px]',
              isPassword && 'pr-10',
              error && 'border-destructive focus:border-destructive',
              className,
            )}
            aria-invalid={!!error}
            aria-describedby={
              error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
            }
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-muted-foreground hover:text-foreground absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          )}
        </div>
        {error && (
          <p id={`${inputId}-error`} className="text-destructive text-[12px]" role="alert">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={`${inputId}-helper`} className="text-muted-foreground text-[12px]">
            {helperText}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
