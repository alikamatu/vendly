'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from '@/utils/clsx';
import { X, CheckCircle, AlertTriangle, Info, XCircle } from 'lucide-react';
import Spinner from './Spinner';

export type AlertVariant = 'success' | 'error' | 'warning' | 'info';

export interface AlertAction {
  label: string;
  onClick: () => void;
  isLoading?: boolean;
}

export interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  message: string;
  action?: AlertAction;
  onDismiss?: () => void;
  className?: string;
}

const variantConfig: Record<
  AlertVariant,
  {
    bg: string;
    text: string;
    iconColor: string;
    actionBg: string;
    icon: React.ElementType;
  }
> = {
  success: {
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
    text: 'text-emerald-900 dark:text-emerald-200',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    actionBg: 'bg-emerald-600 text-white hover:bg-emerald-700',
    icon: CheckCircle,
  },
  error: {
    bg: 'bg-red-500/10 dark:bg-red-500/15',
    text: 'text-red-900 dark:text-red-200',
    iconColor: 'text-red-600 dark:text-red-400',
    actionBg: 'bg-red-600 text-white hover:bg-red-700',
    icon: XCircle,
  },
  warning: {
    bg: 'bg-amber-500/10 dark:bg-amber-500/15',
    text: 'text-amber-900 dark:text-amber-200',
    iconColor: 'text-amber-600 dark:text-amber-400',
    actionBg: 'bg-amber-600 text-white hover:bg-amber-700',
    icon: AlertTriangle,
  },
  info: {
    bg: 'bg-blue-500/10 dark:bg-blue-500/15',
    text: 'text-blue-900 dark:text-blue-200',
    iconColor: 'text-blue-600 dark:text-blue-400',
    actionBg: 'bg-blue-600 text-white hover:bg-blue-700',
    icon: Info,
  },
};

const MotionDiv = motion.div as any;
const MotionButton = motion.button as any;

export default function Alert({
  variant = 'info',
  title,
  message,
  action,
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
          'relative flex items-start gap-3.5 rounded-2xl p-4 text-xs sm:text-sm select-none border border-border/60',
          config.bg,
          config.text,
          className
        )}
      >
        {/* Icon Pill */}
        <div className={clsx('mt-0.5 shrink-0', config.iconColor)}>
          <Icon className="w-5 h-5" strokeWidth={2.2} />
        </div>

        {/* Content & Action Row */}
        <div className="flex-1 min-w-0 space-y-1">
          {title && (
            <h4 className="font-semibold tracking-tight text-foreground leading-snug">
              {title}
            </h4>
          )}
          <p className="leading-relaxed opacity-90">{message}</p>

          {/* Responsive Action Button */}
          {action && (
            <div className="pt-2">
              <MotionButton
                type="button"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.95 }}
                onClick={action.onClick}
                disabled={action.isLoading}
                className={clsx(
                  'inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow-xs transition-all outline-none',
                  config.actionBg,
                  action.isLoading && 'opacity-60 cursor-not-allowed'
                )}
              >
                {action.isLoading && <Spinner size="xs" className="text-current" />}
                <span>{action.label}</span>
              </MotionButton>
            </div>
          )}
        </div>

        {/* Dismiss Button with Micro-Animation */}
        {onDismiss && (
          <MotionButton
            type="button"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onDismiss}
            aria-label="Dismiss alert"
            className="shrink-0 p-1 rounded-lg opacity-60 hover:opacity-100 hover:bg-foreground/5 transition-colors text-current"
          >
            <X className="w-4 h-4" />
          </MotionButton>
        )}
      </MotionDiv>
    </AnimatePresence>
  );
}
