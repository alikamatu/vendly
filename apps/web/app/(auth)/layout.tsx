'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/lib/contexts/theme';
import AuthVideoPanel from '@/components/auth/AuthVideoPanel';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="bg-background text-foreground selection:bg-foreground/10 relative flex min-h-[100svh] w-full">
      {/* Left column: header, centered form, quiet footer */}
      <div className="relative z-10 flex min-h-[100svh] w-full flex-col justify-between px-6 py-6 sm:px-10 sm:py-8 lg:w-[46%] lg:px-14 xl:w-[44%] xl:px-20">
        <header className="flex h-10 items-center justify-between">
          <Link
            href="/"
            aria-label="Verndly home"
            className="focus-visible:ring-foreground/20 inline-flex items-center gap-2 rounded-lg outline-none transition-opacity hover:opacity-80 focus-visible:ring-2"
          >
            <img src="/logos/verndly.png" alt="" className="h-7 w-7 object-contain" />
            <span className="text-foreground text-[15px] font-semibold tracking-tight">
              Verndly
            </span>
          </Link>

          <button
            type="button"
            aria-label="Toggle theme"
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="border-border/60 bg-surface/70 text-foreground/60 hover:border-foreground/25 hover:text-foreground grid h-9 w-9 place-items-center rounded-full border transition-all active:scale-95"
          >
            <motion.span
              key={isDark ? 'moon' : 'sun'}
              initial={{ rotate: -30, opacity: 0, scale: 0.8 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 350, damping: 20 }}
            >
              {isDark ? <Moon size={15} /> : <Sun size={15} />}
            </motion.span>
          </button>
        </header>

        <main className="my-auto flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[380px]">{children}</div>
        </main>

        <footer className="text-foreground/40 flex items-center justify-center gap-5 text-xs">
          <Link href="/terms" className="hover:text-foreground/70 transition-colors">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-foreground/70 transition-colors">
            Privacy
          </Link>
          <a
            href="mailto:support@verndly.app"
            className="hover:text-foreground/70 transition-colors"
          >
            Help
          </a>
        </footer>
      </div>

      {/* Right column: full-height video occupying the entire right screen */}
      <AuthVideoPanel />
    </div>
  );
}
