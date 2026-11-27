'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  BadgePercent,
  BookOpen,
  ChevronDown,
  Clock,
  Download,
  Heart,
  HelpCircle,
  LayoutGrid,
  Mail,
  MapPin,
  MessageSquare,
  Moon,
  Package,
  Phone,
  Search,
  ShieldCheck,
  ShoppingBag,
  Store,
  Sun,
  X,
} from 'lucide-react';
import Portal from '@/components/common/Portal';
import VerndlyAiIcon from '@/components/ai/VerndlyAiIcon';
import { openVerndlyAi } from '@/lib/ai/open-verndly-ai';
import { SUPPORT_CONTACT } from '@/lib/contact';
import { getProductPath } from '@/lib/product-slug';
import { recordShoppingHabit } from '@/lib/cookies/shopping-habits';
import { useTheme } from '@/lib/contexts/theme';
import type { BrowseProduct } from '@/lib/api/product';
import type { NavbarCategoryItem } from './useNavbarCatalog';
import clsx from '@/utils/clsx';

const EASE_SMOOTH = [0.22, 1, 0.36, 1] as const;

function formatGhs(value: number | string | undefined | null): string {
  if (value === undefined || value === null) return '';
  const n = typeof value === 'number' ? value : parseFloat(value);
  if (!Number.isFinite(n) || n <= 0) return '';
  return `GH₵ ${n.toLocaleString('en-GH', { maximumFractionDigits: 0 })}`;
}

interface NavbarMobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSearch: () => void;
  categories: NavbarCategoryItem[];
  recommendedProducts: BrowseProduct[];
  recommendationHeadline: string;
  isPersonalized: boolean;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
  userName?: string | null;
  favCount: number;
  itemCount: number;
}

export default function NavbarMobileDrawer({
  isOpen,
  onClose,
  onOpenSearch,
  categories,
  recommendedProducts,
  recommendationHeadline,
  isPersonalized,
  isAuthenticated,
  isLoadingAuth,
  userName,
  favCount,
  itemCount,
}: NavbarMobileDrawerProps) {
  const { theme, setTheme } = useTheme();
  const [expandedCatId, setExpandedCatId] = useState<string | null>(null);
  const isDark = theme === 'dark';

  // Lock background page scroll while full-screen mobile menu is open
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onClose]);

  const firstName = userName?.trim().split(/\s+/)[0] || null;

  return (
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="mobile-fullscreen-drawer"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.22, ease: EASE_SMOOTH }}
            className="bg-background fixed inset-0 z-[120] flex h-[100dvh] w-full flex-col lg:hidden"
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Verndly mobile navigation"
              className="flex h-full w-full flex-col overflow-hidden"
            >
              {/* Sticky Top Bar inside full-screen drawer */}
              <div className="border-border/50 bg-background flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3.5">
                <Link
                  href="/"
                  onClick={onClose}
                  className="text-foreground flex items-center gap-2.5 text-base font-semibold tracking-tight"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/logos/verndly.png"
                    alt="Verndly"
                    className="h-7 w-7 shrink-0 object-contain"
                  />
                  <span>{firstName ? `Hi, ${firstName}` : 'Verndly'}</span>
                </Link>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    aria-label="Toggle theme"
                    onClick={() => setTheme(isDark ? 'light' : 'dark')}
                    className="bg-surface text-foreground flex h-9 w-9 items-center justify-center rounded-xl transition-colors"
                  >
                    {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close navigation menu"
                    className="bg-surface text-foreground flex h-9 w-9 items-center justify-center rounded-xl transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Scrollable Full-Screen Content */}
              <div className="flex-1 space-y-6 overflow-y-auto px-4 pb-10 pt-4">
                {/* 1. Search + Ask Verndly AI */}
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenSearch();
                    }}
                    className="bg-surface text-muted hover:text-foreground flex w-full items-center gap-2.5 rounded-2xl px-4 py-3.5 text-left text-sm transition-colors"
                  >
                    <Search className="h-4 w-4 shrink-0" />
                    <span className="truncate">Search laptops, sneakers, verified stores…</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      openVerndlyAi();
                    }}
                    className="bg-foreground text-background flex w-full items-center justify-between gap-2.5 rounded-2xl px-4 py-3 text-left text-xs font-semibold transition-opacity hover:opacity-90"
                  >
                    <span className="flex items-center gap-2.5">
                      <VerndlyAiIcon size={20} />
                      <span>Ask Verndly AI</span>
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] opacity-80">
                      Chat &amp; shop
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </button>
                </div>

                {/* Guest Sign In / Get Started */}
                {!isLoadingAuth && !isAuthenticated && (
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      href="/login"
                      onClick={onClose}
                      className="bg-surface text-foreground flex h-11 items-center justify-center rounded-2xl text-xs font-semibold"
                    >
                      Sign in
                    </Link>
                    <Link
                      href="/register"
                      onClick={onClose}
                      className="bg-foreground text-background flex h-11 items-center justify-center rounded-2xl text-xs font-semibold"
                    >
                      Get started
                    </Link>
                  </div>
                )}

                {/* 2. Personalized Recommendations Rail */}
                {recommendedProducts.length > 0 && (
                  <section className="space-y-2.5">
                    <div className="flex items-center justify-between px-0.5">
                      <div>
                        <p className="text-primary text-[10px] font-semibold uppercase tracking-wider">
                          {isPersonalized ? 'Based on your habits' : 'Curated for you'}
                        </p>
                        <h3 className="text-foreground text-sm font-semibold">
                          {recommendationHeadline}
                        </h3>
                      </div>
                      <Link
                        href="/products?sort=popular"
                        onClick={onClose}
                        className="text-muted inline-flex items-center gap-1 text-xs font-semibold"
                      >
                        See all
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>

                    <div className="-mx-4 overflow-x-auto px-4 pb-1">
                      <div className="flex min-w-max gap-2.5">
                        {recommendedProducts.slice(0, 4).map((product) => {
                          const thumb = product.image_urls?.[0];
                          return (
                            <Link
                              key={product.id}
                              href={getProductPath(product)}
                              onClick={() => {
                                recordShoppingHabit('view_product', {
                                  productId: product.id,
                                  category: product.category,
                                  brand: product.brand,
                                  price: product.price,
                                });
                                onClose();
                              }}
                              className="bg-surface flex w-44 shrink-0 flex-col overflow-hidden rounded-2xl p-2"
                            >
                              <div className="bg-background aspect-[4/3] w-full overflow-hidden rounded-xl">
                                {thumb ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={thumb}
                                    alt={product.title}
                                    loading="lazy"
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="text-muted flex h-full w-full items-center justify-center">
                                    <ShoppingBag className="h-5 w-5" />
                                  </div>
                                )}
                              </div>
                              <p className="text-foreground mt-2 truncate text-xs font-semibold">
                                {product.title}
                              </p>
                              <p className="text-muted truncate text-[10px]">
                                {product.seller?.store_name || product.category}
                              </p>
                              <p className="text-foreground mt-1 text-xs font-bold">
                                {formatGhs(product.price)}
                              </p>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  </section>
                )}

                {/* 3. Shop by Category (with Side Images + Expandable Subcategories) */}
                <section className="space-y-2.5">
                  <div className="flex items-center justify-between px-0.5">
                    <h3 className="text-foreground text-sm font-semibold">Shop by Category</h3>
                    <Link
                      href="/categories"
                      onClick={onClose}
                      className="text-primary inline-flex items-center gap-1 text-xs font-semibold"
                    >
                      All categories
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>

                  <div className="space-y-1.5">
                    {categories.map((cat) => {
                      const expanded = expandedCatId === cat.id;
                      return (
                        <div
                          key={cat.id}
                          className="bg-surface overflow-hidden rounded-2xl transition-colors"
                        >
                          <div className="flex items-center gap-3 p-2.5">
                            <Link
                              href={`/products?category=${encodeURIComponent(cat.name)}`}
                              onClick={() => {
                                recordShoppingHabit('browse_category', { category: cat.name });
                                onClose();
                              }}
                              className="flex min-w-0 flex-1 items-center gap-3"
                            >
                              {/* Category Image by the Side */}
                              <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-neutral-200 dark:bg-neutral-800">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={cat.imageUrl}
                                  alt={cat.name}
                                  loading="lazy"
                                  className="h-full w-full object-cover"
                                />
                              </div>

                              <div className="min-w-0 flex-1">
                                <p className="text-foreground truncate text-xs font-semibold">
                                  {cat.name}
                                </p>
                                <p className="text-muted text-[10px]">
                                  {cat.productCount > 0
                                    ? `${cat.productCount} ${cat.productCount === 1 ? 'listing' : 'listings'}`
                                    : `${cat.subcategories.length} subcategories`}
                                </p>
                              </div>
                            </Link>

                            {cat.subcategories.length > 0 && (
                              <button
                                type="button"
                                onClick={() => setExpandedCatId(expanded ? null : cat.id)}
                                aria-label={`Toggle ${cat.name} subcategories`}
                                aria-expanded={expanded}
                                className="bg-background text-muted hover:text-foreground flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors"
                              >
                                <ChevronDown
                                  className={clsx(
                                    'h-4 w-4 transition-transform duration-200',
                                    expanded && 'rotate-180',
                                  )}
                                />
                              </button>
                            )}
                          </div>

                          {/* Expandable Subcategory Chips */}
                          <AnimatePresence initial={false}>
                            {expanded && cat.subcategories.length > 0 && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.18, ease: EASE_SMOOTH }}
                                className="overflow-hidden"
                              >
                                <div className="border-border/40 flex flex-wrap gap-1.5 border-t px-3 pb-3 pt-2.5">
                                  <Link
                                    href={`/products?category=${encodeURIComponent(cat.name)}`}
                                    onClick={() => {
                                      recordShoppingHabit('browse_category', {
                                        category: cat.name,
                                      });
                                      onClose();
                                    }}
                                    className="bg-foreground text-background rounded-full px-3 py-1.5 text-[11px] font-semibold"
                                  >
                                    All {cat.name}
                                  </Link>
                                  {cat.subcategories.map((sub) => (
                                    <Link
                                      key={sub}
                                      href={`/products?category=${encodeURIComponent(cat.name)}&subcategory=${encodeURIComponent(sub)}`}
                                      onClick={() => {
                                        recordShoppingHabit('browse_category', {
                                          category: cat.name,
                                          subcategory: sub,
                                        });
                                        onClose();
                                      }}
                                      className="bg-background text-foreground rounded-full px-3 py-1.5 text-[11px] font-medium"
                                    >
                                      {sub}
                                    </Link>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </section>

                {/* 4. Quick Marketplace Shortcuts */}
                <section className="space-y-2.5">
                  <h3 className="text-foreground px-0.5 text-sm font-semibold">Explore Verndly</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      href="/products?sort=discount_desc"
                      onClick={onClose}
                      className="bg-surface text-foreground flex items-center gap-2.5 rounded-2xl px-3.5 py-3 text-xs font-semibold"
                    >
                      <BadgePercent className="h-4 w-4 text-red-500" />
                      <span>Top Deals</span>
                    </Link>
                    <Link
                      href="/stores"
                      onClick={onClose}
                      className="bg-surface text-foreground flex items-center gap-2.5 rounded-2xl px-3.5 py-3 text-xs font-semibold"
                    >
                      <Store className="text-muted h-4 w-4" />
                      <span>Verified Stores</span>
                    </Link>
                    <Link
                      href="/products"
                      onClick={onClose}
                      className="bg-surface text-foreground flex items-center gap-2.5 rounded-2xl px-3.5 py-3 text-xs font-semibold"
                    >
                      <LayoutGrid className="text-muted h-4 w-4" />
                      <span>Shop All</span>
                    </Link>
                    <Link
                      href="/favorites"
                      onClick={onClose}
                      className="bg-surface text-foreground flex items-center justify-between rounded-2xl px-3.5 py-3 text-xs font-semibold"
                    >
                      <span className="flex items-center gap-2.5">
                        <Heart className="text-muted h-4 w-4" />
                        <span>Favorites</span>
                      </span>
                      {favCount > 0 && (
                        <span className="rounded-full bg-[var(--color-accent)] px-1.5 py-0.5 text-[10px] font-bold text-white">
                          {favCount}
                        </span>
                      )}
                    </Link>
                    <Link
                      href="/cart"
                      onClick={onClose}
                      className="bg-surface text-foreground flex items-center justify-between rounded-2xl px-3.5 py-3 text-xs font-semibold"
                    >
                      <span className="flex items-center gap-2.5">
                        <ShoppingBag className="text-muted h-4 w-4" />
                        <span>Cart</span>
                      </span>
                      {itemCount > 0 && (
                        <span className="bg-foreground text-background rounded-full px-1.5 py-0.5 text-[10px] font-bold">
                          {itemCount}
                        </span>
                      )}
                    </Link>
                    <Link
                      href={isAuthenticated ? '/orders' : '/sell'}
                      onClick={onClose}
                      className="bg-surface text-foreground flex items-center gap-2.5 rounded-2xl px-3.5 py-3 text-xs font-semibold"
                    >
                      {isAuthenticated ? (
                        <>
                          <Package className="text-muted h-4 w-4" />
                          <span>My Orders</span>
                        </>
                      ) : (
                        <>
                          <Store className="h-4 w-4 text-emerald-500" />
                          <span>Sell on Verndly</span>
                        </>
                      )}
                    </Link>
                  </div>
                </section>

                {/* 5. Footer Details & Direct Support right inside Mobile Menu */}
                <section className="bg-surface space-y-4 rounded-3xl p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-muted text-[11px] font-semibold uppercase tracking-wider">
                      Trust, Help &amp; Support
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                      Active Support
                    </span>
                  </div>

                  {/* Key Trust & Help links */}
                  <div className="grid grid-cols-2 gap-1.5 text-xs">
                    <Link
                      href="/buyer-protection"
                      onClick={onClose}
                      className="bg-background text-foreground flex items-center gap-2 rounded-xl px-3 py-2.5 font-medium"
                    >
                      <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                      <span className="truncate">3-Day Escrow</span>
                    </Link>
                    <Link
                      href="/returns"
                      onClick={onClose}
                      className="bg-background text-foreground flex items-center gap-2 rounded-xl px-3 py-2.5 font-medium"
                    >
                      <HelpCircle className="text-muted h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">Returns</span>
                    </Link>
                    <Link
                      href="/sell"
                      onClick={onClose}
                      className="bg-background text-foreground flex items-center gap-2 rounded-xl px-3 py-2.5 font-medium"
                    >
                      <Store className="text-primary h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">Sell on Verndly</span>
                    </Link>
                    <Link
                      href="/blog"
                      onClick={onClose}
                      className="bg-background text-foreground flex items-center gap-2 rounded-xl px-3 py-2.5 font-medium"
                    >
                      <BookOpen className="text-muted h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">Guides &amp; FAQ</span>
                    </Link>
                  </div>

                  {/* Direct Contact Buttons (WhatsApp & Phone) */}
                  <div className="grid grid-cols-2 gap-2">
                    <a
                      href={SUPPORT_CONTACT.whatsappSupportHref}
                      target="_blank"
                      rel="noreferrer"
                      onClick={onClose}
                      className="bg-background flex items-center gap-2 rounded-xl px-3 py-2.5"
                    >
                      <MessageSquare className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      <div className="min-w-0">
                        <p className="text-foreground truncate text-[11px] font-semibold">
                          WhatsApp
                        </p>
                        <p className="text-muted truncate text-[10px]">
                          {SUPPORT_CONTACT.phoneDisplay}
                        </p>
                      </div>
                    </a>
                    <a
                      href={SUPPORT_CONTACT.phoneHref}
                      onClick={onClose}
                      className="bg-background flex items-center gap-2 rounded-xl px-3 py-2.5"
                    >
                      <Phone className="text-primary h-4 w-4 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-foreground truncate text-[11px] font-semibold">Call</p>
                        <p className="text-muted truncate text-[10px]">
                          {SUPPORT_CONTACT.phoneDisplay}
                        </p>
                      </div>
                    </a>
                  </div>

                  {/* Email, Hours, Location */}
                  <div className="border-border/40 text-muted space-y-1.5 border-t pt-3 text-[11px]">
                    <a
                      href={SUPPORT_CONTACT.emailHref}
                      className="text-foreground flex items-center gap-2 font-medium"
                    >
                      <Mail className="h-3.5 w-3.5 text-blue-500" />
                      <span>{SUPPORT_CONTACT.email}</span>
                    </a>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="h-3 w-3" />
                        {SUPPORT_CONTACT.hours}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="h-3 w-3" />
                        {SUPPORT_CONTACT.location}
                      </span>
                    </div>
                  </div>

                  {/* Legal & Install App row */}
                  <div className="border-border/40 text-muted flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-[11px]">
                    <div className="flex items-center gap-3">
                      <Link href="/help" onClick={onClose} className="hover:text-foreground">
                        Help
                      </Link>
                      <Link href="/terms" onClick={onClose} className="hover:text-foreground">
                        Terms
                      </Link>
                      <Link href="/privacy" onClick={onClose} className="hover:text-foreground">
                        Privacy
                      </Link>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        if (typeof window !== 'undefined') {
                          window.dispatchEvent(new CustomEvent('open-pwa-install'));
                        }
                      }}
                      className="text-foreground inline-flex items-center gap-1 font-semibold"
                    >
                      <Download className="h-3 w-3 text-amber-500" />
                      <span>Install App</span>
                    </button>
                  </div>
                </section>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
