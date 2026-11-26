'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import VerndlyAiIcon from '@/components/ai/VerndlyAiIcon';
import { openVerndlyAi } from '@/lib/ai/open-verndly-ai';

export default function AiFinaleCta() {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-24 pt-6 sm:px-6 md:px-8 md:pb-32">
      <div className="bg-foreground text-background flex flex-col items-center rounded-[2.75rem] px-6 py-16 text-center sm:px-12 sm:py-24 md:rounded-[3.5rem]">
        <VerndlyAiIcon size={88} />

        <h2 className="mt-8 max-w-3xl text-4xl font-semibold leading-[1.02] tracking-[-0.04em] sm:text-6xl">
          Experience AI-native shopping and selling today.
        </h2>
        <p className="mt-4 max-w-xl text-sm leading-relaxed opacity-75 sm:text-base">
          Ask Verndly AI to find your next verified purchase in GH₵, or open your storefront in
          minutes with zero monthly rent.
        </p>

        <div className="mt-9 flex flex-col flex-wrap justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => openVerndlyAi()}
            className="bg-background text-foreground inline-flex h-12 items-center justify-center gap-2 rounded-full px-7 text-xs font-semibold transition-transform hover:scale-[1.02] active:scale-95 sm:text-sm"
          >
            <VerndlyAiIcon size={18} animated={false} />
            <span>Ask Verndly AI</span>
          </button>

          <Link
            href="/products"
            className="bg-background/15 text-background hover:bg-background/25 inline-flex h-12 items-center justify-center gap-2 rounded-full px-7 text-xs font-semibold transition-colors sm:text-sm"
          >
            <span>Browse Marketplace</span>
            <ArrowRight className="h-4 w-4" />
          </Link>

          <Link
            href="/sell"
            className="bg-background/15 text-background hover:bg-background/25 inline-flex h-12 items-center justify-center gap-2 rounded-full px-7 text-xs font-semibold transition-colors sm:text-sm"
          >
            <span>Start Selling Free</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
