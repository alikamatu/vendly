"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
} from "lucide-react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { productApi } from "@/lib/api/product";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useCart } from "@/lib/contexts/cart-context";
import PriceBlock from "@/components/product-detail/PriceBlock";
import SellerCard from "@/components/product-detail/SellerCard";
import RelatedProducts from "@/components/product-detail/RelatedProducts";
import DashboardHeader from "@/components/dashboard/DashboardHeader";

type MediaItem =
  | { type: "image"; url: string }
  | { type: "video"; url: string };

export default function ProductDetailsPage() {
  const router = useRouter();
  const { id } = useParams();
  const { addItem } = useCart();
  const [product, setProduct] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [addedFeedback, setAddedFeedback] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const data = await productApi.getProductById(id as string);
        setProduct(data);
      } catch (err) {
        console.error("Failed to fetch product", err);
      } finally {
        setIsLoading(false);
      }
    };
    if (id) fetchProduct();
  }, [id]);

  useEffect(() => {
    setCurrentMediaIndex(0);
  }, [id]);

  const mediaItems: MediaItem[] = useMemo(() => {
    if (!product) return [];
    const items: MediaItem[] = [];
    if (product.video_url) {
      items.push({ type: "video", url: product.video_url });
    }
    const imageUrls = Array.isArray(product.image_urls)
      ? product.image_urls
      : [];
    imageUrls.forEach((url: string) => items.push({ type: "image", url }));
    if (items.length === 0) {
      items.push({ type: "image", url: "/placeholder-product.png" });
    }
    return items;
  }, [product]);

  const currentMedia = mediaItems[currentMediaIndex];

  const attributeEntries: [string, string][] = useMemo(() => {
    if (!product?.attributes) return [];
    const raw = product.attributes;
    const obj =
      typeof raw === "string"
        ? (() => {
            try {
              return JSON.parse(raw);
            } catch {
              return {};
            }
          })()
        : raw && typeof raw === "object"
          ? raw
          : {};
    return Object.entries(obj)
      .filter(([, value]) => value != null && String(value).trim() !== "")
      .map(([key, value]) => [key, String(value).trim()]);
  }, [product]);

  const formatAttributeLabel = (key: string) => {
    return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const handleAddToCart = () => {
    if (!product?.seller) return;
    const price =
      typeof product.price === "number"
        ? String(product.price)
        : (product.price ?? "0");
    addItem({
      productId: String(product.id),
      title: product.title ?? "Product",
      price,
      imageUrl: product.image_urls?.[0] ?? "/placeholder-product.png",
      storeLink: product.seller.store_link ?? "",
      storeName: product.seller.store_name ?? "Store",
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
    if (typeof window === "undefined") return;
    const url = window.location.href;
    if ((navigator as any).share) {
      try {
        await (navigator as any).share({ title: product?.title ?? "Vendly product", url });
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background p-8 text-center flex flex-col items-center justify-center gap-4">
        <h2 className="text-xl font-black uppercase">Product not found</h2>
        <Button onClick={() => router.push("/")}>Back to browse</Button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-background pb-20"
    >
      {/* Unified Navigation Header */}
      <DashboardHeader title={product.title ?? "Product"} />

      {/* Mobile back + share + favorite strip — subtle, sits under the header */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-4 flex items-center justify-between gap-2">
        <button
          onClick={() => router.back()}
          aria-label="Go back"
          className="inline-flex items-center gap-1.5 px-3 h-9 rounded-xl bg-surface hover:bg-border/20 transition-colors text-xs font-bold"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            aria-label="Share product"
            className="p-2.5 rounded-xl bg-surface hover:bg-border/20 transition-colors"
          >
            <Share2 className="w-4 h-4" />
          </button>
          <button
            aria-label="Add to favorites"
            className="p-2.5 rounded-xl bg-surface hover:bg-border/20 transition-colors text-red-500"
          >
            <Heart className="w-4 h-4" />
          </button>
        </div>
      </div>

      <main className="pt-6 md:pt-10 max-w-7xl mx-auto px-4 md:px-8 grid md:grid-cols-2 gap-8 lg:gap-16">
        {/* Left: Media Carousel (images + video) */}
        <div className="space-y-6">
          <div className="relative aspect-[4/5] md:aspect-square bg-surface rounded-[2.5rem] overflow-hidden group">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${currentMedia?.type}-${currentMediaIndex}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="w-full h-full"
              >
                {currentMedia?.type === "video" ? (
                  <div className="relative w-full h-full cursor-pointer" onClick={togglePlay}>
                    <video
                      ref={videoRef}
                      src={currentMedia.url}
                      className="w-full h-full object-cover"
                      autoPlay
                      muted
                      loop
                      playsInline
                    />
                  </div>
                ) : (
                  <img
                    src={
                      currentMedia?.type === "image"
                        ? currentMedia.url
                        : "/placeholder-product.png"
                    }
                    alt={product.title}
                    className="w-full h-full object-cover"
                  />
                )}
              </motion.div>
            </AnimatePresence>

            {mediaItems.length > 1 && (
              <>
                <button
                  onClick={() =>
                    setCurrentMediaIndex((prev) =>
                      prev > 0 ? prev - 1 : mediaItems.length - 1,
                    )
                  }
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-2xl bg-white/90 text-black shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() =>
                    setCurrentMediaIndex((prev) =>
                      prev < mediaItems.length - 1 ? prev + 1 : 0,
                    )
                  }
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-2xl bg-white/90 text-black shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}

            {/* Media indicators */}
            <div className="absolute bottom-6 inset-x-0 flex justify-center gap-2">
              {mediaItems.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === currentMediaIndex
                      ? "w-8 bg-white"
                      : "w-1.5 bg-white/50"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Thumbnails (images + video) */}
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
            {mediaItems.map((item, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentMediaIndex(idx)}
                className={`relative w-20 h-20 rounded-2xl overflow-hidden border-2 transition-all shrink-0 ${
                  idx === currentMediaIndex
                    ? "border-primary scale-105"
                    : "border-transparent opacity-50"
                }`}
              >
                {item.type === "video" ? (
                  <>
                    <video
                      src={item.url}
                      className="w-full h-full object-cover"
                      muted
                      preload="metadata"
                      playsInline
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <Play className="w-8 h-8 text-white fill-white" />
                    </div>
                  </>
                ) : (
                  <img
                    src={item.url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
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
              <span className="text-primary text-[10px] font-black uppercase tracking-[0.2em]">
                <Sparkles className="w-3 h-3 inline mr-1" /> Trending Now
              </span>
              {product.category && (
                <span className="px-3 py-1 rounded-full bg-surface border border-border/50 text-[10px] font-bold text-muted uppercase tracking-wider">
                  {product.category}
                </span>
              )}
            </div>
            <h1 className="text-3xl lg:text-5xl font-black tracking-tighter leading-tight uppercase">
              {product.title ?? "Product"}
            </h1>
            <PriceBlock
              price={product.price}
              originalPrice={product.original_price}
              currency={product.currency ? `${product.currency} ` : "GH₵"}
              quantityAvailable={
                typeof product.quantity_available === "number"
                  ? product.quantity_available
                  : undefined
              }
            />
          </motion.div>

          {/* Tabs / Description */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-2 text-[10px] font-bold text-muted uppercase tracking-widest">
              <Info className="w-4 h-4" /> Description
            </div>
            <p className="text-sm font-medium text-muted leading-relaxed">
              {product.description || "No description provided for this item."}
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
              <div className="flex items-center gap-2 text-[10px] font-bold text-muted uppercase tracking-widest">
                <Ruler className="w-4 h-4" /> Details
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {attributeEntries.map(([key, value]) => (
                  <div
                    key={key}
                    className="flex flex-wrap items-baseline justify-between gap-2 py-2 px-4 rounded-xl bg-surface/50 border border-border/50"
                  >
                    <span className="text-[10px] font-bold text-muted uppercase tracking-wider">
                      {formatAttributeLabel(key)}
                    </span>
                    <span className="text-sm font-semibold text-foreground truncate max-w-[60%]">
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
                  className="flex items-center gap-1.5 px-4 py-2 bg-surface border border-border/50 rounded-xl text-[10px] font-bold text-muted hover:text-foreground hover:border-primary/30 transition-all cursor-default uppercase"
                >
                  <Tag className="w-3 h-3" /> {tag}
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
            className="flex flex-col sm:flex-row gap-4 pt-4"
          >
            <Button
              onClick={handleAddToCart}
              className="h-16 flex-1 rounded-[2rem] font-black uppercase tracking-widest text-xs gap-3"
            >
              {addedFeedback ? (
                <motion.span
                  key="added"
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  className="flex items-center gap-2"
                >
                  <Check className="w-4 h-4" /> Added to cart
                </motion.span>
              ) : (
                <motion.span
                  key="add"
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  className="flex items-center gap-2"
                >
                  <ShoppingCart className="w-4 h-4" /> Add to Cart
                </motion.span>
              )}
            </Button>
            <Button
              variant="secondary"
              onClick={handleBuyNow}
              disabled={
                typeof product.quantity_available === "number" &&
                product.quantity_available <= 0
              }
              className="h-16 flex-1 rounded-[2rem] font-black uppercase tracking-widest text-xs bg-black text-primary border-none hover:bg-black/90 group"
            >
              Buy Now
            </Button>
          </motion.div>
        </div>
      </main>

      {/* Related products */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 pb-24">
        <RelatedProducts
          category={product.category}
          excludeId={String(product.id)}
        />
      </div>
    </motion.div>
  );
}
