'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { EASE_OUT_EXPO } from './types';

const MANIFESTO_STATS = [
  {
    stat: 'Instant',
    label: 'Natural-language search',
    detail: 'Shop by occasion, style, or GH₵ budget in plain English.',
  },
  {
    stat: '3-in-1',
    label: 'Zero-friction catalog import',
    detail: 'Upload raw photos, paste a store URL, or drop WhatsApp screenshots.',
  },
  {
    stat: '3 Days',
    label: 'Paystack escrow window',
    detail: 'Mobile Money & card funds stay protected until delivery & inspection.',
  },
  {
    stat: 'GH₵ 0',
    label: 'Monthly storefront rent',
    detail: 'Open your verified store link and QR code with zero setup cost.',
  },
] as const;

export default function AiManifestoMetrics() {
  return (
    <section
      aria-label="Verndly platform manifesto"
      className="mx-auto max-w-7xl px-4 py-20 sm:px-6 md:px-8 md:py-28"
    >
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.75, ease: EASE_OUT_EXPO }}
        className="max-w-5xl space-y-6"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-600">
          Why AI-Native Matters
        </p>
        <h2 className="text-3xl font-semibold leading-[1.06] tracking-[-0.035em] sm:text-5xl md:text-6xl">
          No endless DMs. No fake MoMo alerts. No hours typing product descriptions.{' '}
          <span className="text-muted font-normal">
            Verndly pairs conversational intelligence with 3-day Paystack escrow so Ghanaian
            commerce moves at the speed of trust.
          </span>
        </h2>
      </motion.div>

      <div className="mt-14 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {MANIFESTO_STATS.map((item, idx) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6, delay: idx * 0.06, ease: EASE_OUT_EXPO }}
            className="bg-surface flex flex-col justify-between gap-8 rounded-[2rem] p-6 sm:p-8"
          >
            <span className="text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">
              {item.stat}
            </span>
            <div className="space-y-1.5">
              <h3 className="text-foreground text-sm font-semibold sm:text-base">{item.label}</h3>
              <p className="text-muted text-xs leading-relaxed">{item.detail}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
