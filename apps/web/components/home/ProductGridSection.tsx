'use client';

import React from 'react';
import { motion } from 'framer-motion';
import ProductCard from '@/components/products/ProductCard';
import SectionHeader from './SectionHeader';
import type { HomeProduct } from '@/hooks/useHomeData';

interface ProductGridSectionProps {
  products: HomeProduct[];
  title: React.ReactNode;
  eyebrow?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  limit?: number;
  emptyState?: React.ReactNode | null;
}

export default function ProductGridSection({
  products,
  title,
  eyebrow,
  description,
  action,
  limit,
  emptyState = null,
}: ProductGridSectionProps) {
  const items = limit ? products.slice(0, limit) : products;
  if (!items.length) return emptyState as any;

  return (
    <section className="space-y-6">
      <SectionHeader eyebrow={eyebrow} title={title} description={description} action={action} />

      {/* Free-flowing variable-height masonry with thin gaps matching the Shop listing style */}
      <div className="columns-2 gap-1.5 sm:columns-3 sm:gap-2 md:columns-4 lg:columns-5">
        {items.map((product, idx) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.28, delay: Math.min(idx * 0.012, 0.2) }}
            className="mb-1.5 break-inside-avoid sm:mb-2"
          >
            <ProductCard product={product as any} index={idx % 8} />
          </motion.div>
        ))}
      </div>
    </section>
  );
}
