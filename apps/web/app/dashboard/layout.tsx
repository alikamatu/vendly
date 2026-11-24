'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { LayoutDashboard, Package, Plus, ShoppingBag, Menu } from 'lucide-react';
import Sidebar from '@/components/dashboard/Sidebar';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

const EASE_SMOOTH = [0.22, 1, 0.36, 1] as const;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
      </div>
    </ProtectedRoute>
  );
}
