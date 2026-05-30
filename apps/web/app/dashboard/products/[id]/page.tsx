"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
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
  Calendar,
  Tag,
  Layers,
  CalendarClock,
  MessageSquare,
  BarChart3,
  Image as ImageIcon,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { useAuth } from "@/lib/contexts/auth-context";
import { useProStatus } from "@/hooks/useProStatus";
import { productApi } from "@/lib/api/product";
import ShareProductCardModal from "@/components/dashboard/ShareProductCardModal";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://verndly.com";

const STATUS_OPTIONS: Array<{ value: string; label: string; tint: string }> = [
  { value: "draft", label: "Draft", tint: "bg-orange-500/10 text-orange-600" },
  { value: "active", label: "Active", tint: "bg-emerald-500/10 text-emerald-600" },
  {
    value: "out_of_stock",
    label: "Out of stock",
    tint: "bg-red-500/10 text-red-600",
  },
  { value: "archived", label: "Archived", tint: "bg-muted/30 text-muted" },
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
  const [togglingHot, setTogglingHot] = useState(false);

  const refresh = useCallback(async () => {
    if (!id) return;
    try {
      const data = await productApi.getProductById(id as string);
      setProduct(data);
      setStockDraft(null);
    } catch (e: any) {
      setError(e?.message || "Failed to load product");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const isOwner = useMemo(() => {
    if (!product || !user) return false;
    return product.seller?.user_id === user.id || user.role === "ADMIN";
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
      toast.success(`Status set to ${next.replace("_", " ")}`);
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
      toast.success(`Stock updated to ${stockDraft}`);
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
      toast.success("Duplicated as draft.");
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
      toast.success("Product deleted.");
      router.push("/dashboard/products");
    } catch (e: any) {
      toast.error(e?.message || "Couldn't delete");
      setDeleting(false);
    }
  }

  async function handleToggleHot() {
    if (!token) return;
    setTogglingHot(true);
    try {
      await productApi.toggleHotSales(
        token,
        product.id,
        Boolean(product.is_featured),
      );
      toast.success(
        product.is_featured ? "Hot Sales disabled." : "Hot Sales enabled.",
      );
      await refresh();
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
      toast.success("Public link copied.");
    } catch {
      toast.error("Couldn't copy. Long-press the URL instead.");
    }
  }

  // ─── Render ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-md mx-auto py-20 text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
        <h1 className="text-lg font-medium">Couldn&apos;t load this product</h1>
        <p className="text-sm text-muted">{error || "Try again in a moment."}</p>
        <Button onClick={() => router.push("/dashboard/products")}>
          Back to products
        </Button>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="max-w-md mx-auto py-20 text-center space-y-4">
        <Lock className="w-10 h-10 text-muted mx-auto" />
        <h1 className="text-lg font-medium">This isn&apos;t your product</h1>
        <Button onClick={() => router.push("/dashboard/products")}>
          Back to your products
        </Button>
      </div>
    );
  }

  const statusInfo =
    STATUS_OPTIONS.find((s) => s.value === product.status) || STATUS_OPTIONS[0];
  const publicUrl = `${SITE_URL}/product/${product.id}`;
  const created = new Date(product.created_at);

  return (
    <div className="max-w-5xl mx-auto pb-24 px-4 md:px-0">
      {/* Back link */}
      <Link
        href="/dashboard/products"
        className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-foreground transition-colors mb-4 mt-2"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        All products
      </Link>

      {/* HERO */}
      <Card
        className="overflow-hidden border-none bg-surface/40 p-4 sm:p-6 rounded-3xl"
        hoverEffect={false}
      >
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
          <div className="relative h-32 w-full sm:h-32 sm:w-32 shrink-0 rounded-2xl overflow-hidden border border-border/50 bg-black/5">
            {product.image_urls?.[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.image_urls[0]}
                alt={product.title}
                className="w-full h-full object-cover"
                loading="eager"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted">
                <ImageIcon className="w-8 h-8" />
              </div>
            )}
            {product.is_featured && (
              <span className="absolute top-2 left-2 inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/90 text-white uppercase tracking-wider">
                <Flame className="w-2.5 h-2.5" /> Hot
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0 space-y-3">
            <div>
              <h1 className="text-lg sm:text-xl font-medium tracking-tight leading-snug">
                {product.title}
              </h1>
              <p className="text-xs text-muted mt-1">
                {product.category}
                {product.brand && (
                  <>
                    <span className="opacity-40 mx-1.5">·</span>
                    {product.brand}
                  </>
                )}
                <span className="opacity-40 mx-1.5">·</span>
                Added{" "}
                {created.toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>

            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-2xl font-semibold text-primary">
                {product.currency || "GH₵"}
                {parseFloat(product.price).toLocaleString()}
              </span>
              {product.original_price &&
                Number(product.original_price) > Number(product.price) && (
                  <span className="text-sm text-muted line-through">
                    {product.currency || "GH₵"}
                    {parseFloat(product.original_price).toLocaleString()}
                  </span>
                )}
              <span
                className={`text-[10px] font-medium px-2 py-0.5 rounded-full uppercase tracking-wider ${statusInfo.tint}`}
              >
                {statusInfo.label}
              </span>
            </div>

            {/* Primary actions row — wraps on mobile */}
            <div className="flex flex-wrap gap-2 pt-1">
              <Link
                href={`/dashboard/products/edit/${product.id}`}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-primary text-white text-xs font-medium hover:opacity-90 transition"
              >
                <Edit2 className="w-3.5 h-3.5" /> Edit details
              </Link>
              <a
                href={publicUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl border border-border text-xs font-medium hover:bg-surface transition"
              >
                <Eye className="w-3.5 h-3.5" /> View public
                <ExternalLink className="w-3 h-3 opacity-50" />
              </a>
              <button
                onClick={copyPublicUrl}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl border border-border text-xs font-medium hover:bg-surface transition"
              >
                <Copy className="w-3.5 h-3.5" /> Copy link
              </button>
              <button
                onClick={handleDuplicate}
                disabled={duplicating}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl border border-border text-xs font-medium hover:bg-surface transition disabled:opacity-60"
              >
                {duplicating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                Duplicate
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        {/* Status */}
        <Card className="p-5 rounded-3xl space-y-3" hoverEffect={false}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">Listing status</h2>
            {savingStatus && (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-muted" />
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {STATUS_OPTIONS.map((s) => {
              const active = s.value === product.status;
              return (
                <button
                  key={s.value}
                  onClick={() => handleStatusChange(s.value)}
                  disabled={savingStatus || active}
                  className={`relative h-11 rounded-xl text-xs font-medium transition border ${
                    active
                      ? `${s.tint} border-current/30`
                      : "border-border hover:bg-surface text-foreground/80"
                  } disabled:cursor-default`}
                >
                  {s.label}
                  {active && (
                    <Check className="w-3 h-3 absolute top-1.5 right-1.5 opacity-70" />
                  )}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-muted">
            Draft hides the product from shoppers. Out of stock keeps the page
            but blocks add-to-cart.
          </p>
        </Card>

        {/* Stock */}
        <Card className="p-5 rounded-3xl space-y-3" hoverEffect={false}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">Inventory</h2>
            <span
              className={`text-[10px] font-medium px-2 py-0.5 rounded-full uppercase tracking-wider ${
                outOfStock
                  ? "bg-red-500/10 text-red-600"
                  : lowStock
                    ? "bg-amber-500/10 text-amber-600"
                    : "bg-emerald-500/10 text-emerald-600"
              }`}
            >
              {outOfStock ? "Out" : lowStock ? "Low" : "Healthy"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                setStockDraft(Math.max(0, currentStock - 1))
              }
              className="h-11 w-11 rounded-xl border border-border hover:bg-surface text-lg font-medium"
              aria-label="Decrease stock"
            >
              −
            </button>
            <input
              type="number"
              min={0}
              value={currentStock}
              onChange={(e) =>
                setStockDraft(Math.max(0, parseInt(e.target.value || "0", 10)))
              }
              className="flex-1 h-11 px-3 rounded-xl border border-border bg-background text-center text-base font-medium tabular-nums"
            />
            <button
              onClick={() => setStockDraft(currentStock + 1)}
              className="h-11 w-11 rounded-xl border border-border hover:bg-surface text-lg font-medium"
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
                {savingStock ? "Saving…" : "Save stock"}
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

        {/* Hot Sales — paid promotion (everyone) */}
        <Card className="p-5 rounded-3xl space-y-3" hoverEffect={false}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-sm font-medium flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-amber-500" /> Hot Sales boost
              </h2>
              <p className="text-[11px] text-muted mt-1">
                Surfaces this item in the homepage Hot Sales rail for a week.
                GH₵7 per cycle.
              </p>
            </div>
            <span
              className={`text-[10px] font-medium px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                product.is_featured
                  ? "bg-amber-500/10 text-amber-600"
                  : "bg-muted/20 text-muted"
              }`}
            >
              {product.is_featured ? "On" : "Off"}
            </span>
          </div>
          <Button
            size="sm"
            variant={product.is_featured ? "secondary" : "primary"}
            onClick={handleToggleHot}
            disabled={togglingHot}
            className="w-full h-10 rounded-xl text-xs"
          >
            {togglingHot ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Working…
              </>
            ) : product.is_featured ? (
              "Turn off Hot Sales"
            ) : (
              "Enable Hot Sales · GH₵7"
            )}
          </Button>
        </Card>

        {/* Share card — Pro */}
        <Card
          className={`p-5 rounded-3xl space-y-3 ${
            isPro ? "" : "opacity-90"
          }`}
          hoverEffect={false}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-sm font-medium flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-accent" /> Share card
                <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-accent/10 text-accent uppercase tracking-wider ml-1">
                  Pro
                </span>
              </h2>
              <p className="text-[11px] text-muted mt-1">
                Generate a 1200×630 image with your product, price, and store
                name. Perfect for Instagram, WhatsApp Status, X.
              </p>
            </div>
          </div>
          {isPro ? (
            <Button
              size="sm"
              onClick={() => setShowShareCard(true)}
              className="w-full h-10 rounded-xl text-xs"
            >
              <Sparkles className="w-3.5 h-3.5" /> Generate card
            </Button>
          ) : (
            <Link href="/dashboard/settings" className="block">
              <Button
                size="sm"
                variant="secondary"
                className="w-full h-10 rounded-xl text-xs"
              >
                <Lock className="w-3.5 h-3.5" /> Upgrade to Pro
              </Button>
            </Link>
          )}
        </Card>

        {/* Variants */}
        <Card className="p-5 rounded-3xl space-y-3" hoverEffect={false}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-sm font-medium flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-muted" /> Variants
              </h2>
              <p className="text-[11px] text-muted mt-1">
                Set per-size / per-colour stock and pricing. Lives on the edit
                page.
              </p>
            </div>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 bg-muted/20 text-muted">
              {Array.isArray(product.variants) && product.variants.length
                ? `${product.variants.length} active`
                : "None"}
            </span>
          </div>
          <Link
            href={`/dashboard/products/edit/${product.id}#variants`}
            className="block"
          >
            <Button
              size="sm"
              variant="secondary"
              className="w-full h-10 rounded-xl text-xs"
            >
              Manage variants
            </Button>
          </Link>
        </Card>

        {/* Analytics — Pro preview */}
        <Card className="p-5 rounded-3xl space-y-3" hoverEffect={false}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-sm font-medium flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-muted" /> Performance
                {!isPro && (
                  <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-accent/10 text-accent uppercase tracking-wider ml-1">
                    Pro preview
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-muted mt-1">
                {isPro
                  ? "Visits and conversion from the last 30 days."
                  : "Pro unlocks full visitor + conversion analytics."}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Metric label="Views" value={product.views_count ?? 0} icon={<Eye className="w-3 h-3" />} />
            <Metric label="In stock" value={currentStock} icon={<Package className="w-3 h-3" />} />
            <Metric
              label="Rating"
              value={
                product.rating_avg
                  ? `${Number(product.rating_avg).toFixed(1)}★`
                  : "—"
              }
              icon={<TrendingUp className="w-3 h-3" />}
            />
          </div>
          {!isPro && (
            <Link href="/dashboard/settings" className="block">
              <Button
                size="sm"
                variant="secondary"
                className="w-full h-9 rounded-xl text-xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-accent" /> Unlock with Pro
              </Button>
            </Link>
          )}
        </Card>

        {/* Schedule price (Pro placeholder) */}
        <Card className="p-5 rounded-3xl space-y-3" hoverEffect={false}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-sm font-medium flex items-center gap-1.5">
                <CalendarClock className="w-4 h-4 text-muted" /> Schedule price
                changes
                <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-accent/10 text-accent uppercase tracking-wider ml-1">
                  Pro
                </span>
              </h2>
              <p className="text-[11px] text-muted mt-1">
                Plan a flash sale, then auto-revert when it ends. Coming soon
                for Pro sellers.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="secondary"
            disabled
            className="w-full h-10 rounded-xl text-xs opacity-60"
          >
            Coming soon
          </Button>
        </Card>

        {/* Customer questions (placeholder for future Q&A) */}
        <Card className="p-5 rounded-3xl space-y-3" hoverEffect={false}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-sm font-medium flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-muted" /> Buyer questions
              </h2>
              <p className="text-[11px] text-muted mt-1">
                Answer common product questions to reduce returns. Coming soon.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="secondary"
            disabled
            className="w-full h-10 rounded-xl text-xs opacity-60"
          >
            Coming soon
          </Button>
        </Card>
      </div>

      {/* Tags + Attributes summary */}
      {(product.tags?.length > 0 ||
        Object.keys(product.attributes || {}).length > 0) && (
        <Card className="mt-4 p-5 rounded-3xl space-y-3" hoverEffect={false}>
          <h2 className="text-sm font-medium flex items-center gap-1.5">
            <Tag className="w-4 h-4 text-muted" /> Tags & attributes
          </h2>
          {product.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {product.tags.map((t: string) => (
                <span
                  key={t}
                  className="text-[11px] px-2 py-0.5 rounded-full bg-muted/20 text-foreground/80"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
          {product.attributes && Object.keys(product.attributes).length > 0 && (
            <dl className="grid grid-cols-2 gap-2 text-[11px]">
              {Object.entries(product.attributes).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-2 border-b border-border/40 py-1.5">
                  <dt className="text-muted capitalize">{k.replace(/_/g, " ")}</dt>
                  <dd className="font-medium truncate">{String(v)}</dd>
                </div>
              ))}
            </dl>
          )}
        </Card>
      )}

      {/* Danger zone */}
      <Card
        className="mt-4 p-5 rounded-3xl space-y-3 border border-red-500/20 bg-red-500/[0.02]"
        hoverEffect={false}
      >
        <h2 className="text-sm font-medium text-red-600 flex items-center gap-1.5">
          <AlertCircle className="w-4 h-4" /> Danger zone
        </h2>
        <p className="text-[11px] text-muted">
          Deletes this product and all of its variants. Orders that already
          reference it stay intact.
        </p>
        {!confirmDelete ? (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setConfirmDelete(true)}
            className="h-10 rounded-xl text-xs text-red-600 hover:bg-red-500/10"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete this product
          </Button>
        ) : (
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1 h-10 rounded-xl text-xs bg-red-500 hover:bg-red-600 text-white"
            >
              {deleting ? "Deleting…" : "Yes, delete permanently"}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setConfirmDelete(false)}
              className="h-10 rounded-xl text-xs"
            >
              Cancel
            </Button>
          </div>
        )}
      </Card>

      <ShareProductCardModal
        open={showShareCard}
        onClose={() => setShowShareCard(false)}
        product={{ id: product.id, title: product.title }}
        storeName={product.seller?.store_name ?? null}
        storeLink={product.seller?.store_link ?? null}
      />
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
    <div className="rounded-xl bg-surface/60 p-3 text-center space-y-0.5">
      <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wider text-muted">
        {icon} {label}
      </div>
      <div className="text-sm font-semibold tabular-nums">{value}</div>
    </div>
  );
}
