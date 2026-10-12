'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  User,
  LayoutDashboard,
  ShoppingBag,
  Heart,
  LogOut,
  Settings,
  Package,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  X,
  Store,
  Activity,
} from 'lucide-react';
import { useAuth } from '@/lib/contexts/auth-context';
import clsx from '@/utils/clsx';
import Portal from '../common/Portal';
import useMediaQuery from '@/hooks/useMediaQuery';

// Alias for motion components to avoid strict prop typing issues
const MotionDiv: any = motion.div;

export default function UserMenu() {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [menuCoords, setMenuCoords] = useState<{ top: number; right: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const isMobile = useMediaQuery('(max-width: 768px)');
  const pathname = usePathname();

  const isDashboard = pathname?.startsWith('/dashboard');
  // Public user profile on desktop becomes a curved animated sidebar menu
  const isSidebarMode = !isMobile && !isDashboard;

  // Measure dropdown anchor coordinates when opening on desktop dashboard
  useEffect(() => {
    if (isOpen && !isMobile && !isSidebarMode && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setMenuCoords({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
  }, [isOpen, isMobile, isSidebarMode]);

  // Lock body scroll when mobile drawer or desktop sidebar is open
  useEffect(() => {
    if (isOpen && (isMobile || isSidebarMode)) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen, isMobile, isSidebarMode]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Close menu when clicking outside (for in-dashboard dropdown)
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (triggerRef.current && !triggerRef.current.contains(event.target as Node)) {
        // Handled by backdrop, safeguard here
      }
    }
    if (isOpen && !isMobile && !isSidebarMode) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, isMobile, isSidebarMode]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  if (!user) return null;

  const isSeller = user.role === 'SELLER';
  const isAdmin = user.role === 'ADMIN';

  // Desktop Sidebar Drawer Variants (for public site)
  const sidebarVariants = {
    hidden: { x: '100%', opacity: 0.5 },
    visible: { x: 0, opacity: 1 },
  };

  // Mobile Bottom Sheet Variants (preserved: bottom up)
  const mobileVariants = {
    hidden: { y: '100%', opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };

  // Desktop In-Dashboard Dropdown Variants
  const dropdownVariants = {
    hidden: { opacity: 0, y: 10, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1 },
  };

  const navLinks = isDashboard
    ? [
        {
          label: 'Dashboard',
          href: '/dashboard',
          icon: LayoutDashboard,
          show: true,
        },
        {
          label: 'My Products',
          href: '/dashboard/products',
          icon: Package,
          show: isSeller,
        },
        {
          label: 'Orders',
          href: '/dashboard/orders',
          icon: ShoppingBag,
          show: true,
        },
        {
          label: 'Store Settings',
          href: '/dashboard/settings/store',
          icon: Store,
          show: isSeller,
        },
        {
          label: 'Personal Info',
          href: '/dashboard/settings/profile',
          icon: User,
          show: true,
        },
        {
          label: 'Activity Log',
          href: '/dashboard/settings/activity',
          icon: Activity,
          show: true,
        },
        {
          label: 'Settings',
          href: '/dashboard/settings',
          icon: Settings,
          show: true,
        },
      ]
    : [
        {
          label: 'My Profile',
          href: isSeller ? '/dashboard/settings/profile' : '/account/profile',
          icon: User,
          show: true,
        },
        {
          label: 'Dashboard',
          href: '/dashboard',
          icon: LayoutDashboard,
          show: isSeller || isAdmin,
        },
        {
          label: 'Manage Products',
          href: '/dashboard/products',
          icon: Package,
          show: isSeller,
        },
        {
          label: 'Open Cart',
          href: '/cart',
          icon: ShoppingBag,
          show: true,
        },
        {
          label: 'Orders',
          href: isSeller ? '/dashboard/orders' : '/orders',
          icon: ShoppingBag,
          show: true,
        },
        { label: 'Favorites', href: '/favorites', icon: Heart, show: true },
        {
          label: 'Settings',
          href: isSeller ? '/dashboard/settings' : '/account',
          icon: Settings,
          show: true,
        },
      ];

  const roleLabel = isSeller ? 'Seller Account' : isAdmin ? 'Admin Account' : 'Verified Buyer';

  return (
    <div className="relative">
      {/* Trigger Button in Header */}
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className="hover:bg-surface hover:border-border group flex items-center gap-2 rounded-2xl border border-transparent p-1 transition-all active:scale-95"
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="Toggle user menu"
      >
        <div className="bg-primary/10 border-primary/20 text-primary group-hover:border-primary/40 flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl border shadow-sm transition-colors md:h-10 md:w-10 md:rounded-2xl">
          {user.seller_profile?.logo_url ? (
            <img
              src={user.seller_profile.logo_url}
              alt="Profile"
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-xs font-medium uppercase tracking-tighter transition-transform group-hover:scale-110 md:text-sm">
              {user.full_name
                ?.split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2) || <User className="h-4 w-4" />}
            </span>
          )}
        </div>
        <div className="hidden flex-col items-start pr-1 sm:flex">
          <span className="text-foreground max-w-[100px] truncate text-[10px] font-medium uppercase tracking-wider md:text-[11px]">
            {user.full_name.split(' ')[0]}
          </span>
          <span
            className={clsx(
              'mt-0.5 text-[8px] font-normal uppercase leading-none tracking-wide md:text-[9px]',
              isSeller ? 'text-primary' : 'text-muted',
            )}
          >
            {user.role}
          </span>
        </div>
        <ChevronDown
          size={14}
          className={clsx('text-muted transition-transform duration-300', isOpen && 'rotate-180')}
        />
      </button>

      {/* Menu Overlay & Container */}
      <AnimatePresence>
        {isOpen && (
          <Portal>
            {/* Backdrop */}
            <MotionDiv
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClose}
              className="fixed inset-0 z-[100] bg-black/60"
            />

            {/* Menu Container */}
            <MotionDiv
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={
                isMobile ? mobileVariants : isSidebarMode ? sidebarVariants : dropdownVariants
              }
              transition={{
                type: 'spring',
                damping: isSidebarMode ? 28 : 25,
                stiffness: isSidebarMode ? 280 : 200,
              }}
              role="dialog"
              aria-modal="true"
              aria-label="User navigation menu"
              className={clsx(
                'fixed z-[101] flex flex-col overflow-hidden',
                // Mobile: Bottom-up sheet (preserved)
                isMobile &&
                  'bg-background border-border shadow-2xl-up inset-x-0 bottom-0 max-h-[90vh] rounded-t-[2.5rem] border-t',
                // Desktop Public: Curved animated sidebar menu from right
                isSidebarMode &&
                  'bg-background/98 border-border/80 inset-y-0 right-0 w-full max-w-[360px] rounded-l-[2.5rem] border-l shadow-[-20px_0_60px_rgba(0,0,0,0.2)] backdrop-blur-2xl sm:max-w-[400px] sm:rounded-l-[3rem] dark:shadow-[-20px_0_60px_rgba(0,0,0,0.6)]',
                // Desktop Dashboard: Compact dropdown anchored under avatar
                !isMobile &&
                  !isSidebarMode &&
                  'bg-background border-border/60 mt-2 w-72 rounded-3xl border shadow-2xl',
              )}
              style={!isMobile && !isSidebarMode && menuCoords ? menuCoords : undefined}
            >
              {/* Mobile grab handle */}
              {isMobile && (
                <div className="bg-muted/30 mx-auto mb-1 mt-3 h-1.5 w-12 shrink-0 rounded-full" />
              )}

              {/* DESKTOP SIDEBAR VIEW */}
              {isSidebarMode ? (
                <div className="flex h-full flex-col overflow-hidden">
                  {/* Sidebar Header */}
                  <div className="border-border/50 bg-surface/40 border-b p-6 pb-4">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3.5">
                        <div className="h-13 w-13 bg-primary/10 border-primary/20 text-primary relative flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border shadow-sm">
                          {user.seller_profile?.logo_url ? (
                            <img
                              src={user.seller_profile.logo_url}
                              alt={user.full_name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="text-base font-semibold uppercase tracking-tight">
                              {user.full_name
                                ?.split(' ')
                                .map((n) => n[0])
                                .join('')
                                .slice(0, 2) || <User className="h-5 w-5" />}
                            </span>
                          )}
                          <span className="ring-background absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 ring-2" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-foreground truncate text-sm font-bold">
                            {user.full_name}
                          </h3>
                          <p className="text-muted mt-0.5 truncate text-xs">{user.email}</p>
                          <div className="bg-primary/10 text-primary border-primary/20 mt-1.5 inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider">
                            <span className="bg-primary h-1.5 w-1.5 animate-pulse rounded-full" />
                            {roleLabel}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={handleClose}
                        aria-label="Close user menu"
                        className="bg-surface/80 hover:bg-surface border-border/50 text-muted hover:text-foreground rounded-xl border p-2 transition-all active:scale-90"
                      >
                        <X size={18} />
                      </button>
                    </div>

                    {/* Seller Store Link Banner */}
                    {isSeller && user.seller_profile?.store_link && (
                      <div className="bg-primary/5 border-primary/15 text-primary mt-3 flex items-center justify-between rounded-2xl border px-3.5 py-2.5 text-xs">
                        <span className="text-[11px] font-medium uppercase tracking-wider">
                          Seller Profile Active
                        </span>
                        <Link
                          href={`/s/${user.seller_profile.store_link}`}
                          onClick={handleClose}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold hover:underline"
                        >
                          Visit Store <ExternalLink size={11} />
                        </Link>
                      </div>
                    )}
                  </div>

                  {/* Sidebar Nav Links */}
                  <div className="flex-1 space-y-1.5 overflow-y-auto px-4 py-4">
                    {navLinks
                      .filter((link) => link.show)
                      .map((link) => {
                        const isActive = pathname === link.href;
                        return (
                          <Link
                            key={link.href}
                            href={link.href}
                            onClick={handleClose}
                            className={clsx(
                              'group flex items-center justify-between rounded-2xl px-3.5 py-3 transition-all',
                              isActive
                                ? 'bg-primary/10 text-primary border-primary/20 border font-semibold'
                                : 'text-foreground hover:bg-surface hover:border-border/60 hover:text-primary border border-transparent',
                            )}
                          >
                            <div className="flex min-w-0 items-center gap-3.5">
                              <div
                                className={clsx(
                                  'rounded-xl p-2 transition-colors',
                                  isActive
                                    ? 'bg-primary text-primary-foreground shadow-sm'
                                    : 'bg-surface text-muted group-hover:bg-primary/10 group-hover:text-primary',
                                )}
                              >
                                <link.icon size={18} />
                              </div>
                              <span className="truncate text-xs font-medium uppercase tracking-wider">
                                {link.label}
                              </span>
                            </div>
                            <ChevronRight
                              size={15}
                              className={clsx(
                                'text-muted group-hover:text-primary transition-transform group-hover:translate-x-1',
                                isActive && 'text-primary translate-x-0.5',
                              )}
                            />
                          </Link>
                        );
                      })}
                  </div>

                  {/* Sidebar Footer */}
                  <div className="border-border/50 bg-surface/30 mt-auto border-t p-4">
                    <button
                      onClick={() => {
                        logout();
                        handleClose();
                      }}
                      className="group flex w-full items-center justify-center gap-2.5 rounded-2xl border border-transparent px-4 py-3 text-xs font-semibold uppercase tracking-wider text-red-500 transition-all hover:border-red-500/20 hover:bg-red-500/10 active:scale-95"
                    >
                      <LogOut
                        size={17}
                        className="transition-transform group-hover:-translate-x-0.5"
                      />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* MOBILE VIEW & IN-DASHBOARD DESKTOP VIEW */
                <div className={clsx('p-2', isMobile ? 'px-4 pb-10' : 'p-2')}>
                  {/* Header Section */}
                  <div
                    className={clsx(
                      'mb-2 flex items-center justify-between',
                      isMobile
                        ? 'border-border/50 border-b py-6'
                        : 'bg-surface/50 border-border/20 rounded-2xl border p-4',
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 text-primary flex h-12 w-12 items-center justify-center rounded-2xl font-mono text-lg font-medium">
                        {user.full_name[0]}
                      </div>
                      <div>
                        <p className="text-foreground text-xs font-medium uppercase tracking-wider">
                          {user.full_name}
                        </p>
                        <p className="text-muted mt-0.5 text-[10px]">{user.email}</p>
                      </div>
                    </div>
                    {isMobile && (
                      <button
                        onClick={handleClose}
                        className="bg-surface text-muted rounded-full p-2 transition-transform active:scale-90"
                      >
                        <X size={20} />
                      </button>
                    )}
                  </div>

                  {/* Seller Stats / Quick Info */}
                  {isSeller && !isMobile && (
                    <div className="text-primary bg-primary/5 border-primary/10 mb-4 flex items-center justify-between rounded-xl border px-4 py-2 text-[9px] font-medium uppercase tracking-wider">
                      <span>Seller Profile Active</span>
                      <Link
                        href={`/s/${user.seller_profile?.store_link}`}
                        onClick={handleClose}
                        className="flex items-center gap-1 hover:underline"
                      >
                        Store <ExternalLink size={10} />
                      </Link>
                    </div>
                  )}

                  {/* Nav Links */}
                  <div className={clsx('space-y-1', isMobile ? 'mt-4 space-y-2' : '')}>
                    {navLinks
                      .filter((link) => link.show)
                      .map((link) => (
                        <Link
                          key={link.href}
                          href={link.href}
                          onClick={handleClose}
                          className={clsx(
                            'group flex items-center gap-4 rounded-2xl transition-all',
                            isMobile
                              ? 'text-foreground active:bg-surface active:border-border/50 border border-transparent px-5 py-4 text-sm font-normal'
                              : 'text-muted hover:text-primary hover:bg-primary/5 px-4 py-3 text-[10px] font-medium uppercase tracking-wider',
                          )}
                        >
                          <link.icon
                            size={isMobile ? 22 : 18}
                            className={clsx(
                              'transition-transform group-hover:scale-110 group-active:scale-95',
                              isMobile ? 'text-primary/70' : 'text-muted group-hover:text-primary',
                            )}
                          />
                          <span>{link.label}</span>
                        </Link>
                      ))}
                  </div>

                  {/* Footer Section */}
                  <div
                    className={clsx(
                      'mt-2 pt-2',
                      isMobile
                        ? 'border-border/50 mt-6 border-t pt-4'
                        : 'border-border/20 border-t',
                    )}
                  >
                    <button
                      onClick={() => {
                        logout();
                        handleClose();
                      }}
                      className={clsx(
                        'group flex w-full items-center gap-4 rounded-2xl text-red-500 transition-all',
                        isMobile
                          ? 'px-5 py-5 text-sm font-normal active:bg-red-50'
                          : 'px-4 py-3 text-[10px] font-medium uppercase tracking-wider hover:bg-red-500/5',
                      )}
                    >
                      <LogOut
                        size={isMobile ? 22 : 18}
                        className="transition-transform group-hover:translate-x-1"
                      />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </MotionDiv>
          </Portal>
        )}
      </AnimatePresence>
    </div>
  );
}
