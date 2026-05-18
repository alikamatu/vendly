"use client";

import React from "react";
import Link from "next/link";
import { Sparkles, Play, BadgePercent } from "lucide-react";
import type { BrowseProduct } from "@/lib/api/product";

interface ProductListRowProps {
  product: BrowseProduct;
}

function discountPercent(p: BrowseProduct): number | null {
  if (p.original_price == null) return null;
  const orig = Number(p.original_price);
  const cur = Number(p.price);
  if (!Number.isFinite(orig) || !Number.isFinite(cur) || orig <= cur || orig <= 0) return null;
  return Math.round(((orig - cur) / orig) * 100);
}

function ProductListRow({ product }: ProductListRowProps) {
  const discount = discountPercent(product);
  return (
    <Link
      href={`/product/${product.id}`}
      className="group flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-accent)]/40 hover:bg-[var(--color-surface)]/80 transition-colors"
    >
      <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden bg-[var(--color-background)] flex-shrink-0 border border-[var(--color-border)]">
        {product.image_urls?.[0] ? (
          <img
            src={product.image_urls[0]}
            alt={product.title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-[var(--color-border)]/40" />
        )}
        {product.video_url && (
          <span className="absolute bottom-1 right-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-black/70 text-white">
            <Play className="w-2.5 h-2.5" fill="currentColor" />
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-start gap-2">
          <h3 className="text-sm font-bold text-[var(--color-foreground)] truncate flex-1">
            {product.title}
          </h3>
          {product.is_featured && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-500/15 text-amber-600 flex-shrink-0">
              <Sparkles className="w-2.5 h-2.5" />
              Hot
            </span>
          )}
          {discount != null && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/15 text-emerald-600 flex-shrink-0">
              <BadgePercent className="w-2.5 h-2.5" />−{discount}%
            </span>
          )}
        </div>
        <p className="text-[11px] text-[var(--color-muted)] truncate">
          @{product.seller.store_link}
          {product.category && (
            <span> · <span className="capitalize">{product.category}</span></span>
          )}
        </p>
        {product.description && (
          <p className="text-[11px] text-[var(--color-muted)] line-clamp-1">
            {product.description}
          </p>
        )}
      </div>

      <div className="text-right flex-shrink-0 space-y-0.5">
        <p className="text-sm font-black text-[var(--color-foreground)] tabular-nums">
          GH₵{Number(product.price).toLocaleString()}
        </p>
        {product.original_price != null && discount != null && (
          <p className="text-[10px] text-[var(--color-muted)] line-through tabular-nums">
            GH₵{Number(product.original_price).toLocaleString()}
          </p>
        )}
      </div>
    </Link>
  );
}

export default React.memo(ProductListRow);
