'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  ArrowUpRight,
  BadgePercent,
  ChevronRight,
  Clock,
  Download,
  Flame,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Tag,
  TrendingUp,
  Truck,
} from 'lucide-react';
import Container from '@/components/common/Container';
import VerndlyAiIcon from '@/components/ai/VerndlyAiIcon';
import { openVerndlyAi } from '@/lib/ai/open-verndly-ai';
import { SUPPORT_CONTACT } from '@/lib/contact';
import { getProductPath } from '@/lib/product-slug';
import { recordShoppingHabit } from '@/lib/cookies/shopping-habits';
import type { BrowseProduct } from '@/lib/api/product';
import type { NavbarCategoryItem } from './useNavbarCatalog';
import clsx from '@/utils/clsx';

export type MegaMenuTab = 'categories' | 'deals' | 'more' | null;

const EASE_SMOOTH = [0.22, 1, 0.36, 1] as const;

const DEAL_LANES = [
  {
    label: 'Top Deals & Discounts',
    desc: 'Biggest price drops across verified stores',
    href: '/products?sort=discount_desc',
    icon: BadgePercent,
    accent: 'text-red-600 dark:text-red-400',
  },
  {
    label: 'Under GH₵ 200',
    desc: 'Everyday finds & thoughtful gifts',
    href: '/products?max_price=200&sort=popular',
    icon: Tag,
    accent: 'text-emerald-600 dark:text-emerald-400',
  },
  {
    label: 'Under GH₵ 500',
    desc: 'Best-value tech, fashion & essentials',
    href: '/products?max_price=500&sort=popular',
    icon: Flame,
    accent: 'text-amber-600 dark:text-amber-400',
  },
  {
    label: 'Trending Right Now',
    desc: 'Most viewed & ordered across Ghana',
    href: '/products?sort=popular',
    icon: TrendingUp,
    accent: 'text-blue-600 dark:text-blue-400',
  },
  {
    label: 'Brand New Drops',
    desc: 'Freshly listed in-stock arrivals',
    href: '/products?condition=new&sort=newest',
    icon: Sparkles,
    accent: 'text-violet-600 dark:text-violet-400',
  },
  {
    label: 'Verified Stores',
    desc: 'Explore vetted Ghanaian merchants',
    href: '/stores',
    icon: Store,
    accent: 'text-foreground',
  },
] as const;

const TRUST_HELP_LINKS = [
  {
    label: '3-Day Buyer Protection',
    href: '/buyer-protection',
    desc: 'Paystack escrow holds funds until inspection',
  },
  { label: 'Returns & Refunds', href: '/returns', desc: 'Simple 3-day return & dispute policy' },
  {
    label: 'Shipping & Delivery',
    href: '/shipping',
    desc: 'Nationwide & same-day Accra delivery info',
  },
  { label: 'Help Center', href: '/help', desc: 'Guides for buyers and sellers' },
  { label: 'FAQ', href: '/faq', desc: 'Quick answers to common questions' },
  { label: 'Blog & Shopping Guides', href: '/blog', desc: 'Safe online shopping tips in Ghana' },
] as const;

const SELL_AND_LEGAL_LINKS = [
  { label: 'Sell on Verndly', href: '/sell', badge: '0% Rent' },
  { label: 'Seller Verification', href: '/seller-verification' },
  { label: 'Seller Fee Comparison', href: '/blog/ghana-marketplace-seller-fees-vs-verndly' },
  { label: 'Terms of Service', href: '/terms' },
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Contact Us', href: '/contact' },
] as const;

function formatGhs(value: number | string | undefined | null): string {
  if (value === undefined || value === null) return '';
  const n = typeof value === 'number' ? value : parseFloat(value);
  if (!Number.isFinite(n) || n <= 0) return '';
  return `GH₵ ${n.toLocaleString('en-GH', { maximumFractionDigits: 0 })}`;
}

function CompactProductCard({
  product,
  onNavigate,
}: {
  product: BrowseProduct;
  onNavigate: () => void;
}) {
  const thumb = product.image_urls?.[0];
  const priceNum = Number(product.price);
  const origNum = Number(product.original_price || 0);
  const discountPct =
    origNum > priceNum && priceNum > 0 ? Math.round(((origNum - priceNum) / origNum) * 100) : 0;

  return (
    <Link
      href={getProductPath(product)}
      onClick={() => {
        recordShoppingHabit('view_product', {
          productId: product.id,
          category: product.category,
          brand: product.brand,
          price: product.price,
        });
        onNavigate();
      }}
      className="bg-surface hover:bg-foreground/[0.06] group flex items-center gap-3 rounded-2xl p-2.5 transition-colors"
    >
      <div className="bg-background relative h-14 w-14 shrink-0 overflow-hidden rounded-xl">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb}
            alt={product.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="text-muted flex h-full w-full items-center justify-center">
            <ShoppingBag className="h-4 w-4" />
          </div>
        )}
        {discountPct >= 5 && (
          <span className="absolute left-1 top-1 rounded-md bg-red-600 px-1 py-0.5 text-[9px] font-bold text-white">
            -{discountPct}%
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-foreground group-hover:text-primary truncate text-xs font-semibold transition-colors">
          {product.title}
        </p>
        <p className="text-muted truncate text-[11px]">
          {product.seller?.store_name || product.category}
        </p>
        <div className="mt-0.5 flex items-center gap-1.5">
          <span className="text-foreground text-xs font-bold">{formatGhs(product.price)}</span>
          {origNum > priceNum && (
            <span className="text-muted text-[10px] line-through">{formatGhs(origNum)}</span>
          )}
        </div>
      </div>
    </Link>
  );
}

interface NavbarMegaMenuProps {
  activeTab: MegaMenuTab;
  categories: NavbarCategoryItem[];
  recommendedProducts: BrowseProduct[];
  recommendationHeadline: string;
  isPersonalized: boolean;
  onClose: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

export default function NavbarMegaMenu({
  activeTab,
  categories,
  recommendedProducts,
  recommendationHeadline,
  isPersonalized,
  onClose,
  onMouseEnter,
  onMouseLeave,
}: NavbarMegaMenuProps) {
  const [hoveredCategoryId, setHoveredCategoryId] = useState<string | null>(null);

  const activeCategory = useMemo(() => {
    if (!categories.length) return null;
    if (hoveredCategoryId) {
      const found = categories.find((c) => c.id === hoveredCategoryId);
      if (found) return found;
    }
    return categories[0];
  }, [categories, hoveredCategoryId]);

  const rightColumnProducts = useMemo(() => {
    if (activeCategory && activeCategory.products.length > 0) {
      return activeCategory.products.slice(0, 3);
    }
    return recommendedProducts.slice(0, 3);
  }, [activeCategory, recommendedProducts]);

  return (
    <AnimatePresence>
      {activeTab && (
        <div
          className="fixed inset-x-0 bottom-0 top-[var(--navbar-bottom,102px)] z-50 hidden lg:block"
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
        >
          {/* Dimmed click-outside backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="fixed inset-x-0 bottom-0 top-[var(--navbar-bottom,102px)] bg-black/45"
          >
            <button
              type="button"
              aria-label="Close menu"
              onClick={onClose}
              className="h-full w-full cursor-default"
            />
          </motion.div>

          {/* Mega Menu Surface */}
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: EASE_SMOOTH }}
            className="bg-background border-border/60 relative z-10 border-b shadow-2xl"
          >
            <Container className="py-6">
              {/* ── 1. CATEGORIES MEGA-DROPDOWN (Amazon × Best Buy style) ── */}
              {activeTab === 'categories' && (
                <div className="grid grid-cols-12 gap-6">
                  {/* Left: Categories list with side thumbnail image */}
                  <div className="border-border/50 col-span-4 border-r pr-4">
                    <div className="mb-3 flex items-center justify-between px-2">
                      <span className="text-muted text-[11px] font-semibold uppercase tracking-wider">
                        Departments
                      </span>
                      <Link
                        href="/categories"
                        onClick={onClose}
                        className="text-primary inline-flex items-center gap-1 text-[11px] font-semibold hover:underline"
                      >
                        All categories
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>

                    <div className="max-h-[420px] space-y-1 overflow-y-auto pr-1">
                      {categories.map((cat) => {
                        const isSelected = activeCategory?.id === cat.id;
                        return (
                          <Link
                            key={cat.id}
                            href={`/products?category=${encodeURIComponent(cat.name)}`}
                            onMouseEnter={() => setHoveredCategoryId(cat.id)}
                            onFocus={() => setHoveredCategoryId(cat.id)}
                            onClick={() => {
                              recordShoppingHabit('browse_category', { category: cat.name });
                              onClose();
                            }}
                            className={clsx(
                              'group flex items-center gap-3 rounded-2xl p-2 transition-colors',
                              isSelected
                                ? 'bg-surface text-foreground'
                                : 'text-foreground/85 hover:bg-surface/70',
                            )}
                          >
                            {/* Category Image by the Side */}
                            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-neutral-200 dark:bg-neutral-800">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={cat.imageUrl}
                                alt={cat.name}
                                loading="lazy"
                                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                              />
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-semibold">{cat.name}</p>
                              <p className="text-muted text-[10px]">
                                {cat.productCount > 0
                                  ? `${cat.productCount} ${cat.productCount === 1 ? 'listing' : 'listings'}`
                                  : `${cat.subcategories.length} subcategories`}
                              </p>
                            </div>

                            <ChevronRight
                              className={clsx(
                                'h-4 w-4 shrink-0 transition-transform',
                                isSelected
                                  ? 'text-foreground translate-x-0.5'
                                  : 'text-muted opacity-50',
                              )}
                            />
                          </Link>
                        );
                      })}
                    </div>
                  </div>

                  {/* Middle: Active category subcategories + quick filters */}
                  <div className="col-span-4 space-y-4">
                    {activeCategory && (
                      <>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={activeCategory.imageUrl}
                              alt=""
                              className="h-8 w-8 rounded-lg object-cover"
                            />
                            <div>
                              <h3 className="text-foreground text-sm font-semibold">
                                {activeCategory.name}
                              </h3>
                              <p className="text-muted text-[11px]">Shop by subcategory</p>
                            </div>
                          </div>
                          <Link
                            href={`/products?category=${encodeURIComponent(activeCategory.name)}`}
                            onClick={() => {
                              recordShoppingHabit('browse_category', {
                                category: activeCategory.name,
                              });
                              onClose();
                            }}
                            className="bg-surface text-foreground hover:bg-foreground hover:text-background inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold transition-colors"
                          >
                            Shop all
                            <ArrowRight className="h-3 w-3" />
                          </Link>
                        </div>

                        <div className="grid grid-cols-2 gap-1.5">
                          {activeCategory.subcategories.map((sub) => (
                            <Link
                              key={sub}
                              href={`/products?category=${encodeURIComponent(activeCategory.name)}&subcategory=${encodeURIComponent(sub)}`}
                              onClick={() => {
                                recordShoppingHabit('browse_category', {
                                  category: activeCategory.name,
                                  subcategory: sub,
                                });
                                onClose();
                              }}
                              className="text-foreground/85 hover:bg-surface hover:text-foreground truncate rounded-xl px-3 py-2 text-xs font-medium transition-colors"
                            >
                              {sub}
                            </Link>
                          ))}
                        </div>

                        {/* Quick filter pills for the department */}
                        <div className="border-border/50 space-y-2 border-t pt-3">
                          <p className="text-muted text-[10px] font-semibold uppercase tracking-wider">
                            Quick filters in {activeCategory.name}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            <Link
                              href={`/products?category=${encodeURIComponent(activeCategory.name)}&sort=discount_desc`}
                              onClick={onClose}
                              className="bg-surface text-foreground hover:bg-foreground hover:text-background rounded-full px-3 py-1 text-[11px] font-medium transition-colors"
                            >
                              Best deals
                            </Link>
                            <Link
                              href={`/products?category=${encodeURIComponent(activeCategory.name)}&condition=new`}
                              onClick={onClose}
                              className="bg-surface text-foreground hover:bg-foreground hover:text-background rounded-full px-3 py-1 text-[11px] font-medium transition-colors"
                            >
                              Brand new
                            </Link>
                            <Link
                              href={`/products?category=${encodeURIComponent(activeCategory.name)}&max_price=300`}
                              onClick={onClose}
                              className="bg-surface text-foreground hover:bg-foreground hover:text-background rounded-full px-3 py-1 text-[11px] font-medium transition-colors"
                            >
                              Under GH₵ 300
                            </Link>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Right: Live Picks / Recommendations + Ask Verndly AI */}
                  <div className="col-span-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-primary text-[10px] font-semibold uppercase tracking-wider">
                          {activeCategory && activeCategory.products.length > 0
                            ? `Trending in ${activeCategory.name}`
                            : isPersonalized
                              ? 'Based on your habits'
                              : 'Recommended'}
                        </p>
                        <h4 className="text-foreground text-sm font-semibold">
                          {activeCategory && activeCategory.products.length > 0
                            ? 'Top picks right now'
                            : recommendationHeadline}
                        </h4>
                      </div>
                      <Link
                        href={
                          activeCategory
                            ? `/products?category=${encodeURIComponent(activeCategory.name)}`
                            : '/products'
                        }
                        onClick={onClose}
                        className="text-muted hover:text-foreground text-[11px] font-semibold"
                      >
                        See all
                      </Link>
                    </div>

                    <div className="space-y-2">
                      {rightColumnProducts.map((product) => (
                        <CompactProductCard
                          key={product.id}
                          product={product}
                          onNavigate={onClose}
                        />
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        openVerndlyAi(
                          activeCategory
                            ? `Show me the best ${activeCategory.name} in stock`
                            : undefined,
                        );
                      }}
                      className="bg-foreground text-background flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left transition-opacity hover:opacity-90"
                    >
                      <span className="flex items-center gap-2.5">
                        <VerndlyAiIcon size={20} />
                        <span>
                          <span className="block text-xs font-semibold">
                            Need help choosing? Ask Verndly AI
                          </span>
                          <span className="block text-[10px] opacity-75">
                            Compare prices, gift ideas &amp; verified Ghana stores
                          </span>
                        </span>
                      </span>
                      <ArrowRight className="h-4 w-4 shrink-0" />
                    </button>
                  </div>
                </div>
              )}

              {/* ── 2. DEALS & RECOMMENDATIONS DROPDOWN ── */}
              {activeTab === 'deals' && (
                <div className="grid grid-cols-12 gap-6">
                  <div className="border-border/50 col-span-5 border-r pr-6">
                    <p className="text-muted mb-3 text-[11px] font-semibold uppercase tracking-wider">
                      Shop Deals &amp; Collections
                    </p>
                    <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                      {DEAL_LANES.map((lane) => {
                        const Icon = lane.icon;
                        return (
                          <Link
                            key={lane.label}
                            href={lane.href}
                            onClick={onClose}
                            className="hover:bg-surface group flex items-start gap-2.5 rounded-2xl p-2.5 transition-colors"
                          >
                            <div className="bg-surface group-hover:bg-background flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors">
                              <Icon className={clsx('h-4 w-4', lane.accent)} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-foreground text-xs font-semibold">{lane.label}</p>
                              <p className="text-muted mt-0.5 text-[11px] leading-snug">
                                {lane.desc}
                              </p>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>

                  <div className="col-span-7 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-primary text-[10px] font-semibold uppercase tracking-wider">
                          {isPersonalized
                            ? 'Tailored from your shopping habits'
                            : 'Curated for you'}
                        </p>
                        <h3 className="text-foreground text-base font-semibold">
                          {recommendationHeadline}
                        </h3>
                      </div>
                      <Link
                        href="/products?sort=popular"
                        onClick={onClose}
                        className="text-muted hover:text-foreground inline-flex items-center gap-1 text-xs font-semibold"
                      >
                        Explore more
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      {recommendedProducts.slice(0, 4).map((product) => (
                        <CompactProductCard
                          key={product.id}
                          product={product}
                          onNavigate={onClose}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── 3. SUPPORT, TRUST & FOOTER DETAILS DROPDOWN ── */}
              {activeTab === 'more' && (
                <div className="grid grid-cols-12 gap-6">
                  {/* Column 1: Buyer Protection & Help */}
                  <div className="col-span-4 space-y-2">
                    <p className="text-muted px-2 text-[11px] font-semibold uppercase tracking-wider">
                      Buyer Protection &amp; Help
                    </p>
                    <div className="space-y-1">
                      {TRUST_HELP_LINKS.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={onClose}
                          className="hover:bg-surface block rounded-xl px-2.5 py-2 transition-colors"
                        >
                          <p className="text-foreground text-xs font-semibold">{item.label}</p>
                          <p className="text-muted text-[11px]">{item.desc}</p>
                        </Link>
                      ))}
                    </div>
                  </div>

                  {/* Column 2: Sell & Policies */}
                  <div className="col-span-3 space-y-4">
                    <div className="space-y-2">
                      <p className="text-muted px-2 text-[11px] font-semibold uppercase tracking-wider">
                        Sellers &amp; Policies
                      </p>
                      <div className="space-y-1">
                        {SELL_AND_LEGAL_LINKS.map((item) => (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={onClose}
                            className="text-foreground/85 hover:bg-surface hover:text-foreground flex items-center justify-between rounded-xl px-2.5 py-2 text-xs font-medium transition-colors"
                          >
                            <span>{item.label}</span>
                            {'badge' in item && item.badge && (
                              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                                {item.badge}
                              </span>
                            )}
                          </Link>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        if (typeof window !== 'undefined') {
                          window.dispatchEvent(new CustomEvent('open-pwa-install'));
                        }
                      }}
                      className="bg-surface text-foreground hover:bg-foreground hover:text-background inline-flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold transition-colors"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Install Verndly App</span>
                    </button>
                  </div>

                  {/* Column 3: Direct Support & Trust Card (Footer details right in navbar) */}
                  <div className="col-span-5">
                    <div className="bg-surface space-y-4 rounded-2xl p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-muted text-[11px] font-semibold uppercase tracking-wider">
                          Direct Support
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                          Active Support
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <a
                          href={SUPPORT_CONTACT.whatsappSupportHref}
                          target="_blank"
                          rel="noreferrer"
                          onClick={onClose}
                          className="bg-background border-border/50 flex items-center gap-2.5 rounded-xl border p-2.5 transition-colors hover:border-emerald-500/40"
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                            <MessageSquare className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-foreground truncate text-xs font-semibold">
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
                          className="bg-background hover:border-primary/40 border-border/50 flex items-center gap-2.5 rounded-xl border p-2.5 transition-colors"
                        >
                          <div className="bg-primary/10 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
                            <Phone className="text-primary h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-foreground truncate text-xs font-semibold">
                              Call Support
                            </p>
                            <p className="text-muted truncate text-[10px]">
                              {SUPPORT_CONTACT.phoneDisplay}
                            </p>
                          </div>
                        </a>
                      </div>

                      <div className="border-border/40 space-y-2 border-t pt-3 text-xs">
                        <a
                          href={SUPPORT_CONTACT.emailHref}
                          onClick={onClose}
                          className="text-foreground hover:text-primary flex items-center justify-between transition-colors"
                        >
                          <span className="flex items-center gap-2">
                            <Mail className="h-3.5 w-3.5 text-blue-500" />
                            <span className="font-medium">{SUPPORT_CONTACT.email}</span>
                          </span>
                          <ArrowUpRight className="h-3.5 w-3.5 opacity-60" />
                        </a>
                        <div className="text-muted flex flex-wrap items-center justify-between gap-2 text-[11px]">
                          <span className="inline-flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            {SUPPORT_CONTACT.hours}
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5" />
                            {SUPPORT_CONTACT.location}
                          </span>
                        </div>
                      </div>

                      <div className="bg-background/70 grid grid-cols-2 gap-2 rounded-xl p-2.5 text-[11px]">
                        <div className="flex items-center gap-1.5 font-medium">
                          <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                          <span>3-Day Paystack Escrow</span>
                        </div>
                        <div className="flex items-center gap-1.5 font-medium">
                          <Truck className="text-primary h-3.5 w-3.5 shrink-0" />
                          <span>Verified Ghana Stores</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Container>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
