'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Crown, MapPin, CheckCircle2, ShoppingBag } from 'lucide-react';
import type { BrowseStore } from '@/lib/api/store';

interface StoreCardProps {
  store: BrowseStore;
  index: number;
}

export default function StoreCard({ store, index }: StoreCardProps) {
  // Generate a random gradient color for the store banner if no banner is defined
  const bannerGradient = React.useMemo(() => {
    const gradients = [
      'from-rose-500/10 to-orange-500/10 border-rose-500/20',
      'from-blue-500/10 to-indigo-500/10 border-blue-500/20',
      'from-emerald-500/10 to-teal-500/10 border-emerald-500/20',
      'from-amber-500/10 to-yellow-500/10 border-amber-500/20',
      'from-purple-500/10 to-pink-500/10 border-purple-500/20',
    ];
    return gradients[index % gradients.length];
  }, [index]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.3) }}
      className="hover:border-[var(--color-accent)]/30 group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm transition-all duration-300 hover:shadow-md"
    >
      <div>
        {/* Banner area */}
        <div className={`h-16 w-full border-b bg-gradient-to-r ${bannerGradient}`} />

        {/* Profile Header section */}
        <div className="relative px-5 pb-3">
          {/* Logo container */}
          <div className="absolute -top-8 left-5 z-10">
            <div className="h-16 w-16 overflow-hidden rounded-2xl border-4 border-[var(--color-surface)] bg-[var(--color-background)] shadow-sm">
              {store.logo_url ? (
                <img
                  src={store.logo_url}
                  alt={store.store_name}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="bg-[var(--color-accent)]/10 flex h-full w-full items-center justify-center text-lg font-bold uppercase text-[var(--color-accent)]">
                  {store.store_name.slice(0, 2)}
                </div>
              )}
            </div>
          </div>

          {/* Title and Badges */}
          <div className="flex flex-col gap-1.5 pt-10">
            <div className="flex flex-wrap items-center gap-1.5">
              <Link href={`/s/${store.store_link}`}>
                <h3 className="text-base font-semibold leading-tight tracking-tight text-[var(--color-foreground)] transition-colors hover:text-[var(--color-accent)]">
                  {store.store_name}
                </h3>
              </Link>
              <div className="flex items-center gap-1">
                {store.is_pro && (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-[var(--color-accent)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow-sm">
                    <Crown className="h-2.5 w-2.5" />
                    PRO
                  </span>
                )}
                {store.is_verified && (
                  <CheckCircle2 className="h-4 w-4 fill-blue-500/10 text-blue-500" />
                )}
              </div>
            </div>

            {/* Location */}
            {store.location || store.area ? (
              <div className="flex items-center gap-1 text-[11px] text-[var(--color-muted)]">
                <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">
                  {[store.area, store.location].filter(Boolean).join(', ')}
                </span>
              </div>
            ) : (
              <div className="h-4" />
            )}

            {/* Bio description */}
            <p className="mt-2.5 line-clamp-2 min-h-[2rem] text-xs leading-relaxed text-[var(--color-muted)]">
              {store.bio || 'No description provided by this vendor.'}
            </p>
          </div>
        </div>

        {/* Product Showcase section */}
        <div className="border-[var(--color-border)]/50 bg-[var(--color-background)]/50 border-t px-5 py-4">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted)]">
              Product Showcase
            </h4>
            <span className="text-[10px] font-medium text-[var(--color-muted)]">
              {store.products_count} {store.products_count === 1 ? 'item' : 'items'}
            </span>
          </div>

          {store.products && store.products.length > 0 ? (
            <div className="grid grid-cols-3 gap-2.5">
              {store.products.slice(0, 3).map((product) => (
                <Link
                  key={product.id}
                  href={`/product/${product.id}`}
                  className="group/item border-[var(--color-border)]/50 relative block aspect-square overflow-hidden rounded-xl border bg-[var(--color-surface)]"
                >
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.title}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover/item:scale-110"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-[var(--color-surface)] text-[10px] text-[var(--color-muted)]">
                      <ShoppingBag className="h-4 w-4 opacity-30" />
                    </div>
                  )}
                  {/* Subtle price tag overlay */}
                  <div className="absolute bottom-1 right-1 rounded-md bg-black/70 px-1.5 py-0.5 text-[9px] font-semibold text-white backdrop-blur-md">
                    ₵
                    {product.price.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                </Link>
              ))}
              {/* If fewer than 3 products, pad with placeholders to keep card size consistent */}
              {Array.from({ length: Math.max(0, 3 - store.products.length) }).map((_, idx) => (
                <div
                  key={`pad-${idx}`}
                  className="border-[var(--color-border)]/60 bg-[var(--color-surface)]/20 flex aspect-square items-center justify-center rounded-xl border border-dashed"
                >
                  <span className="text-[9px] font-medium text-[var(--color-muted)] opacity-30">
                    Empty
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="border-[var(--color-border)]/60 bg-[var(--color-surface)]/20 flex min-h-[4.75rem] flex-col items-center justify-center gap-1 rounded-xl border border-dashed py-4">
              <ShoppingBag className="h-4 w-4 text-[var(--color-muted)] opacity-40" />
              <span className="text-[10px] font-medium text-[var(--color-muted)] opacity-60">
                No active products
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Visit Store Button */}
      <div className="mt-2 p-5 pt-0">
        <Link href={`/s/${store.store_link}`}>
          <button className="hover:bg-[var(--color-primary)]/90 inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-[var(--color-primary)] text-xs font-semibold text-[var(--color-background)] shadow-sm transition-all duration-200 hover:shadow active:scale-[0.98]">
            Visit Store
          </button>
        </Link>
      </div>
    </motion.div>
  );
}
