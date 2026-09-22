'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/ui/logo';
import { ADMIN_NAV_SECTIONS } from '@/lib/constants';
import { useOperations } from '@/contexts/OperationsContext';

export function AdminSidebar({
  collapsed,
  onToggleCollapse,
}: {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  const pathname = usePathname();
  const { badges, sidebarOpen, setSidebarOpen } = useOperations();

  const getBadgeCount = (key?: string): number => {
    if (!key) return 0;
    return (badges as unknown as Record<string, number>)[key] || 0;
  };

  const navContent = (
    <div className="flex h-full select-none flex-col">
      {/* Brand Header */}
      <div className="border-border/80 flex h-16 shrink-0 items-center justify-between border-b px-5">
        <Link
          href="/"
          className="group flex items-center gap-3 focus:outline-none"
          onClick={() => setSidebarOpen(false)}
        >
          <Logo size="sm" showText={false} />
          {(!collapsed || sidebarOpen) && (
            <div className="flex flex-col">
              <span className="text-foreground flex items-center gap-1.5 text-[14px] font-semibold tracking-tight">
                Vendly{' '}
                <span className="text-brand py-0.2 bg-brand/10 rounded px-1.5 text-[11px] font-normal">
                  Ops
                </span>
              </span>
              <span className="text-muted-foreground text-[10px] uppercase tracking-wider">
                Platform Admin
              </span>
            </div>
          )}
        </Link>
        {sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(false)}
            className="text-muted-foreground hover:text-foreground rounded-lg p-1.5 md:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Nav List */}
      <div className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        {ADMIN_NAV_SECTIONS.map((section) => (
          <div key={section.title} className="space-y-1">
            {(!collapsed || sidebarOpen) && (
              <p className="text-muted-foreground/70 px-3 text-[10px] font-semibold uppercase tracking-wider">
                {section.title}
              </p>
            )}
            <div className="space-y-0.5 pt-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                const badgeCount = getBadgeCount(item.badgeKey);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      'group relative flex items-center justify-between rounded-xl px-3 py-2 text-[13px] font-medium transition-colors',
                      isActive
                        ? 'bg-foreground/5 text-foreground dark:bg-muted/60 font-semibold'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/40',
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Icon
                        className={cn(
                          'h-4 w-4 shrink-0 transition-transform group-hover:scale-105',
                          isActive ? 'text-brand' : 'text-muted-foreground',
                        )}
                      />
                      {(!collapsed || sidebarOpen) && (
                        <span className="truncate">{item.title}</span>
                      )}
                    </div>

                    {/* Active bar indicator */}
                    {isActive && (
                      <motion.div
                        layoutId="activeIndicator"
                        className="bg-brand absolute bottom-1.5 left-0 top-1.5 w-1 rounded-r-full"
                        transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                      />
                    )}

                    {/* Badge */}
                    {(!collapsed || sidebarOpen) && badgeCount > 0 && (
                      <span className="bg-brand ml-auto inline-flex shrink-0 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white">
                        {badgeCount > 99 ? '99+' : badgeCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer / Status */}
      <div className="border-border/80 shrink-0 border-t p-3">
        <div className="bg-muted/30 border-border/50 text-muted-foreground flex items-center justify-between rounded-xl border px-3 py-2 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            {(!collapsed || sidebarOpen) && <span>Postgres Connected</span>}
          </div>
          {onToggleCollapse && !sidebarOpen && (
            <button
              onClick={onToggleCollapse}
              className="hover:text-foreground p-1"
              title="Toggle sidebar"
            >
              <ChevronRight
                className={cn('h-3.5 w-3.5 transition-transform', !collapsed && 'rotate-180')}
              />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'bg-card border-border sticky top-0 z-30 hidden h-screen shrink-0 flex-col border-r transition-all duration-200 md:flex',
          collapsed ? 'w-18' : 'w-64',
        )}
      >
        {navContent}
      </aside>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {sidebarOpen && (
          <div className="fixed inset-0 z-[9995] md:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black/70"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="bg-card border-border fixed inset-y-0 left-0 z-10 w-72 max-w-[85vw] border-r shadow-2xl"
            >
              {navContent}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
