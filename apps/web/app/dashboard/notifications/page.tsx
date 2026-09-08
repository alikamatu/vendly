'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Search,
  Filter,
  ShoppingBag,
  Package,
  Store,
  Star,
  Shield,
  ArrowUpRight,
  RefreshCw,
  Clock,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  notificationApi,
  NotificationItem,
  NotificationType,
} from '@/lib/api/notification';
import { useAuth } from '@/lib/contexts/auth-context';
import clsx from '@/utils/clsx';

type FilterTab = 'all' | 'unread' | 'orders' | 'store' | 'system';

function formatRelative(iso: string): string {
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

function getNotificationCategoryIcon(type: NotificationType) {
  if (type.startsWith('ORDER_') || type.startsWith('PAYMENT_') || type.startsWith('PAYOUT_')) {
    return {
      icon: ShoppingBag,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10 border-blue-500/20',
      label: 'Order & Payout',
    };
  }
  if (type.startsWith('PRODUCT_') || type.startsWith('STORE_')) {
    return {
      icon: Package,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10 border-emerald-500/20',
      label: 'Product & Store',
    };
  }
  if (type.includes('REVIEW')) {
    return {
      icon: Star,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10 border-amber-500/20',
      label: 'Review',
    };
  }
  return {
    icon: Bell,
    color: 'text-violet-500',
    bg: 'bg-violet-500/10 border-violet-500/20',
    label: 'System',
  };
}

export default function NotificationsPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await notificationApi.list({ take: 50 });
      setItems(res?.items || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchNotifications();
  };

  const handleMarkAsRead = async (id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, is_read: true } : item))
    );
    try {
      await notificationApi.markRead(id);
    } catch {
      fetchNotifications();
    }
  };

  const handleMarkAllAsRead = async () => {
    setItems((prev) => prev.map((item) => ({ ...item, is_read: true })));
    try {
      await notificationApi.markAllRead();
    } catch {
      fetchNotifications();
    }
  };

  const handleDelete = async (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    try {
      await notificationApi.remove(id);
    } catch {
      fetchNotifications();
    }
  };

  // Filter logic
  const filteredItems = useMemo(() => {
    let result = items;

    // Tab filter
    if (activeTab === 'unread') {
      result = result.filter((n) => !n.is_read);
    } else if (activeTab === 'orders') {
      result = result.filter(
        (n) =>
          n.type.startsWith('ORDER_') ||
          n.type.startsWith('PAYMENT_') ||
          n.type.startsWith('PAYOUT_')
      );
    } else if (activeTab === 'store') {
      result = result.filter(
        (n) =>
          n.type.startsWith('PRODUCT_') ||
          n.type.startsWith('STORE_') ||
          n.type.includes('REVIEW')
      );
    } else if (activeTab === 'system') {
      result = result.filter(
        (n) =>
          n.type === 'SYSTEM' ||
          n.type === 'ADMIN_BROADCAST' ||
          n.type.startsWith('RETURN_')
      );
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (n) =>
          n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q)
      );
    }

    return result;
  }, [items, activeTab, searchQuery]);

  const unreadTotal = items.filter((n) => !n.is_read).length;

  const tabs: { id: FilterTab; label: string; count?: number }[] = [
    { id: 'all', label: 'All', count: items.length },
    { id: 'unread', label: 'Unread', count: unreadTotal },
    {
      id: 'orders',
      label: 'Orders',
      count: items.filter(
        (n) =>
          n.type.startsWith('ORDER_') ||
          n.type.startsWith('PAYMENT_') ||
          n.type.startsWith('PAYOUT_')
      ).length,
    },
    {
      id: 'store',
      label: 'Store & Products',
      count: items.filter(
        (n) =>
          n.type.startsWith('PRODUCT_') ||
          n.type.startsWith('STORE_') ||
          n.type.includes('REVIEW')
      ).length,
    },
    {
      id: 'system',
      label: 'System',
      count: items.filter(
        (n) =>
          n.type === 'SYSTEM' ||
          n.type === 'ADMIN_BROADCAST' ||
          n.type.startsWith('RETURN_')
      ).length,
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-xs font-medium text-muted hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
          Dashboard
        </Link>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
                  Notifications
                </h1>
                {unreadTotal > 0 && (
                  <span className="rounded-full bg-primary/15 text-primary border border-primary/20 px-2 py-0.5 text-[10px] font-semibold">
                    {unreadTotal} unread
                  </span>
                )}
              </div>
              <p className="text-xs text-muted mt-0.5">
                Stay updated with orders, store activity, and customer interactions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              aria-label="Refresh notifications"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 bg-surface/40 text-muted hover:border-border hover:bg-surface hover:text-foreground transition-colors"
            >
              <RefreshCw
                className={clsx('h-4 w-4', isRefreshing && 'animate-spin')}
              />
            </button>

            {unreadTotal > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-surface/40 px-3 py-2 text-xs font-medium text-foreground hover:border-border hover:bg-surface transition-colors"
              >
                <CheckCheck className="h-3.5 w-3.5 text-primary" />
                <span>Mark all as read</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Horizontal scrolling tabs on mobile */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  'flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-medium transition-colors',
                  isActive
                    ? 'border border-primary/20 bg-primary/10 text-primary font-semibold'
                    : 'border border-transparent bg-surface/40 text-muted hover:bg-surface hover:text-foreground'
                )}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span
                    className={clsx(
                      'rounded-full px-1.5 py-0.2 text-[10px]',
                      isActive
                        ? 'bg-primary text-background font-bold'
                        : 'bg-surface text-muted border border-border/60'
                    )}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64 shrink-0">
          <Search className="text-muted absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 opacity-60" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notifications..."
            className="h-9 w-full rounded-2xl border border-border/60 bg-surface/40 pl-9 pr-3 text-xs text-foreground placeholder:text-muted focus:border-border focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* Notification List */}
      <div className="space-y-2.5">
        {loading ? (
          <div className="space-y-2.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-20 rounded-2xl border border-border/40 bg-surface/30 animate-pulse"
              />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/60 bg-surface/20 p-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border/60 bg-surface text-muted mb-3">
              <Clock className="h-6 w-6 opacity-40" />
            </div>
            <p className="text-sm font-medium text-foreground">
              {searchQuery
                ? 'No notifications match your search'
                : activeTab === 'unread'
                ? 'You are all caught up!'
                : 'No notifications in this category'}
            </p>
            <p className="text-xs text-muted mt-1 max-w-sm">
              {activeTab === 'unread'
                ? 'No unread notifications at the moment. New alerts will automatically appear here.'
                : 'Activity such as new orders, review submissions, and system updates will be logged here.'}
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {filteredItems.map((n) => {
              const meta = getNotificationCategoryIcon(n.type);
              const Icon = meta.icon;

              return (
                <motion.div
                  key={n.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className={clsx(
                    'group relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border p-4 transition-all',
                    n.is_read
                      ? 'border-border/60 bg-surface/30 hover:bg-surface/50'
                      : 'border-primary/20 bg-primary/5 hover:bg-primary/10'
                  )}
                >
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    {/* Category Icon */}
                    <div
                      className={clsx(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border',
                        meta.bg
                      )}
                    >
                      <Icon className={clsx('h-4 w-4', meta.color)} />
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h2 className="text-xs sm:text-sm font-semibold tracking-tight text-foreground truncate">
                          {n.title}
                        </h2>
                        {!n.is_read && (
                          <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                        )}
                        <span className="text-[10px] text-muted font-mono opacity-70">
                          • {formatRelative(n.created_at)}
                        </span>
                      </div>
                      <p className="text-xs text-muted mt-0.5 leading-relaxed break-words">
                        {n.body}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 self-end sm:self-center shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40 w-full sm:w-auto justify-end">
                    {/* Deep link if available */}
                    {n.link && (
                      <Link
                        href={n.link}
                        onClick={() => handleMarkAsRead(n.id)}
                        className="flex items-center gap-1 rounded-xl border border-border/60 bg-surface/50 px-2.5 py-1.5 text-xs font-medium text-foreground hover:border-border hover:bg-surface transition-colors"
                      >
                        <span>View</span>
                        <ArrowUpRight className="h-3 w-3" />
                      </Link>
                    )}

                    {/* Mark as read */}
                    {!n.is_read && (
                      <button
                        onClick={() => handleMarkAsRead(n.id)}
                        aria-label="Mark as read"
                        title="Mark as read"
                        className="flex h-8 w-8 items-center justify-center rounded-xl border border-border/60 bg-surface/40 text-muted hover:border-border hover:bg-surface hover:text-foreground transition-colors"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    )}

                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(n.id)}
                      aria-label="Delete notification"
                      title="Delete"
                      className="flex h-8 w-8 items-center justify-center rounded-xl border border-transparent text-muted hover:border-red-500/20 hover:bg-red-500/10 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
