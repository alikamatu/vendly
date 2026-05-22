"use client";

import React, { useRef, useState } from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { ShoppingCart, ExternalLink, Check, Heart, Sparkles } from "lucide-react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import { useCart } from "@/lib/contexts/cart-context";
import { useFavorites } from "@/lib/contexts/favorite-context";

interface ProductCardProps {
  product: {
    id: string;
    title: string;
    price: string;
    original_price?: string | number | null;
    image_urls: string[];
    video_url?: string | null;
    is_featured?: boolean;
    seller: {
      store_name: string;
      logo_url?: string;
      store_link: string;
    };
  };
  index: number;
}

function computeDiscount(price: string | number, original?: string | number | null) {
  if (original == null) return null;
  const o = Number(original);
  const p = Number(price);
  if (!Number.isFinite(o) || !Number.isFinite(p) || o <= p || o <= 0) return null;
  return Math.round(((o - p) / o) * 100);
}

export default function ProductCard({ product, index }: ProductCardProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const { addItem } = useCart();
  const { toggleFavorite, isFavorited } = useFavorites();
  const [added, setAdded] = useState(false);

  const favorited = isFavorited(String(product.id));

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(String(product.id));
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      productId: String(product.id),
      title: product.title,
      price: typeof product.price === "number" ? String(product.price) : (product.price ?? "0"),
      imageUrl: product.image_urls?.[0] ?? "/placeholder-product.png",
      videoUrl: product.video_url,
      storeLink: product.seller.store_link ?? "",
      storeName: product.seller.store_name ?? "Store",
      logoUrl: product.seller.logo_url ?? null,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  const handleMouseEnter = () => {
    if (product.video_url && videoRef.current) {
      videoRef.current.currentTime = 0;
      const playPromise = videoRef.current.play();
      if (playPromise && typeof playPromise.then === "function") {
        playPromise.catch(() => {
          // Autoplay might be blocked; fail silently
        });
      }
    }
  };

  const handleMouseLeave = () => {
    if (product.video_url && videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className="break-inside-avoid mb-2"
    >
      <Card
        className="group border-none shadow-none rounded-[2rem] overflow-hidden p-0 bg-transparent"
        hoverEffect={false}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="relative">
          <Link href={`/product/${product.id}`} className="block">
            {/* Product Media */}
            <div className="relative w-full overflow-hidden rounded-[1.5rem]">
              {product.video_url ? (
                <video
                  ref={videoRef}
                  src={product.video_url}
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="auto"
                  className="w-full h-auto object-cover"
                />
              ) : (
                <img
                  src={product.image_urls?.[0] || "/placeholder-product.png"}
                  alt={product.title}
                  className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105"
                />
              )}
              {/* Promo Badge */}
              {product.is_featured && (
                <div className="absolute top-4 left-4 z-20">
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-600 backdrop-blur-md text-white text-[9px] font-normal uppercase tracking-wider shadow-xl shadow-primary/30"
                  >
                    <Sparkles size={12} className="text-white fill-current" />
                    Hot Sale
                  </motion.div>
                </div>
              )}
              {/* Discount Badge */}
              {(() => {
                const d = computeDiscount(product.price, product.original_price);
                if (d == null) return null;
                return (
                  <div className={`absolute ${product.is_featured ? "top-12" : "top-4"} left-4 z-20`}>
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="px-2.5 py-1.5 rounded-full bg-emerald-500 text-white text-[10px] font-medium uppercase tracking-wider shadow-lg shadow-emerald-500/30"
                    >
                      −{d}%
                    </motion.div>
                  </div>
                );
              })()}
              {/* Overlay Gradient */}
              <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
          </Link>

          {/* Quick Actions Overlay (Always visible on mobile, hover on desktop) */}
          <div className="absolute inset-x-2 bottom-2 flex items-center justify-between translate-y-0 opacity-100 md:translate-y-2 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100 transition-all duration-300 pointer-events-none">
            <div className="flex gap-2">
              <motion.button
                {...({
                  type: "button",
                  onClick: handleAddToCart,
                  whileTap: { scale: 0.92 },
                  className: "p-2.5 md:p-3 rounded-xl md:rounded-2xl bg-white/95 backdrop-blur-md text-black hover:scale-110 active:scale-95 transition-transform shadow-lg pointer-events-auto"
                } as HTMLMotionProps<"button">)}
              >
                {added ? (
                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400 }}>
                    <Check className="w-3 md:w-3.5 h-3 md:h-3.5 text-emerald-600" />
                  </motion.span>
                ) : (
                  <ShoppingCart className="w-3 md:w-3.5 h-3 md:h-3.5" />
                )}
              </motion.button>

              <motion.button
                {...({
                  type: "button",
                  onClick: handleToggleFavorite,
                  whileTap: { scale: 0.92 },
                  className: `p-2.5 md:p-3 rounded-xl md:rounded-2xl backdrop-blur-md transition-all shadow-lg pointer-events-auto ${favorited ? "bg-rose-500 text-white" : "bg-white/95 text-black hover:text-rose-500"
                    }`
                } as HTMLMotionProps<"button">)}
              >
                <Heart className={`w-3 md:w-3.5 h-3 md:h-3.5 ${favorited ? "fill-current" : ""}`} />
              </motion.button>
            </div>
          </div>
        </div>


        {/* Content */}
        <div className="p-5 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <h3 className="text-xs text-foreground line-clamp-1 flex-1 capitalize tracking-tight">
              {product.title}
            </h3>
            <div className="flex flex-col items-end leading-tight">
              <span className="text-xs text-red-500 text-primary">
                GH₵{parseFloat(product.price).toLocaleString()}
              </span>
              {product.original_price != null && computeDiscount(product.price, product.original_price) != null && (
                <span className="text-[10px] text-muted-foreground line-through">
                  GH₵{Number(product.original_price).toLocaleString()}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <div className="w-5 h-5 rounded-full overflow-hidden border border-border/50">
              {product.seller.logo_url ? (
                <img src={product.seller.logo_url} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[8px] font-normal uppercase">
                  {product.seller.store_name[0]}
                </div>
              )}
            </div>
            <p className="text-[10px] text-muted truncate">@{product.seller.store_link}</p>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
