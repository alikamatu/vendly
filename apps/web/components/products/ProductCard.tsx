"use client";

import React from "react";
import { motion } from "framer-motion";
import { ShoppingCart, ExternalLink } from "lucide-react";
import Link from "next/link";
import Card from "@/components/ui/Card";

interface ProductCardProps {
  product: {
    id: string;
    title: string;
    price: string;
    image_urls: string[];
    seller: {
      store_name: string;
      logo_url?: string;
      store_link: string;
    };
  };
  index: number;
}

export default function ProductCard({ product, index }: ProductCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className="break-inside-avoid mb-6"
    >
      <Card className="group border-none shadow-none rounded-[2rem] overflow-hidden p-0 bg-transparent" hoverEffect={false}>
        <Link href={`/product/${product.id}`} className="block">
          <div className="relative">
            {/* Product Image */}
            <div className="relative w-full overflow-hidden rounded-[1.5rem]">
              <img 
                src={product.image_urls?.[0] || "/placeholder-product.png"} 
                alt={product.title}
                className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105"
              />
              {/* Overlay Gradient */}
              <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              {/* Quick Actions Overlay */}
              <div className="absolute inset-x-3 bottom-3 flex items-center justify-between translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    // Add to cart logic here
                  }}
                  className="p-3 rounded-2xl bg-white/90 backdrop-blur-md text-black hover:scale-110 active:scale-95 transition-transform shadow-lg"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                </button>
                <div 
                  onClick={(e) => e.stopPropagation()}
                  className="pointer-events-auto"
                >
                  <Link 
                    href={`/s/${product.seller.store_link}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/40 backdrop-blur-md text-white text-[9px] font-bold border border-white/10 hover:bg-black/60 transition-colors"
                  >
                    View Store <ExternalLink className="w-2.5 h-2.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </Link>

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
