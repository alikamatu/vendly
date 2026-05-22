"use client";

import React, { useRef, useMemo } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, ArrowRight, Sparkles } from "lucide-react";
import ProductCard from "./ProductCard";

interface BrandShowcaseProps {
  products: any[];
  brands: any[];
  onBrandSelect: (brandName: string) => void;
}

export default function BrandShowcase({ products, brands, onBrandSelect }: BrandShowcaseProps) {
  // Rank and group top brands dynamically based on active products count
  const topBrandsData = useMemo(() => {
    const counts: Record<string, any[]> = {};
    
    // Group products by brand
    products.forEach((product) => {
      const brandName = product.brand;
      if (brandName) {
        if (!counts[brandName]) {
          counts[brandName] = [];
        }
        counts[brandName].push(product);
      }
    });

    // Sort brands by product count descending
    return Object.entries(counts)
      .map(([name, brandProducts]) => {
        // Find matching backend Brand record
        const matchingBrand = brands.find(
          (b) => b.name.toLowerCase() === name.toLowerCase()
        );
        return {
          name,
          products: brandProducts.slice(0, 10), // Limit to 10 products
          totalCount: brandProducts.length,
          logoUrl: matchingBrand?.image_url || null,
          id: matchingBrand?.id || name,
        };
      })
      .filter((b) => b.totalCount > 0)
      .sort((a, b) => b.totalCount - a.totalCount)
      .slice(0, 4); // Top 4 brands with the most products
  }, [products, brands]);

  // Ref-based scrolling for desktop arrow controls
  const scrollContainerRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const handleScroll = (brandName: string, direction: "left" | "right") => {
    const el = scrollContainerRefs.current[brandName];
    if (el) {
      const scrollAmt = direction === "left" ? -320 : 320;
      el.scrollBy({ left: scrollAmt, behavior: "smooth" });
    }
  };

  if (topBrandsData.length === 0) return null;

  return (
    <section className="space-y-16 py-10 relative">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-primary font-medium">
          <Sparkles className="w-3.5 h-3.5 animate-pulse" />
          Vendly Collections
        </div>
        <h2 className="text-2xl md:text-4xl uppercase tracking-tight font-medium text-foreground">
          Top Vendly Brands
        </h2>
        <p className="text-xs text-muted max-w-md">
          Explore highly rated brands chosen by independent sellers, categorized dynamically.
        </p>
      </div>

      <div className="space-y-16">
        {topBrandsData.map((brand, brandIdx) => (
          <motion.div
            key={brand.id}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: brandIdx * 0.1 }}
            className="space-y-6 group/section relative"
          >
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-4">
              <div className="flex items-center gap-4">
                {/* Brand Logo Avatar */}
                <div className="relative w-12 h-12 md:w-14 md:h-14 rounded-2xl overflow-hidden border border-border/80 bg-background flex-shrink-0 flex items-center justify-center shadow-md shadow-primary/5 transition-transform duration-500 group-hover/section:scale-105">
                  {brand.logoUrl ? (
                    <img
                      src={brand.logoUrl}
                      alt={brand.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center text-xs font-medium uppercase text-primary italic">
                      {brand.name.slice(0, 2)}
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <h3 className="text-md md:text-lg font-medium uppercase tracking-wider text-foreground">
                    {brand.name}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-normal text-primary bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      {brand.totalCount} {brand.totalCount === 1 ? "Product" : "Products"}
                    </span>
                    <span className="text-[10px] text-muted font-medium">Top Rank #{brandIdx + 1}</span>
                  </div>
                </div>
              </div>

              {/* View All CTA Button */}
              <button
                onClick={() => onBrandSelect(brand.name)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] hover:bg-[var(--color-border)]/30 hover:border-[var(--color-accent)]/30 text-xs font-normal text-[var(--color-foreground)] transition-all duration-300 group hover:shadow-lg self-start md:self-auto"
              >
                <span>View All {brand.name}</span>
                <ArrowRight className="w-3.5 h-3.5 text-primary group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            {/* Desktop Scroller Arrows */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 z-10 hidden lg:flex gap-2 opacity-0 group-hover/section:opacity-100 transition-opacity duration-300">
              <button
                onClick={() => handleScroll(brand.name, "left")}
                className="p-3.5 rounded-2xl bg-background/90 backdrop-blur-md border border-border/80 hover:bg-primary/10 hover:text-primary transition-all shadow-xl hover:-translate-x-0.5"
                title="Scroll Left"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleScroll(brand.name, "right")}
                className="p-3.5 rounded-2xl bg-background/90 backdrop-blur-md border border-border/80 hover:bg-primary/10 hover:text-primary transition-all shadow-xl hover:translate-x-0.5"
                title="Scroll Right"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Snapping Products Carousel */}
            <div
              ref={(ref) => {
                scrollContainerRefs.current[brand.name] = ref;
              }}
              className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-4 px-2 -mx-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            >
              {brand.products.map((product, idx) => (
                <div
                  key={product.id}
                  className="snap-start flex-shrink-0 w-[240px] sm:w-[260px] md:w-[280px]"
                >
                  <ProductCard product={product} index={idx} />
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
