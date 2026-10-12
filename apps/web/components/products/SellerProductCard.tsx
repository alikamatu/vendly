'use client';

import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Flame,
  Sparkles,
  AlertTriangle,
  Edit2,
  ExternalLink,
  Package,
  Eye,
  Sliders,
  MoreHorizontal,
  Copy,
  Trash2,
  CircleDot,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import DropdownMenu, { DropdownMenuItem } from '@/components/ui/DropdownMenu';

interface SellerProductCardProps {
  product: {
    id: string;
    title: string;
    price: string | number;
    original_price?: string | number | null;
    currency?: string;
    image_urls: string[];
    video_url?: string | null;
    status: string;
    is_featured?: boolean;
    quantity_available: number;
    category: string;
    brand?: string | null;
    created_at: string;
    views_count?: number;
  };
  promotionState?: 'idle' | 'verifying' | 'payment_required' | 'failed';
  index: number;
  onQuickStatusToggle?: (id: string, currentStatus: string) => void;
  onDelete?: (id: string) => void;
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || 'https://verndly.com';

export default function SellerProductCard({
  product,
  promotionState = 'idle',
  index,
  onQuickStatusToggle,
  onDelete,
}: SellerProductCardProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [imageError, setImageError] = useState(false);

  const handleMouseEnter = () => {
    if (product.video_url && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  };

  const handleMouseLeave = () => {
    if (product.video_url && videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  const qty = Number(product.quantity_available ?? 0);
  const isOutOfStock = qty === 0;
  const isLowStock = qty > 0 && qty <= 5;
  const isActive = product.status === 'active';

  const numPrice = typeof product.price === 'string' ? parseFloat(product.price) : product.price;
  const numOriginal = product.original_price != null ? Number(product.original_price) : null;
  const hasDiscount = numOriginal != null && numOriginal > numPrice;

  const copyPublicLink = async () => {
    try {
      await navigator.clipboard.writeText(`${SITE_URL}/product/${product.id}`);
      toast.success('Product link copied to clipboard.');
    } catch {
      toast.error('Failed to copy link.');
    }
  };

  const menuItems: DropdownMenuItem[] = [
    {
      label: 'Manage Hub',
      icon: <Sliders className="h-3.5 w-3.5" />,
      onClick: () => {
        router.push(`/dashboard/products/${product.id}`);
      },
    },
    {
      label: 'Edit Details',
      icon: <Edit2 className="h-3.5 w-3.5" />,
      onClick: () => {
        router.push(`/dashboard/products/edit/${product.id}`);
      },
    },
    {
      label: 'Copy Public Link',
      icon: <Copy className="h-3.5 w-3.5" />,
      onClick: copyPublicLink,
    },
    {
      label: isActive ? 'Set as Draft' : 'Publish as Active',
      icon: <CircleDot className="h-3.5 w-3.5" />,
      onClick: () => onQuickStatusToggle?.(product.id, product.status),
    },
    {
      label: 'Delete',
      icon: <Trash2 className="h-3.5 w-3.5" />,
      variant: 'danger',
      divider: true,
      onClick: () => onDelete?.(product.id),
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: Math.min(index * 0.02, 0.2) }}
      className="group"
    >
      <div className="hover:border-[var(--color-foreground)]/25 relative rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 transition-colors sm:p-4">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          {/* Media Thumbnail */}
          <Link
            href={`/dashboard/products/${product.id}`}
            className="group/media relative block h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] focus:outline-none sm:h-24 sm:w-24"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            aria-label={`Manage ${product.title}`}
          >
            {product.video_url ? (
              <video
                ref={videoRef}
                src={product.video_url}
                muted
                loop
                playsInline
                className="h-full w-full object-cover transition-transform duration-200 group-hover/media:scale-105"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={
                  !imageError && product.image_urls?.[0]
                    ? product.image_urls[0]
                    : '/placeholder-product.png'
                }
                alt={product.title}
                loading="lazy"
                decoding="async"
                onError={() => setImageError(true)}
                className="h-full w-full object-cover transition-transform duration-200 group-hover/media:scale-105"
              />
            )}

            {product.is_featured && (
              <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-0.5 rounded-full bg-amber-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
                <Flame className="h-2.5 w-2.5 fill-current" />
                HOT
              </span>
            )}
          </Link>

          {/* Product Details */}
          <div className="w-full min-w-0 flex-1 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link
                  href={`/dashboard/products/${product.id}`}
                  className="block transition-colors focus:outline-none group-hover:text-[var(--color-accent)]"
                >
                  <h3 className="line-clamp-1 text-sm font-semibold text-[var(--color-foreground)] sm:text-base">
                    {product.title}
                  </h3>
                </Link>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-[var(--color-muted)]">
                  <span className="truncate">{product.category}</span>
                  {product.brand && (
                    <>
                      <span className="opacity-40">·</span>
                      <span className="truncate">{product.brand}</span>
                    </>
                  )}
                </p>
              </div>

              {/* Status Pill */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  onQuickStatusToggle?.(product.id, product.status);
                }}
                title={`Click to switch to ${isActive ? 'draft' : 'active'}`}
                className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider transition-colors ${
                  isActive
                    ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400'
                    : 'border-amber-500/20 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 dark:text-amber-400'
                }`}
              >
                {product.status}
              </button>
            </div>

            {/* Price & Stock Chips */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-baseline gap-1.5">
                <span className="text-base font-bold tabular-nums text-[var(--color-foreground)] sm:text-lg">
                  {product.currency || 'GH₵'}
                  {numPrice.toLocaleString()}
                </span>
                {hasDiscount && (
                  <span className="text-xs tabular-nums text-[var(--color-muted)] line-through">
                    {product.currency || 'GH₵'}
                    {numOriginal.toLocaleString()}
                  </span>
                )}
              </div>

              {/* Stock Indicator */}
              <span
                className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                  isOutOfStock
                    ? 'border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400'
                    : isLowStock
                      ? 'border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                      : 'border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-foreground)]'
                }`}
              >
                <Package className="h-3 w-3" />
                {isOutOfStock ? 'Sold Out' : `${qty} in stock`}
              </span>

              {/* Promotion Alerts */}
              {promotionState === 'verifying' && (
                <span className="inline-flex items-center gap-1 rounded-md border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-blue-500">
                  <Sparkles className="h-3 w-3 animate-spin" />
                  Verifying boost
                </span>
              )}
              {promotionState === 'failed' && (
                <span className="inline-flex items-center gap-1 rounded-md border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-red-500">
                  <AlertTriangle className="h-3 w-3" />
                  Boost failed
                </span>
              )}

              {/* Views Count */}
              {product.views_count !== undefined && product.views_count > 0 && (
                <span className="ml-auto inline-flex items-center gap-1 text-xs text-[var(--color-muted)]">
                  <Eye className="h-3.5 w-3.5" />
                  {product.views_count.toLocaleString()}
                </span>
              )}
            </div>

            {/* Quick Actions Row */}
            <div className="border-[var(--color-border)]/50 flex items-center gap-2 border-t pt-1">
              <Link
                href={`/dashboard/products/${product.id}`}
                className="hover:bg-[var(--color-border)]/20 inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-1.5 text-xs font-medium text-[var(--color-foreground)] transition-colors"
              >
                <Sliders className="h-3.5 w-3.5 text-[var(--color-accent)]" />
                Manage Hub
              </Link>
              <Link
                href={`/dashboard/products/edit/${product.id}`}
                className="hover:bg-[var(--color-border)]/20 inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium text-[var(--color-muted)] transition-colors hover:text-[var(--color-foreground)]"
              >
                <Edit2 className="h-3.5 w-3.5" />
                Edit
              </Link>
              <Link
                href={`/product/${product.id}`}
                target="_blank"
                rel="noreferrer"
                className="hover:bg-[var(--color-border)]/20 inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-medium text-[var(--color-muted)] transition-colors hover:text-[var(--color-foreground)]"
                title="View public listing in new tab"
              >
                <Eye className="h-3.5 w-3.5" />
                <ExternalLink className="h-3 w-3 opacity-60" />
              </Link>

              {/* Dropdown Menu for Secondary Actions */}
              <div className="ml-auto">
                <DropdownMenu
                  trigger={
                    <button
                      type="button"
                      className="hover:bg-[var(--color-border)]/20 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-1.5 text-[var(--color-muted)] transition-colors hover:text-[var(--color-foreground)]"
                      title="More actions"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  }
                  items={menuItems}
                  align="right"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
