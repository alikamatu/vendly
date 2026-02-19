'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from '@/utils/clsx';
import { X, CheckCircle, AlertTriangle, Info, XCircle } from 'lucide-react';

type AlertVariant = 'success' | 'error' | 'warning' | 'info';

interface AlertProps {
  variant?: AlertVariant;
  message: string;
  onDismiss?: () => void;
  className?: string;
}

const variantStyles: Record<AlertVariant, string> = {
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800',
  error: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
  warning: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
  info: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
};

const icons: Record<AlertVariant, React.ReactNode> = {
  success: <CheckCircle size={18} />,
  error: <XCircle size={18} />,
  warning: <AlertTriangle size={18} />,
  info: <Info size={18} />,
};

export default function Alert({ variant = 'info', message, onDismiss, className }: AlertProps) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2 }}
        className={clsx(
          'flex items-start gap-3 rounded-lg border p-3 text-sm',
          variantStyles[variant],
          className
        )}
      >
        <span className="mt-0.5 flex-shrink-0">{icons[variant]}</span>
        <span className="flex-1">{message}</span>
        {onDismiss && (
          <button onClick={onDismiss} className="flex-shrink-0 opacity-60 hover:opacity-100 transition">
            <X size={16} />
          </button>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
