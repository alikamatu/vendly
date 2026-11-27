'use client';

import React from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import ProductCard from '@/components/products/ProductCard';
import { filterRailProducts } from '@/lib/product-visibility';
import type { HomeProduct } from '@/hooks/useHomeData';

interface FeaturedMarketplaceProps {
  products: HomeProduct[];
  limit?: number;
}

export default function FeaturedMarketplace({ products, limit = 10 }: FeaturedMarketplaceProps) {
  const items = filterRailProducts(products).slice(0, limit);
  if (!items.length) return null;

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-primary text-[10px] font-medium uppercase tracking-wider">
          Featured Marketplace
        </h2>
        <Link
          href="/products"
          className="text-muted hover:text-foreground inline-flex shrink-0 items-center gap-1 text-xs font-semibold transition-colors"
        >
          <span>Browse Shop</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Free-flowing variable-height masonry with thin gaps matching the Shop listing style */}
      <div className="columns-2 gap-1.5 sm:columns-3 sm:gap-2 md:columns-4 lg:columns-5">
        <AnimatePresence mode="popLayout">
          {items.map((product, idx) => (
            <motion.div
              key={product.id}
              layout
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.28, delay: Math.min(idx * 0.015, 0.2) }}
              className="mb-1.5 break-inside-avoid sm:mb-2"
            >
              <ProductCard product={product as any} index={idx % 8} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}
