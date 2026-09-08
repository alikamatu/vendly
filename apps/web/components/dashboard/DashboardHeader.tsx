'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu,
  Search,
  ExternalLink,
  Sun,
  Moon,
  ChevronRight,
  Store,
} from 'lucide-react';
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

export default function DashboardHeader({
  title,
  onMenuToggle,
}: DashboardHeaderProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const isDark = theme === 'dark';

  // Global hotkey: ⌘K or Ctrl+K opens the in-dashboard search
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
      <header className="sticky top-0 z-40 flex h-16 md:h-18 w-full items-center justify-between border-b border-border/60 bg-background px-4 md:px-8 transition-colors">
        {/* Left: Mobile Drawer Trigger + Breadcrumbs */}
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={onMenuToggle}
            aria-label="Open sidebar navigation"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 bg-surface/50 text-muted transition-colors hover:border-border hover:bg-surface hover:text-foreground active:scale-95 lg:hidden"
          >
            <Menu className="h-4 w-4" />
          </button>

          <div className="flex min-w-0 items-center gap-2">
            <Link
              href="/dashboard"
              className="group hidden sm:flex items-center gap-2 rounded-xl p-1 text-muted hover:text-foreground transition-colors"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-border/60 bg-surface text-primary">
                <Store className="h-3.5 w-3.5" />
              </div>
              {storeName ? (
                <span className="max-w-[140px] truncate text-xs font-medium text-foreground">
                  {storeName}
                </span>
              ) : (
                <span className="text-xs font-medium text-foreground">Seller Hub</span>
              )}
            </Link>

            <span className="hidden sm:inline-block text-border text-xs">/</span>

            <h1 className="truncate text-xs sm:text-sm font-semibold tracking-tight text-foreground">
              {title}
            </h1>
          </div>
        </div>

        {/* Center: In-Dashboard Search Pill (⌘K) */}
        <div className="flex-1 max-w-xs md:max-w-md mx-3">
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            className="group flex w-full items-center justify-between gap-2 rounded-2xl border border-border/60 bg-surface/40 px-3 py-1.5 md:py-2 text-xs text-muted transition-all hover:border-border hover:bg-surface hover:text-foreground"
          >
            <div className="flex items-center gap-2 truncate">
              <Search className="h-3.5 w-3.5 shrink-0 text-muted group-hover:text-foreground transition-colors" />
              <span className="truncate text-[11px] sm:text-xs">
                Search products, orders, settings...
              </span>
            </div>
            <kbd className="hidden sm:inline-flex items-center rounded-md border border-border/60 bg-background/80 px-1.5 py-0.5 font-mono text-[9px] font-medium text-muted">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right: Operational Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* View Public Storefront Link */}
          {storeLink && (
            <Link
              href={`/s/${storeLink}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:inline-flex items-center gap-1.5 rounded-xl border border-border/60 bg-surface/30 px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-border hover:bg-surface hover:text-foreground"
              title="Open public storefront in new tab"
            >
              <span>View Store</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
          )}

          {/* Notifications Bell */}
          <NotificationBell />

          {/* Theme Switcher */}
          <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            aria-label="Toggle theme"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-transparent text-muted transition-colors hover:border-border/60 hover:bg-surface hover:text-foreground active:scale-95"
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

          <div className="hidden sm:block h-5 w-[1px] bg-border/60 mx-1" />

          {/* User Menu */}
          <UserMenu />
        </div>
      </header>

      {/* In-Dashboard Search Modal */}
      <DashboardSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    </>
  );
}
