'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import VerndlyAiIcon from '@/components/ai/VerndlyAiIcon';
import { openVerndlyAi } from '@/lib/ai/open-verndly-ai';
import { EASE_OUT_EXPO, SPRING_GLIDE } from './types';

const AUDIENCE_JOURNEYS = {
  buyers: [
    {
      step: '01',
      title: 'Describe what you want in plain words',
      detail:
        'Skip rigid dropdowns. Tell Verndly AI your occasion, style, or GH₵ budget and get instant matches across verified Ghanaian stores.',
    },
    {
      step: '02',
      title: 'Checkout seamlessly with MoMo or Card',
      detail:
        'Pay with MTN Mobile Money, Telecel Cash, AirtelTigo Money, or Visa/Mastercard. Zero hidden buyer surcharges at checkout.',
    },
    {
      step: '03',
      title: 'Protected by 7-day Paystack escrow',
      detail:
        'Your funds stay safely held until your order arrives and passes inspection — eliminating Instagram DM ghosting forever.',
    },
  ],
  sellers: [
    {
      step: '01',
      title: 'Drop photos, a website link, or WhatsApp screenshots',
      detail:
        'Verndly AI groups up to 20 photos at once, crops WhatsApp catalog screenshots, or imports your Shopify, WooCommerce, or custom site automatically.',
    },
    {
      step: '02',
      title: 'Share your verified storefront everywhere',
      detail:
        'Put verndly.com/s/yourstore in your Instagram, TikTok, and WhatsApp bio with GH₵ 0 monthly rent and zero setup fees.',
    },
    {
      step: '03',
      title: 'End fake MoMo alerts & pay-on-delivery no-shows',
      detail:
        'Every order is cryptographically funded into escrow before you pack or dispatch a rider, with automated payouts to your MoMo or bank.',
    },
  ],
} as const;

export default function AiDualJourneySection() {
  const [audienceTab, setAudienceTab] = useState<'buyers' | 'sellers'>('buyers');

  return (
    <section
      aria-labelledby="dual-journey-heading"
      className="mx-auto max-w-7xl px-4 py-20 sm:px-6 md:px-8 md:py-28"
    >
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div className="max-w-2xl space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-red-600">
            Two Sides, One Standard
          </p>
          <h2
            id="dual-journey-heading"
            className="text-4xl font-semibold leading-[1.04] tracking-[-0.04em] sm:text-6xl"
          >
            Effortless to shop. <span className="text-muted font-normal">Unstoppable to sell.</span>
          </h2>
        </div>

        <div className="bg-surface inline-flex self-start rounded-full p-1.5">
          {(['buyers', 'sellers'] as const).map((tab) => {
            const active = audienceTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setAudienceTab(tab)}
                className={`relative rounded-full px-5 py-2.5 text-xs font-semibold transition-colors sm:text-sm ${
                  active ? 'text-foreground' : 'text-muted hover:text-foreground'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="ai-homepage-audience-pill"
                    transition={SPRING_GLIDE}
                    className="bg-background absolute inset-0 rounded-full"
                  />
                )}
                <span className="relative z-10">
                  {tab === 'buyers' ? 'For Shoppers' : 'For Entrepreneurs'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={audienceTab}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -14 }}
          transition={{ duration: 0.28, ease: EASE_OUT_EXPO }}
          className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3"
        >
          {AUDIENCE_JOURNEYS[audienceTab].map((item) => (
            <div
              key={item.step}
              className="bg-surface flex flex-col justify-between gap-10 rounded-[2.25rem] p-7 sm:p-9"
            >
              <span className="text-muted font-mono text-sm font-semibold">{item.step}</span>
              <div className="space-y-3">
                <h3 className="text-foreground text-xl font-semibold tracking-tight sm:text-2xl">
                  {item.title}
                </h3>
                <p className="text-muted text-sm leading-relaxed">{item.detail}</p>
              </div>
            </div>
          ))}
        </motion.div>
      </AnimatePresence>

      <div className="mt-8 flex flex-wrap gap-3">
        {audienceTab === 'buyers' ? (
          <>
            <button
              type="button"
              onClick={() => openVerndlyAi()}
              className="bg-foreground text-background inline-flex h-12 items-center gap-2 rounded-full px-6 text-xs font-semibold transition-opacity hover:opacity-90 sm:text-sm"
            >
              <VerndlyAiIcon size={18} animated={false} />
              <span>Start Shopping with AI</span>
            </button>
            <Link
              href="/products"
              className="bg-surface text-foreground hover:bg-foreground/[0.06] inline-flex h-12 items-center gap-2 rounded-full px-6 text-xs font-semibold transition-colors sm:text-sm"
            >
              <span>Browse All Products</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </>
        ) : (
          <>
            <Link
              href="/sell"
              className="bg-foreground text-background inline-flex h-12 items-center gap-2 rounded-full px-6 text-xs font-semibold transition-opacity hover:opacity-90 sm:text-sm"
            >
              <span>Open Your Verified Store</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/dashboard/products/add"
              className="bg-surface text-foreground hover:bg-foreground/[0.06] inline-flex h-12 items-center gap-2 rounded-full px-6 text-xs font-semibold transition-colors sm:text-sm"
            >
              <VerndlyAiIcon size={18} animated={false} />
              <span>Import Catalog with Verndly AI</span>
            </Link>
          </>
        )}
      </div>
    </section>
  );
}
