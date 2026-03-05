"use client";

import React, { useRef, useState } from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { ShoppingCart, ExternalLink, Check } from "lucide-react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import { useCart } from "@/lib/cart-context";

interface ProductCardProps {
  product: {
    id: string;
    title: string;
    price: string;
    image_urls: string[];
    video_url?: string | null;
    seller: {
      store_name: string;
      logo_url?: string;
      store_link: string;
    };
  };
  index: number;
}

export default function ProductCard({ product, index }: ProductCardProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      productId: String(product.id),
      title: product.title,
      price: typeof product.price === "number" ? String(product.price) : (product.price ?? "0"),
      imageUrl: product.image_urls?.[0] ?? "/placeholder-product.png",
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
      className="break-inside-avoid mb-6"
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
              {/* Overlay Gradient */}
              <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
          </Link>
          
          {/* Quick Actions Overlay */}
          <div className="absolute inset-x-3 bottom-3 flex items-center justify-between translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none">
            <motion.button
              {...({ 
                type: "button",
                onClick: handleAddToCart,
                whileTap: { scale: 0.92 },
                className: "p-3 rounded-2xl bg-white/90 backdrop-blur-md text-black hover:scale-110 active:scale-95 transition-transform shadow-lg pointer-events-auto"
              } as HTMLMotionProps<"button">)}
            >
              {added ? (
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400 }}>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                </motion.span>
              ) : (
                <ShoppingCart className="w-3.5 h-3.5" />
              )}
            </motion.button>
            <div className="pointer-events-auto">
              <Link 
                href={`/s/${product.seller.store_link}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/40 backdrop-blur-md text-white text-[9px] font-bold border border-white/10 hover:bg-black/60 transition-colors"
              >
                View Store <ExternalLink className="w-2.5 h-2.5" />
              </Link>
            </div>
          </div>
        </div>


        {/* Content */}
        <div className="p-5 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <h3 className="text-xs font-black text-foreground line-clamp-1 flex-1 uppercase tracking-tight">
              {product.title}
            </h3>
            <span className="text-xs text-red-500 font-bold text-primary">
              GH₵{parseFloat(product.price).toLocaleString()}
            </span>
          </div>

          <div className="flex items-center gap-2 pt-1">
             <div className="w-5 h-5 rounded-full overflow-hidden border border-border/50">
               {product.seller.logo_url ? (
                 <img src={product.seller.logo_url} className="w-full h-full object-cover" />
               ) : (
                 <div className="w-full h-full flex items-center justify-center text-[8px] font-bold uppercase">
                    {product.seller.store_name[0]}
                 </div>
               )}
             </div>
             <p className="text-[10px] text-muted font-bold truncate">@{product.seller.store_link}</p>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
