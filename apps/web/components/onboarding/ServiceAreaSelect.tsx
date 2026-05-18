"use client";

import React from "react";
import { Home, Map, Globe2, Check } from "lucide-react";
import { motion, HTMLMotionProps } from "framer-motion";
import type { ServiceArea } from "@/lib/api/onboarding";

interface Option {
  value: ServiceArea;
  title: string;
  description: string;
  icon: React.ElementType;
}

const OPTIONS: Option[] = [
  { value: "SAME_CITY", title: "Same city only", description: "Deliver within your city", icon: Home },
  { value: "NEARBY_STATES", title: "Nearby states", description: "Neighboring states", icon: Map },
  { value: "NATIONWIDE", title: "Nationwide", description: "Ship anywhere in the country", icon: Globe2 },
];

interface ServiceAreaSelectProps {
  value: ServiceArea | null;
  onChange: (v: ServiceArea) => void;
}

export default function ServiceAreaSelect({ value, onChange }: ServiceAreaSelectProps) {
  return (
    <div className="space-y-3">
      <label className="text-[11px] font-bold text-[var(--color-muted)] uppercase tracking-widest pl-1 flex items-center gap-1">
        Service Areas <span className="text-[var(--color-accent)]">*</span>
      </label>

      <div role="radiogroup" aria-label="Service area" className="grid gap-3 md:grid-cols-3">
        {OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const selected = value === opt.value;
          return (
            <motion.button
              key={opt.value}
              {...({
                type: "button",
                role: "radio",
                "aria-checked": selected,
                onClick: () => onChange(opt.value),
                whileTap: { scale: 0.98 },
                className: `relative text-left rounded-2xl border p-4 transition-all bg-[var(--color-surface)] hover:border-[var(--color-accent)]/40
                  ${selected
                    ? "border-[var(--color-accent)] ring-2 ring-[var(--color-accent)]/20 shadow-sm"
                    : "border-[var(--color-border)]"}`,
              } as HTMLMotionProps<"button">)}
            >
              {selected && (
                <span className="absolute top-3 right-3 inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--color-accent)] text-white">
                  <Check className="w-3 h-3" />
                </span>
              )}
              <div className="space-y-2">
                <div
                  className={`inline-flex items-center justify-center w-9 h-9 rounded-xl
                    ${selected ? "bg-[var(--color-accent)]/15 text-[var(--color-accent)]" : "bg-[var(--color-border)]/40 text-[var(--color-muted)]"}`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <p className="text-sm font-bold text-[var(--color-foreground)] leading-tight">
                  {opt.title}
                </p>
                <p className="text-[11px] text-[var(--color-muted)] leading-snug">
                  {opt.description}
                </p>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
