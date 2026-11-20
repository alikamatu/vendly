'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from '@/utils/clsx';
import { X, CheckCircle, AlertTriangle, Info, XCircle } from 'lucide-react';

export type AlertVariant = 'success' | 'error' | 'warning' | 'info';

export interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  message: string;
  onDismiss?: () => void;
  className?: string;
}

const variantConfig: Record<
  AlertVariant,
  {
    bg: string;
    text: string;
    iconColor: string;
    icon: React.ElementType;
  }
> = {
  success: {
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
    text: 'text-emerald-900 dark:text-emerald-200',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    icon: CheckCircle,
  },
  error: {
    bg: 'bg-red-500/10 dark:bg-red-500/15',
    text: 'text-red-900 dark:text-red-200',
    iconColor: 'text-red-600 dark:text-red-400',
    icon: XCircle,
  },
  warning: {
    bg: 'bg-amber-500/10 dark:bg-amber-500/15',
    text: 'text-amber-900 dark:text-amber-200',
    iconColor: 'text-amber-600 dark:text-amber-400',
    icon: AlertTriangle,
  },
  info: {
    bg: 'bg-blue-500/10 dark:bg-blue-500/15',
    text: 'text-blue-900 dark:text-blue-200',
    iconColor: 'text-blue-600 dark:text-blue-400',
    icon: Info,
  },
};

const MotionDiv = motion.div as any;
const MotionButton = motion.button as any;

export default function Alert({
  variant = 'info',
  title,
  message,
  onDismiss,
  className,
}: AlertProps) {
  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <AnimatePresence>
      <MotionDiv
        initial={{ opacity: 0, y: -10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.98 }}
        transition={{ type: 'spring', damping: 26, stiffness: 340 }}
        className={clsx(
          'border-border/60 relative flex select-none items-start gap-3.5 rounded-2xl border p-4 text-xs sm:text-sm',
          config.bg,
          config.text,
          className,
        )}
      >
        {/* Icon Pill */}
        <div className={clsx('mt-0.5 shrink-0', config.iconColor)}>
          <Icon className="h-5 w-5" strokeWidth={2.2} />
        </div>

        {/* Content & Action Row */}
        <div className="min-w-0 flex-1 space-y-1">
          {title && (
            <h4 className="text-foreground font-semibold leading-snug tracking-tight">{title}</h4>
          )}
          <p className="leading-relaxed opacity-90">{message}</p>
        </div>

        {/* Dismiss Button with Micro-Animation */}
        {onDismiss && (
          <MotionButton
            type="button"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onDismiss}
            aria-label="Dismiss alert"
            className="hover:bg-foreground/5 shrink-0 rounded-lg p-1 text-current opacity-60 transition-colors hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </MotionButton>
        )}
      </MotionDiv>
    </AnimatePresence>
  );
}
