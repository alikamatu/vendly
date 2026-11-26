'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowUp, RotateCcw, ShoppingBag, X } from 'lucide-react';
import Portal from '@/components/common/Portal';
import VerndlyAiIcon from '@/components/ai/VerndlyAiIcon';
import Alert from '@/components/ui/Alert';
import { aiApi, type AiBuyerSearchResponse } from '@/lib/api/ai';
import { getProductPath } from '@/lib/product-slug';
import { OPEN_VERNDLY_AI_EVENT, type OpenVerndlyAiDetail } from '@/lib/ai/open-verndly-ai';

const EASE_OUT_EXPO = [0.22, 1, 0.36, 1] as const;

const STARTER_PROMPTS = [
  'Gift ideas under GH₵ 200',
  'Headphones under GH₵ 350',
  'Best deals right now',
  'Affordable sneakers in stock',
];

const HIDDEN_LAUNCHER_PREFIXES = [
  '/dashboard',
  '/admin',
  '/cart/checkout',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/seller-verification',
  '/create-store',
  '/onboarding',
];

interface AssistantTurn {
  id: string;
  prompt: string;
  status: 'loading' | 'done' | 'error';
  result?: AiBuyerSearchResponse;
  error?: string;
}

function formatGhs(value: number | string | undefined | null): string {
  if (value === undefined || value === null) return '';
  const n = typeof value === 'number' ? value : parseFloat(value);
  if (!Number.isFinite(n) || n <= 0) return '';
  return `GH₵ ${n.toLocaleString('en-GH', { maximumFractionDigits: 2 })}`;
}

function buildFilterPills(res: AiBuyerSearchResponse): string[] {
  const pills: string[] = [];
  const f = res.filters;
  if (f.category) pills.push(f.category);
  if (f.min_price !== null && f.max_price !== null) {
    pills.push(`GH₵ ${f.min_price} – ${f.max_price}`);
  } else if (f.max_price !== null) {
    pills.push(`Under GH₵ ${f.max_price}`);
  } else if (f.min_price !== null) {
    pills.push(`From GH₵ ${f.min_price}`);
  }
  if (f.condition) {
    pills.push(
      f.condition === 'new' ? 'Brand New' : f.condition === 'used' ? 'Pre-owned' : 'Refurbished',
    );
  }
  if (f.sort === 'price_asc') pills.push('Lowest price');
  if (f.sort === 'price_desc') pills.push('Premium');
  if (f.sort === 'discount_desc') pills.push('Best deals');
  if (f.sort === 'popular') pills.push('Popular');
  return pills;
}

export default function VerndlyAiAssistant() {
  const pathname = usePathname() || '/';
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [input, setInput] = useState('');
  const [turns, setTurns] = useState<AssistantTurn[]>([]);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const isLoading = turns.some((t) => t.status === 'loading');

  const hideFloatingLauncher = HIDDEN_LAUNCHER_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix),
  );

  const openModal = useCallback(() => {
    setMounted(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsOpen(true);
        window.setTimeout(() => inputRef.current?.focus(), 180);
      });
    });
  }, []);

  const closeModal = useCallback(() => {
    setIsOpen(false);
    window.setTimeout(() => setMounted(false), 300);
  }, []);

  const submitPrompt = useCallback(async (rawPrompt: string) => {
    const clean = rawPrompt.trim();
    if (clean.length < 2) return;

    const turnId = `ai_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setInput('');
    setTurns((prev) => [...prev, { id: turnId, prompt: clean, status: 'loading' }]);

    try {
      const res = await aiApi.buyerSearch(clean, 8);
      setTurns((prev) =>
        prev.map((t) => (t.id === turnId ? { ...t, status: 'done', result: res } : t)),
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Verndly AI could not search right now. Please try again.';
      setTurns((prev) =>
        prev.map((t) => (t.id === turnId ? { ...t, status: 'error', error: message } : t)),
      );
    }
  }, []);

  // Listen to global `open-verndly-ai` triggers from Navbar, Hero, Homepage, Footer, etc.
  useEffect(() => {
    const handleOpenEvent = (e: Event) => {
      const detail = (e as CustomEvent<OpenVerndlyAiDetail>).detail;
      openModal();
      if (detail?.prompt && detail.prompt.trim().length >= 2) {
        void submitPrompt(detail.prompt);
      }
    };
    window.addEventListener(OPEN_VERNDLY_AI_EVENT, handleOpenEvent);
    return () => window.removeEventListener(OPEN_VERNDLY_AI_EVENT, handleOpenEvent);
  }, [openModal, submitPrompt]);

  // Body scroll lock & Escape close while open
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, closeModal]);

  // Auto-scroll to latest message
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [turns]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    void submitPrompt(input);
  };

  return (
    <>
      {/* Persistent Minimal Floating Launcher */}
      {!hideFloatingLauncher && !isOpen && (
        <button
          type="button"
          onClick={openModal}
          aria-label="Ask Verndly AI"
          className="bg-foreground text-background fixed bottom-5 right-4 z-40 inline-flex h-12 items-center gap-2.5 rounded-full px-3.5 text-xs font-semibold transition-transform duration-200 hover:scale-[1.03] active:scale-95 sm:bottom-6 sm:right-6 sm:px-4"
        >
          <VerndlyAiIcon size={22} />
          <span className="hidden sm:inline">Ask Verndly</span>
        </button>
      )}

      {/* Centered Conversational Assistant Modal (95dvh on mobile, sleek centered modal on sm+) */}
      {mounted && (
        <Portal>
          <div
            className={`fixed inset-0 z-[125] flex items-center justify-center p-2.5 transition-opacity duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] sm:p-6 ${
              isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
            }`}
          >
            {/* Dim Backdrop */}
            <button
              type="button"
              aria-label="Close Verndly AI"
              onClick={closeModal}
              className="fixed inset-0 cursor-default bg-black/60"
            />

            {/* Centered Modal Surface — 95% full-screen height on mobile, spacious centered card on sm+ */}
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Verndly AI Shopping Assistant"
              className={`bg-background relative z-10 flex h-[95dvh] max-h-[95dvh] w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] sm:h-[min(82dvh,700px)] sm:rounded-[2.25rem] ${
                isOpen
                  ? 'translate-y-0 scale-100 opacity-100'
                  : 'translate-y-4 scale-[0.96] opacity-0'
              }`}
            >
              {/* Header */}
              <div className="flex shrink-0 items-center justify-between gap-3 px-5 pb-3 pt-4 sm:px-6 sm:pt-5">
                <div className="flex items-center gap-3">
                  <VerndlyAiIcon
                    size={28}
                    mood={isLoading ? 'working' : turns.length > 0 ? 'happy' : 'idle'}
                  />
                  <div>
                    <h2 className="text-foreground text-sm font-semibold tracking-tight sm:text-base">
                      Verndly AI
                    </h2>
                    <p className="text-muted text-[11px]">
                      Personal shopping assistant · Verified Ghana stores
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {turns.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setTurns([])}
                      aria-label="New conversation"
                      title="Start fresh"
                      className="text-muted hover:bg-surface hover:text-foreground flex h-9 w-9 items-center justify-center rounded-full transition-colors"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={closeModal}
                    aria-label="Close Verndly AI"
                    className="bg-surface text-foreground hover:bg-foreground/[0.08] flex h-9 w-9 items-center justify-center rounded-full transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Body / Conversation Thread */}
              <div
                ref={scrollRef}
                className="flex-1 space-y-5 overflow-y-auto px-5 pb-4 pt-2 sm:px-6"
              >
                {turns.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: EASE_OUT_EXPO }}
                    className="flex h-full flex-col items-center justify-center space-y-6 py-6 text-center"
                  >
                    <VerndlyAiIcon size={56} />

                    <div className="max-w-md space-y-2">
                      <h3 className="text-foreground text-2xl font-semibold tracking-tight sm:text-3xl">
                        What can I find for you?
                      </h3>
                      <p className="text-muted text-xs leading-relaxed sm:text-sm">
                        Describe an item, gift idea, or GH₵ budget in plain English — Verndly AI
                        searches verified Ghanaian stores instantly.
                      </p>
                    </div>

                    <div className="flex max-w-lg flex-wrap items-center justify-center gap-2 pt-1">
                      {STARTER_PROMPTS.map((prompt) => (
                        <button
                          key={prompt}
                          type="button"
                          onClick={() => void submitPrompt(prompt)}
                          className="bg-surface text-foreground hover:bg-foreground hover:text-background rounded-full px-4 py-2 text-xs font-medium transition-colors"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                ) : (
                  turns.map((turn) => (
                    <motion.div
                      key={turn.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.28, ease: EASE_OUT_EXPO }}
                      className="space-y-3.5"
                    >
                      {/* User Prompt Bubble */}
                      <div className="flex justify-end">
                        <div className="bg-foreground text-background max-w-[85%] rounded-2xl rounded-br-sm px-4 py-2.5 text-xs font-medium leading-relaxed sm:text-sm">
                          {turn.prompt}
                        </div>
                      </div>

                      {/* Verndly AI Loading State */}
                      {turn.status === 'loading' && (
                        <div className="flex items-center gap-2.5">
                          <VerndlyAiIcon size={22} mood="working" />
                          <div className="inline-flex items-center rounded-full bg-white px-3.5 py-2 text-xs font-medium text-neutral-950">
                            <span>Searching verified stores…</span>
                            <span
                              aria-hidden="true"
                              className="verndly-caret ml-1 inline-block h-[13px] w-[2px] rounded-full bg-red-700"
                            />
                          </div>
                        </div>
                      )}

                      {/* Error State */}
                      {turn.status === 'error' && (
                        <Alert
                          variant="error"
                          message={turn.error || 'Could not complete your request.'}
                        />
                      )}

                      {/* AI Results */}
                      {turn.status === 'done' && turn.result && (
                        <div className="space-y-3">
                          <div className="flex items-start gap-2.5">
                            <div className="mt-0.5 shrink-0">
                              <VerndlyAiIcon size={20} mood="happy" animated={false} />
                            </div>
                            <div className="min-w-0 flex-1 space-y-2">
                              <p className="text-foreground text-xs leading-relaxed sm:text-sm">
                                {turn.result.summary}
                              </p>

                              {buildFilterPills(turn.result).length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                  {buildFilterPills(turn.result).map((pill) => (
                                    <span
                                      key={pill}
                                      className="bg-surface text-muted rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
                                    >
                                      {pill}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          {turn.result.products.length > 0 ? (
                            <div className="space-y-2.5 sm:pl-7">
                              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                {turn.result.products.slice(0, 6).map((p) => {
                                  const thumb = p.image_urls?.[0];
                                  return (
                                    <Link
                                      key={p.id}
                                      href={getProductPath(p)}
                                      onClick={closeModal}
                                      className="bg-surface hover:bg-foreground/[0.06] group flex items-center gap-3 rounded-2xl p-2.5 transition-colors"
                                    >
                                      <div className="bg-background relative h-14 w-14 shrink-0 overflow-hidden rounded-xl">
                                        {thumb ? (
                                          // eslint-disable-next-line @next/next/no-img-element
                                          <img
                                            src={thumb}
                                            alt={p.title}
                                            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                                          />
                                        ) : (
                                          <div className="text-muted flex h-full w-full items-center justify-center">
                                            <ShoppingBag className="h-4 w-4" />
                                          </div>
                                        )}
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <p className="text-foreground truncate text-xs font-semibold">
                                          {p.title}
                                        </p>
                                        <p className="text-muted truncate text-[11px]">
                                          {p.seller?.store_name || p.category}
                                        </p>
                                        <div className="mt-0.5 flex items-center gap-2">
                                          <span className="text-foreground text-xs font-bold">
                                            {formatGhs(p.price)}
                                          </span>
                                          {p.original_price &&
                                            Number(p.original_price) > Number(p.price) && (
                                              <span className="text-muted text-[10px] line-through">
                                                {formatGhs(p.original_price)}
                                              </span>
                                            )}
                                        </div>
                                      </div>
                                      <ArrowRight className="text-muted group-hover:text-foreground h-3.5 w-3.5 shrink-0 transition-transform group-hover:translate-x-0.5" />
                                    </Link>
                                  );
                                })}
                              </div>

                              <Link
                                href={turn.result.browseUrl || '/products'}
                                onClick={closeModal}
                                className="bg-foreground text-background inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-full text-xs font-semibold transition-opacity hover:opacity-90"
                              >
                                <span>
                                  Browse{' '}
                                  {turn.result.total > 6
                                    ? `all ${turn.result.total} matches`
                                    : 'on marketplace'}
                                </span>
                                <ArrowRight className="h-3.5 w-3.5" />
                              </Link>
                            </div>
                          ) : (
                            <div className="bg-surface text-muted rounded-2xl p-3.5 text-xs sm:ml-7">
                              No exact matches found right now — try broadening your budget or
                              keywords.
                            </div>
                          )}
                        </div>
                      )}
                    </motion.div>
                  ))
                )}
              </div>

              {/* Footer Composer */}
              <div className="shrink-0 space-y-2.5 px-5 pb-4 pt-2 sm:px-6 sm:pb-5">
                <form
                  onSubmit={handleFormSubmit}
                  className="bg-surface flex items-center gap-2 rounded-full p-1.5 pl-4"
                >
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask Verndly AI anything to shop…"
                    disabled={isLoading}
                    className="text-foreground placeholder:text-muted/65 min-w-0 flex-1 bg-transparent text-xs outline-none sm:text-sm"
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    aria-label="Send to Verndly AI"
                    className="bg-foreground text-background flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-opacity hover:opacity-90 disabled:opacity-35"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                </form>

                <div className="flex items-center justify-between px-2 text-[11px]">
                  <span className="text-muted">Escrow-protected verified stores</span>
                  <Link
                    href="/dashboard/products/add"
                    onClick={closeModal}
                    className="text-foreground font-medium hover:underline"
                  >
                    Sell with Verndly AI →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}
