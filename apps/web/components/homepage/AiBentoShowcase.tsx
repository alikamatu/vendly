'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Camera, Check, Globe, ShieldCheck, Zap } from 'lucide-react';
import VerndlyAiIcon from '@/components/ai/VerndlyAiIcon';
import { openVerndlyAi } from '@/lib/ai/open-verndly-ai';
import { EASE_OUT_EXPO } from './types';

const DEMO_PARSE_EXAMPLES = [
  {
    prompt: 'Birthday gift for her under GH₵ 300 in Accra',
    summary:
      'Curated in-stock beauty, jewelry, and fashion gifts under GH₵ 300 from verified stores.',
    pills: ['Beauty & Jewelry', 'Under GH₵ 300', 'Verified Stores', 'In Stock'],
  },
  {
    prompt: 'Clean student laptop or iPad for university',
    summary:
      'Matched verified electronics sellers offering tested laptops and tablets with escrow protection.',
    pills: ['Electronics', 'Verified Tech', '3-Day Inspection', 'Ready to Ship'],
  },
  {
    prompt: 'Standing fan and kettle for my new apartment',
    summary: 'Found home & kitchen appliances available for fast Accra delivery or store pickup.',
    pills: ['Home & Kitchen', 'Appliances', 'Fast Dispatch', 'Escrow Protected'],
  },
];

export default function AiBentoShowcase() {
  const [demoIdx, setDemoIdx] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setDemoIdx((i) => (i + 1) % DEMO_PARSE_EXAMPLES.length);
    }, 4400);
    return () => window.clearInterval(id);
  }, []);

  const activeDemo = DEMO_PARSE_EXAMPLES[demoIdx];

  return (
    <section
      aria-labelledby="bento-architecture-heading"
      className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:px-8 md:py-24"
    >
      <div className="mb-12 max-w-3xl space-y-4 md:mb-16">
        <div className="inline-flex items-center gap-2">
          <VerndlyAiIcon size={20} animated={false} />
          <span className="text-xs font-semibold uppercase tracking-[0.16em]">
            Verndly Intelligence Engine
          </span>
        </div>
        <h2
          id="bento-architecture-heading"
          className="text-4xl font-semibold leading-[1.02] tracking-[-0.04em] sm:text-6xl"
        >
          Four engines. <span className="text-muted font-normal">Zero busywork.</span>
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Bento 1 (7 cols): Live Intent Search */}
        <motion.article
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.65, ease: EASE_OUT_EXPO }}
          className="bg-surface flex flex-col justify-between gap-10 rounded-[2.5rem] p-7 sm:p-10 lg:col-span-7"
        >
          <div className="space-y-3">
            <span className="bg-background text-foreground inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-[11px] font-semibold">
              <Zap className="h-3.5 w-3.5 text-red-600" />
              Buyer Intent Engine
            </span>
            <h3 className="text-2xl font-semibold tracking-tight sm:text-4xl">
              Search like you talk to a friend.
            </h3>
            <p className="text-muted max-w-xl text-sm leading-relaxed sm:text-base">
              Traditional marketplaces force you through ten filter checkboxes. Verndly AI
              understands budget ceilings in GH₵, gift ideas, product conditions, and local
              categories in a single sentence.
            </p>
          </div>

          <div className="bg-background space-y-4 rounded-3xl p-5 sm:p-6">
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted text-[11px] font-medium uppercase tracking-wider">
                Live Query Plan
              </span>
              <button
                type="button"
                onClick={() => openVerndlyAi(activeDemo.prompt)}
                className="text-foreground inline-flex items-center gap-1 text-xs font-semibold hover:opacity-75"
              >
                <span>Run this query</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={demoIdx}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.28, ease: EASE_OUT_EXPO }}
                className="space-y-4"
              >
                <p className="text-foreground text-base font-semibold sm:text-lg">
                  “{activeDemo.prompt}”
                </p>
                <div className="flex flex-wrap gap-2">
                  {activeDemo.pills.map((pill) => (
                    <span
                      key={pill}
                      className="bg-surface text-foreground rounded-full px-3 py-1 text-xs font-semibold"
                    >
                      {pill}
                    </span>
                  ))}
                </div>
                <p className="text-muted text-xs leading-relaxed">{activeDemo.summary}</p>
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.article>

        {/* Bento 2 (5 cols): Vision Bulk Photo-to-Listing */}
        <motion.article
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.65, delay: 0.08, ease: EASE_OUT_EXPO }}
          className="bg-surface flex flex-col justify-between gap-10 rounded-[2.5rem] p-7 sm:p-10 lg:col-span-5"
        >
          <div className="space-y-3">
            <span className="bg-background text-foreground inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-[11px] font-semibold">
              <Camera className="h-3.5 w-3.5 text-red-600" />
              Vision Listing Studio
            </span>
            <h3 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              20 camera-roll photos in. Complete store out.
            </h3>
            <p className="text-muted text-sm leading-relaxed">
              Snap your inventory and drop up to 20 photos at once. Verndly AI groups multiple
              angles of the same item, writes clean descriptions, assigns the right category, and
              suggests realistic GH₵ prices.
            </p>
          </div>

          <div className="bg-background space-y-3 rounded-3xl p-5">
            {[
              { label: 'Angle grouping & deduplication', state: 'Automated' },
              { label: 'SEO title & scannable copy', state: 'Generated' },
              { label: '15-category taxonomy mapping', state: 'Matched' },
            ].map((row) => (
              <div
                key={row.label}
                className="bg-surface flex items-center justify-between rounded-2xl px-4 py-3 text-xs"
              >
                <span className="text-foreground font-medium">{row.label}</span>
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                  <Check className="h-3.5 w-3.5" />
                  {row.state}
                </span>
              </div>
            ))}
          </div>
        </motion.article>

        {/* Bento 3 (5 cols): Website & WhatsApp Importer */}
        <motion.article
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.65, delay: 0.12, ease: EASE_OUT_EXPO }}
          className="bg-surface flex flex-col justify-between gap-10 rounded-[2.5rem] p-7 sm:p-10 lg:col-span-5"
        >
          <div className="space-y-3">
            <span className="bg-background text-foreground inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-[11px] font-semibold">
              <Globe className="h-3.5 w-3.5 text-red-600" />
              Omnichannel Importer
            </span>
            <h3 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Bring your website or WhatsApp catalog in one click.
            </h3>
            <p className="text-muted text-sm leading-relaxed">
              Already have products on Shopify, WooCommerce, Jumia, a custom storefront, or WhatsApp
              Business? Paste your link or drop catalog screenshots — Verndly crops every photo and
              mirrors images permanently to fast CDN storage.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              'Shopify & WooCommerce',
              'Custom Next.js SPAs',
              'WhatsApp Screenshots',
              'wa.me Product Links',
              'Meta Commerce CSV',
            ].map((tag) => (
              <span
                key={tag}
                className="bg-background text-foreground rounded-full px-3.5 py-2 text-xs font-semibold"
              >
                {tag}
              </span>
            ))}
          </div>
        </motion.article>

        {/* Bento 4 (7 cols): 3-Day Paystack Escrow */}
        <motion.article
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.65, delay: 0.16, ease: EASE_OUT_EXPO }}
          className="bg-foreground text-background flex flex-col justify-between gap-10 rounded-[2.5rem] p-7 sm:p-10 lg:col-span-7"
        >
          <div className="space-y-3">
            <span className="bg-background/15 text-background inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-[11px] font-semibold">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              3-Day Paystack Escrow
            </span>
            <h3 className="text-2xl font-semibold tracking-tight sm:text-4xl">
              Built-in trust for Mobile Money and card payments.
            </h3>
            <p className="max-w-xl text-sm leading-relaxed opacity-80 sm:text-base">
              Buyers never lose money to unverified accounts, and sellers never dispatch riders for
              fake SMS screenshots or ghosted pay-on-delivery orders.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            {[
              {
                step: '01 · Funded',
                text: 'MTN MoMo, Telecel, AirtelTigo, or Card verified by Paystack.',
              },
              {
                step: '02 · Dispatched',
                text: 'Verified merchant ships via courier or prepares free store pickup.',
              },
              {
                step: '03 · Released',
                text: '3-day inspection window protects buyers before seller payout.',
              },
            ].map((stage) => (
              <div key={stage.step} className="bg-background/10 rounded-3xl p-4">
                <p className="text-xs font-bold">{stage.step}</p>
                <p className="mt-1.5 text-xs leading-relaxed opacity-80">{stage.text}</p>
              </div>
            ))}
          </div>
        </motion.article>
      </div>
    </section>
  );
}
