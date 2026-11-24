'use client';

import React from 'react';
import { Home, Map, Globe2, Check } from 'lucide-react';
import { motion, HTMLMotionProps } from 'framer-motion';
import type { ServiceArea } from '@/lib/api/onboarding';

interface Option {
  value: ServiceArea;
  title: string;
  description: string;
  icon: React.ElementType;
}

const OPTIONS: Option[] = [
  {
    value: 'SAME_CITY',
    title: 'Same city only',
    description: 'Deliver within your city',
    icon: Home,
  },
  {
    value: 'NEARBY_STATES',
    title: 'Nearby areas',
    description: 'Neighboring areas and regions',
    icon: Map,
  },
  {
    value: 'NATIONWIDE',
    title: 'Inter-regional (seller-arranged)',
    description: 'Arrange parcel delivery outside your city',
    icon: Globe2,
  },
];

interface ServiceAreaSelectProps {
  value: ServiceArea | null;
  onChange: (v: ServiceArea) => void;
}

export default function ServiceAreaSelect({ value, onChange }: ServiceAreaSelectProps) {
  return (
    <div className="space-y-3">
      <label className="flex items-center gap-1 pl-1 text-[11px] font-normal uppercase tracking-wider text-[var(--color-muted)]">
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
                type: 'button',
                role: 'radio',
                'aria-checked': selected,
                onClick: () => onChange(opt.value),
                whileTap: { scale: 0.98 },
                className: `relative text-left rounded-2xl border p-4 transition-all bg-[var(--color-surface)] hover:border-[var(--color-accent)]/40
                  ${
                    selected
                      ? 'border-[var(--color-accent)] ring-2 ring-[var(--color-accent)]/20 shadow-sm'
                      : 'border-[var(--color-border)]'
                  }`,
              } as HTMLMotionProps<'button'>)}
            >
              {selected && (
                <span className="absolute right-3 top-3 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-accent)] text-white">
                  <Check className="h-3 w-3" />
                </span>
              )}
              <div className="space-y-2">
                <div
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${selected ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent)]' : 'bg-[var(--color-border)]/40 text-[var(--color-muted)]'}`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <p className="text-sm font-normal leading-tight text-[var(--color-foreground)]">
                  {opt.title}
                </p>
                <p className="text-[11px] leading-snug text-[var(--color-muted)]">
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
