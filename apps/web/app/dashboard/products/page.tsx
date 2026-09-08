'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  Loader2,
  Package,
  ArrowLeft,
  Flame,
  Upload,
  RefreshCw,
  Boxes,
  Eye,
  PackageX,
  Sparkles,
  CircleDot,
  LayoutGrid,
  List,
  ExternalLink,
  Edit2,
  Sliders,
  X,
  MoreHorizontal,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from '@/lib/contexts/auth-context';
import { productApi } from '@/lib/api/product';
import SellerProductCard from '@/components/products/SellerProductCard';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import ConfirmModal from '@/components/ui/ConfirmModal';
import DropdownMenu from '@/components/ui/DropdownMenu';
import Select from '@/components/ui/Select';

// ─── Status groups + sorts ───────────────────────────────────────────
const STATUS_GROUPS = [
  { key: 'all', label: 'All', match: () => true },
  { key: 'active', label: 'Active', match: (s: string) => s === 'active' },
  { key: 'draft', label: 'Drafts', match: (s: string) => s === 'draft' },
  {
    key: 'out',
    label: 'Out of stock',
    match: (_s: string, p: any) => Number(p?.quantity_available ?? 0) === 0,
  },
] as const;
type StatusGroup = (typeof STATUS_GROUPS)[number]['key'];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'price_desc', label: 'Price high → low' },
  { value: 'price_asc', label: 'Price low → high' },
  { value: 'stock_asc', label: 'Lowest stock' },
  { value: 'views_desc', label: 'Most viewed' },
] as const;
type SortBy = (typeof SORT_OPTIONS)[number]['value'];

const LOW_STOCK_THRESHOLD = 5;

export default function SellerProductsPage() {
  const { token } = useAuth();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [promotionStates, setPromotionStates] = useState<
    Record<string, 'idle' | 'verifying' | 'payment_required' | 'failed'>
  >({});

  // Delete modal state
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusGroup, setStatusGroup] = useState<StatusGroup>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [hotOnly, setHotOnly] = useState(false);
  const [lowOnly, setLowOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>('newest');

  // ─── Fetch + auto-refresh ──────────────────────────────────────────
  async function fetchProducts(silent = false) {
    if (!token) return;
    try {
      if (!silent) setIsLoading(true);
      else setRefreshing(true);
      const data = await productApi.getSellerProducts(token);
      setProducts(data);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to load products');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Hot Sales payment-return handler
  useEffect(() => {
    const processCallback = async () => {
      const hotSalePayment = searchParams.get('hot_sale_payment');
      const reference = searchParams.get('reference');
      const productId = searchParams.get('product_id');
      if (!token || hotSalePayment !== '1' || !reference || !productId) return;

      setPromotionStates((prev) => ({ ...prev, [productId]: 'verifying' }));
      toast.info('Verifying Hot Sales boost payment...');

      try {
        const verifyResult = await productApi.verifyHotSalesPayment(
          token,
          reference,
          productId
        );
        await fetchProducts(true);
        if (verifyResult.verified && verifyResult.is_featured) {
          toast.success('Payment verified! Hot Sales boost is now active.');
        } else {
          toast.warning('Payment verification is pending.');
          setPromotionStates((prev) => ({
            ...prev,
            [productId]: 'payment_required',
          }));
        }
      } catch (err: any) {
        setPromotionStates((prev) => ({ ...prev, [productId]: 'failed' }));
        toast.error(err?.message || 'Failed to verify Hot Sales payment');
      } finally {
        router.replace(pathname);
      }
    };
    processCallback();
  }, [searchParams, token, pathname, router]);

  // ─── Quick Actions ────────────────────────────────────────────────
  const handleQuickStatusToggle = async (id: string, currentStatus: string) => {
    if (!token) return;
    const nextStatus = currentStatus === 'active' ? 'draft' : 'active';

    // Optimistic update
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: nextStatus } : p))
    );

    try {
      await productApi.updateStatus(token, id, nextStatus);
      toast.success(`Listing status updated to ${nextStatus.toUpperCase()}`);
    } catch (err: any) {
      // Revert
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: currentStatus } : p))
      );
      toast.error(err?.message || 'Failed to update status');
    }
  };

  const handleQuickStockUpdate = async (id: string, newStock: number) => {
    if (!token || newStock < 0) return;

    const previousProduct = products.find((p) => p.id === id);
    const oldQty = previousProduct?.quantity_available ?? 0;

    // Optimistic update
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, quantity_available: newStock } : p))
    );

    try {
      await productApi.updateStock(token, id, newStock);
      toast.success(`Inventory updated to ${newStock}`);
    } catch (err: any) {
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, quantity_available: oldQty } : p))
      );
      toast.error(err?.message || 'Failed to update stock');
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!token || !deletingProductId) return;
    setIsDeleting(true);
    try {
      await productApi.deleteProduct(token, deletingProductId);
      setProducts((prev) => prev.filter((p) => p.id !== deletingProductId));
      toast.success('Product deleted permanently.');
      setDeletingProductId(null);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete product');
    } finally {
      setIsDeleting(false);
    }
  };

  // ─── Stats (computed client-side) ──────────────────────────────────
  const stats = useMemo(() => {
    let active = 0;
    let drafts = 0;
    let lowStock = 0;
    let outOfStock = 0;
    let totalViews = 0;
    for (const p of products) {
      if (p.status === 'active') active++;
      if (p.status === 'draft') drafts++;
      const qty = Number(p.quantity_available ?? 0);
      if (qty === 0) outOfStock++;
      else if (qty <= LOW_STOCK_THRESHOLD) lowStock++;
      totalViews += Number(p.views_count || 0);
    }
    return { active, drafts, lowStock, outOfStock, totalViews };
  }, [products]);

  // ─── Category options (derived) ────────────────────────────────────
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) {
      if (p.category) set.add(p.category);
    }
    return Array.from(set).sort();
  }, [products]);

  // ─── Filtered + sorted ─────────────────────────────────────────────
  const filtered = useMemo(() => {
    const group = STATUS_GROUPS.find((g) => g.key === statusGroup)!;
    const q = searchQuery.trim().toLowerCase();
    return products
      .filter((p) => {
        if (!group.match(p.status, p)) return false;
        if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;
        if (hotOnly && !p.is_featured) return false;
        if (lowOnly && Number(p.quantity_available ?? 0) > LOW_STOCK_THRESHOLD) return false;
        if (q) {
          const hay = `${p.title} ${p.category || ''} ${p.brand || ''} ${(p.tags || []).join(' ')}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'oldest':
            return +new Date(a.created_at) - +new Date(b.created_at);
          case 'price_desc':
            return parseFloat(b.price) - parseFloat(a.price);
          case 'price_asc':
            return parseFloat(a.price) - parseFloat(b.price);
          case 'stock_asc':
            return (a.quantity_available || 0) - (b.quantity_available || 0);
          case 'views_desc':
            return (b.views_count || 0) - (a.views_count || 0);
          case 'newest':
          default:
            return +new Date(b.created_at) - +new Date(a.created_at);
        }
      });
  }, [products, statusGroup, categoryFilter, hotOnly, lowOnly, searchQuery, sortBy]);

  // ─── Render ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col h-[60vh] items-center justify-center gap-3">
        <Loader2 className="w-7 h-7 text-[var(--color-accent)] animate-spin" />
        <p className="text-xs text-[var(--color-muted)] font-medium tracking-wider uppercase">
          Loading catalog...
        </p>
      </div>
    );
  }

  const anyFilterActive =
    statusGroup !== 'all' ||
    categoryFilter !== 'all' ||
    hotOnly ||
    lowOnly ||
    !!searchQuery.trim();

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-24 px-3 sm:px-6">
      {/* HEADER */}
      <div className="space-y-3 pt-2">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          Dashboard
        </Link>
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--color-foreground)]">
              Products &amp; Inventory
            </h1>
            <p className="text-xs text-[var(--color-muted)] mt-1">
              Showing <span className="font-semibold text-[var(--color-foreground)]">{filtered.length}</span> of{' '}
              <span className="font-semibold text-[var(--color-foreground)]">{products.length}</span> listings
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-1">
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
                  viewMode === 'cards'
                    ? 'bg-[var(--color-foreground)] text-[var(--color-surface)]'
                    : 'text-[var(--color-muted)] hover:text-[var(--color-foreground)]'
                }`}
                title="Card View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
                  viewMode === 'table'
                    ? 'bg-[var(--color-foreground)] text-[var(--color-surface)]'
                    : 'text-[var(--color-muted)] hover:text-[var(--color-foreground)]'
                }`}
                title="Compact Table View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => fetchProducts(true)}
              disabled={refreshing}
              className="inline-flex items-center justify-center w-9 h-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-foreground)] hover:bg-[var(--color-border)]/20 transition disabled:opacity-60"
              title="Refresh listings"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <Link
              href="/dashboard/products/import"
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs font-medium text-[var(--color-foreground)] hover:bg-[var(--color-border)]/20 transition"
            >
              <Upload className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Bulk CSV</span>
            </Link>
            <Link
              href="/dashboard/products/add"
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-[var(--color-accent)] text-white text-xs font-semibold hover:opacity-90 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Product</span>
            </Link>
          </div>
        </div>
      </div>

      {/* STATS STRIP */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
        <StatTile
          icon={<Boxes className="w-4 h-4" />}
          label="Total"
          value={String(products.length)}
          hint="all catalog items"
        />
        <StatTile
          icon={<CircleDot className="w-4 h-4 text-emerald-500" />}
          label="Active"
          value={String(stats.active)}
          hint={`${stats.drafts} draft${stats.drafts === 1 ? '' : 's'}`}
        />
        <StatTile
          accent={stats.lowStock + stats.outOfStock > 0}
          icon={<PackageX className="w-4 h-4" />}
          label="Low / Out"
          value={String(stats.lowStock + stats.outOfStock)}
          hint={
            stats.outOfStock > 0
              ? `${stats.outOfStock} sold out`
              : '≤ 5 left in stock'
          }
        />
        <StatTile
          icon={<Eye className="w-4 h-4 text-[var(--color-accent)]" />}
          label="Total Views"
          value={stats.totalViews.toLocaleString()}
          hint="across all products"
        />
      </div>

      {/* SEARCH + FILTERS */}
      <div className="space-y-3 bg-[var(--color-surface)] border border-[var(--color-border)] p-4 rounded-2xl">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-muted)] pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by product name, category, brand, or tag..."
            className="w-full h-11 pl-10 pr-9 rounded-xl bg-[var(--color-background)] border border-[var(--color-border)] text-xs sm:text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)] transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Status Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)] shrink-0 mr-1.5">
            Status:
          </span>
          {STATUS_GROUPS.map((g) => {
            const count =
              g.key === 'all'
                ? products.length
                : products.filter((p) => g.match(p.status, p)).length;
            const active = statusGroup === g.key;
            return (
              <button
                key={g.key}
                type="button"
                onClick={() => setStatusGroup(g.key)}
                className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition border ${
                  active
                    ? 'bg-[var(--color-foreground)] text-[var(--color-surface)] border-transparent'
                    : 'bg-[var(--color-background)] text-[var(--color-foreground)] border-[var(--color-border)] hover:border-[var(--color-foreground)]/30'
                }`}
              >
                <span>{g.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    active
                      ? 'bg-[var(--color-surface)]/20 text-[var(--color-surface)]'
                      : 'bg-[var(--color-border)]/50 text-[var(--color-muted)]'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Category Chips */}
        {categories.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 border-t border-[var(--color-border)]/50 pt-2.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)] shrink-0 mr-1.5">
              Category:
            </span>
            <button
              type="button"
              onClick={() => setCategoryFilter('all')}
              className={`text-xs px-2.5 py-1 rounded-lg transition ${
                categoryFilter === 'all'
                  ? 'bg-[var(--color-accent)] text-white font-medium'
                  : 'text-[var(--color-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-border)]/30'
              }`}
            >
              All
            </button>
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategoryFilter(c)}
                className={`text-xs px-2.5 py-1 rounded-lg whitespace-nowrap transition ${
                  categoryFilter === c
                    ? 'bg-[var(--color-accent)] text-white font-medium'
                    : 'text-[var(--color-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-border)]/30'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        )}

        {/* Quick Toggles + Sort Controls */}
        <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-[var(--color-border)]/50">
          <label className="inline-flex items-center gap-1.5 text-xs font-medium cursor-pointer select-none shrink-0 px-3 h-8 border border-[var(--color-border)] rounded-full hover:bg-[var(--color-border)]/20 transition">
            <input
              type="checkbox"
              checked={hotOnly}
              onChange={(e) => setHotOnly(e.target.checked)}
              className="h-3.5 w-3.5 rounded accent-[var(--color-accent)]"
            />
            <Flame className="w-3.5 h-3.5 text-amber-500 fill-current" />
            <span>Hot Sales only</span>
          </label>

          <label className="inline-flex items-center gap-1.5 text-xs font-medium cursor-pointer select-none shrink-0 px-3 h-8 border border-[var(--color-border)] rounded-full hover:bg-[var(--color-border)]/20 transition">
            <input
              type="checkbox"
              checked={lowOnly}
              onChange={(e) => setLowOnly(e.target.checked)}
              className="h-3.5 w-3.5 rounded accent-[var(--color-accent)]"
            />
            <PackageX className="w-3.5 h-3.5 text-red-500" />
            <span>Low stock only</span>
          </label>

          {anyFilterActive && (
            <button
              onClick={() => {
                setStatusGroup('all');
                setCategoryFilter('all');
                setHotOnly(false);
                setLowOnly(false);
                setSearchQuery('');
              }}
              className="shrink-0 text-xs font-semibold text-[var(--color-danger)] hover:underline px-2 h-8"
            >
              Reset filters
            </button>
          )}

          {/* Custom Select for Sorting */}
          <div className="ml-auto shrink-0 flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
              Sort:
            </span>
            <Select
              value={sortBy}
              onChange={(val) => setSortBy(val as SortBy)}
              options={SORT_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              size="sm"
              className="min-w-[140px]"
            />
          </div>
        </div>
      </div>

      {/* Alert Error Display */}
      {error && (
        <Alert
          variant="error"
          title="Listing Error"
          message={error}
          onDismiss={() => setError(null)}
        />
      )}

      {/* VIEW: CARD GRID */}
      {viewMode === 'cards' && (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filtered.length > 0 ? (
              filtered.map((product, idx) => (
                <SellerProductCard
                  key={product.id}
                  product={product}
                  promotionState={promotionStates[product.id] || 'idle'}
                  index={idx}
                  onQuickStatusToggle={handleQuickStatusToggle}
                  onDelete={(id) => setDeletingProductId(id)}
                />
              ))
            ) : (
              <EmptyState
                query={searchQuery}
                anyFilters={anyFilterActive}
                hasProducts={products.length > 0}
                onReset={() => {
                  setStatusGroup('all');
                  setCategoryFilter('all');
                  setHotOnly(false);
                  setLowOnly(false);
                  setSearchQuery('');
                }}
              />
            )}
          </AnimatePresence>
        </div>
      )}

      {/* VIEW: COMPACT TABLE */}
      {viewMode === 'table' && (
        <div className="overflow-x-auto bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl">
          {filtered.length > 0 ? (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-[10px] uppercase font-bold tracking-wider text-[var(--color-muted)] bg-[var(--color-surface)]">
                  <th className="py-3 px-4">Item</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Price</th>
                  <th className="py-3 px-4">Stock</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]/60">
                {filtered.map((product) => {
                  const qty = Number(product.quantity_available ?? 0);
                  const isOut = qty === 0;
                  const isLow = qty > 0 && qty <= 5;
                  const isActive = product.status === 'active';

                  return (
                    <tr
                      key={product.id}
                      className="hover:bg-[var(--color-border)]/10 transition-colors group"
                    >
                      {/* Thumbnail & Title */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <Link
                            href={`/dashboard/products/${product.id}`}
                            className="relative h-10 w-10 shrink-0 rounded-xl overflow-hidden border border-[var(--color-border)] bg-[var(--color-background)] block"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={product.image_urls?.[0] || '/placeholder-product.png'}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                            {product.is_featured && (
                              <span className="absolute top-0.5 left-0.5 p-0.5 rounded-full bg-amber-500 text-white">
                                <Flame className="w-2 h-2 fill-current" />
                              </span>
                            )}
                          </Link>
                          <div className="min-w-0 max-w-xs">
                            <Link
                              href={`/dashboard/products/${product.id}`}
                              className="font-semibold text-[var(--color-foreground)] hover:text-[var(--color-accent)] line-clamp-1"
                            >
                              {product.title}
                            </Link>
                            <span className="text-[10px] text-[var(--color-muted)] block font-mono">
                              #{product.id.slice(0, 8)}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4 text-[var(--color-muted)] font-medium">
                        {product.category}
                      </td>

                      {/* Price */}
                      <td className="py-3 px-4 font-bold text-[var(--color-foreground)] tabular-nums">
                        {product.currency || 'GH₵'}
                        {parseFloat(product.price).toLocaleString()}
                      </td>

                      {/* Stock Stepper */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleQuickStockUpdate(product.id, Math.max(0, qty - 1))}
                            className="w-6 h-6 rounded-lg border border-[var(--color-border)] flex items-center justify-center hover:bg-[var(--color-border)]/20 text-xs font-bold text-[var(--color-foreground)]"
                            title="Decrease stock"
                          >
                            -
                          </button>
                          <span
                            className={`min-w-8 text-center font-bold tabular-nums px-2 py-0.5 rounded-md text-[11px] ${
                              isOut
                                ? 'bg-red-500/10 text-red-600'
                                : isLow
                                  ? 'bg-amber-500/10 text-amber-600'
                                  : 'text-[var(--color-foreground)]'
                            }`}
                          >
                            {qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleQuickStockUpdate(product.id, qty + 1)}
                            className="w-6 h-6 rounded-lg border border-[var(--color-border)] flex items-center justify-center hover:bg-[var(--color-border)]/20 text-xs font-bold text-[var(--color-foreground)]"
                            title="Increase stock"
                          >
                            +
                          </button>
                        </div>
                      </td>

                      {/* Status Toggle */}
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => handleQuickStatusToggle(product.id, product.status)}
                          className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border transition-colors ${
                            isActive
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/20'
                          }`}
                          title="Click to toggle status"
                        >
                          {product.status}
                        </button>
                      </td>

                      {/* Actions Dropdown */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/dashboard/products/${product.id}`}
                            className="p-1.5 rounded-lg text-[var(--color-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-border)]/20 transition-colors"
                            title="Manage Hub"
                          >
                            <Sliders className="w-3.5 h-3.5" />
                          </Link>
                          <DropdownMenu
                            trigger={
                              <button
                                type="button"
                                className="p-1.5 rounded-lg text-[var(--color-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-border)]/20 transition-colors"
                                title="More Actions"
                              >
                                <MoreHorizontal className="w-3.5 h-3.5" />
                              </button>
                            }
                            items={[
                              {
                                label: 'Manage Hub',
                                icon: <Sliders className="w-3.5 h-3.5" />,
                                onClick: () => router.push(`/dashboard/products/${product.id}`),
                              },
                              {
                                label: 'Edit Details',
                                icon: <Edit2 className="w-3.5 h-3.5" />,
                                onClick: () => router.push(`/dashboard/products/edit/${product.id}`),
                              },
                              {
                                label: 'View Public Page',
                                icon: <ExternalLink className="w-3.5 h-3.5" />,
                                onClick: () => window.open(`/product/${product.id}`, '_blank'),
                              },
                              {
                                label: isActive ? 'Set as Draft' : 'Publish as Active',
                                icon: <CircleDot className="w-3.5 h-3.5" />,
                                onClick: () => handleQuickStatusToggle(product.id, product.status),
                              },
                              {
                                label: 'Delete Product',
                                icon: <Trash2 className="w-3.5 h-3.5" />,
                                variant: 'danger',
                                divider: true,
                                onClick: () => setDeletingProductId(product.id),
                              },
                            ]}
                            align="right"
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <EmptyState
              query={searchQuery}
              anyFilters={anyFilterActive}
              hasProducts={products.length > 0}
              onReset={() => {
                setStatusGroup('all');
                setCategoryFilter('all');
                setHotOnly(false);
                setLowOnly(false);
                setSearchQuery('');
              }}
            />
          )}
        </div>
      )}

      {/* Confirmation Modal for Deletion */}
      <ConfirmModal
        isOpen={!!deletingProductId}
        onClose={() => setDeletingProductId(null)}
        onConfirm={handleDeleteConfirmed}
        title="Delete Product"
        description="Are you sure you want to delete this listing? All photos and variant configurations will be permanently removed. This action cannot be undone."
        confirmText="Delete Product"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────

function StatTile({
  icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`p-4 rounded-2xl border transition-colors ${
        accent
          ? 'border-amber-500/30 bg-amber-500/5'
          : 'border-[var(--color-border)] bg-[var(--color-surface)]'
      }`}
    >
      <div className="flex items-center gap-1.5">
        <span className={accent ? 'text-amber-500' : 'text-[var(--color-muted)]'}>{icon}</span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted)]">
          {label}
        </span>
      </div>
      <div
        className={`mt-1.5 text-xl sm:text-2xl font-bold tabular-nums ${
          accent ? 'text-amber-600 dark:text-amber-400' : 'text-[var(--color-foreground)]'
        }`}
      >
        {value}
      </div>
      {hint && (
        <div className="text-[10px] text-[var(--color-muted)] mt-0.5 truncate font-medium">{hint}</div>
      )}
    </div>
  );
}

function EmptyState({
  query,
  anyFilters,
  hasProducts,
  onReset,
}: {
  query: string;
  anyFilters: boolean;
  hasProducts: boolean;
  onReset: () => void;
}) {
  return (
    <div className="py-16 px-4 text-center bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl space-y-4">
      <div className="w-12 h-12 rounded-2xl bg-[var(--color-accent)]/10 text-[var(--color-accent)] flex items-center justify-center mx-auto">
        <Package className="w-6 h-6" />
      </div>
      <div className="max-w-sm mx-auto">
        <h3 className="text-base font-semibold text-[var(--color-foreground)]">
          {hasProducts ? 'No products match your filters' : 'Your store has no products yet'}
        </h3>
        <p className="text-xs text-[var(--color-muted)] mt-1">
          {hasProducts
            ? `No listings matched "${query || 'your active filters'}". Try resetting or adjusting criteria.`
            : 'Start selling across Ghana by publishing your first product listing.'}
        </p>
      </div>
      <div>
        {hasProducts && anyFilters ? (
          <Button variant="secondary" size="sm" onClick={onReset} className="rounded-xl">
            Clear all filters
          </Button>
        ) : (
          <Link href="/dashboard/products/add">
            <Button size="sm" className="rounded-xl">
              <Plus className="w-4 h-4 mr-1.5" /> Add New Product
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
