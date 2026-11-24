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
  MessageCircle,
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

  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusGroup, setStatusGroup] = useState<StatusGroup>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [hotOnly, setHotOnly] = useState(false);
  const [lowOnly, setLowOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>('newest');

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

  useEffect(() => {
    const processCallback = async () => {
      const hotSalePayment = searchParams.get('hot_sale_payment');
      const reference = searchParams.get('reference');
      const productId = searchParams.get('product_id');
      if (!token || hotSalePayment !== '1' || !reference || !productId) return;

      setPromotionStates((prev) => ({ ...prev, [productId]: 'verifying' }));
      toast.info('Verifying Hot Sales boost payment...');

      try {
        const verifyResult = await productApi.verifyHotSalesPayment(token, reference, productId);
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

  const handleQuickStatusToggle = async (id: string, currentStatus: string) => {
    if (!token) return;
    const nextStatus = currentStatus === 'active' ? 'draft' : 'active';

    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, status: nextStatus } : p)));

    try {
      await productApi.updateStatus(token, id, nextStatus);
      toast.success(`Listing status updated to ${nextStatus.toUpperCase()}`);
    } catch (err: any) {
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, status: currentStatus } : p)));
      toast.error(err?.message || 'Failed to update status');
    }
  };

  const handleQuickStockUpdate = async (id: string, newStock: number) => {
    if (!token || newStock < 0) return;

    const previousProduct = products.find((p) => p.id === id);
    const oldQty = previousProduct?.quantity_available ?? 0;

    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, quantity_available: newStock } : p)),
    );

    try {
      await productApi.updateStock(token, id, newStock);
      toast.success(`Inventory updated to ${newStock}`);
    } catch (err: any) {
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, quantity_available: oldQty } : p)),
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

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) {
      if (p.category) set.add(p.category);
    }
    return Array.from(set).sort();
  }, [products]);

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
          const hay =
            `${p.title} ${p.category || ''} ${p.brand || ''} ${(p.tags || []).join(' ')}`.toLowerCase();
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

  if (isLoading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-7 w-7 animate-spin text-[var(--color-accent)]" />
        <p className="text-xs font-medium uppercase tracking-wider text-[var(--color-muted)]">
          Loading catalog...
        </p>
      </div>
    );
  }

  const anyFilterActive =
    statusGroup !== 'all' || categoryFilter !== 'all' || hotOnly || lowOnly || !!searchQuery.trim();

  return (
    <div className="w-full space-y-6">
      <div className="space-y-3">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-foreground)] sm:text-3xl">
              Products &amp; Inventory
            </h1>
            <p className="mt-1 text-xs text-[var(--color-muted)] sm:text-sm">
              Showing{' '}
              <span className="font-semibold text-[var(--color-foreground)]">
                {filtered.length}
              </span>{' '}
              of{' '}
              <span className="font-semibold text-[var(--color-foreground)]">
                {products.length}
              </span>{' '}
              listings
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-xl bg-[var(--color-surface)] p-1">
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`rounded-lg p-1.5 text-xs font-medium transition-colors ${
                  viewMode === 'cards'
                    ? 'bg-[var(--color-foreground)] text-[var(--color-background)]'
                    : 'text-[var(--color-muted)] hover:text-[var(--color-foreground)]'
                }`}
                title="Card View"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`rounded-lg p-1.5 text-xs font-medium transition-colors ${
                  viewMode === 'table'
                    ? 'bg-[var(--color-foreground)] text-[var(--color-background)]'
                    : 'text-[var(--color-muted)] hover:text-[var(--color-foreground)]'
                }`}
                title="Compact Table View"
              >
                <List className="h-4 w-4" />
              </button>
            </div>

            <button
              onClick={() => fetchProducts(true)}
              disabled={refreshing}
              className="hover:bg-foreground/[0.06] inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-surface)] text-[var(--color-foreground)] transition disabled:opacity-60"
              title="Refresh listings"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <Link
              href="/dashboard/products/whatsapp-import"
              className="bg-emerald-500/12 inline-flex h-9 items-center gap-1.5 rounded-xl px-3.5 text-xs font-semibold text-emerald-600 transition hover:bg-emerald-500/20 dark:text-emerald-400"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">WhatsApp</span>
            </Link>
            <Link
              href="/dashboard/products/import"
              className="hover:bg-foreground/[0.06] inline-flex h-9 items-center gap-1.5 rounded-xl bg-[var(--color-surface)] px-3.5 text-xs font-medium text-[var(--color-foreground)] transition"
            >
              <Upload className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Bulk CSV</span>
            </Link>
            <Link
              href="/dashboard/products/add"
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[var(--color-foreground)] px-4 text-xs font-semibold text-[var(--color-background)] transition hover:opacity-90"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Product</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <StatTile
          icon={<Boxes className="h-4 w-4" />}
          label="Total"
          value={String(products.length)}
          hint="all catalog items"
        />
        <StatTile
          icon={<CircleDot className="h-4 w-4 text-emerald-500" />}
          label="Active"
          value={String(stats.active)}
          hint={`${stats.drafts} draft${stats.drafts === 1 ? '' : 's'}`}
        />
        <StatTile
          accent={stats.lowStock + stats.outOfStock > 0}
          icon={<PackageX className="h-4 w-4" />}
          label="Low / Out"
          value={String(stats.lowStock + stats.outOfStock)}
          hint={stats.outOfStock > 0 ? `${stats.outOfStock} sold out` : '≤ 5 left in stock'}
        />
        <StatTile
          icon={<Eye className="h-4 w-4 text-[var(--color-accent)]" />}
          label="Total Views"
          value={stats.totalViews.toLocaleString()}
          hint="across all products"
        />
      </div>

      <div className="space-y-3 rounded-3xl bg-[var(--color-surface)] p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted)]" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by product name, category, brand, or tag..."
            className="h-11 w-full rounded-2xl bg-[var(--color-background)] pl-10 pr-9 text-xs text-[var(--color-foreground)] transition placeholder:text-[var(--color-muted)] focus:outline-none sm:text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <span className="mr-1.5 shrink-0 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
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
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  active
                    ? 'bg-[var(--color-foreground)] text-[var(--color-background)]'
                    : 'bg-[var(--color-background)] text-[var(--color-foreground)] hover:opacity-80'
                }`}
              >
                <span>{g.label}</span>
                <span
                  className={`rounded-full px-1.5 text-[10px] ${
                    active
                      ? 'bg-[var(--color-background)]/20 text-[var(--color-background)]'
                      : 'bg-[var(--color-surface)] text-[var(--color-muted)]'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {categories.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1">
            <span className="mr-1.5 shrink-0 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
              Category:
            </span>
            <button
              type="button"
              onClick={() => setCategoryFilter('all')}
              className={`rounded-lg px-2.5 py-1 text-xs transition ${
                categoryFilter === 'all'
                  ? 'bg-[var(--color-accent)] font-medium text-white'
                  : 'text-[var(--color-muted)] hover:bg-[var(--color-background)] hover:text-[var(--color-foreground)]'
              }`}
            >
              All
            </button>
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategoryFilter(c)}
                className={`whitespace-nowrap rounded-lg px-2.5 py-1 text-xs transition ${
                  categoryFilter === c
                    ? 'bg-[var(--color-accent)] font-medium text-white'
                    : 'text-[var(--color-muted)] hover:bg-[var(--color-background)] hover:text-[var(--color-foreground)]'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 overflow-x-auto pt-1">
          <label className="inline-flex h-8 shrink-0 cursor-pointer select-none items-center gap-1.5 rounded-full bg-[var(--color-background)] px-3 text-xs font-medium transition hover:opacity-80">
            <input
              type="checkbox"
              checked={hotOnly}
              onChange={(e) => setHotOnly(e.target.checked)}
              className="h-3.5 w-3.5 rounded accent-[var(--color-accent)]"
            />
            <Flame className="h-3.5 w-3.5 fill-current text-amber-500" />
            <span>Hot Sales only</span>
          </label>

          <label className="inline-flex h-8 shrink-0 cursor-pointer select-none items-center gap-1.5 rounded-full bg-[var(--color-background)] px-3 text-xs font-medium transition hover:opacity-80">
            <input
              type="checkbox"
              checked={lowOnly}
              onChange={(e) => setLowOnly(e.target.checked)}
              className="h-3.5 w-3.5 rounded accent-[var(--color-accent)]"
            />
            <PackageX className="h-3.5 w-3.5 text-red-500" />
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
              className="h-8 shrink-0 px-2 text-xs font-semibold text-[var(--color-danger)] hover:underline"
            >
              Reset filters
            </button>
          )}

          <div className="ml-auto flex shrink-0 items-center gap-2">
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

      {error && (
        <Alert
          variant="error"
          title="Listing Error"
          message={error}
          onDismiss={() => setError(null)}
        />
      )}

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

      {viewMode === 'table' && (
        <div className="overflow-x-auto rounded-3xl bg-[var(--color-surface)] p-2">
          {filtered.length > 0 ? (
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted)]">
                  <th className="px-4 py-3">Item</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Stock</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((product) => {
                  const qty = Number(product.quantity_available ?? 0);
                  const isOut = qty === 0;
                  const isLow = qty > 0 && qty <= 5;
                  const isActive = product.status === 'active';

                  return (
                    <tr
                      key={product.id}
                      className="group transition-colors hover:bg-[var(--color-background)]"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Link
                            href={`/dashboard/products/${product.id}`}
                            className="relative block h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-[var(--color-background)]"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={product.image_urls?.[0] || '/placeholder-product.png'}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                            {product.is_featured && (
                              <span className="absolute left-0.5 top-0.5 rounded-full bg-amber-500 p-0.5 text-white">
                                <Flame className="h-2 w-2 fill-current" />
                              </span>
                            )}
                          </Link>
                          <div className="min-w-0 max-w-xs">
                            <Link
                              href={`/dashboard/products/${product.id}`}
                              className="line-clamp-1 font-semibold text-[var(--color-foreground)] hover:text-[var(--color-accent)]"
                            >
                              {product.title}
                            </Link>
                            <span className="block font-mono text-[10px] text-[var(--color-muted)]">
                              #{product.id.slice(0, 8)}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 font-medium text-[var(--color-muted)]">
                        {product.category}
                      </td>

                      <td className="px-4 py-3 font-bold tabular-nums text-[var(--color-foreground)]">
                        {product.currency || 'GH₵'}
                        {parseFloat(product.price).toLocaleString()}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleQuickStockUpdate(product.id, Math.max(0, qty - 1))}
                            className="flex h-6 w-6 items-center justify-center rounded-lg bg-[var(--color-background)] text-xs font-bold text-[var(--color-foreground)] hover:opacity-80"
                            title="Decrease stock"
                          >
                            -
                          </button>
                          <span
                            className={`min-w-8 rounded-md px-2 py-0.5 text-center text-[11px] font-bold tabular-nums ${
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
                            className="flex h-6 w-6 items-center justify-center rounded-lg bg-[var(--color-background)] text-xs font-bold text-[var(--color-foreground)] hover:opacity-80"
                            title="Increase stock"
                          >
                            +
                          </button>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => handleQuickStatusToggle(product.id, product.status)}
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                            isActive
                              ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400'
                              : 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 dark:text-amber-400'
                          }`}
                          title="Click to toggle status"
                        >
                          {product.status}
                        </button>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/dashboard/products/${product.id}`}
                            className="hover:bg-[var(--color-border)]/20 rounded-lg p-1.5 text-[var(--color-muted)] transition-colors hover:text-[var(--color-foreground)]"
                            title="Manage Hub"
                          >
                            <Sliders className="h-3.5 w-3.5" />
                          </Link>
                          <DropdownMenu
                            trigger={
                              <button
                                type="button"
                                className="hover:bg-[var(--color-border)]/20 rounded-lg p-1.5 text-[var(--color-muted)] transition-colors hover:text-[var(--color-foreground)]"
                                title="More Actions"
                              >
                                <MoreHorizontal className="h-3.5 w-3.5" />
                              </button>
                            }
                            items={[
                              {
                                label: 'Manage Hub',
                                icon: <Sliders className="h-3.5 w-3.5" />,
                                onClick: () => router.push(`/dashboard/products/${product.id}`),
                              },
                              {
                                label: 'Edit Details',
                                icon: <Edit2 className="h-3.5 w-3.5" />,
                                onClick: () =>
                                  router.push(`/dashboard/products/edit/${product.id}`),
                              },
                              {
                                label: 'View Public Page',
                                icon: <ExternalLink className="h-3.5 w-3.5" />,
                                onClick: () => window.open(`/product/${product.id}`, '_blank'),
                              },
                              {
                                label: isActive ? 'Set as Draft' : 'Publish as Active',
                                icon: <CircleDot className="h-3.5 w-3.5" />,
                                onClick: () => handleQuickStatusToggle(product.id, product.status),
                              },
                              {
                                label: 'Delete Product',
                                icon: <Trash2 className="h-3.5 w-3.5" />,
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
      className={`rounded-3xl p-4 transition-colors ${
        accent ? 'bg-amber-500/10' : 'bg-[var(--color-surface)]'
      }`}
    >
      <div className="flex items-center gap-1.5">
        <span className={accent ? 'text-amber-500' : 'text-[var(--color-muted)]'}>{icon}</span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted)]">
          {label}
        </span>
      </div>
      <div
        className={`mt-1.5 text-xl font-bold tabular-nums sm:text-2xl ${
          accent ? 'text-amber-600 dark:text-amber-400' : 'text-[var(--color-foreground)]'
        }`}
      >
        {value}
      </div>
      {hint && (
        <div className="mt-0.5 truncate text-[10px] font-medium text-[var(--color-muted)]">
          {hint}
        </div>
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
    <div className="space-y-4 rounded-3xl bg-[var(--color-surface)] px-4 py-16 text-center">
      <div className="bg-[var(--color-accent)]/10 mx-auto flex h-12 w-12 items-center justify-center rounded-2xl text-[var(--color-accent)]">
        <Package className="h-6 w-6" />
      </div>
      <div className="mx-auto max-w-sm">
        <h3 className="text-base font-semibold text-[var(--color-foreground)]">
          {hasProducts ? 'No products match your filters' : 'Your store has no products yet'}
        </h3>
        <p className="mt-1 text-xs text-[var(--color-muted)]">
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
              <Plus className="mr-1.5 h-4 w-4" /> Add New Product
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
