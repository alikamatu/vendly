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
      </motion.div>
    </Link>
  );
}

export default React.memo(VendorCard);
