"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";
import ProductCard from "@/components/products/ProductCard";
import type { HomeProduct } from "@/hooks/useHomeData";

interface FeaturedMarketplaceProps {
  products: HomeProduct[];
  limit?: number;
}

export default function FeaturedMarketplace({ products, limit = 10 }: FeaturedMarketplaceProps) {
  const items = products.slice(0, limit);
  if (!items.length) return null;

  return (
    <section className="space-y-8">
      <div className="flex items-center gap-4">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/20 to-primary/40" />
        <h2 className="text-[10px] uppercase tracking-wider text-primary font-medium flex items-center gap-2">
          <Sparkles className="w-3 h-3" />
          Featured Marketplace
        </h2>
        <div className="h-px flex-1 bg-gradient-to-l from-transparent via-primary/20 to-primary/40" />
      </div>

      <div className="columns-2 md:columns-3 lg:columns-4 gap-4">
        <AnimatePresence mode="popLayout">
          {items.map((product, idx) => (
            <motion.div
              key={product.id}
              layout
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, delay: idx * 0.02 }}
              className="break-inside-avoid mb-4"
            >
              <ProductCard product={product as any} index={idx} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}
