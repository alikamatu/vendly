import React from 'react';
import { UseFormRegisterReturn } from 'react-hook-form';
import clsx from '@/utils/clsx';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  registration?: UseFormRegisterReturn;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className, registration, ...props }, ref) => {
    return (
      <div className="space-y-1">
        {label && <label className="text-sm font-medium text-foreground/80">{label}</label>}
        <textarea
          ref={ref}
          className={clsx(
            'w-full rounded-lg border border-border bg-background px-4 py-2 text-foreground transition resize-none',
            'focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent',
            error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : null,
            className
          )}
          rows={4}
          {...registration}
          {...props}
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
export default Textarea;
