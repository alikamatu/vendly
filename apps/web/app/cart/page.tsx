"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  ExternalLink,
  ShoppingBag,
  CreditCard,
  Banknote,
  WalletCards,
  AlertTriangle,
  ShieldCheck,
  Truck,
  RotateCcw,
  Sparkles,
  Heart,
  Tag,
  Check,
  Info,
  Loader2,
  Lock,
} from "lucide-react";
import Header from "@/components/layout/Header";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import ConfirmModal from "@/components/ui/ConfirmModal";
import ProductsYouMightLike from "@/components/cart/ProductsYouMightLike";
import RecentlyViewed from "@/components/home/RecentlyViewed";
import { useCart, CartItem } from "@/lib/contexts/cart-context";
import { useAuth } from "@/lib/contexts/auth-context";
import { useAuthModal } from "@/lib/contexts/auth-modal-context";
import { useFavorites } from "@/lib/contexts/favorite-context";
import { storeApi } from "@/lib/api/store";
import { productApi } from "@/lib/api/product";
import { toast } from "sonner";
import clsx from "@/utils/clsx";

/** Resolved stock for one item in the cart. */
interface StockSnapshot {
  available: number;
  status: string | null;
}

// ─── Single Cart Item Row ───────────────────────────────────────────────────

function CartLine({
  item,
  onUpdateQty,
  onRemove,
  onSaveForLater,
  available,
  isStockLoading,
}: {
  item: CartItem;
  onUpdateQty: (key: string, qty: number) => void;
  onRemove: (key: string) => void;
  onSaveForLater: (item: CartItem) => void;
  available: number | null | undefined;
  isStockLoading: boolean;
}) {
  const price = parseFloat(String(item.price));
  const subtotal = price * item.quantity;
  const isMissing = available === null;
  const isOutOfStock = !isMissing && typeof available === "number" && available <= 0;
  const isPartialStock =
    !isOutOfStock &&
    !isMissing &&
    typeof available === "number" &&
    available < item.quantity;
  const blocked = isMissing || isOutOfStock || isPartialStock;
  const itemKey = item.variantId
    ? `${item.productId}::${item.variantId}`
    : item.productId;
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (item.videoUrl && videoRef.current) {
      videoRef.current.play().catch(() => { });
    }
  }, [item.videoUrl]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -16 }}
      className={clsx(
        "flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-2xl transition-colors border-0 shadow-none",
        blocked
          ? "bg-red-500/10 text-red-500"
          : "bg-surface/30 hover:bg-surface/50 text-foreground",
      )}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Product Media Thumbnail */}
        <Link
          href={`/product/${item.productId}`}
          className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden shrink-0 bg-surface/80 relative block group"
        >
          {item.videoUrl ? (
            <video
              ref={videoRef}
              src={item.videoUrl}
              muted
              loop
              playsInline
              autoPlay
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <img
              src={item.imageUrl || "/placeholder-product.png"}
              alt=""
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          )}
        </Link>

        {/* Product Details */}
        <div className="min-w-0 flex-1 space-y-1">
          <Link
            href={`/product/${item.productId}`}
            className="hover:text-primary transition-colors block"
          >
            <h4 className="text-xs sm:text-sm font-semibold tracking-tight uppercase line-clamp-2">
              {item.title}
            </h4>
          </Link>

          {item.variantLabel && (
            <p className="text-[10px] text-muted-foreground capitalize font-medium">
              {item.variantLabel}
            </p>
          )}

          <p className="text-xs font-semibold text-primary">
            GH₵ {price.toFixed(2)}
          </p>

          {/* Stock Alerts */}
          {!isStockLoading && (
            <div className="pt-0.5">
              {isMissing && (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-medium text-red-500">
                  <AlertTriangle size={10} />
                  No longer available
                </span>
              )}
              {isOutOfStock && (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-medium text-red-500">
                  <AlertTriangle size={10} />
                  Out of stock
                </span>
              )}
              {isPartialStock && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                  <AlertTriangle size={10} />
                  Only {available} remaining in stock
                </span>
              )}
              {!blocked && typeof available === "number" && available > 0 && (
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                  ✓ In stock ({available} available)
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Stepper, Subtotal, & Actions */}
      <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/20">
        {/* Quantity Stepper */}
        <div className="flex items-center gap-1 rounded-xl bg-surface/80 p-1 border-0 shadow-none">
          <button
            type="button"
            onClick={() => onUpdateQty(itemKey, item.quantity - 1)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
            aria-label="Decrease quantity"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <span className="min-w-[1.75rem] text-center text-xs font-semibold tabular-nums">
            {item.quantity}
          </span>
          <button
            type="button"
            onClick={() => onUpdateQty(itemKey, item.quantity + 1)}
            disabled={
              typeof available === "number" && item.quantity >= available
            }
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Increase quantity"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Item Total */}
        <span className="text-xs sm:text-sm font-semibold text-foreground min-w-[4.5rem] text-right font-mono">
          GH₵ {subtotal.toFixed(2)}
        </span>

        {/* Quick Actions: Save for later & Delete */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onSaveForLater(item)}
            title="Save for later"
            className="p-2 rounded-xl text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
            aria-label="Save for later"
          >
            <Heart className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onRemove(itemKey)}
            title="Remove from cart"
            className="p-2 rounded-xl text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
            aria-label="Remove item"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Cart Page ──────────────────────────────────────────────────────────

export default function CartPage() {
  const {
    groupedByVendor,
    itemCount,
    totalPrice,
    updateQuantity,
    removeItem,
    clearCart,
    items,
  } = useCart();
  const { token } = useAuth();
  const { openLogin } = useAuthModal();
  const { toggleFavorite, isFavorited } = useFavorites();
  const router = useRouter();

  const [isCheckingOut, setIsCheckingOut] = useState<string | null>(null);
  const [storeDetails, setStoreDetails] = useState<Record<string, any>>({});
  const [stocks, setStocks] = useState<Record<string, StockSnapshot | null>>({});
  const [isStockLoading, setIsStockLoading] = useState(true);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);

  // SaaS Promo Code System
  const [promoCode, setPromoCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<{
    code: string;
    discountPercent: number;
  } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);

  // Live stock resolver
  useEffect(() => {
    let cancelled = false;
    const productIds = Array.from(
      new Set(groupedByVendor.flatMap((g) => g.items.map((i) => i.productId))),
    );

    if (productIds.length === 0) {
      setIsStockLoading(false);
      return;
    }

    setIsStockLoading(true);
    Promise.all(
      productIds.map(async (pid) => {
        try {
          const p: any = await productApi.getProductById(pid);
          return { pid, product: p };
        } catch {
          return { pid, product: null };
        }
      }),
    ).then((results) => {
      if (cancelled) return;
      const next: Record<string, StockSnapshot | null> = {};
      for (const { pid, product } of results) {
        if (!product) {
          for (const g of groupedByVendor) {
            for (const it of g.items) {
              if (it.productId === pid) {
                const key = it.variantId ? `${pid}::${it.variantId}` : pid;
                next[key] = null;
              }
            }
          }
          continue;
        }

        for (const g of groupedByVendor) {
          for (const it of g.items) {
            if (it.productId !== pid) continue;
            const key = it.variantId ? `${pid}::${it.variantId}` : pid;
            if (it.variantId && Array.isArray(product.variants)) {
              const v = product.variants.find((x: any) => x.id === it.variantId);
              next[key] = v
                ? {
                  available: Number(v.quantity_available ?? 0),
                  status: product.status,
                }
                : null;
            } else {
              next[key] = {
                available: Number(product.quantity_available ?? 0),
                status: product.status,
              };
            }
          }
        }
      }
      setStocks(next);
      setIsStockLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [groupedByVendor]);

  // Load store setups
  useEffect(() => {
    groupedByVendor.forEach((group) => {
      if (!storeDetails[group.storeLink]) {
        storeApi
          .getStoreBySlug(group.storeLink)
          .then((store) => {
            setStoreDetails((prev) => ({ ...prev, [group.storeLink]: store }));
          })
          .catch(() => { });
      }
    });
  }, [groupedByVendor]);

  const stockFor = (item: CartItem): number | null | undefined => {
    const key = item.variantId
      ? `${item.productId}::${item.variantId}`
      : item.productId;
    const snap = stocks[key];
    if (snap === undefined) return undefined;
    if (snap === null) return null;
    if (snap.status && snap.status !== "published" && snap.status !== "active") {
      return 0;
    }
    return snap.available;
  };

  const isGroupFulfillable = (group: any): boolean => {
    if (isStockLoading) return false;
    return group.items.every((item: CartItem) => {
      const av = stockFor(item);
      return typeof av === "number" && av >= item.quantity;
    });
  };

  const handleCheckoutClick = (group: any) => {
    if (!token) {
      openLogin({
        message: `Sign in to complete your purchase from ${group.storeName}`,
        onSuccess: () => {
          router.push(
            `/cart/checkout?store=${encodeURIComponent(group.storeLink)}`,
          );
        },
      });
      return;
    }
    router.push(`/cart/checkout?store=${encodeURIComponent(group.storeLink)}`);
    setIsCheckingOut(group.storeLink);
  };

  const handleSaveForLater = (item: CartItem) => {
    if (!isFavorited(item.productId)) {
      toggleFavorite(item.productId);
    }
    const itemKey = item.variantId
      ? `${item.productId}::${item.variantId}`
      : item.productId;
    removeItem(itemKey);
    toast.success(`"${item.title}" saved to your favorites`);
  };

  // Promo code validation
  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = promoCode.trim().toUpperCase();
    if (!clean) return;

    if (clean === "VERNDLY10" || clean === "START10") {
      setAppliedPromo({ code: clean, discountPercent: 10 });
      setPromoError(null);
      toast.success("10% discount applied to your order!");
    } else if (clean === "WELCOME5") {
      setAppliedPromo({ code: clean, discountPercent: 5 });
      setPromoError(null);
      toast.success("5% welcome discount applied!");
    } else {
      setPromoError("Invalid promo code. Try VERNDLY10 for 10% off.");
    }
  };

  // Calculated totals
  const discountAmount = appliedPromo
    ? (totalPrice * appliedPromo.discountPercent) / 100
    : 0;
  const netTotalPrice = Math.max(0, totalPrice - discountAmount);

  // Cart item ids for recommendation filtering
  const cartProductIds = useMemo(() => items.map((i) => i.productId), [items]);

  // Delivery tier progress (GH₵ 150 threshold)
  const deliveryThreshold = 150;
  const progressPercent = Math.min(100, (totalPrice / deliveryThreshold) * 100);
  const remainingForFreeDelivery = Math.max(0, deliveryThreshold - totalPrice);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 pt-8 sm:pt-10 pb-28">
        {/* Navigation Breadcrumb & Clear Cart Button */}
        <div className="flex items-center justify-between gap-3 mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Continue shopping
          </Link>

          {itemCount > 0 && (
            <button
              type="button"
              onClick={() => setIsClearModalOpen(true)}
              className="text-xs text-muted-foreground hover:text-red-500 transition-colors inline-flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Empty cart
            </button>
          )}
        </div>

        {/* Page Title & Count */}
        <div className="flex items-center justify-between pb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Shopping Cart
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Verified young entrepreneur orders with instant Paystack escrow protection
            </p>
          </div>
          {itemCount > 0 && (
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-surface/80 text-foreground">
              {itemCount} {itemCount === 1 ? "item" : "items"}
            </span>
          )}
        </div>

        <AnimatePresence mode="wait">
          {itemCount === 0 ? (
            /* Empty State */
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="py-16 sm:py-24 text-center rounded-3xl bg-surface/20 border-0 shadow-none px-6"
            >
              <div className="w-16 h-16 mx-auto rounded-2xl bg-surface/80 flex items-center justify-center mb-4">
                <ShoppingCart className="w-8 h-8 text-muted-foreground" />
              </div>
              <h2 className="text-lg sm:text-xl font-semibold uppercase tracking-tight">
                Your cart is empty
              </h2>
              <p className="text-xs text-muted-foreground mt-2 max-w-sm mx-auto leading-relaxed">
                Browse verified young entrepreneurs and discover quality items delivered right to your doorstep.
              </p>
              <div className="mt-6 flex items-center justify-center gap-3">
                <Link href="/">
                  <Button variant="primary" size="sm" className="rounded-xl px-6 text-xs font-semibold">
                    <ShoppingBag className="w-3.5 h-3.5 mr-1.5" />
                    Browse trending
                  </Button>
                </Link>
                <Link href="/stores">
                  <Button variant="secondary" size="sm" className="rounded-xl px-6 text-xs font-semibold">
                    Explore stores
                  </Button>
                </Link>
              </div>
            </motion.div>
          ) : (
            /* Cart Groups */
            <motion.div
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              {groupedByVendor.map((group, groupIndex) => {
                const fulfillable = isGroupFulfillable(group);
                const blocked = !fulfillable && !isStockLoading;

                return (
                  <motion.section
                    key={group.storeLink}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: groupIndex * 0.05 }}
                  >
                    <Card
                      className="p-6 sm:p-7 rounded-3xl bg-surface/40 border-0 shadow-none overflow-hidden space-y-6"
                      hoverEffect={false}
                    >
                      {/* Store Header Strip */}
                      <div className="flex items-center justify-between gap-3 pb-5 border-b border-border/30">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-12 h-12 rounded-2xl overflow-hidden bg-surface shrink-0 flex items-center justify-center">
                            {group.logoUrl ? (
                              <img
                                src={group.logoUrl}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-sm font-bold text-muted-foreground uppercase">
                                {group.storeName[0]}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-semibold tracking-tight text-foreground truncate">
                                {group.storeName}
                              </h3>
                              <span className="text-[10px] text-emerald-600 bg-emerald-500/10 px-2 py-0.2 rounded-full font-semibold shrink-0">
                                Verified
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {group.totalItems} {group.totalItems === 1 ? "item" : "items"} from this merchant
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Link href={`/s/${group.storeLink}`}>
                            <Button
                              variant="secondary"
                              size="sm"
                              className="h-8 px-3 rounded-xl text-xs font-medium gap-1.5"
                            >
                              <span>Store</span>
                              <ExternalLink className="w-3 h-3 text-muted-foreground" />
                            </Button>
                          </Link>
                        </div>
                      </div>

                      {/* Items List */}
                      <div className="space-y-3">
                        {group.items.map((item) => (
                          <CartLine
                            key={
                              item.variantId
                                ? `${item.productId}::${item.variantId}`
                                : item.productId
                            }
                            item={item}
                            onUpdateQty={updateQuantity}
                            onRemove={removeItem}
                            onSaveForLater={handleSaveForLater}
                            available={stockFor(item)}
                            isStockLoading={isStockLoading}
                          />
                        ))}
                      </div>

                      {/* Store Financial Breakdown & Checkout Action */}
                      <div className="pt-6 border-t border-border/30 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>Items Subtotal:</span>
                              <span className="font-semibold text-foreground font-mono">
                                GH₵ {group.totalPrice.toFixed(2)}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>Delivery &amp; Logistics:</span>
                              <span className="text-emerald-600 font-medium">
                                Free / Included
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-col sm:items-end gap-2.5 shrink-0">
                            <div className="sm:text-right">
                              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block">
                                Total for this Store
                              </span>
                              <span className="text-xl font-bold text-foreground font-mono">
                                GH₵ {group.totalPrice.toFixed(2)}
                              </span>
                            </div>

                            {blocked && (
                              <p className="flex items-center gap-1.5 text-[10px] font-medium text-red-500 bg-red-500/10 px-3 py-1 rounded-full w-fit">
                                <AlertTriangle className="w-3 h-3" />
                                Please adjust quantity for out-of-stock items
                              </p>
                            )}

                            <Button
                              size="lg"
                              variant="primary"
                              disabled={
                                isCheckingOut === group.storeLink ||
                                isStockLoading ||
                                blocked
                              }
                              onClick={() => handleCheckoutClick(group)}
                              className="w-full sm:w-auto h-11 px-8 rounded-xl text-xs font-semibold uppercase tracking-wider disabled:opacity-40"
                            >
                              {isCheckingOut === group.storeLink ? (
                                <span className="inline-flex items-center gap-2">
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  Loading Checkout...
                                </span>
                              ) : isStockLoading ? (
                                <span className="inline-flex items-center gap-2">
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  Verifying stock...
                                </span>
                              ) : (
                                `Checkout ${group.storeName}`
                              )}
                            </Button>

                            {/* Payment Timing Indicator */}
                            <div className="pt-1">
                              {storeDetails[group.storeLink]?.payment_timing === "UPFRONT_ONLY" && (
                                <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-blue-600 dark:text-blue-400">
                                  <CreditCard className="w-3 h-3" />
                                  Requires Upfront MoMo / Card Payment
                                </span>
                              )}
                              {storeDetails[group.storeLink]?.payment_timing === "DELIVERY_ONLY" && (
                                <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                                  <Banknote className="w-3 h-3" />
                                  Pay on Delivery / Pickup
                                </span>
                              )}
                              {(!storeDetails[group.storeLink]?.payment_timing ||
                                storeDetails[group.storeLink]?.payment_timing === "BOTH") && (
                                  <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
                                    <WalletCards className="w-3 h-3" />
                                    Supports Online Paystack &amp; Cash on Delivery
                                  </span>
                                )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </motion.section>
                );
              })}

              {/* SaaS Promo Code & Global Cart Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                {/* Promo Code Card */}
                <div className="p-5 rounded-3xl bg-surface/40 space-y-3 border-0 shadow-none">
                  <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                    <Tag className="w-4 h-4 text-primary" />
                    <span>Have a Promo Code or Voucher?</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Try <code className="bg-foreground/10 px-1 py-0.5 rounded text-foreground font-mono">VERNDLY10</code> for 10% off your purchase.
                  </p>

                  <form onSubmit={handleApplyPromo} className="flex gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="e.g. VERNDLY10"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      className="flex-1 h-10 px-3.5 rounded-xl bg-surface text-xs placeholder:text-muted-foreground outline-none border-0"
                    />
                    <Button
                      type="submit"
                      variant="secondary"
                      size="sm"
                      className="h-10 px-4 rounded-xl text-xs font-semibold"
                    >
                      Apply
                    </Button>
                  </form>

                  {appliedPromo && (
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 text-xs">
                      <span className="font-medium">
                        ✓ {appliedPromo.code} applied ({appliedPromo.discountPercent}% off)
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setAppliedPromo(null);
                          setPromoCode("");
                        }}
                        className="text-[10px] underline hover:text-emerald-700"
                      >
                        Remove
                      </button>
                    </div>
                  )}

                  {promoError && (
                    <p className="text-xs text-red-500 font-medium">{promoError}</p>
                  )}
                </div>

                {/* Combined Cart Financial Overview */}
                <div className="p-5 rounded-3xl bg-surface/40 space-y-3 border-0 shadow-none">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Total items across stores</span>
                    <span className="font-semibold text-foreground font-mono">
                      {itemCount}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Combined items subtotal</span>
                    <span className="font-semibold text-foreground font-mono">
                      GH₵ {totalPrice.toFixed(2)}
                    </span>
                  </div>

                  {appliedPromo && (
                    <div className="flex items-center justify-between text-xs text-emerald-600">
                      <span>Voucher discount ({appliedPromo.discountPercent}%)</span>
                      <span className="font-semibold font-mono">
                        -GH₵ {discountAmount.toFixed(2)}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Estimated delivery</span>
                    <span className="text-emerald-600 font-medium">Free / Included</span>
                  </div>

                  <div className="pt-3 border-t border-border/30 flex items-center justify-between">
                    <div>
                      <span className="text-sm font-bold text-foreground block">
                        Combined Cart Value
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        Protected by Verndly escrow &amp; buyer guarantee
                      </span>
                    </div>
                    <span className="text-xl font-bold text-primary font-mono">
                      GH₵ {netTotalPrice.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* SaaS Marketplace Trust & Guarantee Strip */}
        <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl bg-surface/30 space-y-2 border-0 shadow-none">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <h4 className="text-xs font-semibold text-foreground">
              Escrow Protection
            </h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Funds are held safely in escrow and only released when order is verified.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-surface/30 space-y-2 border-0 shadow-none">
            <CreditCard className="w-5 h-5 text-primary" />
            <h4 className="text-xs font-semibold text-foreground">
              Instant MoMo &amp; Cards
            </h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Encrypted 256-bit payments via Paystack with instant receipt dispatch.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-surface/30 space-y-2 border-0 shadow-none">
            <Truck className="w-5 h-5 text-primary" />
            <h4 className="text-xs font-semibold text-foreground">
              Doorstep Delivery
            </h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Dispatched directly to your address or available for store pickup.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-surface/30 space-y-2 border-0 shadow-none">
            <RotateCcw className="w-5 h-5 text-primary" />
            <h4 className="text-xs font-semibold text-foreground">
              7-Day Returns
            </h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Simple return requests and dedicated customer support for any issue.
            </p>
          </div>
        </div>

        {/* Dedicated "Products You Might Like" Section */}
        <ProductsYouMightLike
          cartProductIds={cartProductIds}
          limit={8}
        />

        {/* Recently Viewed Strip */}
        <div className="mt-14">
          <RecentlyViewed
            limit={8}
            title="Pick up where you left off"
          />
        </div>
      </main>

      {/* Clear Cart Confirmation Modal */}
      <ConfirmModal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        onConfirm={() => {
          clearCart();
          setIsClearModalOpen(false);
          toast.success("Your cart has been emptied");
        }}
        title="Empty Shopping Cart?"
        description="Are you sure you want to remove all items from your cart across all stores? This action cannot be undone."
        confirmText="Empty Cart"
        cancelText="Keep Items"
        variant="danger"
      />
    </div>
  );
}
