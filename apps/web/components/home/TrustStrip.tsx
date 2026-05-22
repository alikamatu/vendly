"use client";

import React from "react";
import { motion } from "framer-motion";
import { Store, Package, MapPin, ShieldCheck } from "lucide-react";

interface Stat {
  Icon: any;
  value: string;
  label: string;
}

const STATS: Stat[] = [
  { Icon: Store, value: "1,000+", label: "Verified businesses" },
  { Icon: Package, value: "25K+", label: "Products listed" },
  { Icon: MapPin, value: "16", label: "Regions served" },
  { Icon: ShieldCheck, value: "100%", label: "Paystack secured" },
];

/** Compact trust/stats strip — sits below the hero on the home page. */
export default function TrustStrip() {
  return (
    <section className="max-w-7xl mx-auto px-4 md:px-8 -mt-6 md:-mt-10 relative z-10">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-px rounded-3xl overflow-hidden border border-border bg-border/40 shadow-xl"
      >
        {STATS.map(({ Icon, value, label }) => (
          <div
            key={label}
            className="flex items-center gap-3 px-4 py-4 md:py-5 bg-background"
          >
            <span className="inline-flex w-10 h-10 rounded-2xl items-center justify-center bg-primary/10 text-primary flex-shrink-0">
              <Icon className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm md:text-base font-black tracking-tight text-foreground tabular-nums">
                {value}
              </p>
              <p className="text-[10px] md:text-[11px] font-bold text-muted uppercase tracking-wider truncate">
                {label}
              </p>
            </div>
          </div>
        ))}
      </motion.div>
    </section>
  );
}
