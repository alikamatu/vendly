"use client";

import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import clsx from "@/utils/clsx";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  showClose?: boolean;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  className,
  showClose = true,
}: ModalProps) {
  // Prevent scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            {...({
              initial: { opacity: 0 },
              animate: { opacity: 1 },
              exit: { opacity: 0 },
              onClick: onClose,
              className: "fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm",
            } as any)}
          />

          {/* Modal Container */}
          <div className="fixed inset-0 z-[101] flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-none">
            <motion.div
              initial={{ y: "100%", opacity: 0.5 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0.5 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className={clsx(
                "relative w-full max-w-lg bg-background rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 sm:p-8 shadow-2xl pointer-events-auto",
                "max-h-[90vh] overflow-y-auto custom-scrollbar",
                className
              )}
            >
              {/* Header */}
              {(title || showClose) && (
                <div className="flex items-center justify-between mb-6 sticky top-0 bg-background z-10 pt-2 pb-2">
                  {title ? (
                    <h2 className="text-xl font-black uppercase tracking-tight text-foreground">
                      {title}
                    </h2>
                  ) : <div />}
                  {showClose && (
                    <button
                      onClick={onClose}
                      className="p-2 rounded-xl bg-surface hover:bg-border/40 transition-colors text-muted hover:text-foreground"
                    >
                      <X size={20} />
                    </button>
                  )}
                </div>
              )}

              {/* Content */}
              <div className="relative">
                {children}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
