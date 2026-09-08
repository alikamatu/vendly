'use client';

import React, { useRef } from 'react';
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

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || 'https://verndly.com';

export default function SellerProductCard({
  product,
  promotionState = 'idle',
  index,
  onQuickStatusToggle,
  onDelete,
}: SellerProductCardProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);

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
      icon: <Sliders className="w-3.5 h-3.5" />,
      onClick: () => {
        router.push(`/dashboard/products/${product.id}`);
      },
    },
    {
      label: 'Edit Details',
      icon: <Edit2 className="w-3.5 h-3.5" />,
      onClick: () => {
        router.push(`/dashboard/products/edit/${product.id}`);
      },
    },
    {
      label: 'Copy Public Link',
      icon: <Copy className="w-3.5 h-3.5" />,
      onClick: copyPublicLink,
    },
    {
      label: isActive ? 'Set as Draft' : 'Publish as Active',
      icon: <CircleDot className="w-3.5 h-3.5" />,
      onClick: () => onQuickStatusToggle?.(product.id, product.status),
    },
    {
      label: 'Delete',
      icon: <Trash2 className="w-3.5 h-3.5" />,
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
      <div className="relative bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-foreground)]/25 rounded-2xl p-3.5 sm:p-4 transition-colors">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          {/* Media Thumbnail */}
          <Link
            href={`/dashboard/products/${product.id}`}
            className="relative h-20 w-20 sm:h-24 sm:w-24 shrink-0 rounded-xl overflow-hidden border border-[var(--color-border)] bg-[var(--color-background)] group/media block focus:outline-none"
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
                className="w-full h-full object-cover transition-transform duration-200 group-hover/media:scale-105"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.image_urls?.[0] || '/placeholder-product.png'}
                alt={product.title}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover transition-transform duration-200 group-hover/media:scale-105"
              />
            )}

            {product.is_featured && (
              <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500 text-white">
                <Flame className="w-2.5 h-2.5 fill-current" />
                HOT
              </span>
            )}
          </Link>

          {/* Product Details */}
          <div className="flex-1 min-w-0 space-y-2 w-full">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link
                  href={`/dashboard/products/${product.id}`}
                  className="block group-hover:text-[var(--color-accent)] transition-colors focus:outline-none"
                >
                  <h3 className="text-sm sm:text-base font-semibold text-[var(--color-foreground)] line-clamp-1">
                    {product.title}
                  </h3>
                </Link>
                <p className="text-xs text-[var(--color-muted)] flex items-center gap-1.5 mt-0.5">
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
                className={`shrink-0 text-[10px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full border transition-colors ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/20'
                }`}
              >
                {product.status}
              </button>
            </div>

            {/* Price & Stock Chips */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-baseline gap-1.5">
                <span className="text-base sm:text-lg font-bold text-[var(--color-foreground)] tabular-nums">
                  {product.currency || 'GH₵'}
                  {numPrice.toLocaleString()}
                </span>
                {hasDiscount && (
                  <span className="text-xs text-[var(--color-muted)] line-through tabular-nums">
                    {product.currency || 'GH₵'}
                    {numOriginal.toLocaleString()}
                  </span>
                )}
              </div>

              {/* Stock Indicator */}
              <span
                className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                  isOutOfStock
                    ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
                    : isLowStock
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                      : 'bg-[var(--color-background)] text-[var(--color-foreground)] border-[var(--color-border)]'
                }`}
              >
                <Package className="w-3 h-3" />
                {isOutOfStock ? 'Sold Out' : `${qty} in stock`}
              </span>

              {/* Promotion Alerts */}
              {promotionState === 'verifying' && (
                <span className="font-semibold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-500 border border-blue-500/20 text-[10px] uppercase tracking-wider inline-flex items-center gap-1">
                  <Sparkles className="w-3 h-3 animate-spin" />
                  Verifying boost
                </span>
              )}
              {promotionState === 'failed' && (
                <span className="font-semibold px-2 py-0.5 rounded-md bg-red-500/10 text-red-500 border border-red-500/20 text-[10px] uppercase tracking-wider inline-flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Boost failed
                </span>
              )}

              {/* Views Count */}
              {product.views_count !== undefined && product.views_count > 0 && (
                <span className="text-xs text-[var(--color-muted)] inline-flex items-center gap-1 ml-auto">
                  <Eye className="w-3.5 h-3.5" />
                  {product.views_count.toLocaleString()}
                </span>
              )}
            </div>

            {/* Quick Actions Row */}
            <div className="flex items-center gap-2 pt-1 border-t border-[var(--color-border)]/50">
              <Link
                href={`/dashboard/products/${product.id}`}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl bg-[var(--color-background)] hover:bg-[var(--color-border)]/20 border border-[var(--color-border)] text-[var(--color-foreground)] transition-colors"
              >
                <Sliders className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                Manage Hub
              </Link>
              <Link
                href={`/dashboard/products/edit/${product.id}`}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl hover:bg-[var(--color-border)]/20 text-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Edit
              </Link>
              <Link
                href={`/product/${product.id}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-xl hover:bg-[var(--color-border)]/20 text-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors"
                title="View public listing in new tab"
              >
                <Eye className="w-3.5 h-3.5" />
                <ExternalLink className="w-3 h-3 opacity-60" />
              </Link>

              {/* Dropdown Menu for Secondary Actions */}
              <div className="ml-auto">
                <DropdownMenu
                  trigger={
                    <button
                      type="button"
                      className="p-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-border)]/20 transition-colors"
                      title="More actions"
                    >
                      <MoreHorizontal className="w-4 h-4" />
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
