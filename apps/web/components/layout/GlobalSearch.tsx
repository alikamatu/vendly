'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, ArrowRight, ShoppingBag, Store, Tag, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { productApi } from '@/lib/api/product';
import { getProductPath } from '@/lib/product-slug';
import Portal from '../common/Portal';
import Spinner from '@/components/ui/Spinner';

// aliases used to bypass strict framer-motion prop typings
const MotionDiv: any = motion.div;
const MotionButton: any = motion.button;

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCats, setIsLoadingCats] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const fetchCategories = async () => {
    try {
      setIsLoadingCats(true);
      const data = await productApi.getCategories();
      setCategories(data);
    } catch (err) {
      console.error('Failed to fetch categories', err);
    } finally {
      setIsLoadingCats(false);
    }
  };

  const fetchSuggestions = async () => {
    try {
      setIsLoading(true);
      const data = await productApi.searchProducts(query);
      setSuggestions(data);
    } catch (err) {
      console.error('Failed to search products', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      fetchCategories();
    } else {
      document.body.style.overflow = 'unset';
      setQuery('');
      setSuggestions([]);
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 500); // Slightly longer wait for portal/animation
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (query.trim().length > 1) {
        fetchSuggestions();
      } else {
        setSuggestions([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const handleSelect = (item: any) => {
    router.push(getProductPath(item));
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  };

  return (
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[10000] flex items-end">
            <MotionDiv
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="absolute inset-0 bg-black/60"
            />

            <MotionDiv
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 32, stiffness: 350 }}
              drag="y"
              dragConstraints={{ top: 0 }}
              dragElastic={0.2}
              onDragEnd={(_event: any, info: any) => {
                if (info.offset.y > 100) onClose();
              }}
              className="bg-background border-border relative flex h-[90vh] w-full flex-col overflow-hidden rounded-t-[3rem] border-t shadow-2xl md:h-[85vh]"
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              <div className="bg-border/40 mx-auto mt-4 h-1.5 w-16 shrink-0 rounded-full" />

              <header className="border-border/50 shrink-0 border-b px-6 pb-6 pt-6 md:px-12 md:pt-10">
                <div className="mx-auto flex max-w-4xl items-center gap-4">
                  <div className="group relative flex-1">
                    <Search className="text-muted group-focus-within:text-primary absolute left-6 top-1/2 h-5 w-5 -translate-y-1/2 transition-colors" />
                    <input
                      ref={inputRef}
                      type="text"
                      placeholder="Search products, categories, stores..."
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="bg-surface/50 border-border/50 focus:border-primary/50 focus:ring-primary/5 h-14 w-full rounded-3xl border-2 pl-14 pr-14 text-sm font-normal outline-none transition-all focus:ring-4 md:h-16 md:text-base"
                    />
                    {isLoading && (
                      <div className="absolute right-14 top-1/2 -translate-y-1/2">
                        <Spinner size="sm" />
                      </div>
                    )}
                  </div>
                  <button
                    onClick={onClose}
                    className="bg-surface border-border/50 text-muted rounded-2xl border p-3 shadow-sm transition-all active:scale-90 md:p-4"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </header>

              <div className="flex-1 overflow-y-auto px-6 py-8 md:px-12 md:py-10">
                <div className="mx-auto max-w-4xl space-y-10">
                  {query.length > 0 ? (
                    <div className="space-y-6">
                      <p className="text-primary/60 px-2 text-[10px] font-medium uppercase tracking-[0.3em]">
                        Results
                      </p>
                      {suggestions.length > 0 ? (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          {suggestions.map((item, idx) => (
                            <MotionButton
                              key={item.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: idx * 0.03 }}
                              onClick={() => handleSelect(item)}
                              className="bg-surface/30 border-border/50 hover:border-primary/30 hover:bg-primary group flex items-center gap-4 rounded-3xl border p-4 text-left transition-all"
                            >
                              <div className="border-border/50 group relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border bg-white">
                                {item.video_url ? (
                                  <video
                                    src={item.video_url}
                                    autoPlay
                                    muted
                                    loop
                                    playsInline
                                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                                  />
                                ) : (
                                  <img
                                    src={item.image_urls[0] || '/placeholder.png'}
                                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                                    alt=""
                                  />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className="mb-1 truncate text-xs font-medium uppercase tracking-tight">
                                  {item.title}
                                </h4>
                                <div className="flex items-center gap-3">
                                  <span className="text-primary text-[9px] font-medium uppercase tracking-wider">
                                    {item.category}
                                  </span>
                                  <span className="text-muted text-[9px] font-normal uppercase italic tracking-wider">
                                    {item.seller.store_name}
                                  </span>
                                </div>
                              </div>
                              <ArrowRight className="text-primary h-4 w-4 opacity-0 transition-all group-hover:opacity-100" />
                            </MotionButton>
                          ))}
                        </div>
                      ) : (
                        !isLoading && (
                          <div className="space-y-4 py-20 text-center">
                            <ShoppingBag className="text-muted mx-auto h-12 w-12 opacity-10" />
                            <p className="text-muted text-[11px] font-medium uppercase tracking-wider">
                              No products found
                            </p>
                          </div>
                        )
                      )}
                    </div>
                  ) : (
                    <div className="space-y-10">
                      <section className="space-y-6">
                        <div className="flex items-center gap-3">
                          <Sparkles className="text-primary h-4 w-4" />
                          <h3 className="text-foreground text-[11px] font-medium uppercase tracking-[0.3em]">
                            Trending Categories
                          </h3>
                        </div>
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                          {isLoadingCats
                            ? Array.from({ length: 8 }).map((_, i) => (
                                <div
                                  key={i}
                                  className="bg-surface h-14 animate-pulse rounded-2xl"
                                />
                              ))
                            : categories.map((cat, idx) => (
                                <MotionButton
                                  key={cat.id}
                                  initial={{ opacity: 0, scale: 0.9 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ delay: idx * 0.04 }}
                                  onClick={() => setQuery(cat.name)}
                                  className="bg-surface border-border/50 hover:border-primary/30 group flex items-center gap-3 rounded-3xl border p-4 text-left transition-all hover:bg-white active:scale-95"
                                >
                                  <Tag className="text-primary h-4 w-4 transition-transform group-hover:rotate-12" />
                                  <span className="truncate text-[10px] font-medium uppercase tracking-tight">
                                    {cat.name}
                                  </span>
                                </MotionButton>
                              ))}
                        </div>
                      </section>
                    </div>
                  )}
                </div>
              </div>

              <footer className="border-border/50 bg-background flex shrink-0 items-center justify-between border-t px-10 py-6">
                <p className="text-muted text-[9px] font-medium uppercase tracking-wider opacity-40">
                  Drag down to close
                </p>
                <div className="bg-primary h-1.5 w-1.5 animate-pulse rounded-full" />
              </footer>
            </MotionDiv>
          </div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
