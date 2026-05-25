'use client';

import React from 'react';
import { useTheme } from '@/lib/contexts/theme';
import { useAuth } from '@/lib/contexts/auth-context';
import { useCart } from '@/lib/contexts/cart-context';
import { Moon, Sun, LayoutDashboard, ShoppingBag, Heart, Search } from 'lucide-react';
import GlobalSearch from '../layout/GlobalSearch';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useAuthModal } from '@/lib/contexts/auth-modal-context';
import { usePathname } from 'next/navigation';
import PrimaryNav from '../layout/PrimaryNav';

interface DashboardHeaderProps {
  title: string;
  onMenuToggle?: () => void;
  /** Hide the categories/brands mega-nav row (e.g. inside the seller dashboard). */
  hidePrimaryNav?: boolean;
}

import UserMenu from '../layout/UserMenu';
import NotificationBell from '../layout/NotificationBell';

export default function DashboardHeader({
  title,
  onMenuToggle,
  hidePrimaryNav,
}: DashboardHeaderProps) {
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const { openRegister } = useAuthModal();
  const { itemCount } = useCart();
  const pathname = usePathname();
  const isDark = theme === 'dark';

  const isSeller = user?.role === 'SELLER';
  // Auto-hide mega nav inside the seller dashboard (it has its own sidebar)
  const showPrimaryNav = !hidePrimaryNav && !pathname?.startsWith('/dashboard');

  return (
    <>
      <header className="border-border bg-background sticky top-0 z-50 flex h-20 items-center justify-between border-b px-4 md:px-8">
        <div className="flex min-w-0 items-center gap-4">
          {isSeller && (
            <button
              onClick={onMenuToggle}
              className="bg-surface border-border text-muted hover:text-foreground shrink-0 rounded-xl border p-2.5 transition-all lg:hidden"
            >
              <LayoutDashboard className="h-5 w-5" />
            </button>
          )}
          <Link href="/" className="group flex min-w-0 items-center gap-2">
            <div className="bg-primary shadow-primary/20 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs text-white shadow-lg transition-transform group-hover:scale-105">
              <img src="/logos/vendly.png" alt="Ventry Logo" className="h-full w-full" />
            </div>
            <h1 className="text-md text-foreground min-w-0 max-w-[120px] truncate tracking-tight sm:max-w-[200px] md:max-w-[300px] lg:max-w-[450px] xl:max-w-[600px]">
              {title}
            </h1>
          </Link>
        </div>

        <div className="flex items-center gap-1 md:gap-3">
          {/* Cart — always visible (incl. mobile) */}
          <Link
            href="/cart"
            aria-label={`Cart${itemCount > 0 ? `, ${itemCount} item${itemCount === 1 ? '' : 's'}` : ''}`}
            className="text-muted hover:text-primary hover:bg-primary/5 group relative rounded-2xl p-2.5 transition-all"
            title="Cart"
          >
            <ShoppingBag className="h-5 w-5 transition-transform group-active:scale-90" />
            {itemCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="border-background absolute -right-0.5 -top-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full border-2 bg-red-500 px-1 text-[10px] text-white shadow-lg"
              >
                {itemCount > 99 ? '99+' : itemCount}
              </motion.span>
            )}
          </Link>

          {/* Favorites — small+ */}
          {user && (
            <Link
              href="/favorites"
              aria-label="Favorites"
              className="text-muted group hidden rounded-2xl p-2.5 transition-all hover:bg-red-500/5 hover:text-red-500 sm:inline-flex"
              title="Favorites"
            >
              <Heart className="h-5 w-5 transition-transform group-active:scale-90" />
            </Link>
          )}

          {/* Start selling CTA for non-seller users */}
          {user && !isSeller && user.role !== 'ADMIN' && user?.approval_status !== 'APPROVED' && (
            <Link href="/seller-verification" className="hidden sm:inline-flex">
              <button className="bg-red-500 ml-1 h-9 rounded-lg px-3.5 text-xs text-white shadow-sm transition-all hover:opacity-90 active:scale-[0.98]">
                Start selling
              </button>
            </Link>
          )}

          <div className="bg-border mx-1 hidden h-8 w-[1px] sm:block"></div>

          {/* Search Toggle */}
          <button
            onClick={() => setIsSearchOpen(true)}
            className="text-muted hover:text-primary hover:bg-primary/5 group rounded-2xl p-2.5 transition-all"
            aria-label="Search"
          >
            <Search className="h-5 w-5 transition-transform group-active:scale-90" />
          </button>

          {/* Theme Toggle */}
          <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="text-muted hover:text-foreground hover:bg-surface rounded-2xl p-2.5 transition-all"
            aria-label="Toggle theme"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={theme}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
              >
                {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </motion.div>
            </AnimatePresence>
          </button>

          <div className="bg-border mx-1 h-8 w-[1px]"></div>

          {/* User Profile or Login */}
          <div className="flex items-center gap-3 pl-1">
            {user ? (
              <>
                <NotificationBell />
                <UserMenu />
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="text-foreground/80 hover:text-foreground hidden h-9 items-center px-3 text-xs transition-colors sm:inline-flex"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className="bg-background text-primary inline-flex h-9 items-center rounded-lg px-3.5 text-xs shadow-sm transition-all hover:opacity-90 active:scale-[0.98]"
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </div>
        <GlobalSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      </header>
      {showPrimaryNav && <PrimaryNav />}
    </>
  );
}
