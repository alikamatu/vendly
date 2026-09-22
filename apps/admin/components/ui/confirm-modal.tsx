'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Trash2, CheckCircle2, Info, HelpCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { Spinner } from './spinner';

export type ConfirmVariant = 'danger' | 'destructive' | 'warning' | 'info' | 'success';

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void | Promise<void>;
  title: string;
  description?: React.ReactNode;
  details?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  icon?:
    | 'trash'
    | 'alert'
    | 'warning'
    | 'info'
    | 'check'
    | React.ComponentType<{ className?: string }>;
  isAlert?: boolean;
  isLoading?: boolean;
  maxWidth?: 'sm' | 'md' | 'lg';
}

const variantStyles: Record<
  ConfirmVariant,
  {
    halo: string;
    iconColor: string;
    confirmButtonVariant: 'destructive' | 'primary' | 'outline';
    confirmButtonClass: string;
    defaultIcon: React.ComponentType<{ className?: string }>;
  }
> = {
  danger: {
    halo: 'bg-rose-500/10 border-rose-500/20 text-rose-500 shadow-[0_0_24px_rgba(244,63,94,0.15)]',
    iconColor: 'text-rose-500',
    confirmButtonVariant: 'destructive',
    confirmButtonClass:
      'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/20 active:scale-[0.98]',
    defaultIcon: Trash2,
  },
  destructive: {
    halo: 'bg-rose-500/10 border-rose-500/20 text-rose-500 shadow-[0_0_24px_rgba(244,63,94,0.15)]',
    iconColor: 'text-rose-500',
    confirmButtonVariant: 'destructive',
    confirmButtonClass:
      'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/20 active:scale-[0.98]',
    defaultIcon: Trash2,
  },
  warning: {
    halo: 'bg-amber-500/10 border-amber-500/20 text-amber-500 shadow-[0_0_24px_rgba(245,158,11,0.15)]',
    iconColor: 'text-amber-500',
    confirmButtonVariant: 'primary',
    confirmButtonClass:
      'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-600/20 active:scale-[0.98]',
    defaultIcon: AlertTriangle,
  },
  info: {
    halo: 'bg-blue-500/10 border-blue-500/20 text-blue-500 shadow-[0_0_24px_rgba(59,130,246,0.15)]',
    iconColor: 'text-blue-500',
    confirmButtonVariant: 'primary',
    confirmButtonClass:
      'bg-brand hover:bg-brand-hover text-white shadow-lg shadow-brand/20 active:scale-[0.98]',
    defaultIcon: HelpCircle,
  },
  success: {
    halo: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 shadow-[0_0_24px_rgba(16,185,129,0.15)]',
    iconColor: 'text-emerald-500',
    confirmButtonVariant: 'primary',
    confirmButtonClass:
      'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 active:scale-[0.98]',
    defaultIcon: CheckCircle2,
  },
};

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  details,
  confirmText,
  cancelText = 'Cancel',
  variant = 'danger',
  icon,
  isAlert = false,
  isLoading = false,
  maxWidth = 'sm',
}: ConfirmModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen || isLoading) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Enter') {
        // Prevent default if triggered outside form inputs
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
          return;
        }
        e.preventDefault();
        if (isAlert) {
          onClose();
        } else if (onConfirm) {
          void onConfirm();
        }
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isLoading, onClose, onConfirm, isAlert]);

  const currentVariant = variantStyles[variant] || variantStyles.danger;

  // Resolve Icon
  let IconComponent: React.ComponentType<{ className?: string }> = currentVariant.defaultIcon;
  if (typeof icon === 'function' || (typeof icon === 'object' && icon !== null)) {
    IconComponent = icon as React.ComponentType<{ className?: string }>;
  } else if (icon === 'trash') {
    IconComponent = Trash2;
  } else if (icon === 'alert') {
    IconComponent = AlertTriangle;
  } else if (icon === 'warning') {
    IconComponent = AlertTriangle;
  } else if (icon === 'info') {
    IconComponent = Info;
  } else if (icon === 'check') {
    IconComponent = CheckCircle2;
  }

  const maxWidthClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-xl',
  };

  const defaultConfirmText = isAlert ? 'Understood' : 'Confirm';
  const effectiveConfirmText = confirmText || defaultConfirmText;

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
          aria-describedby="confirm-dialog-description"
          className="fixed inset-0 z-[9995] flex items-center justify-center p-4 sm:p-6"
        >
          {/* Backdrop with subtle blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={isLoading ? undefined : onClose}
            className="backdrop-blur-xs fixed inset-0 bg-black/75"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              'bg-card text-card-foreground border-border relative z-10 flex w-full flex-col overflow-hidden rounded-2xl border shadow-2xl',
              maxWidthClasses[maxWidth],
            )}
          >
            {/* Close Button */}
            {!isLoading && (
              <button
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground hover:bg-muted absolute right-4 top-4 rounded-xl p-1.5 transition-colors"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            )}

            {/* Modal Body */}
            <div className="p-6">
              <div className="flex items-start gap-4">
                {/* Luminous Icon Badge */}
                <div
                  className={cn(
                    'mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border',
                    currentVariant.halo,
                  )}
                >
                  <IconComponent className={cn('h-5 w-5', currentVariant.iconColor)} />
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1 pr-4">
                  <h3
                    id="confirm-dialog-title"
                    className="text-foreground text-base font-semibold leading-snug tracking-tight"
                  >
                    {title}
                  </h3>

                  {description && (
                    <div
                      id="confirm-dialog-description"
                      className="text-muted-foreground mt-1.5 text-xs leading-relaxed"
                    >
                      {description}
                    </div>
                  )}

                  {/* Optional Target Entity / Details Box */}
                  {details && (
                    <div className="bg-muted/40 border-border text-foreground mt-3 break-all rounded-xl border p-3 font-mono text-xs">
                      {details}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="border-border mt-6 flex items-center justify-end gap-2.5 border-t pt-4">
                {!isAlert && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onClose}
                    disabled={isLoading}
                    className="h-9 rounded-xl px-4 text-xs"
                  >
                    {cancelText}
                  </Button>
                )}

                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => {
                    if (isAlert) {
                      onClose();
                    } else if (onConfirm) {
                      void onConfirm();
                    }
                  }}
                  className={cn(
                    'inline-flex h-9 cursor-pointer items-center justify-center rounded-xl px-4 text-xs font-medium transition-all duration-150',
                    'focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50',
                    currentVariant.confirmButtonClass,
                  )}
                >
                  {isLoading ? (
                    <>
                      <Spinner size="sm" className="mr-2 text-current" />
                      Processing...
                    </>
                  ) : (
                    effectiveConfirmText
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
