'use client';

import React from 'react';
import Link from 'next/link';
import AuthVideoPanel from '@/components/auth/AuthVideoPanel';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background text-foreground selection:bg-foreground/10 relative flex min-h-[100svh] w-full">
      {/* Left column: header and centered form */}
      <div className="relative z-10 flex min-h-[100svh] w-full flex-col justify-between px-6 py-6 pb-16 sm:px-10 sm:py-8 lg:w-1/2 lg:px-12 lg:pr-20 xl:pl-16 xl:pr-28">
        <header className="flex h-10 items-center">
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
        </header>

        <main className="my-auto flex flex-1 items-center justify-center py-10 lg:justify-end">
          <div className="w-full max-w-[380px]">{children}</div>
        </main>
      </div>

      {/* Right column: stacked feature clips */}
      <AuthVideoPanel />

      <footer className="text-foreground/40 absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center gap-5 text-xs">
        <Link href="/terms" className="hover:text-foreground/70 transition-colors">
          Terms
        </Link>
        <Link href="/privacy" className="hover:text-foreground/70 transition-colors">
          Privacy
        </Link>
        <a href="mailto:support@verndly.com" className="hover:text-foreground/70 transition-colors">
          Help
        </a>
      </footer>
    </div>
  );
}
