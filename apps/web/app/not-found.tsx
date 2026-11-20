'use client';

import { motion } from 'framer-motion';
import { ArrowLeft, Search } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center p-6 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative mb-8"
      >
        <div className="absolute inset-0 rounded-full bg-red-500/20"></div>
        <div className="bg-surface border-border/50 relative w-[200px] rounded-[2.5rem] border p-8 shadow-2xl">
          <Search className="text-primary mx-auto mb-4 h-12 w-12 opacity-20" />
          <h1 className="text-md text-foreground font-medium uppercase tracking-tight">404</h1>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mx-auto max-w-xs space-y-4"
      >
        <h2 className="text-md text-foreground font-normal">Lost in the marketplace?</h2>
        <p className="text-muted text-xs font-medium leading-relaxed">
          The page you're looking for doesn't exist or has been moved to a different stall.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-10 flex w-full max-w-xs flex-col gap-3 sm:flex-row"
      >
        <button
          onClick={() => window.history.back()}
          className="text-muted hover:text-foreground flex flex-1 items-center justify-center gap-2 px-6 py-3.5 text-xs font-normal transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Go Back
        </button>
      </motion.div>
    </div>
  );
}
