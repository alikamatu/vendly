"use client";

import React, { useRef } from "react";
import { motion } from "framer-motion";
import { Flame, ChevronRight, Sparkles, AlertTriangle } from "lucide-react";
import Link from "next/link";
import Card from "@/components/ui/Card";

interface SellerProductCardProps {
  product: {
    id: string;
    title: string;
    price: string;
    image_urls: string[];
    video_url?: string | null;
    status: string;
    is_featured?: boolean;
    quantity_available: number;
    category: string;
    created_at: string;
  };
  promotionState?: "idle" | "verifying" | "payment_required" | "failed";
  /** Kept for API compatibility — both actions now live on the manage page. */
  onDelete?: (id: string) => void;
  onToggleHotSales?: (id: string, currentState: boolean) => void;
  index: number;
}

/**
 * Slim product row for the dashboard list. The whole card is one big tap
 * target that navigates to `/dashboard/products/<id>` — the manage hub
 * where every operation lives. Keeping the row visually quiet (no
 * dropdown, no menu, no buttons inside buttons) is the UX win.
 *
 * On mobile this gives a full-width clickable card with proper hit area;
 * on desktop it stays a tidy row with a chevron affordance.
 */
export default function SellerProductCard({
  product,
  promotionState = "idle",
  index,
}: SellerProductCardProps) {
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

  const statusColors: Record<string, string> = {
    active: "bg-emerald-500/10 text-emerald-600",
    draft: "bg-orange-500/10 text-orange-600",
    out_of_stock: "bg-red-500/10 text-red-600",
    archived: "bg-muted/30 text-muted",
  };

  const lowStock =
    product.quantity_available > 0 && product.quantity_available <= 5;
  const outOfStock = product.quantity_available === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.03 }}
    >
      <Link
        href={`/dashboard/products/${product.id}`}
        aria-label={`Manage ${product.title}`}
        className="block group focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-3xl"
      >
        <Card
          className="overflow-hidden border border-transparent group-hover:border-border/60 bg-surface/40 group-hover:bg-surface/70 transition-all p-3 sm:p-4 rounded-3xl active:scale-[0.997]"
          hoverEffect={false}
        >
          <div className="flex gap-3 sm:gap-4 items-center">
            {/* Media */}
            <div
              className="relative h-20 w-20 sm:h-24 sm:w-24 shrink-0 rounded-2xl overflow-hidden border border-border/50 bg-black/5"
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              {product.video_url ? (
                <video
                  ref={videoRef}
                  src={product.video_url}
                  muted
                  loop
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={product.image_urls?.[0] || "/placeholder-product.png"}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover"
                />
              )}
              {product.is_featured && (
                <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-0.5 text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-amber-500/95 text-white">
                  <Flame className="w-2.5 h-2.5" />
                </span>
              )}
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-[13px] sm:text-sm font-medium text-foreground line-clamp-2 sm:line-clamp-1 leading-snug">
                  {product.title}
                </h3>
                <span
                  className={`shrink-0 text-[9px] font-medium px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    statusColors[product.status] || "bg-muted/10 text-muted"
                  }`}
                >
                  {product.status.replace("_", " ")}
                </span>
              </div>

              <div className="flex items-baseline gap-2 flex-wrap">
                <p className="text-sm font-semibold text-primary tabular-nums">
                  GH₵{parseFloat(product.price).toLocaleString()}
                </p>
                <p className="text-[10px] text-muted uppercase tracking-wider truncate">
                  {product.category}
                </p>
              </div>

              {/* Inline state chips */}
              <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                <StockChip
                  qty={product.quantity_available}
                  out={outOfStock}
                  low={lowStock}
                />
                {promotionState === "verifying" && (
                  <span className="font-medium px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-500 uppercase tracking-wider inline-flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" />
                    Verifying
                  </span>
                )}
                {promotionState === "failed" && (
                  <span className="font-medium px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-500 uppercase tracking-wider inline-flex items-center gap-1">
                    <AlertTriangle className="w-2.5 h-2.5" />
                    Payment failed
                  </span>
                )}
              </div>
            </div>

            {/* Chevron affordance */}
            <ChevronRight className="hidden sm:block w-4 h-4 text-muted/50 group-hover:text-foreground group-hover:translate-x-0.5 transition" />
          </div>
        </Card>
      </Link>
    </motion.div>
  );
}

function StockChip({
  qty,
  out,
  low,
}: {
  qty: number;
  out: boolean;
  low: boolean;
}) {
  return (
    <span
      className={`font-medium px-1.5 py-0.5 rounded-full uppercase tracking-wider inline-flex items-center gap-1 ${
        out
          ? "bg-red-500/10 text-red-600"
          : low
            ? "bg-amber-500/10 text-amber-600"
            : "bg-emerald-500/10 text-emerald-600"
      }`}
    >
      {qty} in stock
    </span>
  );
}
