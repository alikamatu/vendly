'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import clsx from '@/utils/clsx';

const MotionDiv = motion.div as any;
const MotionButton = motion.button as any;

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  showClose?: boolean;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  actions,
  className,
  showClose = true,
}: ModalProps) {
  // Prevent body scrolling while modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          {/* Solid dark/60 Backdrop (No blur for high-speed rendering) */}
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            aria-hidden="true"
            className="fixed inset-0 bg-black/60"
          />

          {/* Modal Pop-up Card */}
          <MotionDiv
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className={clsx(
              'relative z-10 w-full max-w-lg rounded-3xl bg-background dark:bg-[#121212] p-6 sm:p-8 border border-border/80 shadow-2xl',
              'max-h-[90vh] overflow-y-auto no-scrollbar',
              className
            )}
          >
            {/* Header */}
            {(title || showClose) && (
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  {title && (
                    <h3 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground">
                      {title}
                    </h3>
                  )}
                  {description && (
                    <p className="mt-1 text-xs sm:text-sm text-foreground/60 leading-relaxed">
                      {description}
                    </p>
                  )}
                </div>

                {showClose && (
                  <MotionButton
                    type="button"
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.92 }}
                    onClick={onClose}
                    aria-label="Close modal"
                    className="shrink-0 p-2 rounded-xl bg-surface/80 hover:bg-surface text-foreground/50 hover:text-foreground transition-colors"
                  >
                    <X size={18} />
                  </MotionButton>
                )}
              </div>
            )}

            {/* Content Body */}
            <div className="relative">{children}</div>

            {/* Responsive Actions Footer */}
            {actions && (
              <div className="mt-6 pt-2 flex items-center justify-end gap-2.5">
                {actions}
              </div>
            )}
          </MotionDiv>
        </div>
      )}
    </AnimatePresence>
  );
}
