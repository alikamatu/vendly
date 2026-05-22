"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles, MapPin, Package, ArrowUpRight } from "lucide-react";
import type { TopProVendor } from "@/lib/api/store";

interface VendorCardProps {
  vendor: TopProVendor;
  rank?: number;
}

function VendorCard({ vendor, rank }: VendorCardProps) {
  return (
    <Link
      href={`/s/${vendor.store_link}`}
      className="group block h-full"
      aria-label={`Visit ${vendor.store_name} store`}
    >
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ type: "spring", stiffness: 300, damping: 22 }}
        className="relative overflow-hidden h-full rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 flex flex-col gap-4 transition-colors hover:border-[var(--color-accent)]/40"
      >
        {/* Pro tag */}
        <span className="absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-medium uppercase tracking-wider bg-[var(--color-accent)]/15 text-[var(--color-accent)]">
          <Sparkles className="w-2.5 h-2.5" />
          Pro
        </span>

        {/* Rank chip */}
        {rank != null && (
          <span className="absolute top-3 left-3 inline-flex items-center justify-center w-6 h-6 rounded-full bg-[var(--color-foreground)] text-[var(--color-background)] text-[10px] font-medium">
            {rank}
          </span>
        )}

        <div className="flex items-start gap-3 pt-2">
          <div className="w-12 h-12 rounded-2xl overflow-hidden border border-[var(--color-border)] bg-[var(--color-background)] flex-shrink-0">
            {vendor.logo_url ? (
              <img
                src={vendor.logo_url}
                alt={vendor.store_name}
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm font-medium uppercase text-[var(--color-accent)] bg-[var(--color-accent)]/10">
                {vendor.store_name.slice(0, 2)}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="text-sm font-medium text-[var(--color-foreground)] uppercase tracking-tight truncate leading-tight">
              {vendor.store_name}
            </p>
            <p className="text-[10px] text-[var(--color-accent)] font-normal truncate">
              @{vendor.store_link}
            </p>
          </div>
        </div>

        {vendor.bio && (
          <p className="text-[11px] text-[var(--color-muted)] leading-snug line-clamp-2">
            {vendor.bio}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 pt-2 border-t border-[var(--color-border)]/60">
          <div className="flex items-center gap-2.5 text-[10px] font-normal text-[var(--color-muted)] uppercase tracking-wider min-w-0">
            <span className="inline-flex items-center gap-1">
              <Package className="w-3 h-3" />
              {vendor.products_count}
            </span>
            {vendor.location && (
              <span className="inline-flex items-center gap-1 truncate">
                <MapPin className="w-3 h-3" />
                <span className="truncate">{vendor.location}</span>
              </span>
            )}
          </div>
          <ArrowUpRight className="w-4 h-4 text-[var(--color-muted)] group-hover:text-[var(--color-accent)] group-hover:rotate-12 transition-all flex-shrink-0" />
        </div>
      </motion.div>
    </Link>
  );
}

export default React.memo(VendorCard);
