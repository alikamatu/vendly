'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { EASE_OUT_EXPO, type HomepageFaqEntry } from './types';

interface AiSeoFaqSectionProps {
  faqs: HomepageFaqEntry[];
}

export default function AiSeoFaqSection({ faqs }: AiSeoFaqSectionProps) {
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);

  return (
    <section
      aria-labelledby="seo-editorial-heading"
      className="mx-auto max-w-7xl px-4 py-20 sm:px-6 md:px-8 md:py-28"
    >
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
        {/* Left: Rich Semantic Marketing & SEO Prose */}
        <div className="space-y-6 lg:col-span-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-red-600">
            Ghana’s AI-Native Marketplace
          </p>
          <h2
            id="seo-editorial-heading"
            className="text-3xl font-semibold leading-tight tracking-[-0.03em] sm:text-4xl"
          >
            Safe online shopping in Ghana, rebuilt from the ground up with AI.
          </h2>
          <div className="text-muted space-y-4 text-sm leading-relaxed">
            <p>
              Shopping and selling online in Accra and across Ghana used to mean choosing between
              chaotic social media DMs and clunky legacy directories. Verndly unites verified
              independent brands, campus entrepreneurs, and established retailers on a single
              AI-native commerce platform.
            </p>
            <p>
              With <strong>Verndly AI</strong>, shoppers search naturally by budget, category, or
              occasion across Electronics, Fashion, Home &amp; Kitchen, Beauty &amp; Personal Care,
              Jewelry &amp; Watches, and 10+ other curated categories — while every checkout via MTN
              Mobile Money, Telecel Cash, AirtelTigo Money, or bank card is protected by 3-day
              Paystack escrow.
            </p>
            <p>
              For merchants, Verndly eliminates manual catalog setup. Upload product photos, connect
              an existing website URL, or drop WhatsApp Business catalog screenshots to launch a
              fast, search-indexed storefront at{' '}
              <span className="text-foreground font-medium">verndly.com/s/yourstore</span> with zero
              monthly subscription fees.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <Link
              href="/buyer-protection"
              className="bg-surface text-foreground hover:bg-foreground hover:text-background rounded-full px-4 py-2 text-xs font-semibold transition-colors"
            >
              3-Day Escrow Guide
            </Link>
            <Link
              href="/stores"
              className="bg-surface text-foreground hover:bg-foreground hover:text-background rounded-full px-4 py-2 text-xs font-semibold transition-colors"
            >
              Verified Ghana Stores
            </Link>
            <Link
              href="/blog"
              className="bg-surface text-foreground hover:bg-foreground hover:text-background rounded-full px-4 py-2 text-xs font-semibold transition-colors"
            >
              Verndly Commerce Journal
            </Link>
          </div>
        </div>

        {/* Right: Borderless Tonal FAQ Accordion (Matches FAQPage JSON-LD) */}
        <div className="space-y-3 lg:col-span-7">
          {faqs.map((faq, idx) => {
            const isOpen = openFaqIdx === idx;
            return (
              <div key={faq.question} className="bg-surface rounded-3xl p-5 sm:p-6">
                <button
                  type="button"
                  onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 text-left"
                >
                  <h3 className="text-foreground text-sm font-semibold sm:text-base">
                    {faq.question}
                  </h3>
                  <ChevronDown
                    className={`text-muted h-4 w-4 shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22, ease: EASE_OUT_EXPO }}
                      className="overflow-hidden"
                    >
                      <p className="text-muted pt-3 text-xs leading-relaxed sm:text-sm">
                        {faq.answer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
