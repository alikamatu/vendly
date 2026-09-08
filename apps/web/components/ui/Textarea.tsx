import React from 'react';
import { UseFormRegisterReturn } from 'react-hook-form';
import clsx from '@/utils/clsx';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  labelRight?: React.ReactNode;
  hint?: string;
  error?: string;
  registration?: UseFormRegisterReturn;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, labelRight, hint, error, className, registration, id, ...props }, ref) => {
    const generatedId = React.useId();
    const textareaId = id || (label ? `textarea-${label.toLowerCase().replace(/\s+/g, '-')}` : generatedId);

    return (
      <div className="w-full text-left">
        {(label || labelRight) && (
          <div className="mb-1.5 flex items-center justify-between">
            {label && (
              <label
                htmlFor={textareaId}
                className={clsx(
                  'text-xs font-medium tracking-tight',
                  error ? 'text-red-500' : 'text-foreground/80'
                )}
              >
                {label}
              </label>
            )}
            {labelRight && <div className="text-xs">{labelRight}</div>}
          </div>
        )}
        <textarea
          id={textareaId}
          ref={ref}
          className={clsx(
            'w-full rounded-xl border p-3.5 text-sm text-foreground placeholder:text-foreground/40 outline-none font-normal resize-none transition-all duration-200',
            'bg-input-bg shadow-[0_1px_2px_rgba(0,0,0,0.04)]',
            error
              ? 'border-red-500/80 focus:border-red-500'
              : 'border-input-border hover:border-foreground/30 focus:border-secondary focus:bg-background',
            className
          )}
          rows={4}
          {...registration}
          {...props}
        />
        {hint && !error && (
          <p className="mt-1.5 text-[11px] text-foreground/50 leading-relaxed">{hint}</p>
        )}
        {error && <p className="mt-1.5 text-xs font-medium text-red-500">{error}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
export default Textarea;
