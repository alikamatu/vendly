'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Crown } from 'lucide-react';
import type { TopProVendor } from '@/lib/api/store';

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
        whileHover={{ y: -4 }}
        transition={{ type: 'spring', stiffness: 300, damping: 22 }}
        className="hover:border-[var(--color-accent)]/40 flex h-full flex-col items-center justify-center gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm transition-all hover:shadow-md"
      >
        <div className="relative">
          <div className="h-24 w-24 overflow-hidden rounded-full border-4 border-[var(--color-background)] bg-[var(--color-background)] shadow-sm">
            {vendor.logo_url ? (
              <img
                src={vendor.logo_url}
                alt={vendor.store_name}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
            ) : (
              <div className="bg-[var(--color-accent)]/10 flex h-full w-full items-center justify-center text-xl font-bold uppercase text-[var(--color-accent)]">
                {vendor.store_name.slice(0, 2)}
              </div>
            )}
          </div>
          {/* Pro Badge */}
          <div className="absolute -bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full border-2 border-[var(--color-surface)] bg-[var(--color-accent)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
            <Crown size={12} strokeWidth={3} />
            PRO
          </div>
        </div>

        <div className="mt-2 w-full text-center">
          <p className="truncate px-2 text-sm font-semibold tracking-tight text-[var(--color-foreground)]">
            {vendor.store_name}
          </p>
        </div>
      </motion.div>
    </Link>
  );
}

export default React.memo(VendorCard);
