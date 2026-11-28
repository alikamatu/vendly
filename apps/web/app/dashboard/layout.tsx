'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Package,
  Plus,
  ShoppingBag,
  Menu,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import Sidebar from '@/components/dashboard/Sidebar';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/lib/contexts/auth-context';
import SellerExperiencePrompt from '@/components/dashboard/SellerExperiencePrompt';

const EASE_SMOOTH = [0.22, 1, 0.36, 1] as const;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const isUnverifiedStore =
    user?.role === 'SELLER' &&
    Boolean(user.seller_profile) &&
    user.seller_profile?.is_seller_verified === false;

  const getTitle = (path: string) => {
    if (path === '/dashboard') return 'Overview';
    if (path === '/dashboard/products/add') return 'Add Products';
    if (path === '/dashboard/products/whatsapp-import') return 'WhatsApp Import';
    if (path === '/dashboard/products/import') return 'Bulk CSV Import';
    if (path.startsWith('/dashboard/products/edit')) return 'Edit Product';
    if (path.startsWith('/dashboard/products')) return 'Products';
    if (path.startsWith('/dashboard/orders')) return 'Orders';
    if (path.startsWith('/dashboard/payouts')) return 'Payouts';
    if (path.startsWith('/dashboard/transactions')) return 'Transactions';
    if (path.startsWith('/dashboard/analytics')) return 'Analytics';
    if (path.startsWith('/dashboard/reviews')) return 'Reviews';
    if (path.startsWith('/dashboard/activity')) return 'Activity';
    if (path.startsWith('/dashboard/notifications')) return 'Notifications';
    if (path === '/dashboard/settings/activity') return 'Activity Log';
    if (path === '/dashboard/settings/store') return 'Storefront';
    if (path === '/dashboard/settings/profile') return 'Personal Info';
    if (path === '/dashboard/settings/security') return 'Security';
    if (path === '/dashboard/settings/personalization') return 'Appearance';
    if (path === '/dashboard/settings/help') return 'Help & FAQ';
    if (path === '/dashboard/settings/terms') return 'Terms & Policies';
    if (path.startsWith('/dashboard/settings')) return 'Settings';
    return 'Dashboard';
  };

  // Hide mobile bottom dock on focused full-height flows that have their own bottom action bar
  const hideMobileDock =
    pathname === '/dashboard/products/add' || pathname.startsWith('/dashboard/products/edit');

  const mobileTabs = [
    {
      id: 'home',
      label: 'Home',
      href: '/dashboard',
      icon: LayoutDashboard,
      active: pathname === '/dashboard',
    },
    {
      id: 'products',
      label: 'Products',
      href: '/dashboard/products',
      icon: Package,
      active: pathname.startsWith('/dashboard/products'),
    },
    {
      id: 'add',
      label: 'Add',
      href: '/dashboard/products/add',
      icon: Plus,
      isPrimary: true,
      active: false,
    },
    {
      id: 'orders',
      label: 'Orders',
      href: '/dashboard/orders',
      icon: ShoppingBag,
      active: pathname.startsWith('/dashboard/orders'),
    },
  ];

  return (
    <ProtectedRoute allowedRoles={['SELLER', 'ADMIN']}>
      <div className="bg-background min-h-dvh w-full">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

        <div className="flex min-h-dvh flex-col lg:ml-64">
          <DashboardHeader title={getTitle(pathname)} onMenuToggle={() => setIsSidebarOpen(true)} />

          {isUnverifiedStore && (
            <div className="mx-auto w-full max-w-[1440px] px-4 pt-3 sm:px-6 lg:px-8">
              <div className="flex flex-col gap-3 rounded-2xl bg-amber-500/10 px-4 py-3 text-amber-950 sm:flex-row sm:items-center sm:justify-between dark:text-amber-100">
                <div className="flex items-start gap-2.5 sm:items-center">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 sm:mt-0 dark:text-amber-400" />
                  <p className="text-xs leading-relaxed">
                    <strong className="font-semibold">
                      {user?.approval_status === 'PENDING'
                        ? 'Seller verification under review — orders paused.'
                        : 'Seller verification required to receive orders.'}
                    </strong>{' '}
                    You can set up your storefront and upload products now, but buyers cannot check
                    out until your verification is approved.
                  </p>
                </div>
                <Link
                  href="/seller-verification"
                  className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-full bg-amber-600 px-3.5 text-[11px] font-semibold text-white transition-opacity hover:opacity-90"
                >
                  <span>
                    {user?.approval_status === 'PENDING'
                      ? 'View verification status'
                      : 'Complete verification'}
                  </span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          )}

          <main
            className={`mx-auto w-full max-w-[1440px] flex-1 px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-7 ${
              hideMobileDock ? 'pb-6' : 'pb-24 lg:pb-8'
            }`}
          >
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24, ease: EASE_SMOOTH }}
              className="w-full"
            >
              {children}
            </motion.div>
          </main>
        </div>

        {/* Mobile-First Bottom Navigation Dock — flat tonal, zero border, zero shadow */}
        {!hideMobileDock && (
          <nav
            aria-label="Mobile quick navigation"
            className="bg-surface fixed bottom-0 left-0 right-0 z-30 pb-[env(safe-area-inset-bottom)] lg:hidden"
          >
            <div className="grid h-16 grid-cols-5 items-center px-2">
              {mobileTabs.map((tab) => {
                const Icon = tab.icon;
                if (tab.isPrimary) {
                  return (
                    <Link
                      key={tab.id}
                      href={tab.href}
                      aria-label="Add product"
                      className="flex flex-col items-center justify-center"
                    >
                      <span className="bg-foreground text-background flex h-10 w-10 items-center justify-center rounded-2xl transition-transform active:scale-95">
                        <Icon className="h-5 w-5" />
                      </span>
                    </Link>
                  );
                }

                return (
                  <Link
                    key={tab.id}
                    href={tab.href}
                    className={`relative flex flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium transition-colors ${
                      tab.active ? 'text-foreground font-semibold' : 'text-muted'
                    }`}
                  >
                    {tab.active && (
                      <motion.span
                        layoutId="mobile-dock-indicator"
                        transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                        className="absolute top-0 h-[2.5px] w-7 rounded-full bg-[var(--color-accent)]"
                      />
                    )}
                    <Icon
                      className={`h-[18px] w-[18px] ${
                        tab.active ? 'text-[var(--color-accent)]' : 'text-muted'
                      }`}
                    />
                    <span>{tab.label}</span>
                  </Link>
                );
              })}

              <button
                type="button"
                onClick={() => setIsSidebarOpen(true)}
                className="text-muted hover:text-foreground flex flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium transition-colors"
              >
                <Menu className="h-[18px] w-[18px]" />
                <span>Menu</span>
              </button>
            </div>
          </nav>
        )}
        <SellerExperiencePrompt />
      </div>
    </ProtectedRoute>
  );
}
