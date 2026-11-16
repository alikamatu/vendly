'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface AuthPageShellProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Optional contextual action rendered above the heading (e.g. "Back"). */
  topRight?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Form wrapper inside the left column of the centered auth stage.
 */
export default function AuthPageShell({ title, subtitle, topRight, children }: AuthPageShellProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="w-full"
    >
      {topRight && <div className="mb-6 flex items-center">{topRight}</div>}

      {(title || subtitle) && (
        <div className="mb-7 space-y-1.5 text-center">
          {title && (
            <h1 className="text-foreground text-[26px] font-semibold leading-tight tracking-[-0.02em] sm:text-[30px]">
              {title}
            </h1>
          )}
          {subtitle && <p className="text-foreground/55 text-sm">{subtitle}</p>}
        </div>
      )}

      {children}
    </motion.div>
  );
}

/** Thin "or" divider used between OAuth and email forms. */
export function AuthDivider({ label = 'or' }: { label?: string }) {
  return (
    <div className="text-foreground/35 my-5 flex items-center gap-4 text-xs">
      <div className="bg-border/70 h-px flex-1" />
      <span>{label}</span>
      <div className="bg-border/70 h-px flex-1" />
    </div>
  );
}
