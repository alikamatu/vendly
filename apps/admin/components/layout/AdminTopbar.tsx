'use client';

import React, { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Menu, Sun, Moon, Bell, LogOut, User, Shield, ExternalLink } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useOperations } from '@/contexts/OperationsContext';

export function AdminTopbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  const { toggleSidebar, badges } = useOperations();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Auto-close profile menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Format title from pathname
  const getPageTitle = () => {
    if (pathname === '/') return 'Dashboard Overview';
    const segment = pathname.split('/')[1];
    if (!segment) return 'Dashboard';
    return segment.charAt(0).toUpperCase() + segment.slice(1).replace('-', ' ');
  };

  return (
    <header className="bg-card border-border sticky top-0 z-20 flex h-16 items-center justify-between border-b px-4 md:px-6">
      {/* Left: Mobile menu toggle + breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="text-muted-foreground hover:text-foreground -ml-2 rounded-lg p-2 md:hidden"
          aria-label="Toggle navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2">
          <h1 className="text-foreground text-[15px] font-semibold tracking-tight">
            {getPageTitle()}
          </h1>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Storefront Link */}
        <a
          href={process.env.NEXT_PUBLIC_STORE_URL || 'http://localhost:3000'}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-foreground border-border hover:bg-muted/40 hidden items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-colors sm:inline-flex"
        >
          <span>Storefront</span>
          <ExternalLink className="h-3 w-3" />
        </a>

        {/* Notifications Icon */}
        <Link
          href="/notifications"
          className="text-muted-foreground hover:text-foreground hover:bg-muted/40 relative rounded-lg p-2 transition-colors"
          title="Notifications"
        >
          <Bell className="h-4 w-4" />
          {badges.unreadNotifications > 0 && (
            <span className="bg-brand absolute right-1.5 top-1.5 h-2 w-2 rounded-full" />
          )}
        </Link>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="text-muted-foreground hover:text-foreground hover:bg-muted/40 rounded-lg p-2 transition-colors"
          aria-label="Toggle theme"
          title={resolvedTheme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
        >
          {resolvedTheme === 'dark' ? (
            <Sun className="h-4 w-4 text-amber-400" />
          ) : (
            <Moon className="h-4 w-4 text-zinc-600" />
          )}
        </button>

        {/* User Profile Menu */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileOpen((prev) => !prev)}
            className="hover:ring-border flex items-center gap-2.5 rounded-full p-1 transition-all hover:ring-2 focus:outline-none"
          >
            <div className="bg-brand/10 border-brand/20 text-brand flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold uppercase">
              {user?.full_name?.charAt(0) || user?.email?.charAt(0) || 'A'}
            </div>
          </button>

          {/* Profile Dropdown */}
          {profileOpen && (
            <div className="bg-card border-border animate-in fade-in zoom-in-95 absolute right-0 z-50 mt-2 w-56 rounded-2xl border py-1.5 text-xs shadow-xl duration-100">
              <div className="border-border/80 border-b px-3.5 py-2.5">
                <p className="text-foreground truncate font-semibold">
                  {user?.full_name || 'Administrator'}
                </p>
                <p className="text-muted-foreground mt-0.5 truncate text-[11px]">{user?.email}</p>
                <div className="mt-1.5 inline-flex items-center gap-1 rounded bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-purple-600 dark:text-purple-400">
                  <Shield className="h-2.5 w-2.5" />
                  ADMIN
                </div>
              </div>

              <div className="py-1">
                <Link
                  href="/settings"
                  onClick={() => setProfileOpen(false)}
                  className="text-muted-foreground hover:text-foreground hover:bg-muted/50 flex items-center gap-2.5 px-3.5 py-2 transition-colors"
                >
                  <User className="h-3.5 w-3.5" />
                  <span>Admin Settings</span>
                </Link>
                <button
                  onClick={() => {
                    setProfileOpen(false);
                    logout();
                  }}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-rose-600 transition-colors hover:bg-rose-500/10 dark:text-rose-400"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
