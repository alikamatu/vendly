'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Settings,
  LogOut,
  TrendingUp,
  X,
  ExternalLink,
  Wallet,
  ChevronDown,
} from 'lucide-react';
import clsx from '@/utils/clsx';
import { useAuth } from '@/lib/contexts/auth-context';
import { orderApi } from '@/lib/api/order';
import { useRealtimeOrders } from '@/hooks/useRealtimeOrders';
import { motion, AnimatePresence } from 'framer-motion';

interface SubNavItem {
  name: string;
  href: string;
  exact?: boolean;
}

interface NavGroup {
  id: string;
  name: string;
  href: string;
  icon: React.ElementType;
  exact?: boolean;
  hasCount?: boolean;
  subItems?: SubNavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    id: 'overview',
    name: 'Overview',
    href: '/dashboard',
    icon: LayoutDashboard,
    exact: true,
  },
  {
    id: 'products',
    name: 'Products',
    href: '/dashboard/products',
    icon: Package,
    subItems: [
      { name: 'All Products', href: '/dashboard/products', exact: true },
      { name: 'Add Product', href: '/dashboard/products/add' },
      { name: 'WhatsApp Import', href: '/dashboard/products/whatsapp-import' },
      { name: 'Bulk CSV', href: '/dashboard/products/import' },
    ],
  },
  {
    id: 'orders',
    name: 'Orders',
    href: '/dashboard/orders',
    icon: ShoppingBag,
    hasCount: true,
  },
  {
    id: 'finances',
    name: 'Finances',
    href: '/dashboard/payouts',
    icon: Wallet,
    subItems: [
      { name: 'Payouts', href: '/dashboard/payouts' },
      { name: 'Transactions', href: '/dashboard/transactions' },
    ],
  },
  {
    id: 'insights',
    name: 'Insights',
    href: '/dashboard/analytics',
    icon: TrendingUp,
    subItems: [
      { name: 'Analytics', href: '/dashboard/analytics' },
      { name: 'Reviews', href: '/dashboard/reviews' },
      { name: 'Activity', href: '/dashboard/activity' },
    ],
  },
  {
    id: 'settings',
    name: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
    subItems: [
      { name: 'General', href: '/dashboard/settings', exact: true },
      { name: 'Storefront', href: '/dashboard/settings/store' },
      { name: 'Profile', href: '/dashboard/settings/profile' },
      { name: 'Security', href: '/dashboard/settings/security' },
      { name: 'Appearance', href: '/dashboard/settings/personalization' },
    ],
  },
];

const SPRING_INDICATOR = {
  type: 'spring' as const,
  stiffness: 440,
  damping: 36,
  mass: 0.8,
};

const EASE_SMOOTH = [0.22, 1, 0.36, 1] as const;

function isRouteActive(pathname: string, href: string, exact?: boolean): boolean {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isGroupActive(pathname: string, group: NavGroup): boolean {
  if (group.subItems) {
    if (group.subItems.some((sub) => isRouteActive(pathname, sub.href, sub.exact))) {
      return true;
    }
    // Also match dynamic sub-routes like /dashboard/products/[id] or /dashboard/products/edit/[id]
    if (group.id === 'products' && pathname.startsWith('/dashboard/products/')) {
      return true;
    }
    if (group.id === 'settings' && pathname.startsWith('/dashboard/settings/')) {
      return true;
    }
    return false;
  }
  return isRouteActive(pathname, group.href, group.exact);
}

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { logout, user, token } = useAuth();
  const [activeOrderCount, setActiveOrderCount] = useState<number | null>(null);

  // Track manual toggles per group; active group defaults open without needing an effect
  const activeGroupId = useMemo(
    () => NAV_GROUPS.find((g) => isGroupActive(pathname, g))?.id ?? 'overview',
    [pathname],
  );

  const [manualToggle, setManualToggle] = useState<{
    pathname: string;
    overrides: Record<string, boolean>;
  }>({ pathname, overrides: {} });

  const currentOverrides = manualToggle.pathname === pathname ? manualToggle.overrides : {};

  const isGroupExpanded = (id: string) =>
    id in currentOverrides ? currentOverrides[id] : id === activeGroupId;

  const toggleGroup = (id: string) => {
    const nextState = !isGroupExpanded(id);
    setManualToggle({
      pathname,
      overrides: { ...currentOverrides, [id]: nextState },
    });
  };

  // Lock body scroll on mobile when drawer is open + close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, onClose]);

  const refreshOrderCount = useCallback(() => {
    if (!token) return;
    orderApi
      .getSellerOrders(token)
      .then((orders) => {
        if (!Array.isArray(orders)) return;
        const active = orders.filter((o: { status?: string }) => {
          const s = (o.status || '').toUpperCase();
          return !['CANCELLED', 'COMPLETED', 'DELIVERED', 'RETURNED'].includes(s);
        }).length;
        setActiveOrderCount(active > 0 ? active : null);
      })
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    refreshOrderCount();
  }, [refreshOrderCount, pathname]);

  useRealtimeOrders({
    onOrderEvent: () => refreshOrderCount(),
    showToasts: false,
  });

  const renderSidebarContent = (variant: 'desktop' | 'mobile') => {
    const isDesktop = variant === 'desktop';

    return (
      <div className="flex h-full flex-col px-3.5 py-5">
        {/* Brand Header */}
        <div className="mb-6 flex items-center justify-between px-2">
          <Link href="/" onClick={onClose} className="group flex items-center gap-2.5">
            <img
              src="/logos/verndly.png"
              alt="Verndly"
              className="h-7 w-7 shrink-0 object-contain transition-transform duration-200 group-hover:scale-105"
            />
            <div>
              <span className="text-foreground block text-sm font-semibold leading-tight tracking-tight">
                Verndly
              </span>
              <span className="text-muted block text-[10px] font-medium tracking-wide">
                Seller Hub
              </span>
            </div>
          </Link>

          {!isDesktop && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close navigation"
              className="bg-surface text-muted hover:text-foreground flex h-9 w-9 items-center justify-center rounded-xl transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Navigation with Expandable Sub-tabs, Track Lines & Animated Select Indicators */}
        <nav
          aria-label="Seller dashboard navigation"
          className="flex-1 space-y-1 overflow-y-auto pr-0.5"
        >
          {NAV_GROUPS.map((group) => {
            const groupActive = isGroupActive(pathname, group);
            const hasSubItems = Boolean(group.subItems && group.subItems.length > 0);
            const isExpanded = hasSubItems && isGroupExpanded(group.id);
            const Icon = group.icon;

            // Determine active sub-item (handles dynamic /products/[id] falling back to All Products)
            const activeSubHref = hasSubItems
              ? (group.subItems!.find((sub) => isRouteActive(pathname, sub.href, sub.exact))
                  ?.href ?? (groupActive ? group.subItems![0].href : null))
              : null;

            return (
              <div key={group.id} className="space-y-0.5">
                <div className="relative flex items-center">
                  {/* Sliding Background Highlight */}
                  {groupActive && (
                    <motion.div
                      layoutId={`sidebar-active-bg-${variant}`}
                      transition={SPRING_INDICATOR}
                      className={clsx(
                        'pointer-events-none absolute inset-0 rounded-xl',
                        isDesktop ? 'bg-background' : 'bg-surface',
                      )}
                    />
                  )}

                  {/* Left Vertical Select Indicator Bar */}
                  {groupActive && (
                    <motion.span
                      layoutId={`sidebar-active-bar-${variant}`}
                      transition={SPRING_INDICATOR}
                      className="pointer-events-none absolute left-1 top-1/2 z-10 h-4 w-[3px] -translate-y-1/2 rounded-full bg-[var(--color-accent)]"
                    />
                  )}

                  {hasSubItems ? (
                    <div className="relative z-10 flex w-full items-center">
                      <Link
                        href={group.href}
                        onClick={() => {
                          setManualToggle({
                            pathname,
                            overrides: { ...currentOverrides, [group.id]: true },
                          });
                          onClose?.();
                        }}
                        className={clsx(
                          'group flex min-w-0 flex-1 items-center gap-3 rounded-xl py-2.5 pl-4 pr-2 text-[13px] transition-colors',
                          groupActive
                            ? 'text-foreground font-semibold'
                            : 'text-muted hover:text-foreground font-medium',
                        )}
                      >
                        <Icon
                          className={clsx(
                            'h-4 w-4 shrink-0 transition-colors',
                            groupActive
                              ? 'text-[var(--color-accent)]'
                              : 'text-muted group-hover:text-foreground',
                          )}
                        />
                        <span className="truncate">{group.name}</span>
                      </Link>

                      <button
                        type="button"
                        onClick={() => toggleGroup(group.id)}
                        aria-label={`Toggle ${group.name} sub-menu`}
                        aria-expanded={isExpanded}
                        className="text-muted hover:text-foreground mr-1.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors"
                      >
                        <motion.span
                          animate={{ rotate: isExpanded ? 180 : 0 }}
                          transition={{ duration: 0.2, ease: EASE_SMOOTH }}
                          className="flex items-center justify-center"
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </motion.span>
                      </button>
                    </div>
                  ) : (
                    <Link
                      href={group.href}
                      onClick={onClose}
                      className={clsx(
                        'group relative z-10 flex w-full items-center gap-3 rounded-xl py-2.5 pl-4 pr-3 text-[13px] transition-colors',
                        groupActive
                          ? 'text-foreground font-semibold'
                          : 'text-muted hover:text-foreground font-medium',
                      )}
                    >
                      <Icon
                        className={clsx(
                          'h-4 w-4 shrink-0 transition-colors',
                          groupActive
                            ? 'text-[var(--color-accent)]'
                            : 'text-muted group-hover:text-foreground',
                        )}
                      />
                      <span className="flex-1 truncate">{group.name}</span>

                      {group.hasCount && activeOrderCount !== null && (
                        <span
                          className={clsx(
                            'ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold',
                            groupActive
                              ? 'bg-[var(--color-accent)] text-white'
                              : 'bg-foreground/[0.08] text-foreground',
                          )}
                        >
                          {activeOrderCount}
                        </span>
                      )}
                    </Link>
                  )}
                </div>

                {/* Expandable Sub-tabs with Vertical Track Line & Gliding Select Indicator */}
                <AnimatePresence initial={false}>
                  {hasSubItems && isExpanded && (
                    <motion.div
                      key={`${group.id}-sub`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22, ease: EASE_SMOOTH }}
                      className="overflow-hidden"
                    >
                      <div className="relative ml-[22px] py-1 pl-3.5">
                        {/* Continuous vertical track line */}
                        <span
                          aria-hidden="true"
                          className="bg-foreground/[0.08] pointer-events-none absolute bottom-2 left-0 top-2 w-[1.5px] rounded-full"
                        />

                        <div className="space-y-0.5">
                          {group.subItems!.map((sub) => {
                            const isSubActive = activeSubHref === sub.href;
                            return (
                              <Link
                                key={sub.href}
                                href={sub.href}
                                onClick={onClose}
                                className={clsx(
                                  'group relative flex items-center rounded-lg px-2.5 py-2 text-xs transition-colors',
                                  isSubActive
                                    ? 'text-foreground font-semibold'
                                    : 'text-muted hover:text-foreground font-medium',
                                )}
                              >
                                {/* Sliding track-line active select indicator */}
                                {isSubActive && (
                                  <motion.span
                                    layoutId={`sidebar-sub-track-${variant}`}
                                    transition={SPRING_INDICATOR}
                                    className="pointer-events-none absolute -left-[14.5px] bottom-1.5 top-1.5 w-[2.5px] rounded-full bg-[var(--color-accent)]"
                                  />
                                )}

                                {/* Subtle active background fill */}
                                {isSubActive && (
                                  <motion.span
                                    layoutId={`sidebar-sub-pill-${variant}`}
                                    transition={SPRING_INDICATOR}
                                    className={clsx(
                                      'pointer-events-none absolute inset-0 rounded-lg',
                                      isDesktop ? 'bg-foreground/[0.05]' : 'bg-surface',
                                    )}
                                  />
                                )}

                                <span className="relative z-10 truncate">{sub.name}</span>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </nav>

        {/* Footer: Storefront Card + Sign Out (zero borders, flat tonal) */}
        <div className="mt-4 space-y-2 pt-3">
          {user?.seller_profile && (
            <Link
              href={
                user.seller_profile.store_link
                  ? `/s/${user.seller_profile.store_link}`
                  : '/dashboard/settings/store'
              }
              target={user.seller_profile.store_link ? '_blank' : undefined}
              rel={user.seller_profile.store_link ? 'noopener noreferrer' : undefined}
              onClick={onClose}
              className={clsx(
                'group flex items-center gap-2.5 rounded-2xl p-2.5 transition-colors',
                isDesktop
                  ? 'bg-background hover:bg-background/80'
                  : 'bg-surface hover:bg-foreground/[0.06]',
              )}
            >
              <div className="bg-surface text-foreground flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-xl text-xs font-semibold uppercase">
                {user.seller_profile.logo_url ? (
                  <img
                    src={user.seller_profile.logo_url}
                    alt={user.seller_profile.store_name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  user.seller_profile.store_name.charAt(0)
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-foreground truncate text-xs font-semibold leading-tight">
                  {user.seller_profile.store_name}
                </p>
                <p className="text-muted mt-0.5 text-[10px] font-medium">View storefront</p>
              </div>
              <ExternalLink className="text-muted group-hover:text-foreground h-3.5 w-3.5 shrink-0 transition-colors" />
            </Link>
          )}

          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-medium text-red-500 transition-colors hover:bg-red-500/10"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Desktop Permanent Sidebar Rail — flat tonal bg-surface, zero border, zero shadow */}
      <aside className="bg-surface fixed left-0 top-0 z-40 hidden h-screen w-64 lg:block">
        {renderSidebarContent('desktop')}
      </aside>

      {/* Mobile Slide-Over Drawer — smooth spring motion, zero border, zero shadow */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              key="sidebar-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 bg-black/50 lg:hidden"
            >
              <button
                type="button"
                aria-label="Close navigation overlay"
                onClick={onClose}
                className="h-full w-full cursor-default"
              />
            </motion.div>
            <motion.aside
              key="sidebar-drawer"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 36, mass: 0.9 }}
              className="bg-background fixed left-0 top-0 z-50 h-dvh w-[280px] max-w-[85vw] lg:hidden"
            >
              {renderSidebarContent('mobile')}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
