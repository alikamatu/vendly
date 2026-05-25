'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ShoppingBag, Package, Settings, LogOut, Store, Star, Activity, TrendingUp } from 'lucide-react';
import clsx from '@/utils/clsx';
import { useAuth } from '@/lib/contexts/auth-context';
import { motion, AnimatePresence } from 'framer-motion';

const navItems = [
  { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { name: 'My Products', href: '/dashboard/products', icon: Package },
  { name: 'Orders', href: '/dashboard/orders', icon: ShoppingBag },
  { name: 'Analytics', href: '/dashboard/analytics', icon: TrendingUp },
  { name: 'Reviews', href: '/dashboard/reviews', icon: Star },
  { name: 'Activity', href: '/dashboard/activity', icon: Activity },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { logout, user } = useAuth();

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
            className="bg-background/60 fixed inset-0 z-40 backdrop-blur-sm lg:hidden"
            {...({} as any)}
          />
        )}
      </AnimatePresence>

      <aside
        className={clsx(
          'border-border bg-background fixed left-0 top-0 z-50 h-screen w-72 border-r shadow-2xl transition-transform lg:translate-x-0 lg:shadow-none',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-full flex-col px-6 py-8">
          {/* Brand */}
          <div className="mb-10 flex items-center gap-3 px-2">
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-red-500 text-white shadow-lg shadow-red-500/10">
              {user?.seller_profile?.logo_url ? (
                <img
                  src={user.seller_profile.logo_url}
                  alt="Store logo"
                  className="h-full w-full object-cover"
                />
              ) : (
                <Store className="h-5 w-5" />
              )}
            </div>
            <div>
              <span className="text-md text-foreground block font-medium leading-none tracking-tight">
                Vendly
              </span>
              <span className="text-muted text-[9px] font-normal uppercase tracking-wider">
                Seller Hub
              </span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1.5">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={clsx(
                    'group relative flex items-center gap-3 rounded-2xl px-4 py-3 text-xs font-normal transition-all duration-300',
                    isActive
                      ? 'bg-primary/5 text-primary'
                      : 'text-muted hover:bg-surface hover:text-foreground',
                  )}
                >
                  <item.icon
                    className={clsx(
                      'h-4 w-4 transition-transform duration-300 group-hover:scale-110',
                      isActive ? 'text-primary' : 'text-muted group-hover:text-foreground',
                    )}
                  />
                  <span className="flex-1">{item.name}</span>
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active"
                      className="absolute inset-y-0 -left-6 w-1 rounded-r-full bg-red-500"
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Footer info/Logout */}
          <div className="mt-auto space-y-4">
            {user?.seller_profile && (
              <div className="bg-surface border-border/50 rounded-2xl border p-3">
                <p className="text-muted mb-2 text-[10px] font-normal uppercase tracking-wider">
                  My Store
                </p>
                <div className="flex items-center gap-3">
                  <div className="border-border bg-background text-primary flex h-8 w-8 items-center justify-center overflow-hidden rounded-xl border text-[10px] font-normal uppercase">
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
                  <p className="text-foreground truncate text-xs font-normal">
                    {user.seller_profile.store_name}
                  </p>
                </div>
              </div>
            )}

            <button
              onClick={logout}
              className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-xs font-normal text-red-500 transition-all hover:bg-red-500/5"
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
