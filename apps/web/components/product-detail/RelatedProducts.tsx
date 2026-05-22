"use client";

import React, { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import ProductCard from "@/components/products/ProductCard";
import { productApi, BrowseProduct } from "@/lib/api/product";

interface RelatedProductsProps {
  category?: string | null;
  excludeId: string;
  limit?: number;
}

export default function RelatedProducts({
  category,
  excludeId,
  limit = 8,
}: RelatedProductsProps) {
  const [items, setItems] = useState<BrowseProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    productApi
      .browseProducts({
        category: category || undefined,
        limit: limit + 1, // grab one extra to absorb the current product
        sort: "popular",
      })
      .then((res) => {
        if (cancelled) return;
        setItems(res.data.filter((p) => p.id !== excludeId).slice(0, limit));
      })
      .catch(() => {
        if (cancelled) return;
        setItems([]);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [category, excludeId, limit]);

  if (!loading && items.length === 0) return null;

  return (
    <section className="mt-16 md:mt-24 space-y-6">
      <header className="flex items-end justify-between gap-3 flex-wrap">
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
            Discovery
          </p>
          <h2 className="text-xl md:text-2xl font-extrabold tracking-tight">
            You may also like
          </h2>
        </div>
        {category && (
          <Link
            href={`/products?category=${encodeURIComponent(category)}`}
            className="inline-flex items-center gap-1.5 px-4 h-10 rounded-xl border border-border/50 text-[11px] font-black uppercase tracking-widest text-foreground hover:bg-surface transition-colors"
          >
            See all {category}
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </header>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-3xl bg-surface/40 border border-border/30 overflow-hidden"
            >
              <div
                className="w-full aspect-[4/5] bg-border/30 animate-pulse"
              />
              <div className="p-4 space-y-2">
                <div className="h-3 w-3/4 rounded bg-border/30 animate-pulse" />
                <div className="h-3 w-1/2 rounded bg-border/30 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Mobile: horizontal snap carousel for predictable layout.
        // Desktop: even grid (no masonry — avoids the column overflow glitch).
        <>
          <div className="md:hidden flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-smooth -mx-4 px-4 pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {items.map((p, idx) => (
              <div
                key={p.id}
                className="snap-start flex-shrink-0 w-[62vw] xs:w-[48vw] sm:w-[260px]"
              >
                <ProductCard product={p as any} index={idx} />
              </div>
            ))}
          </div>
          <div className="hidden md:grid grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map((p, idx) => (
              <div key={p.id}>
                <ProductCard product={p as any} index={idx} />
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
