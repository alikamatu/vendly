'use client';

import React from 'react';
import Link from 'next/link';
import { Sparkles, Play, BadgePercent } from 'lucide-react';
import { getProductPath } from '@/lib/product-slug';
import type { BrowseProduct } from '@/lib/api/product';

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
      href={getProductPath(product)}
      className="hover:border-[var(--color-accent)]/40 hover:bg-[var(--color-surface)]/80 group flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 transition-colors md:gap-4 md:p-4"
    >
      <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] md:h-20 md:w-20">
        {product.image_urls?.[0] ? (
          <img
            src={product.image_urls[0]}
            alt={product.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="bg-[var(--color-border)]/40 h-full w-full" />
        )}
        {product.video_url && (
          <span className="absolute bottom-1 right-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white">
            <Play className="h-2.5 w-2.5" fill="currentColor" />
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-start gap-2">
          <h3 className="flex-1 truncate text-sm font-normal text-[var(--color-foreground)]">
            {product.title}
          </h3>
          {product.is_featured && (
            <span className="inline-flex flex-shrink-0 items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[9px] font-medium uppercase text-amber-600">
              <Sparkles className="h-2.5 w-2.5" />
              Hot
            </span>
          )}
          {discount != null && (
            <span className="inline-flex flex-shrink-0 items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[9px] font-medium uppercase text-emerald-600">
              <BadgePercent className="h-2.5 w-2.5" />−{discount}%
            </span>
          )}
        </div>
        <p className="truncate text-[11px] text-[var(--color-muted)]">
          @{product.seller.store_link}
          {product.category && (
            <span>
              {' '}
              · <span className="capitalize">{product.category}</span>
            </span>
          )}
        </p>
        {product.description && (
          <p className="line-clamp-1 text-[11px] text-[var(--color-muted)]">
            {product.description}
          </p>
        )}
      </div>

      <div className="flex-shrink-0 space-y-0.5 text-right">
        <p className="text-sm font-medium tabular-nums text-[var(--color-foreground)]">
          GH₵{Number(product.price).toLocaleString()}
        </p>
        {product.original_price != null && discount != null && (
          <p className="text-[10px] tabular-nums text-[var(--color-muted)] line-through">
            GH₵{Number(product.original_price).toLocaleString()}
          </p>
        )}
      </div>
    </Link>
  );
}

export default React.memo(ProductListRow);
