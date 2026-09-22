'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { type ReactNode } from 'react';

/**
 * Animated dot-grid background pattern — subtle, Google AI-inspired.
 * Uses CSS animation instead of Framer Motion for better performance.
 */
function DotGridBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      {/* Base gradient */}
      <div className="bg-background absolute inset-0" />

      {/* Dot grid pattern */}
      <svg
        className="absolute inset-0 h-full w-full opacity-[0.35] dark:opacity-[0.15]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="dot-grid" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="currentColor" className="text-muted-foreground/40" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dot-grid)" />
      </svg>

      {/* Radial gradient overlay — creates a soft vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 40%, transparent 40%, var(--background) 100%)',
        }}
      />

      {/* Animated accent glow — very subtle */}
      <motion.div
        className="absolute left-1/2 top-1/4 h-[600px] w-[600px] -translate-x-1/2 rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.04) 0%, transparent 70%)',
        }}
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.5, 0.8, 0.5],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    </div>
  );
}

/**
 * Floating geometric shapes — adds visual depth without being distracting.
 */
function FloatingShapes() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      {/* Shape 1 — top-right circle */}
      <motion.div
        className="border-border absolute -right-20 -top-20 h-64 w-64 rounded-full border"
        animate={{ rotate: 360 }}
        transition={{ duration: 120, repeat: Infinity, ease: 'linear' }}
      />

      {/* Shape 2 — bottom-left ring */}
      <motion.div
        className="border-border absolute -bottom-32 -left-32 h-96 w-96 rounded-full border"
        animate={{ rotate: -360 }}
        transition={{ duration: 150, repeat: Infinity, ease: 'linear' }}
      />

      {/* Shape 3 — small accent square */}
      <motion.div
        className="border-border/50 absolute right-[15%] top-1/3 hidden h-8 w-8 rounded-[var(--radius-md)] border lg:block"
        animate={{
          y: [0, -12, 0],
          rotate: [0, 45, 0],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Shape 4 — floating diamond */}
      <motion.div
        className="border-border/40 absolute bottom-1/4 left-[12%] hidden h-6 w-6 rotate-45 rounded-sm border lg:block"
        animate={{
          y: [0, -8, 0],
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 1,
        }}
      />
    </div>
  );
}

export default function AuthLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-8 sm:px-6">
      <DotGridBackground />
      <FloatingShapes />

      {/* Auth content — centered, animated */}
      <AnimatePresence mode="wait">
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="w-full max-w-[400px]"
        >
          {children}
        </motion.div>
      </AnimatePresence>

      {/* Footer */}
      <div className="mt-8 text-center">
        <p className="text-muted-foreground/60 text-[11px]">
          © {new Date().getFullYear()} Vendly. All rights reserved.
        </p>
      </div>
    </div>
  );
}
