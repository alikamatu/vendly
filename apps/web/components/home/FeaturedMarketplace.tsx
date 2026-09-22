'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import ProductCard from '@/components/products/ProductCard';
import type { HomeProduct } from '@/hooks/useHomeData';

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
        <div className="bg-border/60 h-px flex-1" />
        <h2 className="text-primary flex items-center gap-2 text-[10px] font-medium uppercase tracking-wider">
          <Sparkles className="h-3 w-3" />
          Featured Marketplace
        </h2>
        <div className="bg-border/60 h-px flex-1" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 md:gap-4 lg:grid-cols-5">
        <AnimatePresence mode="popLayout">
          {items.map((product, idx) => (
            <motion.div
              key={product.id}
              layout
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, delay: idx * 0.02 }}
              className="h-full"
            >
              <ProductCard product={product as any} index={idx} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}
