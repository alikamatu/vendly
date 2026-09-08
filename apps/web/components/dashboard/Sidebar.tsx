'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Settings,
  LogOut,
  Star,
  TrendingUp,
  X,
  ExternalLink,
  Wallet,
} from 'lucide-react';
import clsx from '@/utils/clsx';
import { useAuth } from '@/lib/contexts/auth-context';
import { orderApi } from '@/lib/api/order';
import { useRealtimeOrders } from '@/hooks/useRealtimeOrders';
import { motion, AnimatePresence } from 'framer-motion';

const navItems = [
  { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { name: 'My Products', href: '/dashboard/products', icon: Package },
  { name: 'Orders', href: '/dashboard/orders', icon: ShoppingBag, hasCount: true },
  { name: 'Finances', href: '/dashboard/payouts', icon: Wallet },
  { name: 'Analytics', href: '/dashboard/analytics', icon: TrendingUp },
  { name: 'Reviews', href: '/dashboard/reviews', icon: Star },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { logout, user, token } = useAuth();
  const [activeOrderCount, setActiveOrderCount] = useState<number | null>(null);

  const refreshOrderCount = React.useCallback(() => {
    if (!token) return;
    orderApi
      .getSellerOrders(token)
      .then((orders) => {
        if (!Array.isArray(orders)) return;
        const active = orders.filter((o: any) => {
          const s = (o.status || '').toUpperCase();
          return !['CANCELLED', 'COMPLETED', 'DELIVERED', 'RETURNED'].includes(s);
        }).length;
        setActiveOrderCount(active > 0 ? active : null);
      })
      .catch(() => {});
  }, [token]);

  // Fetch active / pending seller order count for sidebar badge
  useEffect(() => {
    refreshOrderCount();
  }, [refreshOrderCount, pathname]);

  // Real-time synchronization: update badge count whenever an order event fires
  useRealtimeOrders({
    onOrderEvent: () => refreshOrderCount(),
    showToasts: false,
  });

  return (
    <>
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/60 lg:hidden"
            {...({} as any)}
          />
        )}
      </AnimatePresence>

      <aside
        className={clsx(
          'fixed left-0 top-0 z-50 h-screen w-72 border-r border-border/60 bg-background transition-transform duration-300 ease-in-out lg:translate-x-0',
          isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full shadow-none',
        )}
      >
        <div className="flex h-full flex-col px-5 py-6">
          {/* Brand Header */}
          <div className="mb-8 flex items-center justify-between px-2">
            <Link href="/" className="group flex items-center gap-3">
              <img
                src="/logos/verndly.png"
                alt="Verndly"
                className="h-8 w-8 shrink-0 object-contain transition-transform group-hover:scale-105"
              />
              <div>
                <span className="block text-sm font-semibold tracking-tight text-foreground">
                  Verndly
                </span>
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted">
                  Seller Hub
                </span>
              </div>
            </Link>

            {/* Close button on mobile */}
            <button
              onClick={onClose}
              aria-label="Close sidebar"
              className="flex h-8 w-8 items-center justify-center rounded-xl text-muted hover:bg-surface hover:text-foreground transition-colors lg:hidden"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1.5">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== '/dashboard' && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={clsx(
                    'group relative flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-xs font-medium transition-all duration-200',
                    isActive
                      ? 'bg-primary/10 text-primary font-semibold border border-primary/20'
                      : 'text-muted hover:bg-surface/80 hover:text-foreground border border-transparent',
                  )}
                >
                  <item.icon
                    className={clsx(
                      'h-4 w-4 shrink-0 transition-colors',
                      isActive ? 'text-primary' : 'text-muted group-hover:text-foreground',
                    )}
                  />
                  <span className="flex-1 truncate">{item.name}</span>

                  {/* Order count badge */}
                  {item.hasCount && activeOrderCount !== null && (
                    <span
                      className={clsx(
                        'ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold transition-colors',
                        isActive
                          ? 'bg-primary text-background'
                          : 'bg-surface border border-border/70 text-foreground',
                      )}
                    >
                      {activeOrderCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Footer Store Info & Sign Out */}
          <div className="mt-auto space-y-3 pt-4 border-t border-border/40">
            {user?.seller_profile && (
              <div className="rounded-2xl border border-border/60 bg-surface/40 p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                    My Storefront
                  </p>
                  {user.seller_profile.store_link && (
                    <Link
                      href={`/s/${user.seller_profile.store_link}`}
                      target="_blank"
                      className="text-muted hover:text-foreground text-[10px] flex items-center gap-0.5"
                    >
                      <ExternalLink className="h-2.5 w-2.5" />
                    </Link>
                  )}
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-background text-[10px] font-semibold uppercase text-primary">
                    {user.seller_profile.logo_url ? (
                      <img
                        src={user.seller_profile.logo_url}
                        alt="Store Logo"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      user.seller_profile.store_name.charAt(0)
                    )}
                  </div>
                  <p className="truncate text-xs font-medium text-foreground">
                    {user.seller_profile.store_name}
                  </p>
                </div>
              </div>
            )}

            <button
              onClick={logout}
              className="flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-xs font-medium text-red-500 transition-colors hover:bg-red-500/10 border border-transparent hover:border-red-500/20"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
