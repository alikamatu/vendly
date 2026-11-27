'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, ArrowRight, ShoppingBag, Tag } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { productApi } from '@/lib/api/product';
import { aiApi, AiBuyerSearchResponse } from '@/lib/api/ai';
import { getProductPath } from '@/lib/product-slug';
import Portal from '../common/Portal';
import VerndlyAiIcon from '@/components/ai/VerndlyAiIcon';

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

interface QuickProduct {
  id: string;
  slug?: string;
  title: string;
  price?: number | string;
  currency?: string;
  category: string;
  image_urls: string[];
  video_url?: string | null;
  seller: {
    store_name: string;
  };
}

interface CategoryItem {
  id: string;
  name: string;
}

const AI_STARTER_PROMPTS = [
  'Gift ideas under GH₵ 200',
  'Brand new headphones under 350',
  'Affordable sneakers in stock',
  'Best deals on electronics',
];

const EASE_SMOOTH = [0.22, 1, 0.36, 1] as const;

function formatPriceGhs(price: number | string | undefined): string {
  if (price === undefined || price === null) return '';
  const num = typeof price === 'number' ? price : parseFloat(price);
  if (!Number.isFinite(num) || num <= 0) return '';
  return `GH₵ ${num.toLocaleString('en-GH', { maximumFractionDigits: 2 })}`;
}

export default function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<QuickProduct[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCats, setIsLoadingCats] = useState(false);

  // Verndly AI natural-language buyer search state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AiBuyerSearchResponse | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleClose = useCallback(() => {
    setQuery('');
    setSuggestions([]);
    setAiResult(null);
    setAiError(null);
    setAiLoading(false);
    onClose();
  }, [onClose]);

  // Body scroll lock & initial categories load when opened
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    let cancelled = false;
    setIsLoadingCats(true);
    productApi
      .getCategories()
      .then((data) => {
        if (!cancelled && Array.isArray(data)) {
          setCategories(data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsLoadingCats(false);
      });

    const focusTimer = setTimeout(() => {
      inputRef.current?.focus();
    }, 180);

    return () => {
      cancelled = true;
      clearTimeout(focusTimer);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, handleClose]);

  // Debounced instant keyword suggestions
  useEffect(() => {
    if (!isOpen) return;
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const data = await productApi.searchProducts(trimmed);
        if (!cancelled && Array.isArray(data)) {
          setSuggestions(data as QuickProduct[]);
        }
      } catch {
        if (!cancelled) setSuggestions([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }, 280);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, isOpen]);

  const runAiSearch = useCallback(async (rawText: string) => {
    const clean = rawText.trim();
    if (clean.length < 2) return;
    setQuery(clean);
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await aiApi.buyerSearch(clean, 12);
      setAiResult(res);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Verndly AI could not search right now. Try again in a moment.';
      setAiError(message);
    } finally {
      setAiLoading(false);
    }
  }, []);

  const handleSelectProduct = (item: QuickProduct) => {
    router.push(getProductPath(item));
    handleClose();
  };

  const handleBrowseUrl = (url: string) => {
    router.push(url);
    handleClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && query.trim().length >= 2) {
      e.preventDefault();
      runAiSearch(query);
    }
  };

  // Build readable filter pills from Verndly AI's parsed plan
  const aiFilterPills: string[] = [];
  if (aiResult && aiResult.intent !== 'chat') {
    const f = aiResult.filters;
    if (f.category) aiFilterPills.push(f.category);
    if (f.subcategory && f.subcategory.toLowerCase() !== (f.category || '').toLowerCase()) {
      aiFilterPills.push(f.subcategory);
    }
    if (f.brand) aiFilterPills.push(f.brand);
    if (f.min_price !== null && f.max_price !== null) {
      aiFilterPills.push(`GH₵ ${f.min_price} – ${f.max_price}`);
    } else if (f.max_price !== null) {
      aiFilterPills.push(`Under GH₵ ${f.max_price}`);
    } else if (f.min_price !== null) {
      aiFilterPills.push(`From GH₵ ${f.min_price}`);
    }
    if (f.condition) {
      aiFilterPills.push(
        f.condition === 'new' ? 'Brand New' : f.condition === 'used' ? 'Pre-owned' : 'Refurbished',
      );
    }
    if (f.sort === 'price_asc') aiFilterPills.push('Lowest price');
    if (f.sort === 'price_desc') aiFilterPills.push('Highest price');
    if (f.sort === 'discount_desc') aiFilterPills.push('Best deals');
    if (f.sort === 'popular') aiFilterPills.push('Most popular');
  }

  const displayedProducts = aiResult ? aiResult.products : suggestions;

  return (
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[120] flex items-end justify-center sm:items-start sm:p-4 sm:pt-14">
            {/* Soft Fading Backdrop */}
            <motion.div
              key="global-search-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="fixed inset-0 bg-black/60"
            >
              <button
                type="button"
                aria-label="Close search"
                onClick={handleClose}
                className="h-full w-full cursor-default"
              />
            </motion.div>

            {/* Flat Tonal Borderless Search Sheet */}
            <motion.div
              key="global-search-sheet"
              initial={{ y: 24, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 20, opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.26, ease: EASE_SMOOTH }}
              className="bg-background relative z-10 flex h-[88dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl sm:h-auto sm:max-h-[82vh] sm:rounded-3xl"
            >
              {/* Search Bar Header */}
              <div className="shrink-0 px-4 pb-3 pt-4 sm:px-6 sm:pt-5">
                <div className="flex items-center gap-2.5">
                  <div className="bg-surface flex min-w-0 flex-1 items-center gap-2.5 rounded-2xl px-3.5 py-2.5 sm:px-4 sm:py-3">
                    <Search className="text-muted h-4 w-4 shrink-0" />
                    <input
                      ref={inputRef}
                      type="text"
                      placeholder="Ask Verndly AI or search products… e.g. headphones under 350"
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value);
                        if (aiResult) setAiResult(null);
                        if (aiError) setAiError(null);
                      }}
                      onKeyDown={handleKeyDown}
                      className="text-foreground placeholder:text-muted/70 min-w-0 flex-1 bg-transparent text-sm outline-none"
                    />
                    {query && (
                      <button
                        type="button"
                        onClick={() => {
                          setQuery('');
                          setSuggestions([]);
                          setAiResult(null);
                          setAiError(null);
                          inputRef.current?.focus();
                        }}
                        aria-label="Clear search"
                        className="text-muted hover:text-foreground rounded-lg p-1 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={aiLoading || query.trim().length < 2}
                      onClick={() => runAiSearch(query)}
                      className="bg-foreground text-background inline-flex h-8 shrink-0 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold transition-opacity hover:opacity-90 disabled:opacity-35"
                    >
                      <VerndlyAiIcon size={16} mood={aiLoading ? 'working' : 'idle'} />
                      <span className="hidden sm:inline">Ask Verndly AI</span>
                      <span className="sm:hidden">Ask AI</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleClose}
                    aria-label="Close search"
                    className="bg-surface text-muted hover:text-foreground flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Scrollable Results / Discovery Area */}
              <div className="flex-1 overflow-y-auto px-4 pb-6 pt-2 sm:px-6">
                {/* Verndly AI Centered Working State inside sheet */}
                {aiLoading ? (
                  <div className="flex flex-col items-center justify-center gap-4 py-14 text-center">
                    <motion.div
                      animate={{ y: [0, -6, 0] }}
                      transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      <VerndlyAiIcon size={64} mood="working" />
                    </motion.div>
                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-red-700 dark:text-red-400">
                        Verndly AI
                      </p>
                      <p className="text-foreground text-sm font-semibold">
                        Understanding what you&apos;re looking for…
                      </p>
                      <p className="text-muted text-xs">
                        Matching your budget, preferences, and verified Ghana stores.
                      </p>
                    </div>
                  </div>
                ) : aiError ? (
                  <div className="bg-surface space-y-3 rounded-2xl p-5 text-center">
                    <p className="text-foreground text-sm font-semibold">{aiError}</p>
                    <button
                      type="button"
                      onClick={() => runAiSearch(query)}
                      className="bg-foreground text-background inline-flex h-9 items-center rounded-xl px-4 text-xs font-semibold"
                    >
                      Try again
                    </button>
                  </div>
                ) : aiResult ? (
                  <div className="space-y-4">
                    {/* Verndly AI Summary & Filter Chips */}
                    <div className="bg-surface space-y-3 rounded-2xl p-4">
                      <div className="flex items-start gap-3">
                        <VerndlyAiIcon size={28} mood="happy" />
                        <div className="min-w-0 flex-1 space-y-2">
                          <p className="text-foreground text-sm font-medium leading-snug">
                            {aiResult.summary}
                          </p>
                          {aiFilterPills.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {aiFilterPills.map((pill) => (
                                <span
                                  key={pill}
                                  className="bg-background text-foreground rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                                >
                                  {pill}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {Array.isArray(aiResult.follow_ups) && aiResult.follow_ups.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {aiResult.follow_ups.slice(0, 3).map((chip) => (
                            <button
                              key={chip}
                              type="button"
                              onClick={() => void runAiSearch(chip)}
                              className="bg-background text-foreground hover:bg-foreground hover:text-background rounded-full px-3 py-1 text-[11px] font-medium transition-colors"
                            >
                              {chip}
                            </button>
                          ))}
                        </div>
                      )}

                      {aiResult.intent !== 'chat' && (
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-muted text-xs font-medium">
                            {aiResult.total} {aiResult.total === 1 ? 'listing' : 'listings'} found
                          </span>
                          <button
                            type="button"
                            onClick={() => handleBrowseUrl(aiResult.browseUrl)}
                            className="text-foreground inline-flex items-center gap-1 text-xs font-semibold hover:underline"
                          >
                            <span>View all in catalog</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {displayedProducts.length > 0 ? (
                      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                        {displayedProducts.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleSelectProduct(item)}
                            className="bg-surface hover:bg-foreground/[0.06] group flex items-center gap-3.5 rounded-2xl p-3 text-left transition-colors"
                          >
                            <div className="bg-background h-14 w-14 shrink-0 overflow-hidden rounded-xl">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={item.image_urls?.[0] || '/placeholder-product.png'}
                                alt={item.title}
                                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-foreground truncate text-sm font-semibold">
                                {item.title}
                              </p>
                              <div className="mt-0.5 flex items-center gap-2 text-xs">
                                <span className="text-foreground font-bold">
                                  {formatPriceGhs(item.price)}
                                </span>
                                <span className="text-muted truncate">
                                  · {item.seller?.store_name}
                                </span>
                              </div>
                            </div>
                            <ArrowRight className="text-muted group-hover:text-foreground h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
                          </button>
                        ))}
                      </div>
                    ) : aiResult.intent !== 'chat' ? (
                      <div className="bg-surface space-y-3 rounded-2xl py-10 text-center">
                        <ShoppingBag className="text-muted mx-auto h-8 w-8 opacity-40" />
                        <div className="space-y-1">
                          <p className="text-foreground text-sm font-semibold">
                            No matching items in stock right now
                          </p>
                          <p className="text-muted text-xs">
                            Try a broader budget or browse all Verndly stores.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleBrowseUrl('/products')}
                          className="bg-foreground text-background inline-flex h-9 items-center rounded-xl px-4 text-xs font-semibold"
                        >
                          Browse Shop
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : query.trim().length > 0 ? (
                  <div className="space-y-4">
                    {/* Prominent 1-tap Verndly AI prompt for natural-language queries */}
                    <button
                      type="button"
                      onClick={() => runAiSearch(query)}
                      className="bg-surface hover:bg-foreground/[0.06] flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left transition-colors"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <VerndlyAiIcon size={24} />
                        <div className="min-w-0">
                          <p className="text-foreground truncate text-xs font-semibold sm:text-sm">
                            Ask Verndly AI: &ldquo;{query.trim()}&rdquo;
                          </p>
                          <p className="text-muted text-[11px]">
                            Press Enter to filter by price, category, and intent automatically
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="text-muted h-4 w-4 shrink-0" />
                    </button>

                    {isLoading ? (
                      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                        {Array.from({ length: 4 }).map((_, i) => (
                          <div key={i} className="bg-surface h-20 animate-pulse rounded-2xl" />
                        ))}
                      </div>
                    ) : suggestions.length > 0 ? (
                      <div className="space-y-2.5">
                        <p className="text-muted px-1 text-xs font-semibold">Quick matches</p>
                        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                          {suggestions.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => handleSelectProduct(item)}
                              className="bg-surface hover:bg-foreground/[0.06] group flex items-center gap-3.5 rounded-2xl p-3 text-left transition-colors"
                            >
                              <div className="bg-background h-14 w-14 shrink-0 overflow-hidden rounded-xl">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={item.image_urls?.[0] || '/placeholder-product.png'}
                                  alt={item.title}
                                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-foreground truncate text-sm font-semibold">
                                  {item.title}
                                </p>
                                <div className="mt-0.5 flex items-center gap-2 text-xs">
                                  {formatPriceGhs(item.price) && (
                                    <span className="text-foreground font-bold">
                                      {formatPriceGhs(item.price)}
                                    </span>
                                  )}
                                  <span className="text-muted truncate">
                                    {item.category} · {item.seller?.store_name}
                                  </span>
                                </div>
                              </div>
                              <ArrowRight className="text-muted group-hover:text-foreground h-4 w-4 shrink-0" />
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2 py-10 text-center">
                        <p className="text-foreground text-sm font-medium">
                          No exact title matches for &ldquo;{query.trim()}&rdquo;
                        </p>
                        <p className="text-muted text-xs">
                          Tap <strong>Ask Verndly AI</strong> above to search by budget, occasion,
                          or style.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Empty state: Verndly AI natural-language prompts + Categories */
                  <div className="space-y-6 py-2">
                    <section className="space-y-3">
                      <VerndlyAiIcon
                        size={20}
                        showName
                        nameClassName="text-xs font-semibold text-foreground"
                      />
                      <div className="flex flex-wrap gap-2">
                        {AI_STARTER_PROMPTS.map((prompt) => (
                          <button
                            key={prompt}
                            type="button"
                            onClick={() => runAiSearch(prompt)}
                            className="bg-surface text-foreground hover:bg-foreground/[0.06] rounded-full px-3.5 py-2 text-xs font-medium transition-colors"
                          >
                            {prompt}
                          </button>
                        ))}
                      </div>
                    </section>

                    <section className="space-y-3">
                      <p className="text-muted px-1 text-xs font-semibold">Browse categories</p>
                      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                        {isLoadingCats
                          ? Array.from({ length: 6 }).map((_, i) => (
                              <div key={i} className="bg-surface h-12 animate-pulse rounded-2xl" />
                            ))
                          : categories.map((cat) => (
                              <button
                                key={cat.id}
                                type="button"
                                onClick={() =>
                                  handleBrowseUrl(
                                    `/products?category=${encodeURIComponent(cat.name)}`,
                                  )
                                }
                                className="bg-surface text-foreground hover:bg-foreground/[0.06] flex items-center gap-2.5 rounded-2xl px-3.5 py-3 text-left text-xs font-semibold transition-colors"
                              >
                                <Tag className="text-muted h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">{cat.name}</span>
                              </button>
                            ))}
                      </div>
                    </section>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
