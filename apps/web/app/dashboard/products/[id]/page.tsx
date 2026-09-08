'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Edit2,
  ExternalLink,
  Copy,
  Trash2,
  Flame,
  Sparkles,
  Lock,
  Package,
  Eye,
  AlertCircle,
  Loader2,
  Check,
  TrendingUp,
  Tag,
  Layers,
  BarChart3,
  Image as ImageIcon,
  Video,
  MoreHorizontal,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Alert from '@/components/ui/Alert';
import ConfirmModal from '@/components/ui/ConfirmModal';
import DropdownMenu, { DropdownMenuItem } from '@/components/ui/DropdownMenu';
import Modal from '@/components/ui/Modal';
import VariantEditor from '@/components/dashboard/VariantEditor';
import { useAuth } from '@/lib/contexts/auth-context';
import { useProStatus } from '@/hooks/useProStatus';
import { productApi } from '@/lib/api/product';
import ShareProductCardModal from '@/components/dashboard/ShareProductCardModal';

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || 'https://verndly.com';

const STATUS_OPTIONS: Array<{ value: string; label: string; description: string }> = [
  {
    value: 'active',
    label: 'Active',
    description: 'Visible on marketplace and discoverable by buyers',
  },
  {
    value: 'draft',
    label: 'Draft',
    description: 'Hidden from public, work in progress',
  },
];

export default function ManageProductPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { token, user } = useAuth();
  const { status: proStatus } = useProStatus();
  const isPro = !!proStatus?.is_pro;

  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingStock, setSavingStock] = useState(false);
  const [stockDraft, setStockDraft] = useState<number | null>(null);
  const [duplicating, setDuplicating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showShareCard, setShowShareCard] = useState(false);
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [togglingHot, setTogglingHot] = useState(false);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);

  const refresh = useCallback(async () => {
    if (!id) return;
    try {
      const data = await productApi.getProductById(id as string);
      setProduct(data);
      setStockDraft(null);
    } catch (e: any) {
      setError(e?.message || 'Failed to load product');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const isOwner = useMemo(() => {
    if (!product || !user) return false;
    return product.seller?.user_id === user.id || user.role === 'ADMIN';
  }, [product, user]);

  const currentStock = stockDraft ?? product?.quantity_available ?? 0;
  const stockDirty =
    stockDraft !== null && stockDraft !== product?.quantity_available;
  const lowStock = currentStock > 0 && currentStock <= 5;
  const outOfStock = currentStock === 0;

  // ─── Actions ────────────────────────────────────────────────────────

  async function handleStatusChange(next: string) {
    if (!token || !product || next === product.status) return;
    setSavingStatus(true);
    try {
      await productApi.updateStatus(token, product.id, next);
      toast.success(`Status updated to ${next.toUpperCase()}`);
      await refresh();
    } catch (e: any) {
      toast.error(e?.message || "Couldn't update status");
    } finally {
      setSavingStatus(false);
    }
  }

  async function handleSaveStock() {
    if (!token || stockDraft === null) return;
    setSavingStock(true);
    try {
      await productApi.updateStock(token, product.id, stockDraft);
      toast.success(`Inventory stock updated to ${stockDraft}`);
      await refresh();
    } catch (e: any) {
      toast.error(e?.message || "Couldn't update stock");
    } finally {
      setSavingStock(false);
    }
  }

  async function handleDuplicate() {
    if (!token) return;
    setDuplicating(true);
    try {
      const res = await productApi.duplicateProduct(token, product.id);
      toast.success('Product duplicated as draft.');
      router.push(`/dashboard/products/${res.product.id}`);
    } catch (e: any) {
      toast.error(e?.message || "Couldn't duplicate");
    } finally {
      setDuplicating(false);
    }
  }

  async function handleDelete() {
    if (!token) return;
    setDeleting(true);
    try {
      await productApi.deleteProduct(token, product.id);
      toast.success('Product removed permanently.');
      router.push('/dashboard/products');
    } catch (e: any) {
      toast.error(e?.message || "Couldn't delete product");
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  async function handleToggleHot() {
    if (!token) return;
    setTogglingHot(true);
    try {
      if (!product.is_featured) {
        try {
          await productApi.toggleHotSales(token, product.id, true);
          toast.success('Hot Sales enabled!');
          await refresh();
          return;
        } catch (paymentErr: any) {
          if (String(paymentErr?.message || '').toLowerCase().includes('payment')) {
            const init = await productApi.initializeHotSalesPayment(token, product.id);
            if (init.checkout_url) {
              window.location.href = init.checkout_url;
              return;
            }
          }
          throw paymentErr;
        }
      } else {
        await productApi.toggleHotSales(token, product.id, false);
        toast.success('Hot Sales boost disabled.');
        await refresh();
      }
    } catch (e: any) {
      toast.error(e?.message || "Couldn't toggle Hot Sales");
    } finally {
      setTogglingHot(false);
    }
  }

  async function copyPublicUrl() {
    const url = `${SITE_URL}/product/${product.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Public product link copied to clipboard.');
    } catch {
      toast.error("Couldn't copy link. Please copy directly from browser.");
    }
  }

  // ─── Render ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-7 h-7 animate-spin text-[var(--color-accent)]" />
        <p className="text-xs text-[var(--color-muted)] font-medium tracking-wider uppercase">
          Loading product hub...
        </p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-md mx-auto py-20 text-center space-y-4">
        <Alert
          variant="error"
          title="Product Unavailable"
          message={error || 'This listing may have been removed or does not exist.'}
        />
        <Button variant="secondary" onClick={() => router.push('/dashboard/products')} className="rounded-xl">
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to products
        </Button>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="max-w-md mx-auto py-20 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center mx-auto">
          <Lock className="w-6 h-6 text-[var(--color-muted)]" />
        </div>
        <h1 className="text-lg font-bold text-[var(--color-foreground)]">Unauthorized Access</h1>
        <p className="text-sm text-[var(--color-muted)]">You do not have permission to manage this product.</p>
        <Button variant="secondary" onClick={() => router.push('/dashboard/products')} className="rounded-xl">
          Back to your products
        </Button>
      </div>
    );
  }

  const publicUrl = `${SITE_URL}/product/${product.id}`;
  const createdDate = new Date(product.created_at);
  const images = product.image_urls || [];
  const hasVideo = Boolean(product.video_url);

  const moreMenuItems: DropdownMenuItem[] = [
    {
      label: 'Copy Public Link',
      icon: <Copy className="w-3.5 h-3.5" />,
      onClick: copyPublicUrl,
    },
    {
      label: 'Edit Details',
      icon: <Edit2 className="w-3.5 h-3.5" />,
      onClick: () => router.push(`/dashboard/products/edit/${product.id}`),
    },
    {
      label: 'Manage Variants',
      icon: <Layers className="w-3.5 h-3.5" />,
      onClick: () => setShowVariantModal(true),
    },
    {
      label: 'Generate Social Card',
      icon: <Sparkles className="w-3.5 h-3.5" />,
      onClick: () => setShowShareCard(true),
    },
    {
      label: product.is_featured ? 'Deactivate Boost' : 'Boost on Hot Sales',
      icon: <Flame className="w-3.5 h-3.5 text-amber-500" />,
      onClick: handleToggleHot,
    },
    {
      label: 'Delete Product',
      icon: <Trash2 className="w-3.5 h-3.5" />,
      variant: 'danger',
      divider: true,
      onClick: () => setConfirmDelete(true),
    },
  ];

  return (
    <div className="max-w-5xl mx-auto pb-24 px-3 sm:px-6 space-y-4">
      {/* Back link */}
      <Link
        href="/dashboard/products"
        className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors mt-2 group"
      >
        <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
        All products
      </Link>

      {/* Stock Alerts (if applicable) */}
      {outOfStock ? (
        <Alert
          variant="error"
          title="Out of Stock"
          message="This product has 0 quantity available and is marked as sold out on the public store."
        />
      ) : lowStock ? (
        <Alert
          variant="warning"
          title="Low Inventory Alert"
          message={`Only ${currentStock} item(s) left in stock. Consider updating your quantity soon.`}
        />
      ) : null}

      {/* HERO SECTION */}
      <Card
        className="overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6 rounded-2xl"
        hoverEffect={false}
      >
        <div className="flex flex-col md:flex-row gap-6 items-start">
          {/* Media Showcase */}
          <div className="w-full md:w-56 shrink-0 space-y-3">
            <div className="relative aspect-square w-full rounded-xl overflow-hidden border border-[var(--color-border)] bg-black/5">
              {activeMediaIndex === 99 && product.video_url ? (
                <video
                  src={product.video_url}
                  controls
                  className="w-full h-full object-cover"
                />
              ) : images[activeMediaIndex] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={images[activeMediaIndex]}
                  alt={product.title}
                  className="w-full h-full object-cover"
                  loading="eager"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[var(--color-muted)]">
                  <ImageIcon className="w-9 h-9 stroke-1" />
                </div>
              )}

              {product.is_featured && (
                <span className="absolute top-2 left-2 inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white uppercase tracking-wider">
                  <Flame className="w-2.5 h-2.5 fill-current" /> Hot
                </span>
              )}
            </div>

            {/* Thumbnail Selectors */}
            {(images.length > 1 || hasVideo) && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {images.map((url: string, idx: number) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => setActiveMediaIndex(idx)}
                    className={`relative w-11 h-11 rounded-lg overflow-hidden border-2 transition-colors shrink-0 ${
                      activeMediaIndex === idx
                        ? 'border-[var(--color-accent)]'
                        : 'border-[var(--color-border)] opacity-70 hover:opacity-100'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
                {hasVideo && (
                  <button
                    type="button"
                    onClick={() => setActiveMediaIndex(99)}
                    className={`relative w-11 h-11 rounded-lg overflow-hidden border-2 flex items-center justify-center bg-black/10 transition-colors shrink-0 ${
                      activeMediaIndex === 99
                        ? 'border-[var(--color-accent)]'
                        : 'border-[var(--color-border)] opacity-70 hover:opacity-100'
                    }`}
                    title="Play Video"
                  >
                    <Video className="w-4 h-4 text-[var(--color-foreground)]" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Details & Actions */}
          <div className="flex-1 min-w-0 space-y-4 w-full">
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-accent)]">
                  {product.category}
                </span>
                {product.brand && (
                  <>
                    <span className="text-[var(--color-muted)] opacity-40">·</span>
                    <span className="text-xs font-medium text-[var(--color-muted)]">
                      {product.brand}
                    </span>
                  </>
                )}
                <span className="text-[var(--color-muted)] opacity-40">·</span>
                <span className="text-xs text-[var(--color-muted)]">
                  Listed {createdDate.toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--color-foreground)] leading-snug">
                {product.title}
              </h1>
            </div>

            {/* Pricing & Stock Status */}
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="text-2xl sm:text-3xl font-bold text-[var(--color-foreground)] tabular-nums">
                {product.currency || 'GH₵'}
                {parseFloat(product.price).toLocaleString()}
              </span>
              {product.original_price &&
                Number(product.original_price) > Number(product.price) && (
                  <span className="text-sm text-[var(--color-muted)] line-through tabular-nums">
                    {product.currency || 'GH₵'}
                    {parseFloat(product.original_price).toLocaleString()}
                  </span>
                )}
              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border ${
                  product.status === 'active'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                }`}
              >
                {product.status}
              </span>
              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border ${
                  outOfStock
                    ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
                    : lowStock
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                      : 'bg-[var(--color-surface)] text-[var(--color-foreground)] border-[var(--color-border)]'
                }`}
              >
                {outOfStock ? 'Out of Stock' : `${currentStock} in stock`}
              </span>
            </div>

            {/* Primary Actions Bar */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Link
                href={`/dashboard/products/edit/${product.id}`}
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-[var(--color-accent)] text-white text-xs font-semibold hover:opacity-90 transition"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Edit Listing
              </Link>
              <a
                href={publicUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] text-xs font-medium text-[var(--color-foreground)] hover:bg-[var(--color-border)]/20 transition"
              >
                <Eye className="w-3.5 h-3.5" />
                View Public
                <ExternalLink className="w-3 h-3 opacity-50" />
              </a>

              {/* More Actions Dropdown */}
              <DropdownMenu
                trigger={
                  <button
                    type="button"
                    className="inline-flex items-center justify-center w-9 h-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-border)]/20 transition-colors"
                    title="More options"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                }
                items={moreMenuItems}
                align="right"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* CONTROLS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Listing Status Toggle */}
        <Card className="p-5 rounded-2xl space-y-3 bg-[var(--color-surface)] border border-[var(--color-border)]" hoverEffect={false}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--color-foreground)]">Listing Status</h2>
            {savingStatus && (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--color-muted)]" />
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {STATUS_OPTIONS.map((s) => {
              const active = s.value === product.status;
              return (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => handleStatusChange(s.value)}
                  disabled={savingStatus || active}
                  className={`relative p-3 rounded-xl text-left transition-colors border ${
                    active
                      ? 'bg-[var(--color-foreground)] text-[var(--color-surface)] border-transparent'
                      : 'border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-foreground)] hover:border-[var(--color-foreground)]/30'
                  }`}
                >
                  <div className="text-xs font-bold uppercase tracking-wider flex items-center justify-between">
                    <span>{s.label}</span>
                    {active && <Check className="w-3.5 h-3.5 opacity-80" />}
                  </div>
                  <p className="text-[10px] opacity-75 mt-1 leading-tight line-clamp-2">
                    {s.description}
                  </p>
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-[var(--color-muted)]">
            Draft hides the listing from shoppers without removing photos or descriptions.
          </p>
        </Card>

        {/* Inventory Stock Stepper */}
        <Card className="p-5 rounded-2xl space-y-3 bg-[var(--color-surface)] border border-[var(--color-border)]" hoverEffect={false}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--color-foreground)]">Inventory Quantity</h2>
            <span
              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                outOfStock
                  ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                  : lowStock
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {outOfStock ? 'Sold Out' : lowStock ? 'Low Stock' : 'In Stock'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setStockDraft(Math.max(0, currentStock - 1))}
              className="h-10 w-10 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] hover:bg-[var(--color-border)]/20 text-base font-bold text-[var(--color-foreground)] transition"
              aria-label="Decrease stock"
            >
              −
            </button>
            <input
              type="number"
              min={0}
              value={currentStock}
              onChange={(e) =>
                setStockDraft(Math.max(0, parseInt(e.target.value || '0', 10)))
              }
              className="flex-1 h-10 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] text-center text-sm font-bold text-[var(--color-foreground)] tabular-nums focus:outline-none focus:border-[var(--color-accent)]"
            />
            <button
              onClick={() => setStockDraft(currentStock + 1)}
              className="h-10 w-10 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] hover:bg-[var(--color-border)]/20 text-base font-bold text-[var(--color-foreground)] transition"
              aria-label="Increase stock"
            >
              +
            </button>
          </div>
          {stockDirty && (
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSaveStock}
                disabled={savingStock}
                className="flex-1 h-9 rounded-xl text-xs"
              >
                {savingStock ? 'Saving...' : 'Confirm Stock Update'}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setStockDraft(null)}
                className="h-9 rounded-xl text-xs"
              >
                Cancel
              </Button>
            </div>
          )}
        </Card>

        {/* Hot Sales Boost Promotion */}
        <Card className="p-5 rounded-2xl space-y-3 bg-[var(--color-surface)] border border-[var(--color-border)]" hoverEffect={false}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold flex items-center gap-1.5 text-[var(--color-foreground)]">
                <Flame className="w-4 h-4 text-amber-500 fill-current" /> Hot Sales Boost
              </h2>
              <p className="text-xs text-[var(--color-muted)] mt-1">
                Pin this product to the top featured homepage carousel for verified Ghanaian shoppers.
              </p>
            </div>
            <span
              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                product.is_featured
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                  : 'bg-[var(--color-border)]/50 text-[var(--color-muted)]'
              }`}
            >
              {product.is_featured ? 'Active' : 'Inactive'}
            </span>
          </div>
          <Button
            size="sm"
            variant={product.is_featured ? 'secondary' : 'primary'}
            onClick={handleToggleHot}
            disabled={togglingHot}
            className="w-full h-9 rounded-xl text-xs"
          >
            {togglingHot ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Processing...
              </>
            ) : product.is_featured ? (
              'Deactivate Hot Sales'
            ) : (
              'Boost on Hot Sales (GH₵7)'
            )}
          </Button>
        </Card>

        {/* Share Social Card */}
        <Card className="p-5 rounded-2xl space-y-3 bg-[var(--color-surface)] border border-[var(--color-border)]" hoverEffect={false}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold flex items-center gap-1.5 text-[var(--color-foreground)]">
                <Sparkles className="w-4 h-4 text-[var(--color-accent)]" /> Social Share Card
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)] uppercase tracking-wider ml-1">
                  Pro
                </span>
              </h2>
              <p className="text-xs text-[var(--color-muted)] mt-1">
                Generate high-resolution 1200×630 promotional banners tailored for WhatsApp Status, Instagram, and TikTok.
              </p>
            </div>
          </div>
          {isPro ? (
            <Button
              size="sm"
              onClick={() => setShowShareCard(true)}
              className="w-full h-9 rounded-xl text-xs"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Generate Social Card
            </Button>
          ) : (
            <Link href="/dashboard/settings" className="block">
              <Button
                size="sm"
                variant="secondary"
                className="w-full h-9 rounded-xl text-xs"
              >
                <Lock className="w-3.5 h-3.5 mr-1.5" /> Unlock with Pro
              </Button>
            </Link>
          )}
        </Card>

        {/* Variants Overview */}
        <Card className="p-5 rounded-2xl space-y-3 bg-[var(--color-surface)] border border-[var(--color-border)]" hoverEffect={false}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold flex items-center gap-1.5 text-[var(--color-foreground)]">
                <Layers className="w-4 h-4 text-[var(--color-muted)]" /> Product Variants
              </h2>
              <p className="text-xs text-[var(--color-muted)] mt-1">
                Manage size, color, storage, or material options with custom prices and inventory.
              </p>
            </div>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider shrink-0 bg-[var(--color-border)]/50 text-[var(--color-muted)]">
              {Array.isArray(product.variants) && product.variants.length
                ? `${product.variants.length} active`
                : 'None'}
            </span>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setShowVariantModal(true)}
            className="w-full h-9 rounded-xl text-xs"
          >
            Manage Variants &amp; Attributes
          </Button>
        </Card>

        {/* Analytics Preview */}
        <Card className="p-5 rounded-2xl space-y-3 bg-[var(--color-surface)] border border-[var(--color-border)]" hoverEffect={false}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold flex items-center gap-1.5 text-[var(--color-foreground)]">
                <BarChart3 className="w-4 h-4 text-[var(--color-muted)]" /> Performance
                {!isPro && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)] uppercase tracking-wider ml-1">
                    Preview
                  </span>
                )}
              </h2>
              <p className="text-xs text-[var(--color-muted)] mt-1">
                {isPro ? 'Views and impressions over the last 30 days.' : 'Upgrade to Pro for full visitor conversion stats.'}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Metric label="Views" value={product.views_count ?? 0} icon={<Eye className="w-3 h-3" />} />
            <Metric label="In stock" value={currentStock} icon={<Package className="w-3 h-3" />} />
            <Metric
              label="Rating"
              value={
                product.rating_avg ? `${Number(product.rating_avg).toFixed(1)}★` : '—'
              }
              icon={<TrendingUp className="w-3 h-3" />}
            />
          </div>
          {isPro ? (
            <Link href="/dashboard/analytics" className="block">
              <Button size="sm" variant="secondary" className="w-full h-9 rounded-xl text-xs">
                <BarChart3 className="w-3.5 h-3.5 mr-1.5" /> View Store Analytics
              </Button>
            </Link>
          ) : (
            <Link href="/dashboard/settings" className="block">
              <Button size="sm" variant="secondary" className="w-full h-9 rounded-xl text-xs">
                <Sparkles className="w-3.5 h-3.5 text-[var(--color-accent)] mr-1.5" /> Unlock Advanced Analytics
              </Button>
            </Link>
          )}
        </Card>
      </div>

      {/* Specifications & Tags Summary */}
      {(product.tags?.length > 0 ||
        Object.keys(product.attributes || {}).length > 0 ||
        product.description) && (
        <Card className="p-5 rounded-2xl space-y-4 bg-[var(--color-surface)] border border-[var(--color-border)]" hoverEffect={false}>
          <h2 className="text-sm font-semibold flex items-center gap-1.5 text-[var(--color-foreground)]">
            <Tag className="w-4 h-4 text-[var(--color-muted)]" /> Specs &amp; Details
          </h2>

          {product.description && (
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted)] block mb-1">
                Description
              </span>
              <p className="text-xs text-[var(--color-foreground)] leading-relaxed whitespace-pre-line bg-[var(--color-background)] p-3 rounded-xl border border-[var(--color-border)]">
                {product.description}
              </p>
            </div>
          )}

          {product.tags?.length > 0 && (
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted)] block mb-1.5">
                Tags
              </span>
              <div className="flex flex-wrap gap-1.5">
                {product.tags.map((t: string) => (
                  <span
                    key={t}
                    className="text-xs px-2.5 py-0.5 rounded-full bg-[var(--color-background)] border border-[var(--color-border)] text-[var(--color-foreground)]"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {product.attributes && Object.keys(product.attributes).length > 0 && (
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted)] block mb-1.5">
                Attributes
              </span>
              <dl className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                {Object.entries(product.attributes).map(([k, v]) => (
                  <div
                    key={k}
                    className="bg-[var(--color-background)] border border-[var(--color-border)] p-2.5 rounded-xl"
                  >
                    <dt className="text-[10px] font-bold uppercase text-[var(--color-muted)]">
                      {k.replace(/_/g, ' ')}
                    </dt>
                    <dd className="font-semibold text-[var(--color-foreground)] truncate mt-0.5">
                      {String(v)}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </Card>
      )}

      {/* Danger Zone */}
      <Card
        className="p-5 rounded-2xl space-y-3 border border-[var(--color-danger)]/20 bg-[var(--color-danger)]/[0.02]"
        hoverEffect={false}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-[var(--color-danger)] flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4" /> Danger Zone
            </h2>
            <p className="text-xs text-[var(--color-muted)] mt-0.5">
              Permanently remove this listing and all configured variants.
            </p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setConfirmDelete(true)}
            className="h-9 rounded-xl text-xs text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete Listing
          </Button>
        </div>
      </Card>

      {/* Custom ConfirmModal for Permanent Deletion */}
      <ConfirmModal
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Delete Product Listing"
        description="Are you sure you want to permanently delete this product? All media and variant configurations will be deleted immediately. This action cannot be undone."
        confirmText="Delete Listing"
        variant="danger"
        isLoading={deleting}
      />

      <ShareProductCardModal
        open={showShareCard}
        onClose={() => setShowShareCard(false)}
        product={{ id: product.id, title: product.title }}
        storeName={product.seller?.store_name ?? null}
        storeLink={product.seller?.store_link ?? null}
      />

      {/* Manage Variants & Attributes Custom Modal */}
      <Modal
        isOpen={showVariantModal}
        onClose={() => setShowVariantModal(false)}
        title="Product Variants & Attributes"
        description={`Configure specifications, SKU overrides, and stock levels for "${product?.title}".`}
        className="max-w-4xl"
      >
        <div className="pt-1">
          <VariantEditor
            productId={product.id}
            onSaveSuccess={() => {
              refresh();
              setShowVariantModal(false);
            }}
          />
        </div>
      </Modal>
    </div>
  );
}

function Metric({
  label,
  value,
  icon,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-[var(--color-background)] border border-[var(--color-border)] p-3 text-center space-y-0.5">
      <div className="flex items-center justify-center gap-1 text-[10px] uppercase font-bold tracking-wider text-[var(--color-muted)]">
        {icon} {label}
      </div>
      <div className="text-sm font-bold text-[var(--color-foreground)] tabular-nums">{value}</div>
    </div>
  );
}
