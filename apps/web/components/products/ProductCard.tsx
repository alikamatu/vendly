'use client';

import React, { useRef, useState } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { ShoppingCart, ExternalLink, Check, Heart, Sparkles } from 'lucide-react';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import { useCart } from '@/lib/contexts/cart-context';
import { useFavorites } from '@/lib/contexts/favorite-context';
import { toast } from 'sonner';

const MotionButton = motion.button as any;
const MotionSpan = motion.span as any;
const MotionDiv = motion.div as any;

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
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [logoError, setLogoError] = useState(false);

  const favorited = isFavorited(String(product.id));

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(String(product.id));
    toast.success(favorited ? 'Removed from favorites' : 'Saved to favorites');
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      productId: String(product.id),
      title: product.title,
      price: typeof product.price === 'number' ? String(product.price) : (product.price ?? '0'),
      imageUrl: product.image_urls?.[0] ?? '/placeholder-product.png',
      videoUrl: product.video_url,
      storeLink: product.seller.store_link ?? '',
      storeName: product.seller.store_name ?? 'Store',
      logoUrl: product.seller.logo_url ?? null,
    });
    setAdded(true);
    toast.success('Added to cart');
    setTimeout(() => setAdded(false), 1800);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (product.video_url && videoRef.current) {
      videoRef.current.currentTime = 0;
      const playPromise = videoRef.current.play();
      if (playPromise && typeof playPromise.then === 'function') {
        playPromise.catch(() => {
          // Autoplay might be blocked; fail silently
        });
      }
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
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
      className="mb-2 break-inside-avoid"
    >
      <Card
        className="group relative overflow-hidden rounded-[2rem] border-0 bg-transparent p-0 shadow-none"
        hoverEffect={false}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="group/media relative">
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
                  className="h-auto w-full object-cover"
                />
              ) : (
                <img
                  src={
                    !imageError && product.image_urls?.[0]
                      ? product.image_urls[0]
                      : '/placeholder-product.png'
                  }
                  alt={product.title}
                  onError={() => setImageError(true)}
                  className="h-auto w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              )}
              {/* Promo Badge */}
              {product.is_featured && (
                <div className="absolute left-4 top-4 z-20">
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-1.5 rounded-full border-0 bg-red-600 px-3 py-1.5 text-[9px] font-normal uppercase tracking-wider text-white shadow-none"
                  >
                    <Sparkles size={12} className="fill-current text-white" />
                    Hot Sale
                  </motion.div>
                </div>
              )}
              {/* Discount Badge */}
              {(() => {
                const d = computeDiscount(product.price, product.original_price);
                if (d == null) return null;
                return (
                  <div
                    className={`absolute ${product.is_featured ? 'top-12' : 'top-4'} left-4 z-20`}
                  >
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="rounded-full border-0 bg-emerald-600 px-2.5 py-1.5 text-[10px] font-medium uppercase tracking-wider text-white shadow-none"
                    >
                      −{d}%
                    </motion.div>
                  </div>
                );
              })()}
              {/* Overlay Gradient */}
              <div className="absolute inset-0 bg-black/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            </div>
          </Link>

          {/* Quick Actions (Bottom-Left Corner, animated on hover, borderless & shadowless & no blur) */}
          <div
            className={`pointer-events-auto absolute bottom-3 left-3 z-30 flex items-center gap-1.5 transition-all duration-300 ease-out ${
              isHovered
                ? 'translate-y-0 opacity-100'
                : 'opacity-100 group-hover/media:translate-y-0 group-hover:translate-y-0 group-hover/media:opacity-100 group-hover:opacity-100 sm:translate-y-2 sm:opacity-0'
            }`}
          >
            {/* Add to Cart Button */}
            <MotionButton
              type="button"
              aria-label="Add to cart"
              onClick={handleAddToCart}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className={`flex items-center justify-center rounded-full border-0 p-2 shadow-none transition-all duration-200 sm:p-2.5 ${
                added
                  ? 'bg-emerald-600 text-white'
                  : 'bg-surface hover:bg-surface/85 text-foreground'
              }`}
            >
              {added ? (
                <MotionSpan
                  key="checked"
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                >
                  <Check className="h-3.5 w-3.5 stroke-[2.5] text-white" />
                </MotionSpan>
              ) : (
                <MotionSpan key="cart" initial={{ scale: 0.8 }} animate={{ scale: 1 }}>
                  <ShoppingCart className="text-foreground h-3.5 w-3.5" />
                </MotionSpan>
              )}
            </MotionButton>

            {/* Favorite Toggle Button */}
            <MotionButton
              type="button"
              aria-label={favorited ? 'Remove from favorites' : 'Save to favorites'}
              onClick={handleToggleFavorite}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className={`flex items-center justify-center rounded-full border-0 p-2 shadow-none transition-all duration-200 sm:p-2.5 ${
                favorited
                  ? 'bg-rose-500 text-white'
                  : 'bg-surface hover:bg-surface/85 text-foreground hover:text-rose-500'
              }`}
            >
              <MotionDiv
                animate={favorited ? { scale: [1, 1.25, 1] } : { scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <Heart
                  className={`h-3.5 w-3.5 transition-colors ${
                    favorited
                      ? 'fill-white text-white'
                      : 'text-foreground group-hover/fav:text-rose-500'
                  }`}
                />
              </MotionDiv>
            </MotionButton>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-3 p-5">
          <div className="flex items-start justify-between gap-4">
            <h3 className="text-foreground line-clamp-1 flex-1 text-xs capitalize tracking-tight">
              {product.title}
            </h3>
            <div className="flex flex-col items-end leading-tight">
              <span className="text-primary text-xs text-red-500">
                GH₵{parseFloat(product.price).toLocaleString()}
              </span>
              {product.original_price != null &&
                computeDiscount(product.price, product.original_price) != null && (
                  <span className="text-muted-foreground text-[10px] line-through">
                    GH₵{Number(product.original_price).toLocaleString()}
                  </span>
                )}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <div className="border-border/50 h-5 w-5 overflow-hidden rounded-full border">
              {product.seller.logo_url && !logoError ? (
                <img
                  src={product.seller.logo_url}
                  alt={product.seller.store_name}
                  onError={() => setLogoError(true)}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[8px] font-normal uppercase">
                  {product.seller.store_name?.[0] || '?'}
                </div>
              )}
            </div>
            <p className="text-muted truncate text-[10px]">@{product.seller.store_link}</p>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
