"use client";

import React, { useEffect } from "react";
import { AnimatePresence, motion, HTMLMotionProps } from "framer-motion";
import { X } from "lucide-react";
import FiltersPanel from "./FiltersPanel";
import type { ProductsBrowserState } from "@/hooks/useProductsBrowser";
import type { HomeCategory } from "@/hooks/useHomeData";

interface MobileFilterDrawerProps {
  open: boolean;
  onClose: () => void;
  state: ProductsBrowserState;
  categories: HomeCategory[];
  brands: string[];
}

export default function MobileFilterDrawer({
  open,
  onClose,
  state,
  categories,
  brands,
}: MobileFilterDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          {...({
            initial: { opacity: 0 },
            animate: { opacity: 1 },
            exit: { opacity: 0 },
            onClick: onClose,
            className:
              "fixed inset-0 z-[70] flex items-end bg-black/45 backdrop-blur-sm lg:hidden",
          } as HTMLMotionProps<"div">)}
        >
          <motion.div
            {...({
              initial: { y: "100%" },
              animate: { y: 0 },
              exit: { y: "100%" },
              transition: { type: "spring", stiffness: 320, damping: 32 },
              onClick: (e: React.MouseEvent) => e.stopPropagation(),
              className:
                "w-full max-h-[90vh] bg-[var(--color-background)] rounded-t-3xl border-t border-[var(--color-border)] overflow-hidden flex flex-col",
              role: "dialog",
              "aria-modal": true,
              "aria-label": "Filters",
            } as HTMLMotionProps<"div">)}
          >
            <header className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-[var(--color-border)]/60">
              <div className="flex items-center gap-3">
                <span className="block w-10 h-1 rounded-full bg-[var(--color-border)] absolute left-1/2 -translate-x-1/2 top-2" />
                <h2 className="text-sm font-black tracking-tight text-[var(--color-foreground)]">
                  Filters
                </h2>
              </div>
              <button
                onClick={onClose}
                aria-label="Close filters"
                className="p-2 rounded-xl text-[var(--color-muted)] hover:bg-[var(--color-surface)]"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              <FiltersPanel state={state} categories={categories} brands={brands} compact />
            </div>

            <footer className="flex items-center gap-2 px-5 py-3 border-t border-[var(--color-border)]/60 bg-[var(--color-surface)]">
              <button
                onClick={state.clearAll}
                className="flex-1 h-11 rounded-xl border border-[var(--color-border)] text-[12px] font-black uppercase tracking-wider text-[var(--color-foreground)] hover:bg-[var(--color-background)] transition-colors"
              >
                Reset
              </button>
              <button
                onClick={onClose}
                className="flex-[2] h-11 rounded-xl bg-[var(--color-foreground)] text-[var(--color-background)] text-[12px] font-black uppercase tracking-wider hover:opacity-90 transition-opacity"
              >
                Show {state.meta.total} results
              </button>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
