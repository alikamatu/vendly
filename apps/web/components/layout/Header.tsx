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
  BookOpen,
  BadgePercent,
} from 'lucide-react';
import Container from '../common/Container';
import GlobalSearch from './GlobalSearch';
import UserMenu from './UserMenu';
import NotificationBell from './NotificationBell';
import VerndlyAiIcon from '@/components/ai/VerndlyAiIcon';
import { openVerndlyAi } from '@/lib/ai/open-verndly-ai';
import { useTheme } from '../../lib/contexts/theme';
import { useAuth } from '../../lib/contexts/auth-context';
import { useCart } from '@/lib/contexts/cart-context';
import { useFavorites } from '@/lib/contexts/favorite-context';
import clsx from '@/utils/clsx';

const NAV_LINKS = [
  { label: 'Products', href: '/products', icon: LayoutGrid },
  { label: 'Stores', href: '/stores', icon: Store },
  { label: 'Categories', href: '/categories', icon: Sparkles },
  { label: 'Sell', href: '/sell', icon: BadgePercent },
  { label: 'Guides', href: '/blog', icon: BookOpen },
] as const;

const SPRING_PILL = { type: 'spring' as const, stiffness: 420, damping: 34 };
const EASE_SMOOTH = [0.22, 1, 0.36, 1] as const;

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      aria-label="Toggle theme"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="text-muted hover:bg-surface hover:text-foreground flex h-9 w-9 items-center justify-center rounded-xl transition-colors active:scale-95"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={isDark ? 'moon' : 'sun'}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.15 }}
        >
          {isDark ? <Sun className="h-[17px] w-[17px]" /> : <Moon className="h-[17px] w-[17px]" />}
        </motion.div>
      </AnimatePresence>
    </button>
  );
}

export default function Header() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [menuOpenPath, setMenuOpenPath] = useState<string | null>(null);
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useAuth();
  const { itemCount } = useCart();
  const { favorites } = useFavorites();
  const favCount = favorites?.length || 0;

  // Auto-closes mobile menu on route change without calling setState inside an effect
  const isMobileMenuOpen = menuOpenPath === pathname;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setMenuOpenPath(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleMobileMenu = () => {
    setMenuOpenPath((prev) => (prev === pathname ? null : pathname));
  };

  return (
    <>
      <header className="bg-background sticky top-0 z-40 transition-colors">
        <Container className="py-2.5 sm:py-3">
          <div className="flex h-11 items-center justify-between gap-3">
            {/* Left: Brand */}
            <Link
              href="/"
              className="text-foreground group flex shrink-0 items-center gap-2.5 text-[17px] font-semibold tracking-tight transition-opacity hover:opacity-85 sm:text-lg"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logos/verndly.png"
                alt="Verndly"
                className="h-7 w-7 shrink-0 object-contain transition-transform duration-200 group-hover:scale-105"
              />
              <span>Verndly</span>
            </Link>

            {/* Center: Calm Desktop Navigation with gliding active pill */}
            <nav aria-label="Primary navigation" className="hidden items-center gap-1 lg:flex">
              {NAV_LINKS.map((item) => {
                const isActive =
                  item.href === '/products'
                    ? pathname === '/products'
                    : Boolean(pathname?.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={clsx(
                      'relative rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors',
                      isActive ? 'text-foreground' : 'text-muted hover:text-foreground',
                    )}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="header-nav-pill"
                        transition={SPRING_PILL}
                        className="bg-surface absolute inset-0 rounded-full"
                      />
                    )}
                    <span className="relative z-10">{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Right: Uncluttered Utilities & Auth */}
            <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
              {/* Ask Verndly AI Entry */}
              <button
                type="button"
                onClick={() => openVerndlyAi()}
                aria-label="Ask Verndly AI"
                className="bg-surface text-foreground hover:bg-foreground/[0.08] inline-flex h-9 items-center gap-1.5 rounded-xl px-2.5 text-xs font-semibold transition-colors sm:rounded-full sm:px-3"
              >
                <VerndlyAiIcon size={18} />
                <span className="hidden md:inline">Ask Verndly</span>
              </button>

              {/* Search: Pill on xl+, clean icon button on mobile/tablet/lg so bar never cramps */}
              <button
                type="button"
                onClick={() => setIsSearchOpen(true)}
                aria-label="Search marketplace"
                className="bg-surface text-muted hover:bg-foreground/[0.06] hover:text-foreground flex h-9 w-9 items-center justify-center rounded-xl transition-colors xl:w-52 xl:justify-between xl:rounded-full xl:px-3.5"
              >
                <span className="flex items-center gap-2 truncate">
                  <Search className="h-4 w-4 shrink-0" />
                  <span className="hidden truncate text-xs xl:inline">Search Verndly…</span>
                </span>
                <kbd className="bg-background text-muted hidden rounded-md px-1.5 py-0.5 font-mono text-[10px] font-medium xl:inline-flex">
                  ⌘K
                </kbd>
              </button>

              {/* Favorites (desktop/tablet — lives cleanly inside menu on phones) */}
              <Link
                href="/favorites"
                aria-label="Saved favorites"
                className="text-muted hover:bg-surface hover:text-foreground relative hidden h-9 w-9 items-center justify-center rounded-xl transition-colors sm:flex"
              >
                <Heart className="h-[17px] w-[17px]" />
                {favCount > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-accent)] px-1 text-[9px] font-bold text-white">
                    {favCount > 99 ? '99+' : favCount}
                  </span>
                )}
              </Link>

              {/* Cart */}
              <Link
                href="/cart"
                aria-label="Shopping cart"
                className="text-muted hover:bg-surface hover:text-foreground relative flex h-9 w-9 items-center justify-center rounded-xl transition-colors"
              >
                <ShoppingBag className="h-[17px] w-[17px]" />
                {itemCount > 0 && (
                  <span className="bg-foreground text-background absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold">
                    {itemCount > 99 ? '99+' : itemCount}
                  </span>
                )}
              </Link>

              {/* Theme Toggle (md+ — lives inside menu on mobile) */}
              <div className="hidden md:block">
                <ThemeToggle />
              </div>

              {/* Auth Controls */}
              {!isLoading &&
                (isAuthenticated ? (
                  <div className="ml-0.5 flex items-center gap-1">
                    <div className="hidden sm:block">
                      <NotificationBell />
                    </div>
                    <UserMenu />
                  </div>
                ) : (
                  <div className="ml-1 hidden items-center gap-1.5 sm:flex">
                    <Link
                      href="/login"
                      className="text-muted hover:bg-surface hover:text-foreground inline-flex h-9 items-center rounded-full px-3.5 text-xs font-medium transition-colors"
                    >
                      Sign in
                    </Link>
                    <Link
                      href="/register"
                      className="bg-foreground text-background inline-flex h-9 items-center rounded-full px-4 text-xs font-semibold transition-opacity hover:opacity-90"
                    >
                      Get started
                    </Link>
                  </div>
                ))}

              {/* Mobile Menu Trigger */}
              <button
                type="button"
                onClick={toggleMobileMenu}
                aria-label="Toggle navigation menu"
                aria-expanded={isMobileMenuOpen}
                className="bg-surface text-foreground hover:bg-foreground/[0.08] ml-0.5 flex h-9 w-9 items-center justify-center rounded-xl transition-colors lg:hidden"
              >
                {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </Container>

        {/* Smooth Mobile Drawer Panel — flat tonal, zero borders, zero shadows */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: EASE_SMOOTH }}
              className="bg-background overflow-hidden lg:hidden"
            >
              <Container className="space-y-4 pb-5 pt-2">
                {/* Mobile Search & Verndly AI Shortcuts */}
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpenPath(null);
                      openVerndlyAi();
                    }}
                    className="bg-foreground text-background flex w-full items-center justify-between gap-2.5 rounded-2xl px-4 py-3 text-left text-xs font-semibold transition-opacity hover:opacity-90"
                  >
                    <span className="flex items-center gap-2.5">
                      <VerndlyAiIcon size={18} />
                      <span>Ask Verndly AI</span>
                    </span>
                    <span className="text-[10px] opacity-75">Shop with AI</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpenPath(null);
                      setIsSearchOpen(true);
                    }}
                    className="bg-surface text-muted hover:text-foreground flex w-full items-center gap-2.5 rounded-2xl px-4 py-3 text-left text-xs transition-colors"
                  >
                    <Search className="h-4 w-4 shrink-0" />
                    <span>Search products, stores, brands…</span>
                  </button>
                </div>

                {/* Mobile Navigation Grid */}
                <nav aria-label="Mobile navigation" className="grid grid-cols-2 gap-2">
                  {NAV_LINKS.map((item) => {
                    const Icon = item.icon;
                    const isActive =
                      item.href === '/products'
                        ? pathname === '/products'
                        : Boolean(pathname?.startsWith(item.href));
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMenuOpenPath(null)}
                        className={clsx(
                          'flex items-center gap-2.5 rounded-2xl px-3.5 py-3 text-xs font-semibold transition-colors',
                          isActive
                            ? 'bg-foreground text-background'
                            : 'bg-surface text-foreground hover:bg-foreground/[0.06]',
                        )}
                      >
                        <Icon
                          className={clsx(
                            'h-4 w-4 shrink-0',
                            isActive ? 'text-background' : 'text-muted',
                          )}
                        />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}

                  <Link
                    href="/favorites"
                    onClick={() => setMenuOpenPath(null)}
                    className={clsx(
                      'flex items-center justify-between gap-2 rounded-2xl px-3.5 py-3 text-xs font-semibold transition-colors',
                      pathname === '/favorites'
                        ? 'bg-foreground text-background'
                        : 'bg-surface text-foreground hover:bg-foreground/[0.06]',
                    )}
                  >
                    <span className="flex items-center gap-2.5">
                      <Heart
                        className={clsx(
                          'h-4 w-4 shrink-0',
                          pathname === '/favorites' ? 'text-background' : 'text-muted',
                        )}
                      />
                      <span>Favorites</span>
                    </span>
                    {favCount > 0 && (
                      <span className="rounded-full bg-[var(--color-accent)] px-1.5 py-0.5 text-[10px] font-bold text-white">
                        {favCount}
                      </span>
                    )}
                  </Link>
                </nav>

                {/* Guest Auth CTAs on Mobile */}
                {!isLoading && !isAuthenticated && (
                  <div className="grid grid-cols-2 gap-2 sm:hidden">
                    <Link
                      href="/login"
                      onClick={() => setMenuOpenPath(null)}
                      className="bg-surface text-foreground hover:bg-foreground/[0.06] flex h-11 items-center justify-center rounded-2xl text-xs font-semibold transition-colors"
                    >
                      Sign in
                    </Link>
                    <Link
                      href="/register"
                      onClick={() => setMenuOpenPath(null)}
                      className="bg-foreground text-background flex h-11 items-center justify-center rounded-2xl text-xs font-semibold transition-opacity hover:opacity-90"
                    >
                      Get started
                    </Link>
                  </div>
                )}

                {/* Appearance Row */}
                <div className="bg-surface flex items-center justify-between rounded-2xl px-4 py-2 text-xs">
                  <span className="text-muted font-medium">Appearance</span>
                  <ThemeToggle />
                </div>
              </Container>
            </motion.div>
          )}
        </AnimatePresence>

        <GlobalSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      </header>
    </>
  );
}
