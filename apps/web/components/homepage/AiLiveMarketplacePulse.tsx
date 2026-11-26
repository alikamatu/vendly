'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, ShoppingBag, Store } from 'lucide-react';
import { getProductPath } from '@/lib/product-slug';
import { slugifyCategory } from '@/lib/content/categories';
import { formatPriceGhs, type HomepageProductPreview, type HomepageVendorPreview } from './types';

interface AiLiveMarketplacePulseProps {
  featuredProducts: HomepageProductPreview[];
  categories: Array<{ id: string; name: string }>;
  topVendors: HomepageVendorPreview[];
}

export default function AiLiveMarketplacePulse({
  featuredProducts,
  categories,
  topVendors,
}: AiLiveMarketplacePulseProps) {
  if (featuredProducts.length === 0 && categories.length === 0) return null;

  return (
    <section
      aria-labelledby="live-marketplace-pulse-heading"
      className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:px-8 md:py-24"
    >
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-red-600">
            Live Inventory
          </p>
          <h2
            id="live-marketplace-pulse-heading"
            className="text-3xl font-semibold tracking-[-0.035em] sm:text-5xl"
          >
            Discover verified stores right now.
          </h2>
        </div>
        <Link
          href="/products"
          className="text-foreground inline-flex items-center gap-1.5 text-sm font-semibold hover:opacity-75"
        >
          <span>Explore full catalog</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Category Quick Pills */}
      {categories.length > 0 && (
        <div className="mt-8 flex flex-wrap gap-2">
          {categories.slice(0, 12).map((cat) => (
            <Link
              key={cat.id}
              href={`/categories/${slugifyCategory(cat.name)}`}
              className="bg-surface text-foreground hover:bg-foreground hover:text-background rounded-full px-4 py-2 text-xs font-semibold transition-colors"
            >
              {cat.name}
            </Link>
          ))}
        </div>
      )}

      {/* Borderless Live Product Showcase Grid */}
      {featuredProducts.length > 0 && (
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4">
          {featuredProducts.slice(0, 8).map((product) => {
            const thumb = product.image_urls?.[0];
            return (
              <Link
                key={product.id}
                href={getProductPath(product)}
                className="bg-surface hover:bg-foreground/[0.06] group flex flex-col overflow-hidden rounded-3xl p-3 transition-colors sm:p-4"
              >
                <div className="bg-background aspect-square w-full overflow-hidden rounded-2xl">
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumb}
                      alt={product.title}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="text-muted flex h-full w-full items-center justify-center">
                      <ShoppingBag className="h-6 w-6" />
                    </div>
                  )}
                </div>
                <div className="mt-3 space-y-1 px-0.5">
                  <p className="text-muted truncate text-[11px] font-medium">
                    {product.seller?.store_name || product.category}
                  </p>
                  <h3 className="text-foreground line-clamp-1 text-xs font-semibold sm:text-sm">
                    {product.title}
                  </h3>
                  <p className="text-foreground pt-0.5 text-sm font-bold">
                    {formatPriceGhs(product.price)}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Verified Storefront Pills */}
      {topVendors.length > 0 && (
        <div className="mt-8 flex flex-wrap items-center gap-2.5">
          <span className="text-muted mr-1 inline-flex items-center gap-1.5 text-xs font-semibold">
            <Store className="h-3.5 w-3.5" />
            Verified storefronts:
          </span>
          {topVendors.map((vendor) => (
            <Link
              key={vendor.id}
              href={`/s/${vendor.store_link}`}
              className="bg-surface text-foreground hover:bg-foreground hover:text-background inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors"
            >
              {vendor.logo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={vendor.logo_url}
                  alt={vendor.store_name}
                  className="h-4 w-4 rounded-full object-cover"
                />
              )}
              <span>{vendor.store_name}</span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
