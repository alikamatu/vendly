'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Search,
  X,
  Package,
  ShoppingBag,
  LayoutDashboard,
  TrendingUp,
  Star,
  Activity,
  Bell,
  Store,
  User,
  ShieldCheck,
  Palette,
  HelpCircle,
  FileText,
  ExternalLink,
  Plus,
  Moon,
  Sun,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/lib/contexts/auth-context';
import { useTheme } from '@/lib/contexts/theme';
import { productApi } from '@/lib/api/product';
import { orderApi } from '@/lib/api/order';
import Portal from '@/components/common/Portal';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SearchItem {
  id: string;
  category: 'Navigation' | 'Settings' | 'Products' | 'Orders' | 'Actions';
  title: string;
  subtitle?: string;
  badge?: string;
  badgeColor?: string;
  icon: React.ElementType;
  href?: string;
  action?: () => void;
}

export default function DashboardSearchModal({ isOpen, onClose }: SearchModalProps) {
  const router = useRouter();
  const { user, token } = useAuth();
  const { theme, setTheme } = useTheme();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cached seller products & orders for fast searching
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const dataFetchedRef = useRef(false);

  // Fetch products and orders on first open
  useEffect(() => {
    if (!isOpen || !token || dataFetchedRef.current) return;
    dataFetchedRef.current = true;

    Promise.allSettled([
      productApi.getSellerProducts(token).catch(() => []),
      orderApi.getSellerOrders(token).catch(() => []),
    ])
      .then(([prodRes, ordRes]) => {
        if (prodRes.status === 'fulfilled' && Array.isArray(prodRes.value)) {
          setProducts(prodRes.value);
        }
        if (ordRes.status === 'fulfilled' && Array.isArray(ordRes.value)) {
          setOrders(ordRes.value);
        }
      });
  }, [isOpen, token]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Static Dashboard Pages & Settings
  const baseNavigationItems: SearchItem[] = useMemo(
    () => [
      {
        id: 'nav-overview',
        category: 'Navigation',
        title: 'Overview',
        subtitle: 'Dashboard metrics & sales performance',
        icon: LayoutDashboard,
        href: '/dashboard',
      },
      {
        id: 'nav-products',
        category: 'Navigation',
        title: 'My Products',
        subtitle: 'Catalog, pricing & inventory',
        icon: Package,
        href: '/dashboard/products',
      },
      {
        id: 'nav-orders',
        category: 'Navigation',
        title: 'Orders',
        subtitle: 'Customer orders & fulfillment status',
        icon: ShoppingBag,
        href: '/dashboard/orders',
      },
      {
        id: 'nav-analytics',
        category: 'Navigation',
        title: 'Analytics',
        subtitle: 'Revenue, conversion & customer insights',
        icon: TrendingUp,
        href: '/dashboard/analytics',
      },
      {
        id: 'nav-reviews',
        category: 'Navigation',
        title: 'Store Reviews',
        subtitle: 'Customer feedback & ratings',
        icon: Star,
        href: '/dashboard/reviews',
      },
      {
        id: 'nav-notifications',
        category: 'Navigation',
        title: 'Notifications Hub',
        subtitle: 'View all notifications & alerts',
        icon: Bell,
        href: '/dashboard/notifications',
      },
      // Settings sub-pages
      {
        id: 'settings-store',
        category: 'Settings',
        title: 'Store Settings',
        subtitle: 'Store profile, branding & hours',
        icon: Store,
        href: '/dashboard/settings/store',
      },
      {
        id: 'settings-profile',
        category: 'Settings',
        title: 'Personal Info',
        subtitle: 'Account details, contact info & role',
        icon: User,
        href: '/dashboard/settings/profile',
      },
      {
        id: 'settings-security',
        category: 'Settings',
        title: 'Password & Security',
        subtitle: '2-factor auth, session management',
        icon: ShieldCheck,
        href: '/dashboard/settings/security',
      },
      {
        id: 'settings-activity',
        category: 'Settings',
        title: 'Activity & Audit Log',
        subtitle: 'Security audit trail & action logs',
        icon: Activity,
        href: '/dashboard/settings/activity',
      },
      {
        id: 'settings-appearance',
        category: 'Settings',
        title: 'Appearance',
        subtitle: 'Dark mode & visual preferences',
        icon: Palette,
        href: '/dashboard/settings/personalization',
      },
      {
        id: 'settings-help',
        category: 'Settings',
        title: 'Help & FAQ',
        subtitle: 'Seller guides & support desk',
        icon: HelpCircle,
        href: '/dashboard/settings/help',
      },
      {
        id: 'settings-terms',
        category: 'Settings',
        title: 'Terms & Conditions',
        subtitle: 'Platform policies & seller rules',
        icon: FileText,
        href: '/dashboard/settings/terms',
      },
    ],
    []
  );

  // Quick Actions
  const quickActions: SearchItem[] = useMemo(() => {
    const actions: SearchItem[] = [
      {
        id: 'action-add-product',
        category: 'Actions',
        title: 'Add New Product',
        subtitle: 'Create a new listing in your catalog',
        icon: Plus,
        href: '/dashboard/products?action=new',
      },
      {
        id: 'action-toggle-theme',
        category: 'Actions',
        title: `Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`,
        subtitle: 'Toggle dashboard color theme',
        icon: theme === 'dark' ? Sun : Moon,
        action: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
      },
    ];

    if (user?.seller_profile?.store_link) {
      actions.unshift({
        id: 'action-view-store',
        category: 'Actions',
        title: 'View Public Storefront',
        subtitle: `/s/${user.seller_profile.store_link}`,
        icon: ExternalLink,
        href: `/s/${user.seller_profile.store_link}`,
      });
    }

    return actions;
  }, [user, theme, setTheme]);

  // Filtered Results
  const filteredResults = useMemo(() => {
    const q = query.trim().toLowerCase();

    if (!q) {
      // Default state: Quick Actions + Top Navigation
      return [...quickActions, ...baseNavigationItems.slice(0, 6)];
    }

    const matches: SearchItem[] = [];

    // 1. Navigation & Settings matches
    for (const item of baseNavigationItems) {
      if (item.title.toLowerCase().includes(q) || item.subtitle?.toLowerCase().includes(q)) {
        matches.push(item);
      }
    }

    // 2. Actions matches
    for (const item of quickActions) {
      if (item.title.toLowerCase().includes(q) || item.subtitle?.toLowerCase().includes(q)) {
        matches.push(item);
      }
    }

    // 3. Products matches
    const productMatches = products
      .filter((p) => {
        const title = (p.title || '').toLowerCase();
        const sku = (p.sku || '').toLowerCase();
        const category = (p.category?.name || '').toLowerCase();
        return title.includes(q) || sku.includes(q) || category.includes(q);
      })
      .slice(0, 6)
      .map((p) => ({
        id: `prod-${p.id}`,
        category: 'Products' as const,
        title: p.title,
        subtitle: `GH¢ ${Number(p.base_price || 0).toFixed(2)} • ${p.quantity_available ?? 0} in stock`,
        badge: p.status === 'active' ? 'Active' : p.status === 'draft' ? 'Draft' : 'Inactive',
        badgeColor:
          p.status === 'active'
            ? 'bg-emerald-500/10 text-emerald-600'
            : 'bg-amber-500/10 text-amber-600',
        icon: Package,
        href: `/dashboard/products?search=${encodeURIComponent(p.title)}`,
      }));
    matches.push(...productMatches);

    // 4. Orders matches
    const orderMatches = orders
      .filter((o) => {
        const id = (o.id || '').toLowerCase();
        const customer = (o.customerName || o.customer_name || '').toLowerCase();
        const phone = (o.customerPhone || o.customer_phone || '').toLowerCase();
        const status = (o.status || '').toLowerCase();
        return id.includes(q) || customer.includes(q) || phone.includes(q) || status.includes(q);
      })
      .slice(0, 5)
      .map((o) => ({
        id: `ord-${o.id}`,
        category: 'Orders' as const,
        title: `Order #${(o.id || '').slice(0, 8).toUpperCase()}`,
        subtitle: `${o.customerName || o.customer_name || 'Customer'} • GH¢ ${Number(o.total || 0).toFixed(2)}`,
        badge: (o.status || 'PENDING').replace('_', ' '),
        badgeColor:
          o.status === 'COMPLETED' || o.status === 'DELIVERED'
            ? 'bg-emerald-500/10 text-emerald-600'
            : 'bg-blue-500/10 text-blue-600',
        icon: ShoppingBag,
        href: `/dashboard/orders?search=${encodeURIComponent((o.id || '').slice(0, 8))}`,
      }));
    matches.push(...orderMatches);

    return matches;
  }, [query, baseNavigationItems, quickActions, products, orders]);

  // Keep selectedIndex in bounds
  useEffect(() => {
    if (selectedIndex >= filteredResults.length) {
      setSelectedIndex(Math.max(0, filteredResults.length - 1));
    }
  }, [filteredResults, selectedIndex]);

  // Execute selection
  const handleSelect = useCallback(
    (item: SearchItem) => {
      onClose();
      if (item.action) {
        item.action();
      } else if (item.href) {
        router.push(item.href);
      }
    },
    [onClose, router]
  );

  // Keyboard navigation inside modal
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < filteredResults.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredResults.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = filteredResults[selectedIndex];
      if (item) handleSelect(item);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <Portal>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-[100] bg-black/60 transition-opacity"
      />

      {/* Modal Dialog */}
      <div className="fixed inset-0 z-[101] flex items-end sm:items-start justify-center sm:pt-20 md:pt-24 p-0 sm:p-4 pointer-events-none">
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          transition={{ duration: 0.16, ease: 'easeOut' }}
          className="pointer-events-auto w-full sm:max-w-xl max-h-[85vh] sm:max-h-[600px] flex flex-col rounded-t-3xl sm:rounded-3xl bg-background border border-border/70 overflow-hidden shadow-none"
        >
          {/* Top Search Input */}
          <div className="flex items-center gap-3 px-4 sm:px-5 py-3.5 border-b border-border/60 bg-surface/30">
            <Search className="w-4 h-4 text-muted shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search products, orders, settings, or actions..."
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted/70 focus:outline-none"
            />
            {query ? (
              <button
                onClick={() => setQuery('')}
                className="p-1 rounded-lg text-muted hover:text-foreground hover:bg-surface transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <span className="hidden sm:inline-flex items-center text-[10px] font-mono font-medium text-muted bg-surface px-1.5 py-0.5 rounded border border-border/60">
                ESC
              </span>
            )}
          </div>

          {/* Results List */}
          <div className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-1">
            {filteredResults.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <p className="text-sm text-foreground font-medium">No results found</p>
                <p className="text-xs text-muted mt-1">
                  We couldn&apos;t find anything matching &quot;{query}&quot; in your dashboard.
                </p>
              </div>
            ) : (
              filteredResults.map((item, index) => {
                const isSelected = index === selectedIndex;
                const Icon = item.icon;

                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-2xl cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-primary/10 text-primary border border-primary/20'
                        : 'hover:bg-surface text-foreground border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                          isSelected
                            ? 'bg-primary text-background'
                            : 'bg-surface border border-border/60 text-muted'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-medium leading-tight truncate">
                            {item.title}
                          </span>
                          {item.badge && (
                            <span
                              className={`text-[9px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                                item.badgeColor || 'bg-surface text-muted border border-border/60'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </div>
                        {item.subtitle && (
                          <p className="text-[11px] text-muted truncate mt-0.5">
                            {item.subtitle}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 text-muted">
                      <span className="text-[9px] uppercase tracking-wider hidden sm:inline-block font-mono">
                        {item.category}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Controls / Shortcuts */}
          <div className="hidden sm:flex items-center justify-between px-4 py-2.5 border-t border-border/60 bg-surface/30 text-[10px] text-muted">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-background border border-border/70 font-mono text-[9px]">
                  ↑
                </kbd>
                <kbd className="px-1.5 py-0.5 rounded bg-background border border-border/70 font-mono text-[9px]">
                  ↓
                </kbd>
                to navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-background border border-border/70 font-mono text-[9px]">
                  ↵
                </kbd>
                to select
              </span>
            </div>
            <span>Dashboard Global Search</span>
          </div>
        </motion.div>
      </div>
    </Portal>
  );
}
