'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowUp, Camera, Globe, MessageCircle } from 'lucide-react';
import VerndlyAiIcon from '@/components/ai/VerndlyAiIcon';
import { openVerndlyAi } from '@/lib/ai/open-verndly-ai';
import { aiApi, type AiBuyerSearchResponse } from '@/lib/api/ai';
import { getProductPath } from '@/lib/product-slug';
import HeroVerndlyOrb from './HeroVerndlyOrb';
import { EASE_OUT_EXPO, SPRING_GLIDE } from './types';

const LIVE_THOUGHTS = [
  'Finding verified sneakers under GH₵ 350 in Accra…',
  'Turning 12 raw product photos into a live store…',
  'Importing your website & WhatsApp catalog automatically…',
  'Protecting Mobile Money orders in 3-day escrow…',
];

const SHOP_PROMPTS = [
  { label: 'Gifts under GH₵ 250', query: 'thoughtful gift ideas under 250 cedis' },
  { label: 'Laptops & audio', query: 'verified laptops headphones and electronics in stock' },
  { label: 'Handmade fashion', query: 'authentic fashion clothing sandals and bags in stock' },
  { label: 'Skincare & parfum', query: 'perfume skincare and shea butter under 300 cedis' },
  { label: 'Best deals today', query: 'best discounted products on sale right now' },
];

interface AiNativeHeroProps {
  /** Slightly tighter bottom padding when embedded above home rails */
  compactBottom?: boolean;
}

/**
 * Reusable monumental Google × Apple × Linear AI-native hero section.
 * Shared across `/` (`HomeView`) and `/homepage` (`AiNativeHomepage`).
 */
type HeroSearchStatus = 'idle' | 'loading' | 'done' | 'error';

function formatGhs(value: number | string | undefined | null): string {
  if (value === undefined || value === null) return '';
  const n = typeof value === 'number' ? value : parseFloat(value);
  if (!Number.isFinite(n) || n <= 0) return '';
  return `GH₵ ${n.toLocaleString('en-GH', { maximumFractionDigits: 0 })}`;
}

export default function AiNativeHero({ compactBottom = false }: AiNativeHeroProps) {
  const [heroMode, setHeroMode] = useState<'shop' | 'sell'>('shop');
  const [promptInput, setPromptInput] = useState('');
  const [thoughtIndex, setThoughtIndex] = useState(0);
  const [searchStatus, setSearchStatus] = useState<HeroSearchStatus>('idle');
  const [searchResult, setSearchResult] = useState<AiBuyerSearchResponse | null>(null);
  const [searchError, setSearchError] = useState('');
  const searchSeq = useRef(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setThoughtIndex((i) => (i + 1) % LIVE_THOUGHTS.length);
    }, 3600);
    return () => window.clearInterval(id);
  }, []);

  const runSearch = async (raw: string) => {
    const query = raw.trim();
    if (query.length < 2) return;
    const seq = ++searchSeq.current;
    setPromptInput(query);
    setSearchError('');
    setSearchStatus('loading');
    try {
      const res = await aiApi.buyerSearch(query, 6);
      if (seq !== searchSeq.current) return;
      setSearchResult(res);
      setSearchStatus('done');
    } catch (err: unknown) {
      if (seq !== searchSeq.current) return;
      setSearchResult(null);
      setSearchError(
        err instanceof Error ? err.message : 'Verndly could not search right now. Try again.',
      );
      setSearchStatus('error');
    }
  };

  const handleHeroSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchStatus === 'loading') return;
    void runSearch(promptInput);
  };

  return (
    <section
      aria-labelledby="ai-homepage-hero-heading"
      className={`mx-auto flex max-w-6xl flex-col items-center px-4 pt-8 text-center sm:px-6 md:pt-14 ${
        compactBottom ? 'pb-12 md:pb-16' : 'pb-20 md:pb-32'
      }`}
    >
      {/* Huge Interactive Verndly AI Avatar + Live Thought Pill */}
      <motion.div
        initial={{ opacity: 0, scale: 0.88, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.7, ease: EASE_OUT_EXPO }}
        className="mb-7 flex flex-col items-center gap-4 sm:mb-9"
      >
        <HeroVerndlyOrb
          onClick={() => openVerndlyAi()}
          isTypingPrompt={promptInput.trim().length > 0}
        />

        <div className="bg-surface inline-flex min-h-9 max-w-[92vw] items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium">
          <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-red-600" />
          <AnimatePresence mode="wait">
            <motion.span
              key={thoughtIndex}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.24, ease: EASE_OUT_EXPO }}
              className="text-foreground truncate"
            >
              {LIVE_THOUGHTS[thoughtIndex]}
            </motion.span>
          </AnimatePresence>
          <span
            aria-hidden="true"
            className="verndly-caret inline-block h-3.5 w-[2px] shrink-0 rounded-full bg-red-700"
          />
        </div>
      </motion.div>

      {/* Monumental Display Headline */}
      <motion.div
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.75, delay: 0.08, ease: EASE_OUT_EXPO }}
        className="max-w-5xl"
      >
        <h1
          id="ai-homepage-hero-heading"
          className="text-5xl font-semibold leading-[0.96] tracking-[-0.045em] sm:text-7xl md:text-8xl lg:text-[6.25rem]"
        >
          Commerce, <span className="text-muted font-normal">native to intelligence.</span>
        </h1>
      </motion.div>

      <motion.p
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.75, delay: 0.16, ease: EASE_OUT_EXPO }}
        className="text-muted mt-6 max-w-2xl text-base leading-relaxed sm:mt-8 sm:text-xl"
      >
        Verndly is Ghana’s AI-native marketplace. Ask in plain English to shop verified independent
        stores — or drop product photos, a website link, or WhatsApp screenshots to launch your
        storefront in seconds.
      </motion.p>

      {/* Google-Clarity Omnibar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.75, delay: 0.24, ease: EASE_OUT_EXPO }}
        className="mt-10 w-full max-w-3xl space-y-4 sm:mt-12"
      >
        {/* Mode Switcher */}
        <div className="bg-surface mx-auto inline-flex rounded-full p-1">
          {(['shop', 'sell'] as const).map((mode) => {
            const active = heroMode === mode;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => setHeroMode(mode)}
                className={`relative rounded-full px-5 py-2 text-xs font-semibold transition-colors sm:text-sm ${
                  active ? 'text-foreground' : 'text-muted hover:text-foreground'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="ai-native-hero-mode-pill"
                    transition={SPRING_GLIDE}
                    className="bg-background absolute inset-0 rounded-full"
                  />
                )}
                <span className="relative z-10">
                  {mode === 'shop' ? 'Shop with Verndly AI' : 'Sell with Verndly AI'}
                </span>
              </button>
            );
          })}
        </div>

        {heroMode === 'shop' ? (
          <div className="space-y-4">
            <form
              onSubmit={handleHeroSubmit}
              className="bg-surface flex items-center gap-3 rounded-[2rem] p-2.5 pl-5 sm:p-3 sm:pl-6"
            >
              <VerndlyAiIcon size={24} animated={false} />
              <input
                type="text"
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                placeholder="Ask Verndly AI anything — e.g. perfume under GH₵ 250 in Accra…"
                aria-label="Ask Verndly AI to shop"
                className="text-foreground placeholder:text-muted/70 min-w-0 flex-1 bg-transparent py-2 text-sm outline-none sm:text-base"
              />
              <button
                type="submit"
                disabled={searchStatus === 'loading' || promptInput.trim().length < 2}
                className="bg-foreground text-background inline-flex h-12 shrink-0 items-center gap-2 rounded-full px-5 text-xs font-semibold transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-40 sm:px-6 sm:text-sm"
              >
                <span className="hidden sm:inline">Ask Verndly</span>
                <ArrowUp className="h-4 w-4" />
              </button>
            </form>

            <AnimatePresence initial={false}>
              {searchStatus !== 'idle' && (
                <motion.div
                  key="hero-search-answer"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.35, ease: EASE_OUT_EXPO }}
                  className="text-left"
                >
                  <div
                    role="status"
                    aria-live="polite"
                    className="bg-surface overflow-hidden rounded-[1.75rem] px-3 py-3 sm:px-4"
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      {searchStatus === 'loading' ? (
                        <HeroSearchSkeleton key="skeleton" />
                      ) : searchStatus === 'error' ? (
                        <motion.p
                          key="error"
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.28, ease: EASE_OUT_EXPO }}
                          className="text-muted px-2 py-3 text-sm"
                        >
                          {searchError}
                        </motion.p>
                      ) : searchResult ? (
                        <HeroSearchAnswer key="answer" result={searchResult} />
                      ) : null}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 1-Tap Prompt Pills + Direct Browse Shop CTA */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Link
                href="/products"
                className="bg-foreground text-background inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-opacity hover:opacity-90"
              >
                <span>Browse Shop</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              {SHOP_PROMPTS.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => void runSearch(item.query)}
                  className="bg-surface text-foreground hover:bg-foreground hover:text-background rounded-full px-4 py-2 text-xs font-medium transition-colors"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-surface grid grid-cols-1 gap-2.5 rounded-[2rem] p-3 sm:grid-cols-3">
            <Link
              href="/dashboard/products/add?source=upload"
              className="bg-background hover:bg-foreground hover:text-background group flex flex-col items-start justify-between gap-4 rounded-3xl p-5 text-left transition-colors"
            >
              <Camera className="h-5 w-5 text-red-600 transition-colors group-hover:text-current" />
              <div>
                <p className="text-sm font-semibold">Photos → Live Listing</p>
                <p className="text-muted mt-1 text-xs group-hover:opacity-80">
                  Drop up to 20 photos; AI writes titles, tags &amp; GH₵ prices.
                </p>
              </div>
            </Link>

            <Link
              href="/dashboard/products/add?source=website"
              className="bg-background hover:bg-foreground hover:text-background group flex flex-col items-start justify-between gap-4 rounded-3xl p-5 text-left transition-colors"
            >
              <Globe className="h-5 w-5 text-red-600 transition-colors group-hover:text-current" />
              <div>
                <p className="text-sm font-semibold">Import Website URL</p>
                <p className="text-muted mt-1 text-xs group-hover:opacity-80">
                  Pull Shopify, WooCommerce, Jumia, or custom store links.
                </p>
              </div>
            </Link>

            <Link
              href="/dashboard/products/add?source=whatsapp"
              className="bg-background hover:bg-foreground hover:text-background group flex flex-col items-start justify-between gap-4 rounded-3xl p-5 text-left transition-colors"
            >
              <MessageCircle className="h-5 w-5 text-red-600 transition-colors group-hover:text-current" />
              <div>
                <p className="text-sm font-semibold">WhatsApp Screenshots</p>
                <p className="text-muted mt-1 text-xs group-hover:opacity-80">
                  Auto-crops each product photo &amp; reads your catalog prices.
                </p>
              </div>
            </Link>
          </div>
        )}
      </motion.div>
    </section>
  );
}

function HeroSearchSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: EASE_OUT_EXPO }}
      className="space-y-3 px-1 py-1"
      aria-hidden="true"
    >
      <div className="verndly-skel h-3 w-2/3 max-w-sm rounded-full" />
      <div className="verndly-skel h-3 w-1/3 max-w-[10rem] rounded-full" />
      <div className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 rounded-2xl p-1.5">
            <div className="verndly-skel h-12 w-12 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="verndly-skel h-2.5 w-4/5 rounded-full" />
              <div className="verndly-skel h-2.5 w-1/3 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function HeroSearchAnswer({ result }: { result: AiBuyerSearchResponse }) {
  const products = result.products.slice(0, 4);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: EASE_OUT_EXPO }}
      className="space-y-3 px-1 py-1"
    >
      <p className="text-foreground px-1.5 text-sm leading-relaxed">{result.summary}</p>
      {products.length > 0 ? (
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {products.map((product, index) => {
            const thumb = product.image_urls?.[0];
            return (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.32, delay: 0.04 * index, ease: EASE_OUT_EXPO }}
              >
                <Link
                  href={getProductPath(product)}
                  className="hover:bg-background group flex items-center gap-3 rounded-2xl p-1.5 transition-colors"
                >
                  <div className="bg-background relative h-12 w-12 shrink-0 overflow-hidden rounded-xl">
                    {thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumb} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground truncate text-xs font-medium">{product.title}</p>
                    <p className="text-muted truncate text-[11px]">
                      {product.seller?.store_name || product.category}
                    </p>
                  </div>
                  <span className="text-foreground shrink-0 text-xs font-semibold">
                    {formatGhs(product.price)}
                  </span>
                </Link>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <p className="text-muted px-1.5 text-sm">Nothing matched that yet. Try a wider budget.</p>
      )}
      <Link
        href={result.browseUrl || '/products'}
        className="text-foreground inline-flex items-center gap-1 px-1.5 text-xs font-medium"
      >
        {result.total > products.length ? `See all ${result.total}` : 'Browse marketplace'}
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </motion.div>
  );
}
