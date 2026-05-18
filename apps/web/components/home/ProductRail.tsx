"use client";

import React, { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ProductCard from "@/components/products/ProductCard";
import type { HomeProduct } from "@/hooks/useHomeData";

interface ProductRailProps {
  products: HomeProduct[];
  /** Optional accessible label, e.g. brand name */
  label?: string;
}

/**
 * Horizontally scrolling rail of ProductCards.
 * - Mobile: snap-x carousel, touch-friendly.
 * - Desktop: chevron buttons appear on hover, smooth scroll.
 */
export default function ProductRail({ products, label }: ProductRailProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  const scroll = (dir: "left" | "right") => {
    const el = ref.current;
    if (!el) return;
    const dx = dir === "left" ? -el.clientWidth * 0.8 : el.clientWidth * 0.8;
    el.scrollBy({ left: dx, behavior: "smooth" });
  };

  if (!products.length) return null;

  return (
    <div className="relative group/rail">
      <div className="absolute right-0 -top-12 z-10 hidden lg:flex gap-2 opacity-0 group-hover/rail:opacity-100 transition-opacity">
        <button
          onClick={() => scroll("left")}
          aria-label="Scroll left"
          className="p-2.5 rounded-full bg-background/95 backdrop-blur-md border border-border hover:bg-primary/10 hover:text-primary transition-all shadow-md"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => scroll("right")}
          aria-label="Scroll right"
          className="p-2.5 rounded-full bg-background/95 backdrop-blur-md border border-border hover:bg-primary/10 hover:text-primary transition-all shadow-md"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div
        ref={ref}
        role="region"
        aria-label={label ? `${label} products` : undefined}
        className="flex gap-3 md:gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-4 -mx-4 px-4 md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      >
        {products.map((product, idx) => (
          <div
            key={product.id}
            className="snap-start flex-shrink-0 w-[58vw] xs:w-[46vw] sm:w-[260px] md:w-[270px] lg:w-[280px]"
          >
            <ProductCard product={product as any} index={idx} />
          </div>
        ))}
      </div>
    </div>
  );
}
