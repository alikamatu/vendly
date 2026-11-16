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
    <section className="space-y-8">
      <SectionHeader eyebrow={eyebrow} title={title} description={description} action={action} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 md:gap-4 lg:grid-cols-5">
        {items.map((product, idx) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.3, delay: Math.min(idx * 0.015, 0.25) }}
          >
            <ProductCard product={product as any} index={idx} />
          </motion.div>
        ))}
      </div>
    </section>
  );
}
