'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Package,
  Search,
  Star,
  Eye,
  CheckCircle2,
  XCircle,
  Archive,
  Store,
  Plus,
  Pencil,
  Trash2,
  Copy,
  RefreshCw,
  Download,
  ChevronLeft,
  ChevronRight,
  Upload,
  AlertTriangle,
  Layers,
  Tag,
  ArrowUp,
  X,
  FileText,
  ShieldAlert,
  Box,
} from 'lucide-react';
import { AdminShell } from '@/components/layout/AdminShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Spinner } from '@/components/ui/spinner';
import { Alert } from '@/components/ui/alert';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableEmpty,
} from '@/components/ui/table';
import { formatCurrency, dateShort, shortId } from '@/lib/format';
import { cn } from '@/lib/utils';
import type {
  VendlyProduct,
  ProductStatus,
  AdminStoreSummary,
  AdminProductWriteInput,
} from '@/types/operations';
import { useVendlyProducts } from '@/hooks/use-products';
import { VendlyUserService } from '@/services/user.service';
import { VendlyCategoryService } from '@/services/category.service';
import { useToast } from '@/contexts/ToastContext';
import { useConfirm } from '@/contexts/ConfirmContext';

const CONDITIONS = [
  { value: 'new', label: 'Brand New' },
  { value: 'like_new', label: 'Like New' },
  { value: 'good', label: 'Good (Used)' },
  { value: 'fair', label: 'Fair' },
  { value: 'used', label: 'Used' },
];

const STATUS_OPTIONS: ProductStatus[] = ['active', 'draft', 'archived', 'rejected'];

interface ProductEditorState {
  seller_id: string;
  title: string;
  description: string;
  price: string;
  original_price: string;
  currency: string;
  condition: string;
  quantity_available: string;
  status: ProductStatus;
  is_featured: boolean;
  category: string;
  brand: string;
  subcategory: string;
  dimensions: string;
  weight: string;
  color: string;
  material: string;
  warranty: string;
  tagsText: string;
  image_urls: string[];
  video_url: string;
  reason: string;
}

const EMPTY_EDITOR: ProductEditorState = {
  seller_id: '',
  title: '',
  description: '',
  price: '',
  original_price: '',
  currency: 'GHS',
  condition: 'new',
  quantity_available: '1',
  status: 'active',
  is_featured: false,
  category: '',
  brand: '',
  subcategory: '',
  dimensions: '',
  weight: '',
  color: '',
  material: '',
  warranty: '',
  tagsText: '',
  image_urls: [],
  video_url: '',
  reason: '',
};

function productToEditor(p: VendlyProduct): ProductEditorState {
  const attrs = (p.attributes || {}) as Record<string, unknown>;
  return {
    seller_id: p.seller_id || p.seller?.id || '',
    title: p.title || '',
    description: p.description || '',
    price: p.price !== undefined && p.price !== null ? String(p.price) : '',
    original_price:
      p.original_price !== undefined && p.original_price !== null ? String(p.original_price) : '',
    currency: p.currency || 'GHS',
    condition: p.condition || 'new',
    quantity_available: String(p.quantity_available ?? 0),
    status: (STATUS_OPTIONS.includes(p.status?.toLowerCase() as ProductStatus)
      ? p.status.toLowerCase()
      : 'draft') as ProductStatus,
    is_featured: Boolean(p.is_featured),
    category: p.category || '',
    brand: p.brand || '',
    subcategory: typeof attrs.subcategory === 'string' ? attrs.subcategory : '',
    dimensions: typeof attrs.dimensions === 'string' ? attrs.dimensions : '',
    weight: typeof attrs.weight === 'string' ? attrs.weight : '',
    color: typeof attrs.color === 'string' ? attrs.color : '',
    material: typeof attrs.material === 'string' ? attrs.material : '',
    warranty: typeof attrs.warranty === 'string' ? attrs.warranty : '',
    tagsText: Array.isArray(p.tags) ? p.tags.join(', ') : '',
    image_urls: Array.isArray(p.image_urls) ? [...p.image_urls] : [],
    video_url: p.video_url || '',
    reason: '',
  };
}

export default function ProductsPage() {
  const {
    products,
    total,
    totalPages,
    summary,
    categories: dbCategories,
    params,
    setParams,
    loading,
    error,
    refresh,
    createProduct,
    updateProduct,
    uploadMedia,
    duplicateProduct,
    updateStock,
    updateStatus,
    toggleFeatured,
    deleteProduct,
    bulkAction,
  } = useVendlyProducts({ page: 1, limit: 50, sort: 'newest' });

  const { success, error: toastError } = useToast();
  const { confirm } = useConfirm();

  // Reference lists (stores & categories)
  const [stores, setStores] = useState<AdminStoreSummary[]>([]);
  const [managedCategories, setManagedCategories] = useState<string[]>([]);

  useEffect(() => {
    VendlyUserService.getStores({ page: 1, limit: 200 })
      .then((res) => setStores(res.data || []))
      .catch(() => {});
    VendlyCategoryService.list()
      .then((cats) => setManagedCategories((cats || []).map((c) => c.name)))
      .catch(() => {});
  }, []);

  const allCategories = useMemo(() => {
    return Array.from(new Set([...managedCategories, ...dbCategories]))
      .filter(Boolean)
      .sort();
  }, [managedCategories, dbCategories]);

  // Debounced server-side search
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setParams((prev) => {
        if ((prev.search || '') === searchInput.trim()) return prev;
        return { ...prev, search: searchInput.trim() || undefined, page: 1 };
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, setParams]);

  // Multi-select bulk state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkCategoryValue, setBulkCategoryValue] = useState('');
  const [bulkBusy, setBulkBusy] = useState(false);

  // Clear selections when page/filter changes
  useEffect(() => {
    setSelectedIds([]);
  }, [
    params.page,
    params.limit,
    params.status,
    params.category,
    params.seller_id,
    params.search,
    params.stock,
    params.is_featured,
  ]);

  // Modals state
  const [selectedProduct, setSelectedProduct] = useState<VendlyProduct | null>(null);
  const [inspectOpen, setInspectOpen] = useState(false);
  const [moderationReason, setModerationReason] = useState('');

  // Create / Edit Modal
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<VendlyProduct | null>(null);
  const [editor, setEditor] = useState<ProductEditorState>(EMPTY_EDITOR);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [editorSaving, setEditorSaving] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const fileUploadRef = useRef<HTMLInputElement>(null);

  // Quick Stock Modal
  const [stockTarget, setStockTarget] = useState<VendlyProduct | null>(null);
  const [stockValue, setStockValue] = useState('0');
  const [stockReason, setStockReason] = useState('');

  // Smart Delete Modal
  const [deleteTarget, setDeleteTarget] = useState<VendlyProduct | null>(null);
  const [forceDeleteChecked, setForceDeleteChecked] = useState(false);

  // Bulk Delete Modal
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkForceDelete, setBulkForceDelete] = useState(false);

  const [actionLoading, setActionLoading] = useState(false);

  const allOnPageSelected =
    products.length > 0 && products.every((p) => selectedIds.includes(p.id));

  const toggleSelectAll = () => {
    if (allOnPageSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(products.map((p) => p.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  /* ── Handlers ──────────────────────────────────────────────────────── */

  const openCreateModal = () => {
    setEditingProduct(null);
    setEditor({
      ...EMPTY_EDITOR,
      seller_id: stores[0]?.id || '',
      category: allCategories[0] || '',
    });
    setNewImageUrl('');
    setEditorOpen(true);
  };

  const openEditModal = (product: VendlyProduct) => {
    setEditingProduct(product);
    setEditor(productToEditor(product));
    setNewImageUrl('');
    setEditorOpen(true);
  };

  const handleSaveEditor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editor.title.trim()) {
      toastError('Product title is required');
      return;
    }
    if (!editor.category.trim()) {
      toastError('Category is required');
      return;
    }
    const numPrice = Number(editor.price);
    if (!editor.price || Number.isNaN(numPrice) || numPrice <= 0) {
      toastError('Enter a valid price greater than 0');
      return;
    }
    if (!editingProduct && !editor.seller_id) {
      toastError('Please select the seller store that owns this product');
      return;
    }

    const baseAttrs = { ...((editingProduct?.attributes as Record<string, unknown>) || {}) };
    const setOrDelete = (key: string, val: string) => {
      if (val.trim()) baseAttrs[key] = val.trim();
      else delete baseAttrs[key];
    };
    setOrDelete('subcategory', editor.subcategory);
    setOrDelete('dimensions', editor.dimensions);
    setOrDelete('weight', editor.weight);
    setOrDelete('color', editor.color);
    setOrDelete('material', editor.material);
    setOrDelete('warranty', editor.warranty);

    const parsedTags = editor.tagsText
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const payload: AdminProductWriteInput = {
      seller_id: editor.seller_id || undefined,
      title: editor.title.trim(),
      description: editor.description.trim() || null,
      price: String(numPrice),
      original_price: editor.original_price.trim() ? editor.original_price.trim() : null,
      currency: editor.currency || 'GHS',
      condition: editor.condition || 'new',
      quantity_available: Math.max(0, parseInt(editor.quantity_available || '0', 10) || 0),
      status: editor.status,
      is_featured: editor.is_featured,
      category: editor.category.trim(),
      brand: editor.brand.trim() || null,
      attributes: baseAttrs,
      image_urls: editor.image_urls,
      video_url: editor.video_url.trim() || null,
      tags: parsedTags,
      reason: editor.reason.trim() || undefined,
    };

    setEditorSaving(true);
    try {
      if (editingProduct) {
        const updated = await updateProduct(editingProduct.id, payload);
        success(`Updated "${updated.title}"`);
        if (selectedProduct?.id === updated.id) {
          setSelectedProduct(updated);
        }
      } else {
        const created = await createProduct({
          ...payload,
          seller_id: editor.seller_id,
          title: editor.title.trim(),
          price: String(numPrice),
          category: editor.category.trim(),
        });
        success(`Created "${created.title}"`);
      }
      setEditorOpen(false);
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to save product');
    } finally {
      setEditorSaving(false);
    }
  };

  const handleUploadEditorImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !editingProduct) return;
    setUploadingMedia(true);
    try {
      const updated = await uploadMedia(editingProduct.id, files);
      setEditor((prev) => ({ ...prev, image_urls: updated.image_urls || [] }));
      setEditingProduct(updated);
      if (selectedProduct?.id === updated.id) setSelectedProduct(updated);
      success(`Uploaded ${files.length} image(s)`);
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Image upload failed');
    } finally {
      setUploadingMedia(false);
      if (fileUploadRef.current) fileUploadRef.current.value = '';
    }
  };

  const handleAddImageUrl = () => {
    const clean = newImageUrl.trim();
    if (!clean) return;
    if (!/^https?:\/\//i.test(clean)) {
      toastError('Image URL must start with http:// or https://');
      return;
    }
    setEditor((prev) => ({
      ...prev,
      image_urls: [...prev.image_urls, clean],
    }));
    setNewImageUrl('');
  };

  const handleStatusUpdate = async (
    productId: string,
    newStatus: ProductStatus,
    reason?: string,
  ) => {
    if (newStatus === 'rejected') {
      const ok = await confirm({
        title: 'Reject Product Listing',
        description: 'Take down this listing from the public marketplace and mark it as rejected?',
        confirmText: 'Reject Listing',
        variant: 'danger',
      });
      if (!ok) return;
    } else if (newStatus === 'archived') {
      const ok = await confirm({
        title: 'Archive Product Listing',
        description: 'Archive this product? Archived listings cannot be purchased by customers.',
        confirmText: 'Archive Listing',
        variant: 'warning',
      });
      if (!ok) return;
    }

    setActionLoading(true);
    try {
      const updated = await updateStatus(productId, newStatus, reason);
      success(`Product marked as ${newStatus}`);
      if (selectedProduct?.id === productId) {
        setSelectedProduct(updated);
      }
      setModerationReason('');
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Status update failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleFeatured = async (p: VendlyProduct) => {
    setActionLoading(true);
    try {
      const updated = await toggleFeatured(p.id, p.is_featured);
      success(updated.is_featured ? 'Product featured on marketplace' : 'Product unfeatured');
      if (selectedProduct?.id === p.id) {
        setSelectedProduct(updated);
      }
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to toggle featured');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDuplicate = async (p: VendlyProduct) => {
    setActionLoading(true);
    try {
      const cloned = await duplicateProduct(p.id);
      success(`Duplicated "${p.title}" as draft`);
      openEditModal(cloned);
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Duplicate failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStockSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockTarget) return;
    const qty = Math.max(0, parseInt(stockValue || '0', 10) || 0);
    setActionLoading(true);
    try {
      const updated = await updateStock(stockTarget.id, qty, stockReason.trim() || undefined);
      success(`Stock updated to ${updated.quantity_available} units`);
      if (selectedProduct?.id === updated.id) setSelectedProduct(updated);
      setStockTarget(null);
      setStockReason('');
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to update stock');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setActionLoading(true);
    try {
      const res = await deleteProduct(deleteTarget.id, forceDeleteChecked);
      success(res.message || 'Product deleted');
      if (selectedProduct?.id === deleteTarget.id) {
        setInspectOpen(false);
        setSelectedProduct(null);
      }
      setDeleteTarget(null);
      setForceDeleteChecked(false);
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setActionLoading(false);
    }
  };

  const runBulk = async (
    action: 'delete' | 'status' | 'feature' | 'category',
    value?: unknown,
    force = false,
  ) => {
    if (!selectedIds.length) return;
    setBulkBusy(true);
    try {
      const res = await bulkAction({ ids: selectedIds, action, value, force });
      success(`Bulk ${action} applied to ${res.updated} product(s)`);
      setSelectedIds([]);
      setBulkDeleteOpen(false);
      setBulkForceDelete(false);
      setBulkCategoryValue('');
    } catch (err) {
      toastError(err instanceof Error ? err.message : `Bulk ${action} failed`);
    } finally {
      setBulkBusy(false);
    }
  };

  const handleExportCsv = () => {
    if (!products.length) {
      toastError('No products on this page to export');
      return;
    }
    const headers = [
      'ID',
      'Title',
      'Store',
      'Category',
      'Brand',
      'Price',
      'Original Price',
      'Currency',
      'Stock',
      'Status',
      'Featured',
      'Views',
      'Orders',
      'Created At',
    ];
    const escape = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = products.map((p) =>
      [
        p.id,
        p.title,
        p.seller?.store_name || '',
        p.category,
        p.brand || '',
        p.price,
        p.original_price || '',
        p.currency,
        p.quantity_available,
        p.status,
        p.is_featured ? 'Yes' : 'No',
        p.views_count || 0,
        p._count?.order_items || 0,
        p.created_at,
      ]
        .map(escape)
        .join(','),
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `verndly-products-page-${params.page || 1}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    success(`Exported ${products.length} product(s) to CSV`);
  };

  const resetFilters = () => {
    setSearchInput('');
    setParams({ page: 1, limit: params.limit || 50, sort: 'newest' });
  };

  const currentPage = params.page || 1;
  const pageLimit = params.limit || 50;
  const rangeStart = total === 0 ? 0 : (currentPage - 1) * pageLimit + 1;
  const rangeEnd = Math.min(total, currentPage * pageLimit);

  const kpiCards = [
    {
      label: 'All Catalog',
      value: summary.total,
      color: 'text-foreground',
      onClick: () =>
        setParams((p) => ({
          ...p,
          status: undefined,
          stock: undefined,
          is_featured: undefined,
          page: 1,
        })),
    },
    {
      label: 'Active',
      value: summary.active,
      color: 'text-emerald-500',
      onClick: () =>
        setParams((p) => ({
          ...p,
          status: 'active',
          stock: undefined,
          is_featured: undefined,
          page: 1,
        })),
    },
    {
      label: 'Drafts',
      value: summary.draft,
      color: 'text-amber-500',
      onClick: () =>
        setParams((p) => ({
          ...p,
          status: 'draft',
          stock: undefined,
          is_featured: undefined,
          page: 1,
        })),
    },
    {
      label: 'Featured',
      value: summary.featured,
      color: 'text-yellow-500',
      onClick: () =>
        setParams((p) => ({
          ...p,
          is_featured: true,
          status: undefined,
          stock: undefined,
          page: 1,
        })),
    },
    {
      label: 'Out of Stock',
      value: summary.out_of_stock,
      color: 'text-rose-500',
      onClick: () =>
        setParams((p) => ({
          ...p,
          stock: 'out_of_stock',
          status: undefined,
          is_featured: undefined,
          page: 1,
        })),
    },
    {
      label: 'Archived / Rejected',
      value: summary.archived + summary.rejected,
      color: 'text-muted-foreground',
      onClick: () =>
        setParams((p) => ({
          ...p,
          status: 'archived',
          stock: undefined,
          is_featured: undefined,
          page: 1,
        })),
    },
  ];

  const orderCountForDelete = deleteTarget?._count?.order_items ?? 0;

  return (
    <AdminShell>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-foreground text-xl font-bold tracking-tight sm:text-2xl">
              Full Product Catalog Control
            </h2>
            <p className="text-muted-foreground mt-0.5 text-xs sm:text-sm">
              Complete Super Admin control over every product across all stores — create, edit,
              restock, feature, recategorize, duplicate, bulk-manage, or delete.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExportCsv} className="gap-1.5">
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => void refresh()} className="gap-1.5">
              <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
              Refresh
            </Button>
            <Button variant="primary" size="sm" onClick={openCreateModal} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Add Product
            </Button>
          </div>
        </div>

        {/* Catalog KPI Strip */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {kpiCards.map((k) => (
            <button
              key={k.label}
              type="button"
              onClick={k.onClick}
              className="bg-card border-border hover:border-primary/40 rounded-xl border p-3.5 text-left transition-all"
            >
              <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
                {k.label}
              </p>
              <p className={cn('mt-1 text-xl font-bold tracking-tight', k.color)}>{k.value}</p>
            </button>
          ))}
        </div>

        {/* Status Tabs + Search + Multi-Filters */}
        <div className="bg-card border-border space-y-3 rounded-xl border p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            {/* Search */}
            <div className="relative w-full lg:w-80">
              <Search className="text-muted-foreground absolute left-3 top-2.5 h-4 w-4" />
              <Input
                placeholder="Search title, store, brand, tag, email, or UUID..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="h-9 pl-9 text-xs"
              />
            </div>

            {/* Status Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
              {(['ALL', 'active', 'draft', 'archived', 'rejected'] as const).map((s) => {
                const isActive = (params.status || 'ALL') === s;
                return (
                  <Button
                    key={s}
                    size="sm"
                    variant={isActive ? 'primary' : 'outline'}
                    onClick={() =>
                      setParams((prev) => ({
                        ...prev,
                        status: s === 'ALL' ? undefined : s,
                        page: 1,
                      }))
                    }
                    className="h-8 whitespace-nowrap px-3 text-xs capitalize"
                  >
                    {s === 'ALL' ? `All (${summary.total})` : s}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Advanced Filters Row */}
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
            <select
              value={params.category || ''}
              onChange={(e) =>
                setParams((prev) => ({
                  ...prev,
                  category: e.target.value || undefined,
                  page: 1,
                }))
              }
              className="bg-muted border-border h-9 rounded-lg border px-3 text-xs focus:outline-none"
            >
              <option value="">All Categories</option>
              {allCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            <select
              value={params.seller_id || ''}
              onChange={(e) =>
                setParams((prev) => ({
                  ...prev,
                  seller_id: e.target.value || undefined,
                  page: 1,
                }))
              }
              className="bg-muted border-border h-9 rounded-lg border px-3 text-xs focus:outline-none"
            >
              <option value="">All Stores ({stores.length})</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.store_name} ({s.products_count})
                </option>
              ))}
            </select>

            <select
              value={params.stock || ''}
              onChange={(e) =>
                setParams((prev) => ({
                  ...prev,
                  stock: (e.target.value || undefined) as typeof prev.stock,
                  page: 1,
                }))
              }
              className="bg-muted border-border h-9 rounded-lg border px-3 text-xs focus:outline-none"
            >
              <option value="">All Stock Levels</option>
              <option value="in_stock">In Stock (&gt; 0)</option>
              <option value="low_stock">Low Stock (1–5)</option>
              <option value="out_of_stock">Out of Stock (0)</option>
            </select>

            <select
              value={
                params.is_featured === true ? 'true' : params.is_featured === false ? 'false' : ''
              }
              onChange={(e) =>
                setParams((prev) => ({
                  ...prev,
                  is_featured:
                    e.target.value === 'true'
                      ? true
                      : e.target.value === 'false'
                        ? false
                        : undefined,
                  page: 1,
                }))
              }
              className="bg-muted border-border h-9 rounded-lg border px-3 text-xs focus:outline-none"
            >
              <option value="">Featured: Any</option>
              <option value="true">Featured Only</option>
              <option value="false">Not Featured</option>
            </select>

            <div className="flex gap-2">
              <select
                value={params.sort || 'newest'}
                onChange={(e) =>
                  setParams((prev) => ({
                    ...prev,
                    sort: e.target.value as typeof prev.sort,
                    page: 1,
                  }))
                }
                className="bg-muted border-border h-9 flex-1 rounded-lg border px-2.5 text-xs focus:outline-none"
              >
                <option value="newest">Sort: Newest</option>
                <option value="oldest">Sort: Oldest</option>
                <option value="price_asc">Price: Low → High</option>
                <option value="price_desc">Price: High → Low</option>
                <option value="views_desc">Most Viewed</option>
                <option value="stock_asc">Lowest Stock</option>
                <option value="title_asc">Title: A → Z</option>
              </select>
              {(params.status ||
                params.category ||
                params.seller_id ||
                params.search ||
                params.stock ||
                params.is_featured !== undefined) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetFilters}
                  className="h-9 px-2 text-xs"
                >
                  Reset
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Bulk Action Toolbar */}
        {selectedIds.length > 0 && (
          <div className="bg-card border-primary/40 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-semibold">
              <Badge variant="info">{selectedIds.length} selected</Badge>
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="text-muted-foreground hover:text-foreground text-[11px] underline"
              >
                Clear
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                size="sm"
                variant="outline"
                disabled={bulkBusy}
                onClick={() => void runBulk('status', 'active')}
                className="h-7 border-emerald-500/30 px-2.5 text-[11px] text-emerald-600"
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={bulkBusy}
                onClick={() => void runBulk('status', 'draft')}
                className="h-7 px-2.5 text-[11px]"
              >
                Set Draft
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={bulkBusy}
                onClick={() => void runBulk('status', 'archived')}
                className="h-7 px-2.5 text-[11px]"
              >
                Archive
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={bulkBusy}
                onClick={() => void runBulk('status', 'rejected')}
                className="h-7 border-rose-500/30 px-2.5 text-[11px] text-rose-600"
              >
                Reject
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={bulkBusy}
                onClick={() => void runBulk('feature', true)}
                className="h-7 border-amber-500/30 px-2.5 text-[11px] text-amber-600"
              >
                Feature
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={bulkBusy}
                onClick={() => void runBulk('feature', false)}
                className="h-7 px-2.5 text-[11px]"
              >
                Unfeature
              </Button>
              <div className="flex items-center gap-1">
                <select
                  value={bulkCategoryValue}
                  onChange={(e) => setBulkCategoryValue(e.target.value)}
                  className="bg-muted border-border h-7 rounded-md border px-2 text-[11px]"
                >
                  <option value="">Move category...</option>
                  {allCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                {bulkCategoryValue && (
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={bulkBusy}
                    onClick={() => void runBulk('category', bulkCategoryValue)}
                    className="h-7 px-2 text-[11px]"
                  >
                    Apply
                  </Button>
                )}
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={bulkBusy}
                onClick={() => {
                  setBulkForceDelete(false);
                  setBulkDeleteOpen(true);
                }}
                className="h-7 gap-1 border-rose-500/40 bg-rose-500/10 px-2.5 text-[11px] text-rose-600 hover:bg-rose-500/20"
              >
                <Trash2 className="h-3 w-3" />
                Delete ({selectedIds.length})
              </Button>
            </div>
          </div>
        )}

        {error && <Alert variant="error">{error}</Alert>}

        {/* Products Table */}
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-2 py-20">
            <Spinner size="lg" className="text-brand" />
            <p className="text-muted-foreground text-xs">Loading full product catalog...</p>
          </div>
        ) : products.length === 0 ? (
          <TableEmpty
            icon={Package}
            title="No products found"
            description="No products match your current search or filter criteria."
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <tr>
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      checked={allOnPageSelected}
                      onChange={toggleSelectAll}
                      aria-label="Select all products on page"
                      className="h-3.5 w-3.5 cursor-pointer rounded"
                    />
                  </TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Store</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Feat.</TableHead>
                  <TableHead>Metrics</TableHead>
                  <TableHead className="text-right">Controls</TableHead>
                </tr>
              </TableHeader>
              <TableBody>
                {products.map((p) => {
                  const statusLower = (p.status || '').toLowerCase();
                  const statusVariant =
                    statusLower === 'active'
                      ? 'success'
                      : statusLower === 'draft'
                        ? 'warning'
                        : statusLower === 'rejected'
                          ? 'danger'
                          : 'default';
                  const isSelected = selectedIds.includes(p.id);
                  const qty = p.quantity_available ?? 0;

                  return (
                    <TableRow key={p.id} className={isSelected ? 'bg-primary/5' : undefined}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOne(p.id)}
                          aria-label={`Select ${p.title}`}
                          className="h-3.5 w-3.5 cursor-pointer rounded"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {p.image_urls?.[0] ? (
                            <img
                              src={p.image_urls[0]}
                              alt={p.title}
                              className="border-border bg-muted h-10 w-10 shrink-0 rounded-lg border object-cover"
                            />
                          ) : (
                            <div className="bg-muted text-muted-foreground flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                              <Package className="h-4 w-4" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-foreground max-w-[220px] truncate text-xs font-semibold">
                              {p.title}
                            </p>
                            <p className="text-muted-foreground flex items-center gap-1.5 font-mono text-[10px]">
                              <span>#{shortId(p.id, 8)}</span>
                              {p.brand && (
                                <>
                                  <span>•</span>
                                  <span className="font-sans">{p.brand}</span>
                                </>
                              )}
                              <span>•</span>
                              <span className="font-sans">{dateShort(p.created_at)}</span>
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="min-w-0">
                          <div className="text-foreground flex items-center gap-1.5 text-xs font-medium">
                            <Store className="text-muted-foreground h-3 w-3 shrink-0" />
                            <span className="max-w-[140px] truncate">
                              {p.seller?.store_name || 'Direct Seller'}
                            </span>
                          </div>
                          {p.seller?.is_seller_verified === false && (
                            <span className="text-[10px] text-amber-500">Unverified Store</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-muted-foreground text-xs">
                          <p className="max-w-[130px] truncate">{p.category || 'General'}</p>
                          {typeof p.attributes?.subcategory === 'string' && (
                            <p className="text-[10px] opacity-70">{p.attributes.subcategory}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-foreground font-mono text-xs font-bold">
                          {formatCurrency(p.price, p.currency)}
                        </p>
                        {p.original_price && Number(p.original_price) > Number(p.price) && (
                          <p className="text-muted-foreground font-mono text-[10px] line-through">
                            {formatCurrency(p.original_price, p.currency)}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <button
                          type="button"
                          onClick={() => {
                            setStockTarget(p);
                            setStockValue(String(qty));
                            setStockReason('');
                          }}
                          title="Click to adjust stock"
                          className={cn(
                            'rounded-md border px-2 py-0.5 font-mono text-[11px] font-semibold transition-colors',
                            qty === 0
                              ? 'border-rose-500/30 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20'
                              : qty <= 5
                                ? 'border-amber-500/30 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20'
                                : 'border-border bg-muted/50 text-foreground hover:bg-muted',
                          )}
                        >
                          {qty}
                        </button>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant} dot>
                          {p.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <button
                          type="button"
                          onClick={() => void handleToggleFeatured(p)}
                          disabled={actionLoading}
                          className="hover:bg-muted text-muted-foreground rounded p-1 transition-colors hover:text-amber-400"
                          title={p.is_featured ? 'Unfeature product' : 'Feature product'}
                        >
                          <Star
                            className={`h-4 w-4 ${
                              p.is_featured
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-muted-foreground'
                            }`}
                          />
                        </button>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-[11px]">
                        <div>{p.views_count || 0} views</div>
                        <div className="text-[10px]">
                          {p._count?.order_items ?? 0} orders
                          {(p._count?.reports ?? 0) > 0 && (
                            <span className="ml-1 font-semibold text-rose-500">
                              • {p._count?.reports} rpt
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedProduct(p);
                              setModerationReason('');
                              setInspectOpen(true);
                            }}
                            title="Inspect listing"
                            className="h-7 px-2 text-[11px]"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditModal(p)}
                            title="Edit all fields"
                            className="h-7 border-blue-500/30 px-2 text-[11px] text-blue-600 hover:bg-blue-500/10"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => void handleDuplicate(p)}
                            disabled={actionLoading}
                            title="Duplicate product as draft"
                            className="h-7 px-2 text-[11px]"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setDeleteTarget(p);
                              setForceDeleteChecked(false);
                            }}
                            title="Delete product"
                            className="h-7 border-rose-500/30 px-2 text-[11px] text-rose-600 hover:bg-rose-500/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {/* Pagination Bar */}
            <div className="bg-card border-border flex flex-col items-center justify-between gap-3 rounded-xl border px-4 py-3 text-xs sm:flex-row">
              <div className="text-muted-foreground flex items-center gap-3">
                <span>
                  Showing{' '}
                  <strong className="text-foreground">
                    {rangeStart}–{rangeEnd}
                  </strong>{' '}
                  of <strong className="text-foreground">{total}</strong> matching products
                </span>
                <select
                  value={pageLimit}
                  onChange={(e) =>
                    setParams((prev) => ({
                      ...prev,
                      limit: Number(e.target.value),
                      page: 1,
                    }))
                  }
                  className="bg-muted border-border h-7 rounded-md border px-2 text-xs"
                >
                  {[25, 50, 100, 200, 500].map((n) => (
                    <option key={n} value={n}>
                      {n} / page
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setParams((prev) => ({ ...prev, page: 1 }))}
                  className="h-7 px-2 text-[11px]"
                >
                  First
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() =>
                    setParams((prev) => ({ ...prev, page: Math.max(1, currentPage - 1) }))
                  }
                  className="h-7 px-2"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="px-2 font-medium">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() =>
                    setParams((prev) => ({
                      ...prev,
                      page: Math.min(totalPages, currentPage + 1),
                    }))
                  }
                  className="h-7 px-2"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setParams((prev) => ({ ...prev, page: totalPages }))}
                  className="h-7 px-2 text-[11px]"
                >
                  Last
                </Button>
              </div>
            </div>
          </>
        )}

        {/* ── 1. Product Inspection Modal ─────────────────────────────── */}
        <Modal
          isOpen={inspectOpen}
          onClose={() => setInspectOpen(false)}
          title={selectedProduct?.title || 'Product Inspection'}
          description={`Store: ${selectedProduct?.seller?.store_name || 'Direct'} · Owner: ${selectedProduct?.seller?.user?.email || '—'}`}
          maxWidth="2xl"
        >
          {selectedProduct && (
            <div className="space-y-5 text-xs">
              {selectedProduct.image_urls && selectedProduct.image_urls.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-2">
                  {selectedProduct.image_urls.map((url, idx) => (
                    <a
                      key={idx}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0"
                    >
                      <img
                        src={url}
                        alt={`Preview ${idx + 1}`}
                        className="border-border h-20 w-20 rounded-xl border object-cover transition-opacity hover:opacity-80"
                      />
                    </a>
                  ))}
                </div>
              )}

              <div className="bg-muted/40 border-border grid grid-cols-2 gap-3 rounded-xl border p-3.5 sm:grid-cols-4">
                <div>
                  <span className="text-muted-foreground text-[10px] uppercase">Price</span>
                  <p className="text-foreground mt-0.5 font-mono text-sm font-bold">
                    {formatCurrency(selectedProduct.price, selectedProduct.currency)}
                  </p>
                  {selectedProduct.original_price && (
                    <p className="text-muted-foreground font-mono text-[10px] line-through">
                      {formatCurrency(selectedProduct.original_price, selectedProduct.currency)}
                    </p>
                  )}
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px] uppercase">Stock</span>
                  <p className="text-foreground mt-0.5 font-semibold">
                    {selectedProduct.quantity_available} units
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px] uppercase">Category</span>
                  <p className="text-foreground mt-0.5 font-semibold">{selectedProduct.category}</p>
                  {selectedProduct.brand && (
                    <p className="text-muted-foreground text-[10px]">{selectedProduct.brand}</p>
                  )}
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px] uppercase">Activity</span>
                  <p className="text-foreground mt-0.5 font-semibold">
                    {selectedProduct._count?.order_items ?? 0} orders ·{' '}
                    {selectedProduct.views_count || 0} views
                  </p>
                  <p className="text-muted-foreground text-[10px]">
                    {selectedProduct._count?.reviews ?? 0} reviews ·{' '}
                    {selectedProduct._count?.reports ?? 0} reports
                  </p>
                </div>
              </div>

              {selectedProduct.description && (
                <div className="space-y-1">
                  <span className="text-muted-foreground text-[11px] font-medium">Description</span>
                  <p className="bg-card border-border text-foreground whitespace-pre-wrap rounded-xl border p-3 leading-relaxed">
                    {selectedProduct.description}
                  </p>
                </div>
              )}

              {selectedProduct.tags && selectedProduct.tags.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <Tag className="text-muted-foreground h-3.5 w-3.5" />
                  {selectedProduct.tags.map((tag) => (
                    <Badge key={tag} variant="default">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Moderation Controls */}
              <div className="border-border space-y-3 border-t pt-3">
                <div className="space-y-1">
                  <label className="text-muted-foreground text-[11px] font-medium">
                    Audit Reason (Optional)
                  </label>
                  <Input
                    value={moderationReason}
                    onChange={(e) => setModerationReason(e.target.value)}
                    placeholder="e.g. Verified listing photos / Policy violation"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={actionLoading || selectedProduct.status === 'active'}
                      onClick={() =>
                        void handleStatusUpdate(
                          selectedProduct.id,
                          'active',
                          moderationReason || undefined,
                        )
                      }
                      className="h-8 border-emerald-500/30 text-xs text-emerald-600 hover:bg-emerald-500/10"
                    >
                      <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={actionLoading || selectedProduct.status === 'draft'}
                      onClick={() =>
                        void handleStatusUpdate(
                          selectedProduct.id,
                          'draft',
                          moderationReason || undefined,
                        )
                      }
                      className="h-8 text-xs"
                    >
                      <FileText className="mr-1 h-3.5 w-3.5" />
                      Draft
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={actionLoading || selectedProduct.status === 'archived'}
                      onClick={() =>
                        void handleStatusUpdate(
                          selectedProduct.id,
                          'archived',
                          moderationReason || undefined,
                        )
                      }
                      className="h-8 text-xs"
                    >
                      <Archive className="mr-1 h-3.5 w-3.5" />
                      Archive
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={actionLoading || selectedProduct.status === 'rejected'}
                      onClick={() =>
                        void handleStatusUpdate(
                          selectedProduct.id,
                          'rejected',
                          moderationReason || undefined,
                        )
                      }
                      className="h-8 border-rose-500/30 text-xs text-rose-600 hover:bg-rose-500/10"
                    >
                      <XCircle className="mr-1 h-3.5 w-3.5" />
                      Reject
                    </Button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => {
                        setInspectOpen(false);
                        openEditModal(selectedProduct);
                      }}
                      className="h-8 gap-1 text-xs"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit All Fields
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setDeleteTarget(selectedProduct);
                        setForceDeleteChecked(false);
                      }}
                      className="h-8 gap-1 border-rose-500/30 text-xs text-rose-600 hover:bg-rose-500/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Modal>

        {/* ── 2. Full Create / Edit Product Modal ─────────────────────── */}
        <Modal
          isOpen={editorOpen}
          onClose={() => !editorSaving && setEditorOpen(false)}
          title={editingProduct ? `Edit Product — ${editingProduct.title}` : 'Create New Product'}
          description={
            editingProduct
              ? 'Super Admin override: edit any product attribute, pricing, stock, media, or transfer store ownership.'
              : 'Create a product directly under any seller store.'
          }
          maxWidth="3xl"
        >
          <form onSubmit={(e) => void handleSaveEditor(e)} className="space-y-5 text-xs">
            {/* Ownership & Status Row */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <label className="text-muted-foreground text-[10px] font-semibold uppercase">
                  Owning Store *
                </label>
                <select
                  value={editor.seller_id}
                  onChange={(e) => setEditor((p) => ({ ...p, seller_id: e.target.value }))}
                  required
                  className="bg-muted border-border h-9 w-full rounded-lg border px-2.5 text-xs"
                >
                  <option value="">Select store...</option>
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.store_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-muted-foreground text-[10px] font-semibold uppercase">
                  Listing Status
                </label>
                <select
                  value={editor.status}
                  onChange={(e) =>
                    setEditor((p) => ({ ...p, status: e.target.value as ProductStatus }))
                  }
                  className="bg-muted border-border h-9 w-full rounded-lg border px-2.5 text-xs capitalize"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-muted-foreground text-[10px] font-semibold uppercase">
                  Condition
                </label>
                <select
                  value={editor.condition}
                  onChange={(e) => setEditor((p) => ({ ...p, condition: e.target.value }))}
                  className="bg-muted border-border h-9 w-full rounded-lg border px-2.5 text-xs"
                >
                  {CONDITIONS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Title + Brand */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1 sm:col-span-2">
                <label className="text-muted-foreground text-[10px] font-semibold uppercase">
                  Product Title *
                </label>
                <Input
                  value={editor.title}
                  onChange={(e) => setEditor((p) => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. Apple iPhone 15 Pro Max 256GB"
                  required
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-muted-foreground text-[10px] font-semibold uppercase">
                  Brand
                </label>
                <Input
                  value={editor.brand}
                  onChange={(e) => setEditor((p) => ({ ...p, brand: e.target.value }))}
                  placeholder="e.g. Apple, Nike"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Category + Subcategory */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-muted-foreground text-[10px] font-semibold uppercase">
                  Category *
                </label>
                <input
                  list="admin-category-list"
                  value={editor.category}
                  onChange={(e) => setEditor((p) => ({ ...p, category: e.target.value }))}
                  placeholder="Select or type category"
                  required
                  className="bg-muted border-border h-9 w-full rounded-lg border px-3 text-xs focus:outline-none"
                />
                <datalist id="admin-category-list">
                  {allCategories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
              <div className="space-y-1">
                <label className="text-muted-foreground text-[10px] font-semibold uppercase">
                  Subcategory / Subtab
                </label>
                <Input
                  value={editor.subcategory}
                  onChange={(e) => setEditor((p) => ({ ...p, subcategory: e.target.value }))}
                  placeholder="e.g. Phones, Laptops, Women Dresses, Shoes"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Pricing & Inventory */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="space-y-1">
                <label className="text-muted-foreground text-[10px] font-semibold uppercase">
                  Price (GH₵) *
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={editor.price}
                  onChange={(e) => setEditor((p) => ({ ...p, price: e.target.value }))}
                  required
                  className="h-9 font-mono text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-muted-foreground text-[10px] font-semibold uppercase">
                  Original Price (Optional)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editor.original_price}
                  onChange={(e) => setEditor((p) => ({ ...p, original_price: e.target.value }))}
                  placeholder="Leave blank if no discount"
                  className="h-9 font-mono text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-muted-foreground text-[10px] font-semibold uppercase">
                  Stock Quantity *
                </label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={editor.quantity_available}
                  onChange={(e) => setEditor((p) => ({ ...p, quantity_available: e.target.value }))}
                  required
                  className="h-9 font-mono text-xs"
                />
              </div>
              <div className="flex items-end pb-1.5">
                <label className="flex cursor-pointer items-center gap-2 text-xs font-medium">
                  <input
                    type="checkbox"
                    checked={editor.is_featured}
                    onChange={(e) => setEditor((p) => ({ ...p, is_featured: e.target.checked }))}
                    className="h-4 w-4 rounded"
                  />
                  <span>Featured / Hot Deal</span>
                </label>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label className="text-muted-foreground text-[10px] font-semibold uppercase">
                Description
              </label>
              <textarea
                value={editor.description}
                onChange={(e) => setEditor((p) => ({ ...p, description: e.target.value }))}
                rows={3}
                placeholder="Full product description..."
                className="bg-muted border-border w-full rounded-lg border p-2.5 text-xs focus:outline-none"
              />
            </div>

            {/* Specs & Dimensions */}
            <div className="bg-muted/40 border-border space-y-3 rounded-xl border p-3.5">
              <p className="text-foreground flex items-center gap-1.5 text-[11px] font-semibold">
                <Layers className="h-3.5 w-3.5" />
                Specifications, Dimensions &amp; Tags
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Input
                  value={editor.dimensions}
                  onChange={(e) => setEditor((p) => ({ ...p, dimensions: e.target.value }))}
                  placeholder="Dimensions (e.g. 25 × 15 × 8 cm)"
                  className="h-8 text-xs"
                />
                <Input
                  value={editor.weight}
                  onChange={(e) => setEditor((p) => ({ ...p, weight: e.target.value }))}
                  placeholder="Weight (e.g. 0.5 kg)"
                  className="h-8 text-xs"
                />
                <Input
                  value={editor.color}
                  onChange={(e) => setEditor((p) => ({ ...p, color: e.target.value }))}
                  placeholder="Color (e.g. Matte Black)"
                  className="h-8 text-xs"
                />
                <Input
                  value={editor.material}
                  onChange={(e) => setEditor((p) => ({ ...p, material: e.target.value }))}
                  placeholder="Material (e.g. Leather, Cotton)"
                  className="h-8 text-xs"
                />
                <Input
                  value={editor.warranty}
                  onChange={(e) => setEditor((p) => ({ ...p, warranty: e.target.value }))}
                  placeholder="Warranty (e.g. 12 months)"
                  className="h-8 text-xs"
                />
                <Input
                  value={editor.tagsText}
                  onChange={(e) => setEditor((p) => ({ ...p, tagsText: e.target.value }))}
                  placeholder="Tags (comma-separated)"
                  className="h-8 text-xs"
                />
              </div>
            </div>

            {/* Media Manager */}
            <div className="bg-muted/40 border-border space-y-3 rounded-xl border p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-foreground text-[11px] font-semibold">
                  Product Images ({editor.image_urls.length})
                </p>
                {editingProduct && (
                  <>
                    <input
                      ref={fileUploadRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => void handleUploadEditorImages(e)}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={uploadingMedia}
                      isLoading={uploadingMedia}
                      onClick={() => fileUploadRef.current?.click()}
                      className="h-7 gap-1 text-[11px]"
                    >
                      <Upload className="h-3 w-3" />
                      Upload New Images
                    </Button>
                  </>
                )}
              </div>

              {editor.image_urls.length > 0 && (
                <div className="flex flex-wrap gap-2.5">
                  {editor.image_urls.map((url, idx) => (
                    <div
                      key={`${url}-${idx}`}
                      className="border-border bg-card relative overflow-hidden rounded-lg border"
                    >
                      <img
                        src={url}
                        alt={`Product ${idx + 1}`}
                        className="h-20 w-20 object-cover"
                      />
                      {idx === 0 && (
                        <span className="absolute left-1 top-1 rounded bg-black/75 px-1 text-[9px] font-semibold text-white">
                          Cover
                        </span>
                      )}
                      <div className="absolute right-1 top-1 flex gap-1">
                        {idx > 0 && (
                          <button
                            type="button"
                            title="Make cover photo"
                            onClick={() =>
                              setEditor((p) => {
                                const next = [...p.image_urls];
                                const [picked] = next.splice(idx, 1);
                                next.unshift(picked);
                                return { ...p, image_urls: next };
                              })
                            }
                            className="rounded bg-black/75 p-0.5 text-white hover:bg-emerald-600"
                          >
                            <ArrowUp className="h-3 w-3" />
                          </button>
                        )}
                        <button
                          type="button"
                          title="Remove image"
                          onClick={() =>
                            setEditor((p) => ({
                              ...p,
                              image_urls: p.image_urls.filter((_, i) => i !== idx),
                            }))
                          }
                          className="rounded bg-black/75 p-0.5 text-white hover:bg-rose-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <Input
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  placeholder="Paste image URL (https://...) and click Add"
                  className="h-8 flex-1 text-xs"
                />
                <Button type="button" size="sm" variant="outline" onClick={handleAddImageUrl}>
                  Add URL
                </Button>
              </div>

              <Input
                value={editor.video_url}
                onChange={(e) => setEditor((p) => ({ ...p, video_url: e.target.value }))}
                placeholder="Optional product video URL (https://...)"
                className="h-8 text-xs"
              />
            </div>

            {editingProduct && (
              <div className="space-y-1">
                <label className="text-muted-foreground text-[10px] font-semibold uppercase">
                  Admin Edit Note (Audit Log)
                </label>
                <Input
                  value={editor.reason}
                  onChange={(e) => setEditor((p) => ({ ...p, reason: e.target.value }))}
                  placeholder="Optional reason for this edit..."
                  className="h-8 text-xs"
                />
              </div>
            )}

            <div className="border-border flex justify-end gap-2 border-t pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={editorSaving}
                onClick={() => setEditorOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={editorSaving}>
                {editingProduct ? 'Save Changes' : 'Create Product'}
              </Button>
            </div>
          </form>
        </Modal>

        {/* ── 3. Quick Stock Adjustment Modal ─────────────────────────── */}
        <Modal
          isOpen={Boolean(stockTarget)}
          onClose={() => !actionLoading && setStockTarget(null)}
          title="Quick Stock Adjustment"
          description={stockTarget ? stockTarget.title : undefined}
          maxWidth="sm"
        >
          <form onSubmit={(e) => void handleStockSave(e)} className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="text-muted-foreground text-[10px] font-semibold uppercase">
                New Stock Quantity
              </label>
              <div className="flex items-center gap-2">
                <Box className="text-muted-foreground h-4 w-4" />
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={stockValue}
                  onChange={(e) => setStockValue(e.target.value)}
                  required
                  className="h-9 font-mono text-sm font-bold"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-muted-foreground text-[10px] font-semibold uppercase">
                Reason (Optional)
              </label>
              <Input
                value={stockReason}
                onChange={(e) => setStockReason(e.target.value)}
                placeholder="e.g. Inventory audit correction"
                className="h-8 text-xs"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setStockTarget(null)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={actionLoading}>
                Update Stock
              </Button>
            </div>
          </form>
        </Modal>

        {/* ── 4. Smart Single Delete Modal ────────────────────────────── */}
        <Modal
          isOpen={Boolean(deleteTarget)}
          onClose={() => !actionLoading && setDeleteTarget(null)}
          title="Delete Product"
          description={deleteTarget ? deleteTarget.title : undefined}
          maxWidth="md"
        >
          {deleteTarget && (
            <div className="space-y-4 text-xs">
              {orderCountForDelete > 0 ? (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-amber-700 dark:text-amber-300">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <div className="space-y-1">
                      <p className="font-semibold">
                        This product appears in {orderCountForDelete} historical order item(s).
                      </p>
                      <p className="opacity-90">
                        You can archive it safely, or enable Force Delete below to permanently
                        remove the listing while preserving product titles on past orders.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">
                  Permanently delete <strong>{deleteTarget.title}</strong>? This removes the
                  listing, its variants, reviews, and favorites and cannot be undone.
                </p>
              )}

              {orderCountForDelete > 0 && (
                <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/5 p-3">
                  <input
                    type="checkbox"
                    checked={forceDeleteChecked}
                    onChange={(e) => setForceDeleteChecked(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded"
                  />
                  <span className="text-rose-600 dark:text-rose-400">
                    <strong>Force Delete Permanently</strong> — unlink from past orders (preserving
                    order item names) and delete this product now.
                  </span>
                </label>
              )}

              <div className="flex flex-wrap justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={actionLoading}
                  onClick={() => setDeleteTarget(null)}
                >
                  Cancel
                </Button>
                {orderCountForDelete > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={actionLoading}
                    onClick={() => {
                      const id = deleteTarget.id;
                      setDeleteTarget(null);
                      void handleStatusUpdate(id, 'archived', 'Archived instead of delete');
                    }}
                  >
                    <Archive className="mr-1 h-3.5 w-3.5" />
                    Archive Instead
                  </Button>
                )}
                <Button
                  variant="primary"
                  size="sm"
                  isLoading={actionLoading}
                  disabled={orderCountForDelete > 0 && !forceDeleteChecked}
                  onClick={() => void handleConfirmDelete()}
                  className="bg-rose-600 text-white hover:bg-rose-700"
                >
                  <Trash2 className="mr-1 h-3.5 w-3.5" />
                  {forceDeleteChecked ? 'Force Delete Permanently' : 'Delete Product'}
                </Button>
              </div>
            </div>
          )}
        </Modal>

        {/* ── 5. Bulk Delete Modal ────────────────────────────────────── */}
        <Modal
          isOpen={bulkDeleteOpen}
          onClose={() => !bulkBusy && setBulkDeleteOpen(false)}
          title={`Delete ${selectedIds.length} Selected Product(s)`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <p className="text-muted-foreground">
              You are about to permanently delete <strong>{selectedIds.length}</strong> selected
              product(s). This action is audit-logged and cannot be undone.
            </p>
            <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/5 p-3">
              <input
                type="checkbox"
                checked={bulkForceDelete}
                onChange={(e) => setBulkForceDelete(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded"
              />
              <span className="text-rose-600 dark:text-rose-400">
                <ShieldAlert className="mr-1 inline h-3.5 w-3.5" />
                <strong>Force Delete products with past orders</strong> (preserves product title
                snapshots on historical orders).
              </span>
            </label>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={bulkBusy}
                onClick={() => setBulkDeleteOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                isLoading={bulkBusy}
                onClick={() => void runBulk('delete', undefined, bulkForceDelete)}
                className="bg-rose-600 text-white hover:bg-rose-700"
              >
                Confirm Delete ({selectedIds.length})
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </AdminShell>
  );
}
