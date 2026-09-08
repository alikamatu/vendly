'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/lib/contexts/theme';
import AmbientBackground from '@/components/ui/AmbientBackground';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="relative min-h-screen bg-background text-foreground selection:bg-secondary/20 overflow-x-hidden">
      {/* Ambient background with visible SVG grid */}
      <AmbientBackground />

      {/* Floating Theme Toggle */}
      <div className="fixed top-5 right-6 z-50">
        <button
          type="button"
          aria-label="Toggle theme"
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          className="rounded-full border border-border/80 bg-surface p-2.5 transition-all hover:border-foreground/30 hover:bg-surface active:scale-95 shadow-xs"
        >
          <motion.div
            key={isDark ? 'moon' : 'sun'}
            initial={{ rotate: -30, opacity: 0, scale: 0.8 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 350, damping: 20 }}
            className="text-foreground/80 hover:text-foreground"
          >
            {isDark ? <Moon size={16} /> : <Sun size={16} />}
          </motion.div>
        </button>
      </div>

      {/* Main viewport */}
      <main className="relative z-10 w-full min-h-screen">
        {children}
      </main>
    </div>
  );
}