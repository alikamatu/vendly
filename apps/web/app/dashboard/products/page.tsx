"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  Loader2,
  AlertCircle,
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
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/contexts/auth-context";
import { productApi } from "@/lib/api/product";
import SellerProductCard from "@/components/products/SellerProductCard";

// ─── Status groups + sorts ───────────────────────────────────────────
const STATUS_GROUPS = [
  { key: "all", label: "All", match: () => true },
  { key: "active", label: "Active", match: (s: string) => s === "active" },
  { key: "draft", label: "Drafts", match: (s: string) => s === "draft" },
  {
    key: "out",
    label: "Out of stock",
    match: (s: string) => s === "out_of_stock",
  },
  { key: "archived", label: "Archived", match: (s: string) => s === "archived" },
] as const;
type StatusGroup = (typeof STATUS_GROUPS)[number]["key"];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "price_desc", label: "Price high → low" },
  { value: "price_asc", label: "Price low → high" },
  { value: "stock_asc", label: "Lowest stock" },
  { value: "views_desc", label: "Most viewed" },
] as const;
type SortBy = (typeof SORT_OPTIONS)[number]["value"];

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
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [promotionStates, setPromotionStates] = useState<
    Record<string, "idle" | "verifying" | "payment_required" | "failed">
  >({});

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusGroup, setStatusGroup] = useState<StatusGroup>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [hotOnly, setHotOnly] = useState(false);
  const [lowOnly, setLowOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>("newest");

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
      setError(err.message || "Failed to load products");
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Hot Sales payment-return handler (kept from the previous version).
  useEffect(() => {
    const processCallback = async () => {
      const hotSalePayment = searchParams.get("hot_sale_payment");
      const reference = searchParams.get("reference");
      const productId = searchParams.get("product_id");
      if (!token || hotSalePayment !== "1" || !reference || !productId) return;

      setPromotionStates((prev) => ({ ...prev, [productId]: "verifying" }));
      setActionMessage("Verifying Hot Sales payment…");

      try {
        const verifyResult = await productApi.verifyHotSalesPayment(
          token,
          reference,
          productId,
        );
        await fetchProducts(true);
        if (verifyResult.verified && verifyResult.is_featured) {
          setActionMessage("Payment verified. Hot Sales enabled.");
        } else {
          setActionMessage("Payment still pending. Refresh in a moment.");
          setPromotionStates((prev) => ({
            ...prev,
            [productId]: "payment_required",
          }));
        }
      } catch (err: any) {
        setPromotionStates((prev) => ({ ...prev, [productId]: "failed" }));
        setError(err.message || "Failed to verify Hot Sales payment");
      } finally {
        router.replace(pathname);
      }
    };
    processCallback();
  }, [searchParams, token, pathname, router]);

  // ─── Stats (computed client-side) ──────────────────────────────────
  const stats = useMemo(() => {
    let active = 0;
    let drafts = 0;
    let lowStock = 0;
    let outOfStock = 0;
    let totalViews = 0;
    for (const p of products) {
      if (p.status === "active") active++;
      if (p.status === "draft") drafts++;
      if (p.quantity_available === 0) outOfStock++;
      else if (p.quantity_available <= LOW_STOCK_THRESHOLD) lowStock++;
      totalViews += p.views_count || 0;
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
        if (!group.match(p.status)) return false;
        if (categoryFilter !== "all" && p.category !== categoryFilter)
          return false;
        if (hotOnly && !p.is_featured) return false;
        if (lowOnly && p.quantity_available > LOW_STOCK_THRESHOLD) return false;
        if (q) {
          const hay =
            `${p.title} ${p.category || ""} ${p.brand || ""} ${(p.tags || []).join(" ")}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case "oldest":
            return +new Date(a.created_at) - +new Date(b.created_at);
          case "price_desc":
            return parseFloat(b.price) - parseFloat(a.price);
          case "price_asc":
            return parseFloat(a.price) - parseFloat(b.price);
          case "stock_asc":
            return (a.quantity_available || 0) - (b.quantity_available || 0);
          case "views_desc":
            return (b.views_count || 0) - (a.views_count || 0);
          case "newest":
          default:
            return +new Date(b.created_at) - +new Date(a.created_at);
        }
      });
  }, [products, statusGroup, categoryFilter, hotOnly, lowOnly, searchQuery, sortBy]);

  // ─── Card handlers (still proxied for promotion verify state) ───────
  const handleDelete = async (id: string) => {
    if (!token) return;
    try {
      await productApi.deleteProduct(token, id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) {
      alert(err.message || "Failed to delete product");
    }
  };

  const handleToggleHotSales = async (id: string, currentState: boolean) => {
    if (!token) return;
    try {
      if (!currentState) {
        setPromotionStates((prev) => ({ ...prev, [id]: "verifying" }));
        try {
          await productApi.toggleHotSales(token, id, true);
          setProducts((prev) =>
            prev.map((p) => (p.id === id ? { ...p, is_featured: true } : p)),
          );
          setActionMessage("Hot Sales enabled.");
          setPromotionStates((prev) => ({ ...prev, [id]: "idle" }));
          setTimeout(() => setActionMessage(null), 2500);
          return;
        } catch (toggleErr: any) {
          if (!String(toggleErr?.message || "").toLowerCase().includes("payment")) {
            throw toggleErr;
          }
          setPromotionStates((prev) => ({
            ...prev,
            [id]: "payment_required",
          }));
        }
        const init = await productApi.initializeHotSalesPayment(token, id);
        if (!init.checkout_url) {
          throw new Error("Unable to initialize payment. Try again.");
        }
        window.location.href = init.checkout_url;
        return;
      }
      await productApi.toggleHotSales(token, id, false);
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, is_featured: false } : p)),
      );
      setActionMessage("Hot Sales disabled.");
      setPromotionStates((prev) => ({ ...prev, [id]: "idle" }));
      setTimeout(() => setActionMessage(null), 2500);
    } catch (err: any) {
      setPromotionStates((prev) => ({ ...prev, [id]: "failed" }));
      setError(err.message || "Failed to update Hot Sales status");
    }
  };

  // ─── Render ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="w-7 h-7 text-red-500 animate-spin" />
      </div>
    );
  }

  const anyFilterActive =
    statusGroup !== "all" ||
    categoryFilter !== "all" ||
    hotOnly ||
    lowOnly ||
    !!searchQuery.trim();

  return (
    <div className="space-y-5 max-w-6xl mx-auto pb-24 px-3 sm:px-4">
      {/* HEADER */}
      <div className="space-y-3 pt-2">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-[11px] text-muted hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3 h-3" /> Dashboard
        </Link>
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
              Products
            </h1>
            <p className="text-[11px] text-muted mt-1">
              {filtered.length} of {products.length} showing
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => fetchProducts(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-border text-xs font-medium hover:bg-surface transition disabled:opacity-60"
              title="Refresh"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`}
              />
            </button>
            <Link
              href="/dashboard/products/import"
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-border text-xs font-medium hover:bg-surface transition"
            >
              <Upload className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Bulk CSV</span>
            </Link>
            <Link
              href="/dashboard/products/add"
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-red-500 text-white text-xs font-semibold hover:opacity-90 transition shadow-sm shadow-red-500/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New product</span>
              <span className="sm:hidden">New</span>
            </Link>
          </div>
        </div>
      </div>

      {/* STATS STRIP */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <StatTile
          icon={<Boxes className="w-4 h-4" />}
          label="Total"
          value={String(products.length)}
          hint="all listings"
        />
        <StatTile
          icon={<CircleDot className="w-4 h-4" />}
          label="Active"
          value={String(stats.active)}
          hint={`${stats.drafts} draft${stats.drafts === 1 ? "" : "s"}`}
        />
        <StatTile
          accent={stats.lowStock + stats.outOfStock > 0}
          icon={<PackageX className="w-4 h-4" />}
          label="Low / out"
          value={String(stats.lowStock + stats.outOfStock)}
          hint={
            stats.outOfStock > 0
              ? `${stats.outOfStock} sold out`
              : "≤ 5 in stock"
          }
        />
        <StatTile
          icon={<Eye className="w-4 h-4" />}
          label="Total views"
          value={stats.totalViews.toLocaleString()}
          hint="across all products"
        />
      </div>

      {/* SEARCH + FILTERS */}
      <div className="space-y-2.5">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, category, brand, or tag…"
            className="w-full h-11 pl-9 pr-3 rounded-xl bg-surface border border-border text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500/40 transition"
          />
        </div>

        {/* Status group chips */}
        <ChipRow label="Status">
          {STATUS_GROUPS.map((g) => {
            const count =
              g.key === "all"
                ? products.length
                : products.filter((p) => g.match(p.status)).length;
            return (
              <Chip
                key={g.key}
                active={statusGroup === g.key}
                onClick={() => setStatusGroup(g.key)}
                badge={count > 0 && g.key !== "all" ? count : undefined}
              >
                {g.label}
              </Chip>
            );
          })}
        </ChipRow>

        {/* Category chips (only if categories present) */}
        {categories.length > 0 && (
          <ChipRow label="Category">
            <Chip
              active={categoryFilter === "all"}
              onClick={() => setCategoryFilter("all")}
            >
              All
            </Chip>
            {categories.map((c) => (
              <Chip
                key={c}
                active={categoryFilter === c}
                onClick={() => setCategoryFilter(c)}
              >
                {c}
              </Chip>
            ))}
          </ChipRow>
        )}

        {/* Quick toggles + sort + reset */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-3 px-3 sm:mx-0 sm:px-0">
          <label className="inline-flex items-center gap-1.5 text-[11px] cursor-pointer select-none shrink-0 px-3 h-8 border border-border rounded-full hover:bg-surface transition">
            <input
              type="checkbox"
              checked={hotOnly}
              onChange={(e) => setHotOnly(e.target.checked)}
              className="h-3 w-3 accent-red-500"
            />
            <Flame className="w-3 h-3 text-amber-500" /> Hot only
          </label>
          <label className="inline-flex items-center gap-1.5 text-[11px] cursor-pointer select-none shrink-0 px-3 h-8 border border-border rounded-full hover:bg-surface transition">
            <input
              type="checkbox"
              checked={lowOnly}
              onChange={(e) => setLowOnly(e.target.checked)}
              className="h-3 w-3 accent-red-500"
            />
            <PackageX className="w-3 h-3 text-amber-500" /> Low stock
          </label>
          {anyFilterActive && (
            <button
              onClick={() => {
                setStatusGroup("all");
                setCategoryFilter("all");
                setHotOnly(false);
                setLowOnly(false);
                setSearchQuery("");
              }}
              className="shrink-0 text-[11px] text-red-500 hover:underline px-2 h-8"
            >
              Clear filters
            </button>
          )}
          <div className="ml-auto shrink-0 flex items-center gap-1.5 text-[11px]">
            <span className="text-muted uppercase tracking-wider">Sort</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="h-8 px-2.5 rounded-full border border-border bg-background text-xs focus:outline-none focus:border-red-500/40"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Banners */}
      {actionMessage && (
        <div className="flex items-center gap-2 px-3 py-2.5 bg-amber-500/5 text-amber-700 rounded-xl border border-amber-500/20 text-xs">
          <Flame className="w-4 h-4 shrink-0" /> {actionMessage}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 px-3 py-2.5 bg-red-500/5 text-red-600 rounded-xl border border-red-500/20 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* LIST */}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {filtered.length > 0 ? (
            filtered.map((product, idx) => (
              <SellerProductCard
                key={product.id}
                product={product}
                promotionState={promotionStates[product.id] || "idle"}
                onDelete={handleDelete}
                onToggleHotSales={handleToggleHotSales}
                index={idx}
              />
            ))
          ) : (
            <EmptyState
              query={searchQuery}
              anyFilters={anyFilterActive}
              hasProducts={products.length > 0}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Sub-components (kept inline for now — share with orders page later) ─

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
      className={`p-3 sm:p-4 rounded-2xl border ${
        accent
          ? "border-red-500/30 bg-red-500/5"
          : "border-border bg-surface/50"
      }`}
    >
      <div className="flex items-center gap-1.5">
        <span className={accent ? "text-red-500" : "text-muted"}>{icon}</span>
        <span className="text-[10px] uppercase tracking-wider text-muted">
          {label}
        </span>
      </div>
      <div
        className={`mt-1 text-lg sm:text-xl font-semibold tabular-nums ${
          accent ? "text-red-500" : ""
        }`}
      >
        {value}
      </div>
      {hint && (
        <div className="text-[10px] text-muted mt-0.5 truncate">{hint}</div>
      )}
    </div>
  );
}

function ChipRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-3 px-3 sm:mx-0 sm:px-0">
      <span className="text-[10px] uppercase tracking-wider text-muted shrink-0 mr-1">
        {label}
      </span>
      <div className="flex items-center gap-1.5">{children}</div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-medium border transition active:scale-95 ${
        active
          ? "bg-red-500 text-white border-red-500"
          : "bg-background border-border hover:border-foreground/30 text-foreground/80"
      }`}
    >
      {children}
      {typeof badge === "number" && badge > 0 && (
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded-full tabular-nums ${
            active ? "bg-white/20" : "bg-foreground/10"
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

function EmptyState({
  query,
  anyFilters,
  hasProducts,
}: {
  query: string;
  anyFilters: boolean;
  hasProducts: boolean;
}) {
  if (!hasProducts) {
    return (
      <div className="py-20 text-center space-y-4 border border-dashed border-border rounded-3xl">
        <div className="mx-auto w-12 h-12 rounded-full bg-surface flex items-center justify-center">
          <Package className="w-5 h-5 text-muted" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium">Your inventory is empty.</p>
          <p className="text-[11px] text-muted">
            Post your first product to start selling.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 justify-center mt-2">
          <Link
            href="/dashboard/products/add"
            className="inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-xl bg-red-500 text-white text-xs font-semibold hover:opacity-90 transition"
          >
            <Plus className="w-3.5 h-3.5" /> Post a product
          </Link>
          <Link
            href="/dashboard/products/import"
            className="inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-xl border border-border text-xs font-medium hover:bg-surface transition"
          >
            <Upload className="w-3.5 h-3.5" /> Import CSV
          </Link>
        </div>
      </div>
    );
  }
  return (
    <div className="py-16 text-center space-y-3 border border-dashed border-border rounded-3xl">
      <div className="mx-auto w-12 h-12 rounded-full bg-surface flex items-center justify-center">
        <Search className="w-5 h-5 text-muted" />
      </div>
      <div>
        <p className="text-sm font-medium">
          {query ? `No products match "${query}".` : "No products match these filters."}
        </p>
        <p className="text-[11px] text-muted mt-1">
          {anyFilters ? "Try clearing filters." : "Try a different search term."}
        </p>
      </div>
    </div>
  );
}
