'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  Tag,
  Info,
  Check,
  Sparkles,
  Share2,
  Heart,
  Play,
  Ruler,
  Zap,
  Flag,
} from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { productApi } from '@/lib/api/product';
import Button from '@/components/ui/Button';
import { useCart } from '@/lib/contexts/cart-context';
import { useFavorites } from '@/lib/contexts/favorite-context';
import { useAuth } from '@/lib/contexts/auth-context';
import { isOwnStore } from '@/lib/utils/ownership';
import {
  formatDimensionsLabel,
  formatWeightLabel,
  type ProductDimensions,
  type ProductWeight,
} from '@/lib/catalog-subcategories';
import PriceBlock from '@/components/product-detail/PriceBlock';
import SellerCard from '@/components/product-detail/SellerCard';
import RelatedProducts from '@/components/product-detail/RelatedProducts';
import RecentlyViewed from '@/components/home/RecentlyViewed';
import Header from '@/components/layout/Header';
import { RatingStars } from '@/components/reviews/rating-stars';
import { ProductReviewsSection } from '@/components/reviews/product-reviews-section';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import VariantPicker, {
  matchVariant,
  type ProductVariant as Variant,
} from '@/components/product-detail/VariantPicker';
import QuickCheckoutModal from '@/components/product-detail/QuickCheckoutModal';
import ShareProductModal from '@/components/product-detail/ShareProductModal';
import ReportModal from '@/components/report/ReportModal';
import { isProductTrending } from '@/lib/product-badges';
import { getProductPath } from '@/lib/product-slug';
import { toast } from 'sonner';

type MediaItem = { type: 'image'; url: string } | { type: 'video'; url: string };

export default function ProductDetailClient({
  initialProduct = null,
  productId,
}: {
  initialProduct?: any;
  productId?: string;
}) {
  const router = useRouter();
  const params = useParams();
  const id = productId || (params?.id as string);
  const { addItem } = useCart();
  const { user } = useAuth();
  const { toggleFavorite, isFavorited } = useFavorites();
  const [product, setProduct] = useState<any>(initialProduct);
  const [isLoading, setIsLoading] = useState(!initialProduct);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState<1 | -1>(1);
  const [dragOffsetX, setDragOffsetX] = useState(0);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const didSwipeRef = useRef(false);
  const { record: recordRecentlyViewed } = useRecentlyViewed();
  const [addedFeedback, setAddedFeedback] = useState(false);
  const [selectedVariantAttrs, setSelectedVariantAttrs] = useState<Record<string, string>>({});
  const [isQuickCheckoutOpen, setIsQuickCheckoutOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (initialProduct && String(initialProduct.id) === String(id)) {
      setProduct(initialProduct);
      setIsLoading(false);
    }
    const fetchProduct = async () => {
      try {
        const data = await productApi.getProductById(id as string);
        if (data) setProduct(data);
      } catch (err) {
        console.error('Failed to fetch product', err);
      } finally {
        setIsLoading(false);
      }
    };
    if (id) fetchProduct();
  }, [id, initialProduct]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentMediaIndex(0);
  }, [id]);

  useEffect(() => {
    if (!product?.id) return;
    recordRecentlyViewed({
      id: product.id,
      title: product.title,
      price: product.price,
      image: product.image_urls?.[0] ?? null,
      storeName: product.seller?.store_name ?? null,
      storeLink: product.seller?.store_link ?? null,
    });
  }, [product?.id, product?.title, product?.price, recordRecentlyViewed]);

  const mediaItems: MediaItem[] = useMemo(() => {
    if (!product) return [];
    const items: MediaItem[] = [];
    if (product.video_url) {
      items.push({ type: 'video', url: product.video_url });
    }
    const imageUrls = Array.isArray(product.image_urls) ? product.image_urls : [];
    imageUrls.forEach((url: string) => items.push({ type: 'image', url }));
    if (items.length === 0) {
      items.push({ type: 'image', url: '/placeholder-product.png' });
    }
    return items;
  }, [product]);

  const currentMedia = mediaItems[currentMediaIndex];

  const attributeEntries: [string, string][] = useMemo(() => {
    if (!product?.attributes) return [];
    const raw = product.attributes;
    const obj =
      typeof raw === 'string'
        ? (() => {
            try {
              return JSON.parse(raw);
            } catch {
              return {};
            }
          })()
        : raw && typeof raw === 'object'
          ? raw
          : {};
    const entries: [string, string][] = [];
    for (const [key, value] of Object.entries(obj)) {
      if (value == null) continue;
      if (key === 'dimensions' && typeof value === 'object') {
        const formatted = formatDimensionsLabel(value as ProductDimensions);
        if (formatted) entries.push(['dimensions', formatted]);
        continue;
      }
      if (key === 'weight' && typeof value === 'object') {
        const formatted = formatWeightLabel(value as ProductWeight);
        if (formatted) entries.push(['weight', formatted]);
        continue;
      }
      if (typeof value === 'object') continue;
      const text = String(value).trim();
      if (text) entries.push([key, text]);
    }
    return entries;
  }, [product]);

  const formatAttributeLabel = (key: string) => {
    return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const variants: Variant[] = useMemo(
    () => (Array.isArray(product?.variants) ? product.variants : []),
    [product],
  );
  const hasVariants = variants.length > 0;
  const matchedVariant = useMemo(
    () => (hasVariants ? matchVariant(variants, selectedVariantAttrs) : null),
    [hasVariants, variants, selectedVariantAttrs],
  );
  const variantLabel = useMemo(() => {
    const entries = Object.entries(selectedVariantAttrs);
    if (!entries.length) return null;
    return entries.map(([k, v]) => `${k}: ${v}`).join(' · ');
  }, [selectedVariantAttrs]);
  const effectivePrice = matchedVariant?.price ?? product?.price ?? '0';
  const effectiveStock = matchedVariant
    ? matchedVariant.quantity_available
    : product?.quantity_available;
  const isOwner = useMemo(() => isOwnStore(user, product?.seller), [user, product?.seller]);
  const storeAcceptsOrders =
    product?.seller?.can_receive_orders !== false && product?.seller?.is_seller_verified !== false;
  const canPurchase =
    !isOwner &&
    storeAcceptsOrders &&
    (hasVariants
      ? !!matchedVariant && matchedVariant.quantity_available > 0
      : typeof product?.quantity_available !== 'number' || product.quantity_available > 0);

  const handleAddToCart = () => {
    if (!product?.seller) return;
    if (isOwner) {
      toast.error('You cannot purchase your own product.');
      return;
    }
    if (!storeAcceptsOrders) {
      toast.error('This store is pending seller verification and cannot receive orders yet.');
      return;
    }
    if (hasVariants && !matchedVariant) return;
    const price =
      typeof effectivePrice === 'number' ? String(effectivePrice) : (effectivePrice ?? '0');
    const added = addItem({
      productId: String(product.id),
      variantId: matchedVariant?.id ?? null,
      variantLabel,
      title: product.title ?? 'Product',
      price,
      imageUrl: matchedVariant?.image_url || product.image_urls?.[0] || '/placeholder-product.png',
      maxStock: typeof effectiveStock === 'number' ? effectiveStock : null,
      storeLink: product.seller.store_link ?? '',
      storeName: product.seller.store_name ?? 'Store',
      logoUrl: product.seller.logo_url ?? null,
    });
    if (added) {
      setAddedFeedback(true);
      setTimeout(() => setAddedFeedback(false), 2000);
    }
  };

  // Auto-open Quick Checkout if returning from auth redirect (?buyNow=1)
  useEffect(() => {
    if (typeof window === 'undefined' || !product || isOwner || !storeAcceptsOrders) return;
    const sp = new URLSearchParams(window.location.search);
    if (sp.get('buyNow') === '1') {
      setIsQuickCheckoutOpen(true);
    }
  }, [product, isOwner, storeAcceptsOrders]);

  const handleBuyNow = () => {
    if (!product?.seller) return;
    if (isOwner) {
      toast.error('You cannot purchase your own product.');
      return;
    }
    if (!storeAcceptsOrders) {
      toast.error('This store is pending seller verification and cannot receive orders yet.');
      return;
    }
    if (hasVariants && !matchedVariant) {
      toast.error('Please select all product options first.');
      return;
    }
    setIsQuickCheckoutOpen(true);
  };

  const handleToggleFavorite = () => {
    if (!product?.id) return;
    toggleFavorite(String(product.id));
    toast.success(
      isFavorited(String(product.id)) ? 'Removed from favorites' : 'Saved to favorites',
    );
  };

  const handleShare = async () => {
    if (typeof window === 'undefined') return;
    const url = product
      ? `${window.location.origin}${getProductPath(product)}`
      : window.location.href;
    const imageUrl = product?.image_urls?.[0];
    const title = product?.title ?? 'Verndly product';
    const text = `Check out ${title} on Verndly! GH₵${product?.price}`;

    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      if (imageUrl && (navigator as any).canShare) {
        try {
          const res = await fetch(imageUrl);
          if (res.ok) {
            const blob = await res.blob();
            const mimeType = blob.type || 'image/jpeg';
            const ext = mimeType.split('/')[1] || 'jpg';
            const file = new File([blob], `${title.replace(/[^a-zA-Z0-9]/g, '_')}.${ext}`, {
              type: mimeType,
            });
            if ((navigator as any).canShare({ files: [file] })) {
              await (navigator as any).share({
                title,
                text,
                url,
                files: [file],
              });
              toast.success('Shared successfully!');
              return;
            }
          }
        } catch {
          // Fall through to standard share
        }
      }

      try {
        await (navigator as any).share({ title, text, url });
        toast.success('Shared successfully!');
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
      }
    }

    setIsShareModalOpen(true);
  };

  const goToNextMedia = () => {
    if (mediaItems.length <= 1) return;
    setSwipeDirection(1);
    setCurrentMediaIndex((prev) => (prev < mediaItems.length - 1 ? prev + 1 : 0));
  };

  const goToPrevMedia = () => {
    if (mediaItems.length <= 1) return;
    setSwipeDirection(-1);
    setCurrentMediaIndex((prev) => (prev > 0 ? prev - 1 : mediaItems.length - 1));
  };

  const goToMediaIndex = (idx: number) => {
    if (idx === currentMediaIndex) return;
    setSwipeDirection(idx > currentMediaIndex ? 1 : -1);
    setCurrentMediaIndex(idx);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (mediaItems.length <= 1 || e.touches.length !== 1) return;
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
    didSwipeRef.current = false;
    setDragOffsetX(0);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!touchStartRef.current || mediaItems.length <= 1 || e.touches.length !== 1) return;
    const t = e.touches[0];
    const dx = t.clientX - touchStartRef.current.x;
    const dy = t.clientY - touchStartRef.current.y;
    // Only engage horizontal drag when swipe is clearly more horizontal than vertical
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 8) {
      didSwipeRef.current = true;
      setDragOffsetX(Math.max(-120, Math.min(120, dx * 0.55)));
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!touchStartRef.current || mediaItems.length <= 1) {
      setDragOffsetX(0);
      return;
    }
    const t = e.changedTouches[0];
    const dx = t ? t.clientX - touchStartRef.current.x : 0;
    const dy = t ? t.clientY - touchStartRef.current.y : 0;
    touchStartRef.current = null;
    setDragOffsetX(0);

    if (Math.abs(dx) >= 42 && Math.abs(dx) > Math.abs(dy)) {
      didSwipeRef.current = true;
      if (dx < 0) {
        goToNextMedia();
      } else {
        goToPrevMedia();
      }
    }
  };

  const togglePlay = () => {
    if (didSwipeRef.current) {
      didSwipeRef.current = false;
      return;
    }
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
    }
  };

  if (isLoading) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="border-primary h-12 w-12 rounded-full border-4 border-t-transparent"
        />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="bg-background flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <h2 className="text-xl font-medium uppercase">Product not found</h2>
        <Button onClick={() => router.push('/')}>Back to browse</Button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-background min-h-screen pb-28 sm:pb-20"
    >
      {/* Unified Navigation Header */}
      <Header />

      {/* Mobile back + share + favorite strip — subtle, sits under the header */}
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 pt-4 md:px-8">
        <button
          onClick={() => router.back()}
          aria-label="Go back"
          className="bg-surface hover:bg-border/20 inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-normal transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            aria-label="Share product"
            className="bg-surface hover:bg-border/20 rounded-xl border-0 p-2.5 shadow-none transition-colors"
          >
            <Share2 className="h-4 w-4" />
          </button>
          <button
            onClick={handleToggleFavorite}
            aria-label={
              isFavorited(String(product?.id)) ? 'Remove from favorites' : 'Add to favorites'
            }
            className="bg-surface hover:bg-border/20 rounded-xl border-0 p-2.5 shadow-none transition-colors"
          >
            <Heart
              className={`h-4 w-4 transition-colors ${
                isFavorited(String(product?.id)) ? 'fill-red-500 text-red-500' : 'text-foreground'
              }`}
            />
          </button>
        </div>
      </div>

      <main className="mx-auto grid max-w-7xl gap-8 px-4 pt-6 md:grid-cols-2 md:px-8 md:pt-10 lg:gap-16">
        {/* Left: Media Carousel (images + video, swipeable on mobile) */}
        <div className="space-y-6">
          <div
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={() => {
              touchStartRef.current = null;
              setDragOffsetX(0);
            }}
            className="bg-surface group relative aspect-[4/5] touch-pan-y select-none overflow-hidden rounded-[2.5rem] md:aspect-square"
          >
            <div
              style={{
                transform: dragOffsetX ? `translate3d(${dragOffsetX}px, 0, 0)` : undefined,
                transition: dragOffsetX ? 'none' : 'transform 180ms ease-out',
              }}
              className="h-full w-full"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={`${currentMedia?.type}-${currentMediaIndex}`}
                  initial={{ opacity: 0.4, x: swipeDirection * 28 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0.4, x: swipeDirection * -28 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="h-full w-full"
                >
                  {currentMedia?.type === 'video' ? (
                    <div className="relative h-full w-full cursor-pointer" onClick={togglePlay}>
                      <video
                        ref={videoRef}
                        src={currentMedia.url}
                        className="h-full w-full object-cover"
                        autoPlay
                        muted
                        loop
                        playsInline
                      />
                    </div>
                  ) : (
                    <img
                      src={
                        currentMedia?.type === 'image'
                          ? currentMedia.url
                          : '/placeholder-product.png'
                      }
                      alt={product.title}
                      draggable={false}
                      /* LCP: main product image — load eagerly + flag high
                         fetch priority so the browser dispatches it before
                         any below-the-fold work. */
                      loading={currentMediaIndex === 0 ? 'eager' : 'lazy'}
                      fetchPriority={currentMediaIndex === 0 ? 'high' : undefined}
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {mediaItems.length > 1 && (
              <>
                <span className="pointer-events-none absolute right-4 top-4 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-medium tabular-nums text-white sm:hidden">
                  {currentMediaIndex + 1} / {mediaItems.length}
                </span>
                <button
                  type="button"
                  aria-label="Previous image"
                  onClick={goToPrevMedia}
                  className="absolute left-4 top-1/2 hidden -translate-y-1/2 rounded-2xl bg-white/90 p-3 text-black opacity-0 shadow-lg transition-opacity group-hover:opacity-100 sm:flex"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  aria-label="Next image"
                  onClick={goToNextMedia}
                  className="absolute right-4 top-1/2 hidden -translate-y-1/2 rounded-2xl bg-white/90 p-3 text-black opacity-0 shadow-lg transition-opacity group-hover:opacity-100 sm:flex"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}

            {/* Media indicators */}
            {mediaItems.length > 1 && (
              <div className="absolute inset-x-0 bottom-5 flex justify-center gap-2">
                {mediaItems.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    aria-label={`View media ${idx + 1}`}
                    onClick={() => goToMediaIndex(idx)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      idx === currentMediaIndex ? 'w-8 bg-white' : 'w-1.5 bg-white/50'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Thumbnails (images + video) */}
          <div className="scrollbar-hide flex gap-4 overflow-x-auto pb-2">
            {mediaItems.map((item, idx) => (
              <button
                key={idx}
                onClick={() => goToMediaIndex(idx)}
                className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-2 transition-all ${
                  idx === currentMediaIndex
                    ? 'border-primary scale-105'
                    : 'border-transparent opacity-50'
                }`}
              >
                {item.type === 'video' ? (
                  <>
                    <video
                      src={item.url}
                      className="h-full w-full object-cover"
                      muted
                      preload="metadata"
                      playsInline
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <Play className="h-8 w-8 fill-white text-white" />
                    </div>
                  </>
                ) : (
                  <img src={item.url} alt="" className="h-full w-full object-cover" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Product Info */}
        <div className="space-y-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-4"
          >
            {(isProductTrending(product) || product.category) && (
              <div className="flex flex-wrap items-center gap-2">
                {isProductTrending(product) && (
                  <span className="text-primary text-[10px] font-medium uppercase tracking-wider">
                    <Sparkles className="mr-1 inline h-3 w-3" /> Trending Now
                  </span>
                )}
                {product.category && (
                  <span className="bg-surface border-border/50 text-muted rounded-full border px-3 py-1 text-[10px] font-normal uppercase tracking-wider">
                    {product.category}
                  </span>
                )}
              </div>
            )}
            <h1 className="text-xl font-medium uppercase leading-tight tracking-tighter">
              {product.title ?? 'Product'}
            </h1>
            <a
              href="#reviews"
              aria-label="Jump to reviews"
              className="hover:bg-foreground/5 -mt-1 inline-flex w-fit items-center gap-1.5 rounded-md px-1 py-0.5"
            >
              <RatingStars
                value={typeof product.rating_avg === 'number' ? product.rating_avg : 0}
                count={typeof product.rating_count === 'number' ? product.rating_count : 0}
                size={14}
                showValue
                showCount
              />
            </a>
            <PriceBlock
              price={effectivePrice}
              originalPrice={product.original_price}
              currency={product.currency ? `${product.currency} ` : 'GH₵'}
              quantityAvailable={typeof effectiveStock === 'number' ? effectiveStock : undefined}
            />
          </motion.div>

          {hasVariants && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.32 }}
              className="space-y-2"
            >
              <VariantPicker
                variants={variants}
                selected={selectedVariantAttrs}
                onChange={setSelectedVariantAttrs}
              />
              {!matchedVariant && (
                <p className="text-muted text-[11px]">
                  Select all options to add this product to your cart.
                </p>
              )}
            </motion.div>
          )}

          {/* Tabs / Description — never show placeholder copy when empty */}
          {product.description?.trim() && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-4"
            >
              <div className="text-muted flex items-center gap-2 text-[10px] font-normal uppercase tracking-wider">
                <Info className="h-4 w-4" /> Description
              </div>
              <p className="text-muted text-sm font-medium leading-relaxed">
                {product.description.trim()}
              </p>
            </motion.div>
          )}

          {/* Specifications / Attributes (size, model, etc.) */}
          {attributeEntries.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="space-y-4"
            >
              <div className="text-muted flex items-center gap-2 text-[10px] font-normal uppercase tracking-wider">
                <Ruler className="h-4 w-4" /> Details
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {attributeEntries.map(([key, value]) => (
                  <div
                    key={key}
                    className="bg-surface/50 border-border/50 flex flex-wrap items-baseline justify-between gap-2 rounded-xl border px-4 py-2"
                  >
                    <span className="text-muted text-[10px] font-normal uppercase tracking-wider">
                      {formatAttributeLabel(key)}
                    </span>
                    {key === 'subcategory' ? (
                      <Link
                        href={`/products?${new URLSearchParams({
                          ...(product.category ? { category: product.category } : {}),
                          subcategory: value,
                        }).toString()}`}
                        className="text-foreground max-w-[60%] truncate text-sm font-medium underline-offset-2 hover:underline"
                      >
                        {value}
                      </Link>
                    ) : (
                      <span className="text-foreground max-w-[60%] truncate text-sm font-normal">
                        {value}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Tags */}
          {Array.isArray(product.tags) && product.tags.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex flex-wrap gap-2"
            >
              {product.tags.map((tag: string) => (
                <Link
                  key={tag}
                  href={`/products?q=${encodeURIComponent(tag)}`}
                  className="bg-surface border-border/50 text-muted hover:text-foreground hover:border-primary/30 flex items-center gap-1.5 rounded-xl border px-4 py-2 text-[10px] font-normal uppercase transition-all"
                >
                  <Tag className="h-3 w-3" /> {tag}
                </Link>
              ))}
            </motion.div>
          )}

          {/* Seller Info Card */}
          {product.seller && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <SellerCard seller={product.seller} />
            </motion.div>
          )}

          {/* Actions (Mobile-first side-by-side, ergonomic sizing, proper contrast) */}
          {isOwner ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-surface flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="space-y-0.5">
                <p className="text-foreground text-xs font-semibold">This is your listing</p>
                <p className="text-muted text-[11px]">
                  Sellers cannot purchase their own products.
                </p>
              </div>
              <Button
                variant="primary"
                onClick={() => router.push(`/dashboard/products/${product.id}`)}
                className="bg-foreground text-background hover:bg-foreground/90 h-10 shrink-0 rounded-xl px-4 text-xs font-semibold"
              >
                Manage Product
              </Button>
            </motion.div>
          ) : !storeAcceptsOrders ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="space-y-3 pt-4"
            >
              <div className="rounded-2xl bg-amber-500/10 px-4 py-3 text-amber-950 dark:text-amber-100">
                <p className="text-xs font-semibold">
                  Orders disabled — Store pending verification
                </p>
                <p className="mt-0.5 text-[11px] opacity-80">
                  This seller is still completing Verndly verification. You can browse their
                  products, and checkout will unlock once verified.
                </p>
              </div>
              <div className="flex flex-row gap-2.5 sm:gap-3">
                <Button
                  variant="secondary"
                  disabled
                  className="border-border/80 bg-surface/60 text-muted sm:h-13 h-12 flex-1 cursor-not-allowed gap-2 rounded-xl border text-xs font-semibold opacity-60 sm:rounded-2xl sm:text-sm"
                >
                  <ShoppingCart className="h-4 w-4 shrink-0" />
                  <span className="truncate">Add to Cart</span>
                </Button>
                <Button
                  variant="primary"
                  disabled
                  className="bg-foreground/30 text-background sm:h-13 h-12 flex-1 cursor-not-allowed gap-2 rounded-xl border-0 text-xs font-semibold sm:rounded-2xl sm:text-sm"
                >
                  <Zap className="h-4 w-4 shrink-0" />
                  <span className="truncate">Orders Unavailable</span>
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="flex flex-row gap-2.5 pt-4 sm:gap-3"
            >
              <Button
                variant="secondary"
                onClick={handleAddToCart}
                disabled={!canPurchase}
                className="border-border/80 bg-surface/90 text-foreground hover:bg-surface sm:h-13 group h-12 flex-1 gap-2 rounded-xl border text-xs font-semibold tracking-wide shadow-sm transition-all active:scale-[0.98] sm:rounded-2xl sm:text-sm"
              >
                {addedFeedback ? (
                  <motion.span
                    key="added"
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    className="flex items-center justify-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400"
                  >
                    <Check className="h-4 w-4" />
                    <span className="truncate">Added!</span>
                  </motion.span>
                ) : (
                  <motion.span
                    key="add"
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    className="flex items-center justify-center gap-1.5"
                  >
                    <ShoppingCart className="text-muted group-hover:text-foreground h-4 w-4 shrink-0 transition-colors" />
                    <span className="truncate">Add to Cart</span>
                  </motion.span>
                )}
              </Button>

              <Button
                variant="primary"
                onClick={handleBuyNow}
                disabled={!canPurchase}
                className="border-foreground/10 bg-foreground text-background hover:bg-foreground/90 sm:h-13 h-12 flex-1 gap-2 rounded-xl border text-xs font-semibold tracking-wide shadow-md transition-all active:scale-[0.98] sm:rounded-2xl sm:text-sm"
              >
                <Zap className="h-4 w-4 shrink-0 fill-current" />
                <span className="truncate">{canPurchase ? 'Buy Now' : 'Out of Stock'}</span>
              </Button>
            </motion.div>
          )}

          {!isOwner && (
            <div className="flex items-center justify-end pt-1">
              <button
                type="button"
                onClick={() => setIsReportModalOpen(true)}
                className="text-muted hover:text-foreground inline-flex items-center gap-1.5 text-[11px] font-medium transition-colors"
              >
                <Flag className="h-3.5 w-3.5" />
                Report this listing
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Reviews Section */}
      <div className="border-border/40 mx-auto max-w-7xl border-t px-4 py-16 md:px-8">
        <ProductReviewsSection
          productId={String(product.id)}
          productTitle={product.title ?? 'Product'}
          sellerUserId={product.seller?.user_id}
        />
      </div>

      {/* Recently viewed (excludes the current product) */}
      <div className="mx-auto max-w-7xl px-4 pb-4 md:px-8">
        <RecentlyViewed limit={12} excludeId={String(product.id)} title="Continue browsing" />
      </div>

      {/* Related products */}
      <div className="mx-auto max-w-7xl px-4 pb-24 md:px-8">
        <RelatedProducts category={product.category} excludeId={String(product.id)} />
      </div>

      {/* Quick Checkout Modal (Mobile-first, Borderless, Shadowless, No blur) */}
      {product && (
        <QuickCheckoutModal
          isOpen={isQuickCheckoutOpen}
          onClose={() => setIsQuickCheckoutOpen(false)}
          product={product}
          selectedVariant={matchedVariant}
          selectedVariantAttrs={selectedVariantAttrs}
        />
      )}

      {/* Share Product Modal (With Product Image, Mobile-first, Borderless, Shadowless, No blur) */}
      {product && (
        <ShareProductModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          product={product}
        />
      )}

      {/* Report Product Modal */}
      {product && !isOwner && (
        <ReportModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          targetType="PRODUCT"
          targetId={String(product.id)}
          targetName={product.title ?? 'Product listing'}
        />
      )}

      {/* Sticky Mobile Bottom Action Bar (Fixed, thumb-friendly on mobile) */}
      {product && (
        <div className="border-border/60 bg-background/95 fixed bottom-0 left-0 right-0 z-40 border-t p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(0,0,0,0.06)] backdrop-blur-xl sm:hidden">
          <div className="mx-auto flex max-w-md items-center gap-3">
            {/* Price display on the left */}
            <div className="flex min-w-0 flex-col justify-center">
              <span className="text-muted text-[10px] font-medium uppercase tracking-wider">
                Price
              </span>
              <span className="truncate text-base font-bold tabular-nums text-red-500">
                {product.currency ? `${product.currency} ` : 'GH₵ '}
                {Number(effectivePrice).toLocaleString()}
              </span>
            </div>

            {/* Action buttons on the right */}
            <div className="flex flex-1 items-center gap-2">
              {isOwner ? (
                <Button
                  variant="primary"
                  onClick={() => router.push(`/dashboard/products/${product.id}`)}
                  className="bg-foreground text-background hover:bg-foreground/90 h-11 flex-1 rounded-xl px-4 text-xs font-semibold"
                >
                  Manage Your Product
                </Button>
              ) : (
                <>
                  <Button
                    variant="secondary"
                    onClick={handleAddToCart}
                    disabled={!canPurchase}
                    className="border-border/80 bg-surface/90 text-foreground hover:bg-surface group h-11 flex-1 gap-1.5 rounded-xl border px-2 text-xs font-semibold shadow-sm transition-all active:scale-95"
                  >
                    {addedFeedback ? (
                      <Check className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <ShoppingCart className="text-muted group-hover:text-foreground h-4 w-4" />
                    )}
                    <span className="truncate">{addedFeedback ? 'Added' : 'Add to Cart'}</span>
                  </Button>

                  <Button
                    variant="primary"
                    onClick={handleBuyNow}
                    disabled={!canPurchase}
                    className="border-foreground/10 bg-foreground text-background hover:bg-foreground/90 h-11 flex-[1.3] gap-1.5 rounded-xl border px-3 text-xs font-semibold shadow-md transition-all active:scale-95"
                  >
                    <Zap className="h-3.5 w-3.5 shrink-0 fill-current" />
                    <span className="truncate">{canPurchase ? 'Buy Now' : 'Out of Stock'}</span>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
