"use client";

import React from "react";
import { motion } from "framer-motion";
import ProductCard from "@/components/products/ProductCard";
import SectionHeader from "./SectionHeader";
import type { HomeProduct } from "@/hooks/useHomeData";

interface ProductGridSectionProps {
  products: HomeProduct[];
  title: React.ReactNode;
  eyebrow?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  limit?: number;
  /** Layout strategy. `masonry` uses CSS columns; `grid` uses a fixed grid. */
  layout?: "masonry" | "grid";
  emptyState?: React.ReactNode | null;
}

export default function ProductGridSection({
  products,
  title,
  eyebrow,
  description,
  action,
  limit,
  layout = "masonry",
  emptyState = null,
}: ProductGridSectionProps) {
  const items = limit ? products.slice(0, limit) : products;
  if (!items.length) return emptyState as any;

  return (
    <section className="space-y-8">
      <SectionHeader eyebrow={eyebrow} title={title} description={description} action={action} />

      {layout === "masonry" ? (
        <div className="columns-2 md:columns-3 lg:columns-4 gap-4">
          {items.map((product, idx) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.3, delay: Math.min(idx * 0.015, 0.25) }}
              className="break-inside-avoid mb-4"
            >
              <ProductCard product={product as any} index={idx} />
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
          {items.map((product, idx) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.3, delay: Math.min(idx * 0.015, 0.25) }}
            >
              <ProductCard product={product as any} index={idx} />
            </motion.div>
          ))}
        </div>
      )}
    </section>
  );
}
