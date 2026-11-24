'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, Search, ExternalLink, Sun, Moon, Store } from 'lucide-react';
import { useTheme } from '@/lib/contexts/theme';
import { useAuth } from '@/lib/contexts/auth-context';
import UserMenu from '../layout/UserMenu';
import NotificationBell from '../layout/NotificationBell';
import DashboardSearchModal from './DashboardSearchModal';

interface DashboardHeaderProps {
  title: string;
  onMenuToggle?: () => void;
  hidePrimaryNav?: boolean;
}

export default function DashboardHeader({ title, onMenuToggle }: DashboardHeaderProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const isDark = theme === 'dark';

  // Global hotkey: ⌘K or Ctrl+K opens in-dashboard search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const storeLink = user?.seller_profile?.store_link;
  const storeName = user?.seller_profile?.store_name;

  return (
    <>
      <header className="bg-background sticky top-0 z-30 flex h-14 w-full items-center justify-between gap-2 px-4 sm:h-16 sm:px-6 lg:px-8">
        {/* Left: Mobile Menu Trigger + Title / Breadcrumb */}
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={onMenuToggle}
            aria-label="Open sidebar navigation"
            className="bg-surface text-foreground hover:bg-foreground/[0.08] flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors active:scale-95 lg:hidden"
          >
            <Menu className="h-4 w-4" />
          </button>

          <div className="flex min-w-0 items-center gap-2">
            <Link
              href="/dashboard"
              className="text-muted hover:text-foreground hidden items-center gap-2 rounded-xl py-1 transition-colors md:flex"
            >
              <div className="bg-surface text-foreground flex h-7 w-7 shrink-0 items-center justify-center rounded-lg">
                <Store className="h-3.5 w-3.5" />
              </div>
              <span className="text-foreground max-w-[140px] truncate text-xs font-medium">
                {storeName || 'Seller Hub'}
              </span>
            </Link>

            <span className="text-muted/40 hidden text-xs md:inline-block">/</span>

            <h1 className="text-foreground truncate text-sm font-semibold tracking-tight sm:text-[15px]">
              {title}
            </h1>
          </div>
        </div>

        {/* Center: Search Bar (sm+ pill; compact icon button on mobile so header never cramps) */}
        <div className="hidden flex-1 justify-center px-4 sm:flex">
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            className="bg-surface text-muted hover:bg-foreground/[0.06] hover:text-foreground group flex w-full max-w-md items-center justify-between gap-2 rounded-2xl px-3.5 py-2 text-xs transition-colors"
          >
            <span className="flex items-center gap-2 truncate">
              <Search className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Search products, orders, settings…</span>
            </span>
            <kbd className="bg-background text-muted hidden items-center rounded-lg px-1.5 py-0.5 font-mono text-[10px] font-medium md:inline-flex">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {/* Mobile Search Trigger */}
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            aria-label="Search dashboard"
            className="bg-surface text-muted hover:text-foreground flex h-9 w-9 items-center justify-center rounded-xl transition-colors sm:hidden"
          >
            <Search className="h-4 w-4" />
          </button>

          {/* Public Storefront Link */}
          {storeLink && (
            <Link
              href={`/s/${storeLink}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-surface text-muted hover:bg-foreground/[0.06] hover:text-foreground hidden items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-colors md:inline-flex"
              title="Open public storefront in new tab"
            >
              <span>View Store</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
          )}

          <NotificationBell />

          <button
            type="button"
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            aria-label="Toggle theme"
            className="text-muted hover:bg-surface hover:text-foreground flex h-9 w-9 items-center justify-center rounded-xl transition-colors active:scale-95"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={theme}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15 }}
              >
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </motion.div>
            </AnimatePresence>
          </button>

          <UserMenu />
        </div>
      </header>

      <DashboardSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
}
