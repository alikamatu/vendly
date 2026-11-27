'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  ChevronDown,
  ShieldCheck,
  BadgePercent,
} from 'lucide-react';
import Container from '../common/Container';
import GlobalSearch from './GlobalSearch';
import UserMenu from './UserMenu';
import NotificationBell from './NotificationBell';
import NavbarMegaMenu, { type MegaMenuTab } from './NavbarMegaMenu';
import NavbarMobileDrawer from './NavbarMobileDrawer';
import { useNavbarCatalog } from './useNavbarCatalog';
import VerndlyAiIcon from '@/components/ai/VerndlyAiIcon';
import { openVerndlyAi } from '@/lib/ai/open-verndly-ai';
import { useTheme } from '../../lib/contexts/theme';
import { useAuth } from '../../lib/contexts/auth-context';
import { useCart } from '@/lib/contexts/cart-context';
import { useFavorites } from '@/lib/contexts/favorite-context';
import { recordShoppingHabit } from '@/lib/cookies/shopping-habits';
import clsx from '@/utils/clsx';

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
  const [activeMegaTab, setActiveMegaTab] = useState<MegaMenuTab>(null);
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { itemCount } = useCart();
  const { favorites } = useFavorites();
  const favCount = favorites?.length || 0;

  const headerRef = useRef<HTMLElement | null>(null);
  const closeTimerRef = useRef<number | null>(null);

  // Auto-closes mobile menu on route change without setState inside an effect
  const isMobileMenuOpen = menuOpenPath === pathname;

  const { categories, recommendedProducts, recommendationHeadline, isPersonalized } =
    useNavbarCatalog(Boolean(activeMegaTab) || isMobileMenuOpen);

  // Keep `--navbar-bottom` CSS variable synced so mega-menu aligns flush below sticky header
  const syncNavbarBottom = useCallback(() => {
    if (!headerRef.current) return;
    const rect = headerRef.current.getBoundingClientRect();
    document.documentElement.style.setProperty('--navbar-bottom', `${Math.round(rect.bottom)}px`);
  }, []);

  useEffect(() => {
    syncNavbarBottom();
    window.addEventListener('resize', syncNavbarBottom);
    return () => window.removeEventListener('resize', syncNavbarBottom);
  }, [syncNavbarBottom, activeMegaTab]);

  // Close desktop mega-menu when navigating to a new route
  const [megaTabPath, setMegaTabPath] = useState<string | null>(null);
  const effectiveMegaTab: MegaMenuTab = megaTabPath === pathname ? activeMegaTab : null;

  const cancelScheduledClose = useCallback(() => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const openMegaTab = useCallback(
    (tab: MegaMenuTab) => {
      cancelScheduledClose();
      syncNavbarBottom();
      setMegaTabPath(pathname);
      setActiveMegaTab(tab);
    },
    [cancelScheduledClose, pathname, syncNavbarBottom],
  );

  const scheduleMegaClose = useCallback(() => {
    cancelScheduledClose();
    closeTimerRef.current = window.setTimeout(() => {
      setActiveMegaTab(null);
    }, 170);
  }, [cancelScheduledClose]);

  const closeMegaNow = useCallback(() => {
    cancelScheduledClose();
    setActiveMegaTab(null);
  }, [cancelScheduledClose]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        closeMegaNow();
        setIsSearchOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setMenuOpenPath(null);
        closeMegaNow();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeMegaNow]);

  useEffect(() => {
    return () => cancelScheduledClose();
  }, [cancelScheduledClose]);

  const toggleMobileMenu = () => {
    closeMegaNow();
    setMenuOpenPath((prev) => (prev === pathname ? null : pathname));
  };

  // Top 4 departments surfaced directly on the desktop Amazon/Best Buy sub-bar
  const quickCategories = categories.slice(0, 4);

  return (
    <>
      <header
        ref={headerRef}
        className="bg-background border-border/50 sticky top-0 z-40 border-b transition-colors"
      >
        {/* ── TIER 1: Primary Commerce Bar (Amazon × Best Buy clarity) ── */}
        <Container className="py-2.5 sm:py-3">
          <div className="flex h-11 items-center justify-between gap-3">
            {/* Left: Brand */}
            <Link
              href="/"
              onClick={closeMegaNow}
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

            {/* Center: Prominent Amazon/Best Buy Search Bar + Integrated Ask Verndly AI */}
            <div className="hidden min-w-0 flex-1 items-center justify-center gap-2 md:flex lg:max-w-2xl">
              <div className="bg-surface border-border/50 hover:border-border flex h-10 w-full items-center gap-2 rounded-full border pl-4 pr-1.5 transition-colors">
                <button
                  type="button"
                  onClick={() => {
                    closeMegaNow();
                    setIsSearchOpen(true);
                  }}
                  aria-label="Search marketplace"
                  className="text-muted hover:text-foreground flex min-w-0 flex-1 items-center justify-between gap-2 text-left transition-colors"
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <Search className="h-4 w-4 shrink-0" />
                    <span className="truncate text-xs sm:text-[13px]">
                      Search laptops, sneakers, verified stores…
                    </span>
                  </span>
                  <kbd className="bg-background text-muted hidden rounded-md px-1.5 py-0.5 font-mono text-[10px] font-medium xl:inline-flex">
                    ⌘K
                  </kbd>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    closeMegaNow();
                    openVerndlyAi();
                  }}
                  aria-label="Ask Verndly AI"
                  className="bg-foreground text-background inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full px-3 text-[11px] font-semibold transition-opacity hover:opacity-90"
                >
                  <VerndlyAiIcon size={15} />
                  <span>Ask AI</span>
                </button>
              </div>
            </div>

            {/* Right: Utilities & Account */}
            <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
              {/* Mobile Ask AI & Search Icon Shortcuts */}
              <button
                type="button"
                onClick={() => openVerndlyAi()}
                aria-label="Ask Verndly AI"
                className="bg-surface text-foreground hover:bg-foreground/[0.08] inline-flex h-9 items-center gap-1.5 rounded-xl px-2.5 text-xs font-semibold transition-colors md:hidden"
              >
                <VerndlyAiIcon size={18} />
                <span className="xs:inline hidden">Ask AI</span>
              </button>

              <button
                type="button"
                onClick={() => setIsSearchOpen(true)}
                aria-label="Search marketplace"
                className="bg-surface text-muted hover:bg-foreground/[0.06] hover:text-foreground flex h-9 w-9 items-center justify-center rounded-xl transition-colors md:hidden"
              >
                <Search className="h-4 w-4" />
              </button>

              {/* Favorites */}
              <Link
                href="/favorites"
                aria-label="Saved favorites"
                onClick={closeMegaNow}
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
                onClick={closeMegaNow}
                className="text-muted hover:bg-surface hover:text-foreground relative flex h-9 items-center justify-center gap-1.5 rounded-xl px-2.5 transition-colors"
              >
                <span className="relative flex items-center justify-center">
                  <ShoppingBag className="h-[17px] w-[17px]" />
                  {itemCount > 0 && (
                    <span className="bg-foreground text-background absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold">
                      {itemCount > 99 ? '99+' : itemCount}
                    </span>
                  )}
                </span>
                <span className="text-foreground hidden text-xs font-semibold xl:inline">Cart</span>
              </Link>

              {/* Theme Toggle (desktop) */}
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
                      onClick={closeMegaNow}
                      className="text-muted hover:bg-surface hover:text-foreground inline-flex h-9 items-center rounded-full px-3.5 text-xs font-medium transition-colors"
                    >
                      Sign in
                    </Link>
                    <Link
                      href="/register"
                      onClick={closeMegaNow}
                      className="bg-foreground text-background inline-flex h-9 items-center rounded-full px-4 text-xs font-semibold transition-opacity hover:opacity-90"
                    >
                      Get started
                    </Link>
                  </div>
                ))}

              {/* Mobile Full-Screen Menu Trigger */}
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

        {/* ── TIER 2: Desktop Amazon × Best Buy Category, Deals & Trust Bar ── */}
        <div className="border-border/40 bg-surface/40 hidden border-t lg:block">
          <Container>
            <nav
              aria-label="Marketplace departments and tools"
              className="flex h-10 items-center justify-between gap-4"
            >
              <div className="flex min-w-0 items-center gap-1">
                {/* Best Buy / Amazon "All Categories" Mega-Menu Trigger */}
                <button
                  type="button"
                  onMouseEnter={() => openMegaTab('categories')}
                  onMouseLeave={scheduleMegaClose}
                  onClick={() =>
                    effectiveMegaTab === 'categories' ? closeMegaNow() : openMegaTab('categories')
                  }
                  aria-expanded={effectiveMegaTab === 'categories'}
                  className={clsx(
                    'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors',
                    effectiveMegaTab === 'categories'
                      ? 'bg-foreground text-background'
                      : 'text-foreground hover:bg-surface',
                  )}
                >
                  <Menu className="h-3.5 w-3.5" />
                  <span>All Categories</span>
                  <ChevronDown
                    className={clsx(
                      'h-3.5 w-3.5 transition-transform duration-150',
                      effectiveMegaTab === 'categories' && 'rotate-180',
                    )}
                  />
                </button>

                {/* Deals & Personalized Picks Dropdown Trigger */}
                <button
                  type="button"
                  onMouseEnter={() => openMegaTab('deals')}
                  onMouseLeave={scheduleMegaClose}
                  onClick={() =>
                    effectiveMegaTab === 'deals' ? closeMegaNow() : openMegaTab('deals')
                  }
                  aria-expanded={effectiveMegaTab === 'deals'}
                  className={clsx(
                    'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors',
                    effectiveMegaTab === 'deals'
                      ? 'bg-foreground text-background'
                      : 'text-foreground/85 hover:bg-surface hover:text-foreground',
                  )}
                >
                  <BadgePercent
                    className={clsx(
                      'h-3.5 w-3.5',
                      effectiveMegaTab === 'deals' ? 'text-background' : 'text-red-500',
                    )}
                  />
                  <span>Deals &amp; Picks</span>
                  <ChevronDown
                    className={clsx(
                      'h-3.5 w-3.5 transition-transform duration-150',
                      effectiveMegaTab === 'deals' && 'rotate-180',
                    )}
                  />
                </button>

                <span className="bg-border/70 mx-1 h-4 w-px shrink-0" aria-hidden="true" />

                {/* Top Department Quick Links */}
                {quickCategories.map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/products?category=${encodeURIComponent(cat.name)}`}
                    onClick={() => {
                      recordShoppingHabit('browse_category', { category: cat.name });
                      closeMegaNow();
                    }}
                    className="text-muted hover:text-foreground hidden truncate rounded-full px-2.5 py-1 text-xs font-medium transition-colors xl:inline-flex"
                  >
                    {cat.name}
                  </Link>
                ))}

                <Link
                  href="/stores"
                  onClick={closeMegaNow}
                  className={clsx(
                    'shrink-0 rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                    pathname?.startsWith('/stores')
                      ? 'text-foreground font-semibold'
                      : 'text-muted hover:text-foreground',
                  )}
                >
                  Verified Stores
                </Link>

                <Link
                  href="/sell"
                  onClick={closeMegaNow}
                  className={clsx(
                    'shrink-0 rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                    pathname?.startsWith('/sell')
                      ? 'text-foreground font-semibold'
                      : 'text-muted hover:text-foreground',
                  )}
                >
                  Sell on Verndly
                </Link>

                {/* Help, Trust & Footer Details Dropdown */}
                <button
                  type="button"
                  onMouseEnter={() => openMegaTab('more')}
                  onMouseLeave={scheduleMegaClose}
                  onClick={() =>
                    effectiveMegaTab === 'more' ? closeMegaNow() : openMegaTab('more')
                  }
                  aria-expanded={effectiveMegaTab === 'more'}
                  className={clsx(
                    'inline-flex h-8 shrink-0 items-center gap-1 rounded-full px-2.5 text-xs font-medium transition-colors',
                    effectiveMegaTab === 'more'
                      ? 'bg-foreground text-background font-semibold'
                      : 'text-muted hover:bg-surface hover:text-foreground',
                  )}
                >
                  <span>Support &amp; More</span>
                  <ChevronDown
                    className={clsx(
                      'h-3.5 w-3.5 transition-transform duration-150',
                      effectiveMegaTab === 'more' && 'rotate-180',
                    )}
                  />
                </button>
              </div>

              {/* Right Trust Pill (Buyer Protection / Support Quick Entry) */}
              <Link
                href="/buyer-protection"
                onClick={closeMegaNow}
                className="text-muted hover:text-foreground inline-flex shrink-0 items-center gap-1.5 text-[11px] font-medium transition-colors"
              >
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>3-Day Paystack Escrow</span>
              </Link>
            </nav>
          </Container>
        </div>

        {/* Desktop Mega-Dropdown Panels */}
        <NavbarMegaMenu
          activeTab={effectiveMegaTab}
          categories={categories}
          recommendedProducts={recommendedProducts}
          recommendationHeadline={recommendationHeadline}
          isPersonalized={isPersonalized}
          onClose={closeMegaNow}
          onMouseEnter={cancelScheduledClose}
          onMouseLeave={scheduleMegaClose}
        />

        {/* Mobile Full-Screen Drawer */}
        <NavbarMobileDrawer
          isOpen={isMobileMenuOpen}
          onClose={() => setMenuOpenPath(null)}
          onOpenSearch={() => setIsSearchOpen(true)}
          categories={categories}
          recommendedProducts={recommendedProducts}
          recommendationHeadline={recommendationHeadline}
          isPersonalized={isPersonalized}
          isAuthenticated={isAuthenticated}
          isLoadingAuth={isLoading}
          userName={user?.full_name}
          favCount={favCount}
          itemCount={itemCount}
        />

        <GlobalSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      </header>
    </>
  );
}
