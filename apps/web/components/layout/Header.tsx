'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  ShoppingBag,
  Heart,
  Sun,
  Moon,
  Menu,
  X,
  Sparkles,
  LayoutGrid,
  Store,
  Tag,
  ArrowRight,
  BookOpen,
  BadgePercent,
} from 'lucide-react';
import Container from '../common/Container';
import Button from '../ui/Button';
import GlobalSearch from './GlobalSearch';
import UserMenu from './UserMenu';
import NotificationBell from './NotificationBell';
import { useTheme } from '../../lib/contexts/theme';
import { useAuth } from '../../lib/contexts/auth-context';
import { useCart } from '@/lib/contexts/cart-context';
import { useFavorites } from '@/lib/contexts/favorite-context';
import clsx from '@/utils/clsx';

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      aria-label="Toggle theme"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="text-muted hover:text-foreground hover:bg-surface hover:border-border/60 rounded-xl border border-transparent p-2 transition-all active:scale-95"
    >
      <motion.div
        key={isDark ? 'moon' : 'sun'}
        initial={{ rotate: -20, opacity: 0 }}
        animate={{ rotate: 0, opacity: 1 }}
        exit={{ rotate: 20, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        {isDark ? <Moon size={18} /> : <Sun size={18} />}
      </motion.div>
    </button>
  );
}

export default function Header() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useAuth();
  const { itemCount } = useCart();
  const { favorites } = useFavorites();
  const favCount = favorites?.length || 0;

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

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const navLinks = [
    { label: 'Products', href: '/products', icon: LayoutGrid },
    { label: 'Stores', href: '/stores', icon: Store },
    { label: 'Categories', href: '/categories', icon: Sparkles },
    { label: 'Sell', href: '/sell', icon: BadgePercent },
    { label: 'Guides', href: '/blog', icon: BookOpen },
  ];

  return (
    <>
      <header className="border-border/60 bg-background sticky top-0 z-40 border-b transition-colors">
        <Container className="py-3 md:py-3.5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              <Link
                href="/"
                className="text-foreground flex shrink-0 items-center gap-2.5 text-lg font-bold tracking-tight transition-opacity hover:opacity-90 sm:text-xl"
              >
                <img
                  src="/logos/verndly.png"
                  alt="Verndly"
                  className="h-7 w-7 object-contain transition-transform group-hover:scale-105"
                />
                <span>Verndly</span>
              </Link>

              <nav className="ml-2 hidden items-center gap-1 lg:flex">
                {navLinks.map((item) => {
                  const isActive =
                    item.href === '/products'
                      ? pathname === '/products'
                      : pathname?.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={clsx(
                        'rounded-xl px-3 py-1.5 text-xs font-semibold tracking-tight transition-colors',
                        isActive
                          ? 'text-foreground bg-surface'
                          : 'text-muted hover:text-foreground hover:bg-surface/50',
                      )}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="mx-2 hidden max-w-sm flex-1 md:flex lg:max-w-md">
              <button
                type="button"
                onClick={() => setIsSearchOpen(true)}
                className="border-border/70 bg-surface/50 text-muted hover:border-border hover:bg-surface hover:text-foreground group flex w-full items-center justify-between gap-2 rounded-2xl border px-3.5 py-2 text-xs transition-all"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <Search className="text-muted group-hover:text-foreground h-4 w-4 shrink-0 transition-colors" />
                  <span className="truncate text-xs">Search products, stores, brands…</span>
                </div>
                <kbd className="border-border bg-background/80 text-muted hidden items-center gap-0.5 rounded-md border px-1.5 py-0.5 font-mono text-[10px] sm:inline-flex">
                  ⌘K
                </kbd>
              </button>
            </div>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => setIsSearchOpen(true)}
                aria-label="Search marketplace"
                className="text-muted hover:text-foreground hover:bg-surface rounded-xl p-2 transition-colors md:hidden"
              >
                <Search size={18} />
              </button>

              <Link
                href="/favorites"
                aria-label="My saved favorites"
                className="text-muted hover:text-foreground hover:bg-surface relative rounded-xl p-2 transition-colors"
              >
                <Heart size={18} />
                {favCount > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white shadow-sm">
                    {favCount > 99 ? '99+' : favCount}
                  </span>
                )}
              </Link>

              <Link
                href="/cart"
                aria-label="Shopping Cart"
                className="text-muted hover:text-foreground hover:bg-surface relative rounded-xl p-2 transition-colors"
              >
                <ShoppingBag size={18} />
                {itemCount > 0 && (
                  <span className="bg-foreground text-background absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold shadow-sm">
                    {itemCount > 99 ? '99+' : itemCount}
                  </span>
                )}
              </Link>

              <div className="hidden sm:block">
                <ThemeToggle />
              </div>

              <div className="border-border/60 flex items-center gap-2 border-l pl-1 sm:pl-2">
                {!isLoading &&
                  (isAuthenticated ? (
                    <>
                      <NotificationBell />
                      <UserMenu />
                    </>
                  ) : (
                    <>
                      <Link href="/login" className="hidden sm:inline-block">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 px-3 text-xs font-semibold"
                        >
                          Sign in
                        </Button>
                      </Link>
                      <Link href="/register">
                        <Button
                          variant="primary"
                          size="sm"
                          className="h-9 rounded-xl px-3.5 text-xs font-semibold shadow-sm sm:px-4"
                        >
                          Get started
                        </Button>
                      </Link>
                    </>
                  ))}
              </div>

              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label="Toggle navigation menu"
                className="text-muted hover:text-foreground hover:bg-surface ml-1 rounded-xl p-2 transition-colors lg:hidden"
              >
                {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </Container>

        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-border bg-background space-y-3 border-t px-4 py-4 lg:hidden"
            >
              <nav className="grid grid-cols-2 gap-2">
                {navLinks.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname?.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={clsx(
                        'flex items-center gap-2 rounded-xl border p-2.5 text-xs font-semibold transition-colors',
                        isActive
                          ? 'border-foreground bg-foreground/5 text-foreground'
                          : 'border-border/60 bg-surface/40 text-muted hover:text-foreground',
                      )}
                    >
                      <Icon className="text-muted h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>

              <div className="border-border/50 text-muted flex items-center justify-between border-t pt-2 text-xs">
                <span>Dark / Light Mode</span>
                <ThemeToggle />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <GlobalSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      </header>
    </>
  );
}
