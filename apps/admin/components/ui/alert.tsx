'use client';

import { AlertCircle, CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

type AlertVariant = 'error' | 'success' | 'warning' | 'info';

interface AlertProps {
  variant?: AlertVariant;
  children: React.ReactNode;
  dismissible?: boolean;
  className?: string;
}

const variantConfig: Record<AlertVariant, { icon: typeof AlertCircle; colors: string }> = {
  error: {
    icon: AlertCircle,
    colors: 'bg-destructive/8 text-destructive border-destructive/20',
  },
  success: {
    icon: CheckCircle2,
    colors: 'bg-success/8 text-success border-success/20',
  },
  warning: {
    icon: AlertTriangle,
    colors: 'bg-warning/8 text-warning border-warning/20',
  },
  info: {
    icon: Info,
    colors: 'bg-info/8 text-info border-info/20',
  },
};

export function Alert({ variant = 'info', children, dismissible = false, className }: AlertProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const { icon: Icon, colors } = variantConfig[variant];

  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-2.5 px-3.5 py-3 text-[13px] leading-snug',
        'rounded-[var(--radius-lg)] border',
        colors,
        className,
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="flex-1 font-medium">{children}</div>
      {dismissible && (
        <button
          onClick={() => setDismissed(true)}
          className="mt-0.5 shrink-0 transition-opacity hover:opacity-70"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
