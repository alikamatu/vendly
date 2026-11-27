'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
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
} from 'lucide-react';
import Header from '@/components/layout/Header';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import ConfirmModal from '@/components/ui/ConfirmModal';
import ProductsYouMightLike from '@/components/cart/ProductsYouMightLike';
import RecentlyViewed from '@/components/home/RecentlyViewed';
import { useCart, CartItem } from '@/lib/contexts/cart-context';
import { useAuth } from '@/lib/contexts/auth-context';
import { useAuthModal } from '@/lib/contexts/auth-modal-context';
import { useFavorites } from '@/lib/contexts/favorite-context';
import { storeApi } from '@/lib/api/store';
import { productApi } from '@/lib/api/product';
import { toast } from 'sonner';
import clsx from '@/utils/clsx';

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
  onUpdateQty: (key: string, qty: number, maxStockOverride?: number | null) => void;
  onRemove: (key: string) => void;
  onSaveForLater: (item: CartItem) => void;
  available: number | null | undefined;
  isStockLoading: boolean;
}) {
  const price = parseFloat(String(item.price));
  const subtotal = price * item.quantity;
  const isMissing = available === null;
  const isOutOfStock = !isMissing && typeof available === 'number' && available <= 0;
  const isPartialStock =
    !isOutOfStock && !isMissing && typeof available === 'number' && available < item.quantity;
  const blocked = isMissing || isOutOfStock || isPartialStock;
  const itemKey = item.variantId ? `${item.productId}::${item.variantId}` : item.productId;
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (item.videoUrl && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, [item.videoUrl]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -16 }}
      className={clsx(
        'flex flex-col gap-4 rounded-2xl border-0 p-4 shadow-none transition-colors sm:flex-row sm:items-center',
        blocked
          ? 'bg-red-500/10 text-red-500'
          : 'bg-surface/30 hover:bg-surface/50 text-foreground',
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {/* Product Media Thumbnail */}
        <Link
          href={`/product/${item.productId}`}
          className="bg-surface/80 group relative block h-20 w-20 shrink-0 overflow-hidden rounded-2xl sm:h-24 sm:w-24"
        >
          {item.videoUrl ? (
            <video
              ref={videoRef}
              src={item.videoUrl}
              muted
              loop
              playsInline
              autoPlay
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <img
              src={item.imageUrl || '/placeholder-product.png'}
              alt=""
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          )}
        </Link>

        {/* Product Details */}
        <div className="min-w-0 flex-1 space-y-1">
          <Link
            href={`/product/${item.productId}`}
            className="hover:text-primary block transition-colors"
          >
            <h4 className="line-clamp-2 text-xs font-semibold uppercase tracking-tight sm:text-sm">
              {item.title}
            </h4>
          </Link>

          {item.variantLabel && (
            <p className="text-muted-foreground text-[10px] font-medium capitalize">
              {item.variantLabel}
            </p>
          )}

          <p className="text-primary text-xs font-semibold">GH₵ {price.toFixed(2)}</p>

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
              {isPartialStock && typeof available === 'number' && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                    <AlertTriangle size={10} />
                    Only {available} remaining in stock
                  </span>
                  <button
                    type="button"
                    onClick={() => onUpdateQty(itemKey, available, available)}
                    className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-700 transition-colors hover:bg-amber-500/30 dark:text-amber-300"
                  >
                    Set to {available}
                  </button>
                </div>
              )}
              {!blocked && typeof available === 'number' && available > 0 && (
                <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                  ✓ In stock ({available} available)
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Stepper, Subtotal, & Actions */}
      <div className="border-border/20 flex shrink-0 items-center justify-between gap-3 border-t pt-2 sm:justify-end sm:gap-4 sm:border-t-0 sm:pt-0">
        {/* Quantity Stepper */}
        <div className="bg-surface/80 flex items-center gap-1 rounded-xl border-0 p-1 shadow-none">
          <button
            type="button"
            onClick={() => onUpdateQty(itemKey, item.quantity - 1)}
            className="text-muted-foreground hover:text-foreground hover:bg-surface rounded-lg p-1.5 transition-colors"
            aria-label="Decrease quantity"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="min-w-[1.75rem] text-center text-xs font-semibold tabular-nums">
            {item.quantity}
          </span>
          <button
            type="button"
            onClick={() =>
              onUpdateQty(
                itemKey,
                item.quantity + 1,
                typeof available === 'number' ? available : null,
              )
            }
            disabled={typeof available === 'number' && item.quantity >= available}
            className="text-muted-foreground hover:text-foreground hover:bg-surface rounded-lg p-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-30"
            aria-label="Increase quantity"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Item Total */}
        <span className="text-foreground min-w-[4.5rem] text-right font-mono text-xs font-semibold sm:text-sm">
          GH₵ {subtotal.toFixed(2)}
        </span>

        {/* Quick Actions: Save for later & Delete */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onSaveForLater(item)}
            title="Save for later"
            className="text-muted-foreground rounded-xl p-2 transition-colors hover:bg-rose-500/10 hover:text-rose-500"
            aria-label="Save for later"
          >
            <Heart className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => onRemove(itemKey)}
            title="Remove from cart"
            className="text-muted-foreground rounded-xl p-2 transition-colors hover:bg-red-500/10 hover:text-red-500"
            aria-label="Remove item"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Cart Page ──────────────────────────────────────────────────────────

export default function CartPage() {
  const { groupedByVendor, itemCount, totalPrice, updateQuantity, removeItem, clearCart, items } =
    useCart();
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
  const [promoCode, setPromoCode] = useState('');
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
          .catch(() => {});
      }
    });
  }, [groupedByVendor]);

  const stockFor = (item: CartItem): number | null | undefined => {
    const key = item.variantId ? `${item.productId}::${item.variantId}` : item.productId;
    const snap = stocks[key];
    if (snap === undefined) return undefined;
    if (snap === null) return null;
    if (snap.status && snap.status !== 'published' && snap.status !== 'active') {
      return 0;
    }
    return snap.available;
  };

  const isGroupFulfillable = (group: any): boolean => {
    if (isStockLoading) return false;
    return group.items.every((item: CartItem) => {
      const av = stockFor(item);
      return typeof av === 'number' && av >= item.quantity;
    });
  };

  const handleCheckoutClick = (group: any) => {
    if (!token) {
      openLogin({
        message: `Sign in to complete your purchase from ${group.storeName}`,
        onSuccess: () => {
          router.push(`/cart/checkout?store=${encodeURIComponent(group.storeLink)}`);
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
    const itemKey = item.variantId ? `${item.productId}::${item.variantId}` : item.productId;
    removeItem(itemKey);
    toast.success(`"${item.title}" saved to your favorites`);
  };

  // Promo code validation
  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = promoCode.trim().toUpperCase();
    if (!clean) return;

    if (clean === 'VERNDLY10' || clean === 'START10') {
      setAppliedPromo({ code: clean, discountPercent: 10 });
      setPromoError(null);
      toast.success('10% discount applied to your order!');
    } else if (clean === 'WELCOME5') {
      setAppliedPromo({ code: clean, discountPercent: 5 });
      setPromoError(null);
      toast.success('5% welcome discount applied!');
    } else {
      setPromoError('Invalid promo code. Try VERNDLY10 for 10% off.');
    }
  };

  // Calculated totals
  const discountAmount = appliedPromo ? (totalPrice * appliedPromo.discountPercent) / 100 : 0;
  const netTotalPrice = Math.max(0, totalPrice - discountAmount);

  // Cart item ids for recommendation filtering
  const cartProductIds = useMemo(() => items.map((i) => i.productId), [items]);

  // Delivery tier progress (GH₵ 150 threshold)
  const deliveryThreshold = 150;
  const progressPercent = Math.min(100, (totalPrice / deliveryThreshold) * 100);
  const remainingForFreeDelivery = Math.max(0, deliveryThreshold - totalPrice);

  return (
    <div className="bg-background text-foreground min-h-screen">
      <Header />

      <main className="mx-auto max-w-4xl px-4 pb-28 pt-8 sm:px-6 sm:pt-10 md:px-8">
        {/* Navigation Breadcrumb & Clear Cart Button */}
        <div className="mb-6 flex items-center justify-between gap-3">
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-xs font-medium transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Continue shopping
          </Link>

          {itemCount > 0 && (
            <button
              type="button"
              onClick={() => setIsClearModalOpen(true)}
              className="text-muted-foreground inline-flex items-center gap-1.5 text-xs transition-colors hover:text-red-500"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Empty cart
            </button>
          )}
        </div>

        {/* Page Title & Count */}
        <div className="flex items-center justify-between pb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Shopping Cart</h1>
            <p className="text-muted-foreground mt-1 text-xs">
              Verified young entrepreneur orders with instant Paystack escrow protection
            </p>
          </div>
          {itemCount > 0 && (
            <span className="bg-surface/80 text-foreground rounded-full px-3 py-1 text-xs font-semibold">
              {itemCount} {itemCount === 1 ? 'item' : 'items'}
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
              className="bg-surface/20 rounded-3xl border-0 px-6 py-16 text-center shadow-none sm:py-24"
            >
              <div className="bg-surface/80 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl">
                <ShoppingCart className="text-muted-foreground h-8 w-8" />
              </div>
              <h2 className="text-lg font-semibold uppercase tracking-tight sm:text-xl">
                Your cart is empty
              </h2>
              <p className="text-muted-foreground mx-auto mt-2 max-w-sm text-xs leading-relaxed">
                Browse verified young entrepreneurs and discover quality items delivered right to
                your doorstep.
              </p>
              <div className="mt-6 flex items-center justify-center gap-3">
                <Link href="/">
                  <Button
                    variant="primary"
                    size="sm"
                    className="rounded-xl px-6 text-xs font-semibold"
                  >
                    <ShoppingBag className="mr-1.5 h-3.5 w-3.5" />
                    Browse trending
                  </Button>
                </Link>
                <Link href="/stores">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="rounded-xl px-6 text-xs font-semibold"
                  >
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
                      className="bg-surface/40 space-y-6 overflow-hidden rounded-3xl border-0 p-6 shadow-none sm:p-7"
                      hoverEffect={false}
                    >
                      {/* Store Header Strip */}
                      <div className="border-border/30 flex items-center justify-between gap-3 border-b pb-5">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="bg-surface flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl">
                            {group.logoUrl ? (
                              <img
                                src={group.logoUrl}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="text-muted-foreground text-sm font-bold uppercase">
                                {group.storeName[0]}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="text-foreground truncate text-sm font-semibold tracking-tight">
                                {group.storeName}
                              </h3>
                              <span className="py-0.2 shrink-0 rounded-full bg-emerald-500/10 px-2 text-[10px] font-semibold text-emerald-600">
                                Verified
                              </span>
                            </div>
                            <p className="text-muted-foreground mt-0.5 text-[11px]">
                              {group.totalItems} {group.totalItems === 1 ? 'item' : 'items'} from
                              this merchant
                            </p>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          <Link href={`/s/${group.storeLink}`}>
                            <Button
                              variant="secondary"
                              size="sm"
                              className="h-8 gap-1.5 rounded-xl px-3 text-xs font-medium"
                            >
                              <span>Store</span>
                              <ExternalLink className="text-muted-foreground h-3 w-3" />
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
                      <div className="border-border/30 space-y-4 border-t pt-6">
                        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                          <div className="space-y-1">
                            <div className="text-muted-foreground flex items-center gap-4 text-xs">
                              <span>Items Subtotal:</span>
                              <span className="text-foreground font-mono font-semibold">
                                GH₵ {group.totalPrice.toFixed(2)}
                              </span>
                            </div>
                            <div className="text-muted-foreground flex items-center gap-4 text-xs">
                              <span>Delivery &amp; Logistics:</span>
                              <span className="font-medium text-emerald-600">Free / Included</span>
                            </div>
                          </div>

                          <div className="flex shrink-0 flex-col gap-2.5 sm:items-end">
                            <div className="sm:text-right">
                              <span className="text-muted-foreground block text-[10px] font-semibold uppercase tracking-wider">
                                Total for this Store
                              </span>
                              <span className="text-foreground font-mono text-xl font-bold">
                                GH₵ {group.totalPrice.toFixed(2)}
                              </span>
                            </div>

                            {blocked && (
                              <p className="flex w-fit items-center gap-1.5 rounded-full bg-red-500/10 px-3 py-1 text-[10px] font-medium text-red-500">
                                <AlertTriangle className="h-3 w-3" />
                                Please adjust quantity for out-of-stock items
                              </p>
                            )}

                            <Button
                              size="lg"
                              variant="primary"
                              disabled={
                                isCheckingOut === group.storeLink || isStockLoading || blocked
                              }
                              onClick={() => handleCheckoutClick(group)}
                              className="h-11 w-full rounded-xl px-8 text-xs font-semibold uppercase tracking-wider disabled:opacity-40 sm:w-auto"
                            >
                              {isCheckingOut === group.storeLink ? (
                                <span className="inline-flex items-center gap-2">
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  Loading Checkout...
                                </span>
                              ) : isStockLoading ? (
                                <span className="inline-flex items-center gap-2">
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  Verifying stock...
                                </span>
                              ) : (
                                `Checkout ${group.storeName}`
                              )}
                            </Button>

                            {/* Payment Timing Indicator */}
                            <div className="pt-1">
                              {storeDetails[group.storeLink]?.payment_timing === 'UPFRONT_ONLY' && (
                                <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-blue-600 dark:text-blue-400">
                                  <CreditCard className="h-3 w-3" />
                                  Requires Upfront MoMo / Card Payment
                                </span>
                              )}
                              {storeDetails[group.storeLink]?.payment_timing ===
                                'DELIVERY_ONLY' && (
                                <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                                  <Banknote className="h-3 w-3" />
                                  Pay on Delivery / Pickup
                                </span>
                              )}
                              {(!storeDetails[group.storeLink]?.payment_timing ||
                                storeDetails[group.storeLink]?.payment_timing === 'BOTH') && (
                                <span className="text-muted-foreground inline-flex items-center gap-1.5 text-[10px] font-medium">
                                  <WalletCards className="h-3 w-3" />
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
              <div className="grid grid-cols-1 gap-6 pt-4 md:grid-cols-2">
                {/* Promo Code Card */}
                <div className="bg-surface/40 space-y-3 rounded-3xl border-0 p-5 shadow-none">
                  <div className="text-foreground flex items-center gap-2 text-xs font-semibold">
                    <Tag className="text-primary h-4 w-4" />
                    <span>Have a Promo Code or Voucher?</span>
                  </div>
                  <p className="text-muted-foreground text-[11px]">
                    Try{' '}
                    <code className="bg-foreground/10 text-foreground rounded px-1 py-0.5 font-mono">
                      VERNDLY10
                    </code>{' '}
                    for 10% off your purchase.
                  </p>

                  <form onSubmit={handleApplyPromo} className="flex gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="e.g. VERNDLY10"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      className="bg-surface placeholder:text-muted-foreground h-10 flex-1 rounded-xl border-0 px-3.5 text-xs outline-none"
                    />
                    <Button
                      type="submit"
                      variant="secondary"
                      size="sm"
                      className="h-10 rounded-xl px-4 text-xs font-semibold"
                    >
                      Apply
                    </Button>
                  </form>

                  {appliedPromo && (
                    <div className="flex items-center justify-between rounded-xl bg-emerald-500/10 p-2.5 text-xs text-emerald-600">
                      <span className="font-medium">
                        ✓ {appliedPromo.code} applied ({appliedPromo.discountPercent}% off)
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setAppliedPromo(null);
                          setPromoCode('');
                        }}
                        className="text-[10px] underline hover:text-emerald-700"
                      >
                        Remove
                      </button>
                    </div>
                  )}

                  {promoError && <p className="text-xs font-medium text-red-500">{promoError}</p>}
                </div>

                {/* Combined Cart Financial Overview */}
                <div className="bg-surface/40 space-y-3 rounded-3xl border-0 p-5 shadow-none">
                  <div className="text-muted-foreground flex items-center justify-between text-xs">
                    <span>Total items across stores</span>
                    <span className="text-foreground font-mono font-semibold">{itemCount}</span>
                  </div>

                  <div className="text-muted-foreground flex items-center justify-between text-xs">
                    <span>Combined items subtotal</span>
                    <span className="text-foreground font-mono font-semibold">
                      GH₵ {totalPrice.toFixed(2)}
                    </span>
                  </div>

                  {appliedPromo && (
                    <div className="flex items-center justify-between text-xs text-emerald-600">
                      <span>Voucher discount ({appliedPromo.discountPercent}%)</span>
                      <span className="font-mono font-semibold">
                        -GH₵ {discountAmount.toFixed(2)}
                      </span>
                    </div>
                  )}

                  <div className="text-muted-foreground flex items-center justify-between text-xs">
                    <span>Estimated delivery</span>
                    <span className="font-medium text-emerald-600">Free / Included</span>
                  </div>

                  <div className="border-border/30 flex items-center justify-between border-t pt-3">
                    <div>
                      <span className="text-foreground block text-sm font-bold">
                        Combined Cart Value
                      </span>
                      <span className="text-muted-foreground text-[10px]">
                        Protected by Verndly escrow &amp; buyer guarantee
                      </span>
                    </div>
                    <span className="text-primary font-mono text-xl font-bold">
                      GH₵ {netTotalPrice.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* SaaS Marketplace Trust & Guarantee Strip */}
        <div className="mt-14 grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="bg-surface/30 space-y-2 rounded-2xl border-0 p-4 shadow-none">
            <ShieldCheck className="text-primary h-5 w-5" />
            <h4 className="text-foreground text-xs font-semibold">Escrow Protection</h4>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              Funds are held safely in escrow and only released when order is verified.
            </p>
          </div>

          <div className="bg-surface/30 space-y-2 rounded-2xl border-0 p-4 shadow-none">
            <CreditCard className="text-primary h-5 w-5" />
            <h4 className="text-foreground text-xs font-semibold">Instant MoMo &amp; Cards</h4>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              Encrypted 256-bit payments via Paystack with instant receipt dispatch.
            </p>
          </div>

          <div className="bg-surface/30 space-y-2 rounded-2xl border-0 p-4 shadow-none">
            <Truck className="text-primary h-5 w-5" />
            <h4 className="text-foreground text-xs font-semibold">Doorstep Delivery</h4>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              Dispatched directly to your address or available for store pickup.
            </p>
          </div>

          <div className="bg-surface/30 space-y-2 rounded-2xl border-0 p-4 shadow-none">
            <RotateCcw className="text-primary h-5 w-5" />
            <h4 className="text-foreground text-xs font-semibold">3-Day Returns</h4>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              Simple return requests and dedicated customer support for any issue.
            </p>
          </div>
        </div>

        {/* Dedicated "Products You Might Like" Section */}
        <ProductsYouMightLike cartProductIds={cartProductIds} limit={8} />

        {/* Recently Viewed Strip */}
        <div className="mt-14">
          <RecentlyViewed limit={8} title="Pick up where you left off" />
        </div>
      </main>

      {/* Clear Cart Confirmation Modal */}
      <ConfirmModal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        onConfirm={() => {
          clearCart();
          setIsClearModalOpen(false);
          toast.success('Your cart has been emptied');
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
