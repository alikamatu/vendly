"use client";

import React from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import BrandLogo from "./BrandLogo";
import ProductRail from "./ProductRail";
import type { BrandBucket } from "@/lib/home/brand-grouping";

interface BrandSectionProps {
  brand: BrandBucket;
  rank: number;
  onViewAll: (brandName: string) => void;
}

function BrandSection({ brand, rank, onViewAll }: BrandSectionProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
      aria-labelledby={`brand-${brand.id}`}
    >
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div className="flex items-center gap-4 min-w-0">
          <BrandLogo name={brand.name} src={brand.logoUrl} />
          <div className="space-y-1 min-w-0">
            <h3
              id={`brand-${brand.id}`}
              className="text-base md:text-lg font-medium uppercase tracking-wider text-foreground truncate"
            >
              {brand.name}
            </h3>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-normal text-primary bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider whitespace-nowrap">
                {brand.totalCount} {brand.totalCount === 1 ? "Product" : "Products"}
              </span>
              <span className="text-[10px] text-muted-foreground font-medium">
                Top Rank #{rank}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={() => onViewAll(brand.name)}
          className="inline-flex items-center gap-2 px-4 md:px-5 py-2 md:py-2.5 rounded-full bg-[var(--color-surface,theme(colors.muted.DEFAULT))] border border-border hover:bg-primary/10 hover:border-primary/30 text-xs font-normal text-foreground transition-all group/cta self-start md:self-auto whitespace-nowrap"
          aria-label={`View all ${brand.name} products`}
        >
          <span>View all {brand.name}</span>
          <ArrowRight className="w-3.5 h-3.5 text-primary group-hover/cta:translate-x-1 transition-transform" />
        </button>
      </header>

      <ProductRail products={brand.products} label={brand.name} />
    </motion.section>
  );
}

export default React.memo(BrandSection);
