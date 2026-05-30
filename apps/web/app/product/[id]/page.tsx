'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
} from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { productApi } from '@/lib/api/product';
import Button from '@/components/ui/Button';
import { useCart } from '@/lib/contexts/cart-context';
import PriceBlock from '@/components/product-detail/PriceBlock';
import SellerCard from '@/components/product-detail/SellerCard';
import RelatedProducts from '@/components/product-detail/RelatedProducts';
import RecentlyViewed from '@/components/home/RecentlyViewed';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import { RatingStars } from '@/components/reviews/rating-stars';
import { ProductReviewsSection } from '@/components/reviews/product-reviews-section';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import VariantPicker, {
  matchVariant,
  type ProductVariant as Variant,
} from '@/components/product-detail/VariantPicker';

type MediaItem = { type: 'image'; url: string } | { type: 'video'; url: string };

export default function ProductDetailsPage() {
  const router = useRouter();
  const { id } = useParams();
  const { addItem } = useCart();
  const [product, setProduct] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const { record: recordRecentlyViewed } = useRecentlyViewed();
  const [addedFeedback, setAddedFeedback] = useState(false);
  const [selectedVariantAttrs, setSelectedVariantAttrs] = useState<
    Record<string, string>
  >({});
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const data = await productApi.getProductById(id as string);
        setProduct(data);
      } catch (err) {
        console.error('Failed to fetch product', err);
      } finally {
        setIsLoading(false);
      }
    };
    if (id) fetchProduct();
  }, [id]);

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
    return Object.entries(obj)
      .filter(([, value]) => value != null && String(value).trim() !== '')
      .map(([key, value]) => [key, String(value).trim()]);
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
  const effectivePrice =
    matchedVariant?.price ?? product?.price ?? '0';
  const effectiveStock = matchedVariant
    ? matchedVariant.quantity_available
    : product?.quantity_available;
  const canPurchase = hasVariants
    ? !!matchedVariant && matchedVariant.quantity_available > 0
    : typeof product?.quantity_available !== 'number' ||
      product.quantity_available > 0;

  const handleAddToCart = () => {
    if (!product?.seller) return;
    if (hasVariants && !matchedVariant) return;
    const price =
      typeof effectivePrice === 'number'
        ? String(effectivePrice)
        : (effectivePrice ?? '0');
    addItem({
      productId: String(product.id),
      variantId: matchedVariant?.id ?? null,
      variantLabel,
      title: product.title ?? 'Product',
      price,
      imageUrl:
        matchedVariant?.image_url ||
        product.image_urls?.[0] ||
        '/placeholder-product.png',
      storeLink: product.seller.store_link ?? '',
      storeName: product.seller.store_name ?? 'Store',
      logoUrl: product.seller.logo_url ?? null,
    });
    setAddedFeedback(true);
    setTimeout(() => setAddedFeedback(false), 2000);
  };

  const handleBuyNow = () => {
    if (!product?.seller) return;
    handleAddToCart();
    // Jump straight to checkout for this store
    router.push(`/cart/checkout?store=${encodeURIComponent(product.seller.store_link)}`);
  };

  const handleShare = async () => {
    if (typeof window === 'undefined') return;
    const url = window.location.href;
    if ((navigator as any).share) {
      try {
        await (navigator as any).share({ title: product?.title ?? 'Verndly product', url });
        return;
      } catch {
        // fall through
      }
    }
    try {
      await navigator.clipboard.writeText(url);
    } catch {}
  };

  const togglePlay = () => {
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
      className="bg-background min-h-screen pb-20"
    >
      {/* Unified Navigation Header */}
      <DashboardHeader title={product.title ?? 'Product'} />

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
            className="bg-surface hover:bg-border/20 rounded-xl p-2.5 transition-colors"
          >
            <Share2 className="h-4 w-4" />
          </button>
          <button
            aria-label="Add to favorites"
            className="bg-surface hover:bg-border/20 rounded-xl p-2.5 text-red-500 transition-colors"
          >
            <Heart className="h-4 w-4" />
          </button>
        </div>
      </div>

      <main className="mx-auto grid max-w-7xl gap-8 px-4 pt-6 md:grid-cols-2 md:px-8 md:pt-10 lg:gap-16">
        {/* Left: Media Carousel (images + video) */}
        <div className="space-y-6">
          <div className="bg-surface group relative aspect-[4/5] overflow-hidden rounded-[2.5rem] md:aspect-square">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${currentMedia?.type}-${currentMediaIndex}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
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
                      currentMedia?.type === 'image' ? currentMedia.url : '/placeholder-product.png'
                    }
                    alt={product.title}
                    /* LCP: main product image — load eagerly + flag high
                       fetch priority so the browser dispatches it before
                       any below-the-fold work. */
                    loading={currentMediaIndex === 0 ? 'eager' : 'lazy'}
                    // @ts-ignore — fetchpriority is a valid DOM attr; React types lag.
                    fetchpriority={currentMediaIndex === 0 ? 'high' : undefined}
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                )}
              </motion.div>
            </AnimatePresence>

            {mediaItems.length > 1 && (
              <>
                <button
                  onClick={() =>
                    setCurrentMediaIndex((prev) => (prev > 0 ? prev - 1 : mediaItems.length - 1))
                  }
                  className="absolute left-4 top-1/2 -translate-y-1/2 rounded-2xl bg-white/90 p-3 text-black opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={() =>
                    setCurrentMediaIndex((prev) => (prev < mediaItems.length - 1 ? prev + 1 : 0))
                  }
                  className="absolute right-4 top-1/2 -translate-y-1/2 rounded-2xl bg-white/90 p-3 text-black opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}

            {/* Media indicators */}
            <div className="absolute inset-x-0 bottom-6 flex justify-center gap-2">
              {mediaItems.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === currentMediaIndex ? 'w-8 bg-white' : 'w-1.5 bg-white/50'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Thumbnails (images + video) */}
          <div className="scrollbar-hide flex gap-4 overflow-x-auto pb-2">
            {mediaItems.map((item, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentMediaIndex(idx)}
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
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-primary text-[10px] font-medium uppercase tracking-wider">
                <Sparkles className="mr-1 inline h-3 w-3" /> Trending Now
              </span>
              {product.category && (
                <span className="bg-surface border-border/50 text-muted rounded-full border px-3 py-1 text-[10px] font-normal uppercase tracking-wider">
                  {product.category}
                </span>
              )}
            </div>
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
              quantityAvailable={
                typeof effectiveStock === 'number' ? effectiveStock : undefined
              }
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
                <p className="text-[11px] text-muted">
                  Select all options to add this product to your cart.
                </p>
              )}
            </motion.div>
          )}

          {/* Tabs / Description */}
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
              {product.description || 'No description provided for this item.'}
            </p>
          </motion.div>

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
                    <span className="text-foreground max-w-[60%] truncate text-sm font-normal">
                      {value}
                    </span>
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
                <span
                  key={tag}
                  className="bg-surface border-border/50 text-muted hover:text-foreground hover:border-primary/30 flex cursor-default items-center gap-1.5 rounded-xl border px-4 py-2 text-[10px] font-normal uppercase transition-all"
                >
                  <Tag className="h-3 w-3" /> {tag}
                </span>
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

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex flex-col gap-4 pt-4 sm:flex-row"
          >
            <Button
              onClick={handleAddToCart}
              disabled={!canPurchase}
              className="h-16 flex-1 gap-3 rounded-[2rem] text-xs font-medium uppercase tracking-wider"
            >
              {addedFeedback ? (
                <motion.span
                  key="added"
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  className="flex items-center gap-2"
                >
                  <Check className="h-4 w-4" /> Added to cart
                </motion.span>
              ) : (
                <motion.span
                  key="add"
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  className="flex items-center gap-2"
                >
                  <ShoppingCart className="h-4 w-4" /> Add to Cart
                </motion.span>
              )}
            </Button>
            <Button
              variant="secondary"
              onClick={handleBuyNow}
              disabled={!canPurchase}
              className="text-primary group h-16 flex-1 rounded-[2rem] border-none bg-black text-xs font-medium uppercase tracking-wider hover:bg-black/90"
            >
              Buy Now
            </Button>
          </motion.div>
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
        <RecentlyViewed
          limit={12}
          excludeId={String(product.id)}
          title="Continue browsing"
        />
      </div>

      {/* Related products */}
      <div className="mx-auto max-w-7xl px-4 pb-24 md:px-8">
        <RelatedProducts category={product.category} excludeId={String(product.id)} />
      </div>
    </motion.div>
  );
}
