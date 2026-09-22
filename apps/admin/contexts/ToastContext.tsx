'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  description?: string;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (toast: Omit<Toast, 'id'>) => string;
  success: (message: string, description?: string) => string;
  error: (message: string, description?: string) => string;
  warning: (message: string, description?: string) => string;
  info: (message: string, description?: string) => string;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    ({ type, message, description, duration = 4000 }: Omit<Toast, 'id'>) => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const newToast: Toast = { id, type, message, description, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          dismissToast(id);
        }, duration);
      }

      return id;
    },
    [dismissToast],
  );

  const success = useCallback(
    (message: string, description?: string) => showToast({ type: 'success', message, description }),
    [showToast],
  );

  const error = useCallback(
    (message: string, description?: string) =>
      showToast({ type: 'error', message, description, duration: 6000 }),
    [showToast],
  );

  const warning = useCallback(
    (message: string, description?: string) =>
      showToast({ type: 'warning', message, description, duration: 5000 }),
    [showToast],
  );

  const info = useCallback(
    (message: string, description?: string) => showToast({ type: 'info', message, description }),
    [showToast],
  );

  return (
    <ToastContext.Provider
      value={{ toasts, showToast, success, error, warning, info, dismissToast }}
    >
      {children}
      {/* Toast container */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-5 right-5 z-[9999] flex w-full max-w-sm flex-col gap-2 px-4 sm:px-0"
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => {
            const icons = {
              success: <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />,
              error: <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />,
              warning: <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />,
              info: <Info className="h-4 w-4 shrink-0 text-blue-500" />,
            };

            return (
              <motion.div
                key={toast.id}
                layout
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
                className="bg-card border-border pointer-events-auto flex items-start gap-3 rounded-xl border p-3.5 text-[13px] shadow-lg backdrop-blur-md"
              >
                <div className="pt-0.5">{icons[toast.type]}</div>
                <div className="min-w-0 flex-1">
                  <p className="text-foreground font-medium leading-tight">{toast.message}</p>
                  {toast.description && (
                    <p className="text-muted-foreground mt-1 text-[12px] leading-normal">
                      {toast.description}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => dismissToast(toast.id)}
                  className="text-muted-foreground hover:text-foreground -mr-1 p-0.5 transition-colors"
                  aria-label="Dismiss notification"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
