import React from 'react';
import { UseFormRegisterReturn } from 'react-hook-form';
import clsx from '@/utils/clsx';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  registration?: UseFormRegisterReturn;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className, registration, ...props }, ref) => {
    return (
      <div className="space-y-1">
        {label && <label className="text-sm font-medium text-foreground/80">{label}</label>}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={clsx(
              'w-full rounded-lg border border-foreground/15 bg-background px-4 py-2.5 text-foreground transition-all duration-200',
              'focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20',
              'placeholder:text-foreground/30',
              icon ? 'pl-10' : null,
              error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : null,
              className
            )}
            {...registration}
            {...props}
          />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;