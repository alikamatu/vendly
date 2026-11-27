'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Download,
  Copy,
  CheckCircle2,
  Share2,
  RefreshCw,
  Sparkles,
  AlertCircle,
  Smartphone,
  Monitor,
  Moon,
  Sun,
  Wand2,
  Maximize2,
  Minimize2,
  RotateCcw,
} from 'lucide-react';
import Spinner from '@/components/ui/Spinner';
import { getProductPath } from '@/lib/product-slug';
import { aiApi, type AiCardCopyTone } from '@/lib/api/ai';
import { useAuth } from '@/lib/contexts/auth-context';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
  product: {
    id: string;
    title: string;
    description?: string | null;
    category?: string | null;
    brand?: string | null;
    condition?: string | null;
    price?: string | number;
    original_price?: string | number | null;
    currency?: string | null;
    image_urls?: string[];
  };
  storeName?: string | null;
  storeLink?: string | null;
  storeLocation?: string | null;
}

const PUBLIC_SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || 'https://verndly.com';

type CardFormat = 'portrait' | 'landscape';
type CardTheme = 'light' | 'dark';
type ImageFit = 'cover' | 'contain';

const TONE_OPTIONS: Array<{ value: AiCardCopyTone; label: string }> = [
  { value: 'minimal', label: 'Apple / Nike' },
  { value: 'luxury', label: 'Luxury' },
  { value: 'hype', label: 'Drop Hype' },
];

/**
 * Verndly Studio Product Share Card Generator Modal
 *
 * Generates ultra-legible, Apple/Nike-style product cards for:
 *  - Story / Status (4:5, 1080×1350) — WhatsApp Status, Instagram, TikTok
 *  - Post / Link (16:9, 1200×630) — X/Twitter, WhatsApp link previews, Facebook
 *
 * Includes Verndly AI editorial copywriting (headline, tagline, blurb, badge, CTA,
 * and ready-to-paste social caption), multi-photo switching, and Studio Light / Obsidian Dark modes.
 */
export default function ShareProductCardModal({
  open,
  onClose,
  product,
  storeName,
  storeLink,
  storeLocation,
}: Props) {
  const { token } = useAuth();
  const [format, setFormat] = useState<CardFormat>('portrait');
  const [theme, setTheme] = useState<CardTheme>('light');
  const [fit, setFit] = useState<ImageFit>('cover');
  const [photoIdx, setPhotoIdx] = useState(0);
  const [tone, setTone] = useState<AiCardCopyTone>('minimal');
  const [v, setV] = useState(0);

  // Editable copy fields (empty = smart server defaults)
  const [badge, setBadge] = useState('');
  const [headline, setHeadline] = useState('');
  const [tagline, setTagline] = useState('');
  const [blurb, setBlurb] = useState('');
  const [cta, setCta] = useState('');
  const [socialCaption, setSocialCaption] = useState('');

  // Debounced copy snapshot so typing doesn't spam image renders
  const [appliedCopy, setAppliedCopy] = useState({
    badge: '',
    headline: '',
    tagline: '',
    blurb: '',
    cta: '',
  });

  const [aiGenerating, setAiGenerating] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const images = useMemo(
    () => (Array.isArray(product.image_urls) ? product.image_urls.filter(Boolean) : []),
    [product.image_urls],
  );

  // Debounce manual copy edits into the rendered image URL
  useEffect(() => {
    const timer = setTimeout(() => {
      setAppliedCopy((prev) => {
        if (
          prev.badge === badge &&
          prev.headline === headline &&
          prev.tagline === tagline &&
          prev.blurb === blurb &&
          prev.cta === cta
        ) {
          return prev;
        }
        setLoaded(false);
        setImgError(false);
        return { badge, headline, tagline, blurb, cta };
      });
    }, 420);
    return () => clearTimeout(timer);
  }, [badge, headline, tagline, blurb, cta]);

  const cardUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set('theme', theme);
    params.set('format', format);
    params.set('fit', fit);
    if (photoIdx > 0) params.set('photo', String(photoIdx));
    if (appliedCopy.badge.trim()) params.set('badge', appliedCopy.badge.trim());
    if (appliedCopy.headline.trim()) params.set('title', appliedCopy.headline.trim());
    if (appliedCopy.tagline.trim()) params.set('tagline', appliedCopy.tagline.trim());
    if (appliedCopy.blurb.trim()) params.set('blurb', appliedCopy.blurb.trim());
    if (appliedCopy.cta.trim()) params.set('cta', appliedCopy.cta.trim());
    if (v > 0) params.set('v', String(v));
    return `/api/cards/product/${product.id}?${params.toString()}`;
  }, [product.id, theme, format, fit, photoIdx, appliedCopy, v]);

  const productUrl = `${PUBLIC_SITE_URL}${getProductPath({
    id: product.id,
    title: product.title,
    storeLink,
    storeName,
  })}`;

  useEffect(() => {
    if (!open) {
      setLoaded(false);
      setCopiedLink(false);
      setCopiedCaption(false);
    }
  }, [open]);

  const hasCustomCopy = Boolean(
    badge.trim() || headline.trim() || tagline.trim() || blurb.trim() || cta.trim(),
  );

  const handleGenerateAiCopy = async (selectedTone: AiCardCopyTone = tone) => {
    setAiGenerating(true);
    try {
      const res = await aiApi.generateCardCopy(
        {
          title: product.title,
          description: product.description || undefined,
          category: product.category || undefined,
          brand: product.brand || undefined,
          condition: product.condition || undefined,
          price: product.price,
          original_price: product.original_price,
          currency: product.currency || 'GHS',
          store_name: storeName || undefined,
          location: storeLocation || undefined,
          tone: selectedTone,
        },
        token || undefined,
      );
      setBadge(res.badge);
      setHeadline(res.headline);
      setTagline(res.tagline);
      setBlurb(res.blurb);
      setCta(res.cta);
      setSocialCaption(res.social_caption);
      setLoaded(false);
      setImgError(false);
      setAppliedCopy({
        badge: res.badge,
        headline: res.headline,
        tagline: res.tagline,
        blurb: res.blurb,
        cta: res.cta,
      });
      toast.success('Verndly AI upgraded your card copy!');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not generate AI copy';
      toast.error(msg);
    } finally {
      setAiGenerating(false);
    }
  };

  const resetCopy = () => {
    setBadge('');
    setHeadline('');
    setTagline('');
    setBlurb('');
    setCta('');
    setSocialCaption('');
    setLoaded(false);
    setImgError(false);
    setAppliedCopy({ badge: '', headline: '', tagline: '', blurb: '', cta: '' });
  };

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(productUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 1600);
      toast.success('Product link copied!');
    } catch {
      toast.error("Couldn't copy. Long-press the URL instead.");
    }
  };

  const copyCaption = async () => {
    const text = socialCaption
      ? `${socialCaption}\n\n${productUrl}`
      : `${headline || product.title}\n${productUrl}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCaption(true);
      setTimeout(() => setCopiedCaption(false), 1600);
      toast.success('Caption + link copied for WhatsApp & Instagram!');
    } catch {
      toast.error("Couldn't copy caption.");
    }
  };

  const download = async () => {
    setDownloading(true);
    try {
      const res = await fetch(cardUrl);
      if (!res.ok) throw new Error("Couldn't render the card.");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeName = (headline || product.title)
        .replace(/[^a-z0-9-_]+/gi, '-')
        .replace(/^-+|-+$/g, '')
        .toLowerCase()
        .slice(0, 40);
      a.download = `${safeName || 'product'}-verndly-${format}-${theme}.png`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('High-res studio card downloaded!');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Download failed';
      toast.error(msg);
    } finally {
      setDownloading(false);
    }
  };

  const share = async () => {
    if (!(navigator as any).share) {
      copyShareLink();
      return;
    }
    try {
      let files: File[] | undefined;
      try {
        const res = await fetch(cardUrl);
        const blob = await res.blob();
        const f = new File([blob], `${product.id}-verndly-${format}-${theme}.png`, {
          type: 'image/png',
        });
        if ((navigator as any).canShare?.({ files: [f] })) {
          files = [f];
        }
      } catch {
        // Fall back to URL-only share
      }
      await (navigator as any).share({
        title: headline || product.title,
        text:
          socialCaption ||
          (storeName ? `${headline || product.title} — by ${storeName}` : product.title),
        url: productUrl,
        ...(files ? { files } : {}),
      });
    } catch {
      // User cancelled
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/65 p-2 sm:p-4"
          onClick={onClose}
        >
          <div onClick={(e) => e.stopPropagation()} className="contents">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.18 }}
              className="bg-background flex max-h-[94dvh] w-full max-w-4xl flex-col overflow-hidden rounded-[28px]"
            >
              {/* Top Header */}
              <div className="bg-surface/60 flex shrink-0 items-center justify-between gap-2 px-5 py-4">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-red-700/10 text-red-700 dark:bg-red-500/15 dark:text-red-400">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-foreground truncate text-sm font-semibold tracking-tight">
                      Studio Product Card
                    </h3>
                    <p className="text-muted truncate text-[11px]">
                      High-clarity social poster powered by Verndly AI
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={download}
                    disabled={downloading}
                    className="bg-foreground text-background inline-flex h-9 items-center gap-1.5 rounded-xl px-3.5 text-xs font-semibold transition hover:opacity-90 disabled:opacity-60"
                    aria-label="Download PNG"
                  >
                    {downloading ? <Spinner size="xs" /> : <Download className="h-3.5 w-3.5" />}
                    <span className="hidden sm:inline">Download PNG</span>
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close"
                    className="bg-surface text-muted hover:text-foreground flex h-9 w-9 items-center justify-center rounded-xl transition"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Studio Body: Preview Left + Controls & AI Copywriter Right */}
              <div className="grid flex-1 grid-cols-1 gap-5 overflow-y-auto p-4 sm:p-5 lg:grid-cols-12">
                {/* Left Column: Live High-Res Card Preview */}
                <div className="flex flex-col gap-3 lg:col-span-6">
                  {/* Format + Theme + Fit Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="bg-surface inline-flex items-center rounded-xl p-1 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          if (format !== 'portrait') {
                            setLoaded(false);
                            setImgError(false);
                            setFormat('portrait');
                          }
                        }}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition ${
                          format === 'portrait'
                            ? 'bg-background text-foreground'
                            : 'text-muted hover:text-foreground'
                        }`}
                      >
                        <Smartphone className="h-3 w-3" />
                        <span>Story 4:5</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (format !== 'landscape') {
                            setLoaded(false);
                            setImgError(false);
                            setFormat('landscape');
                          }
                        }}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition ${
                          format === 'landscape'
                            ? 'bg-background text-foreground'
                            : 'text-muted hover:text-foreground'
                        }`}
                      >
                        <Monitor className="h-3 w-3" />
                        <span>Link 16:9</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <div className="bg-surface inline-flex items-center rounded-xl p-1 text-xs">
                        <button
                          type="button"
                          onClick={() => {
                            if (theme !== 'light') {
                              setLoaded(false);
                              setImgError(false);
                              setTheme('light');
                            }
                          }}
                          className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition ${
                            theme === 'light'
                              ? 'bg-background text-foreground'
                              : 'text-muted hover:text-foreground'
                          }`}
                        >
                          <Sun className="h-3 w-3 text-amber-500" />
                          <span>Light</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (theme !== 'dark') {
                              setLoaded(false);
                              setImgError(false);
                              setTheme('dark');
                            }
                          }}
                          className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition ${
                            theme === 'dark'
                              ? 'bg-background text-foreground'
                              : 'text-muted hover:text-foreground'
                          }`}
                        >
                          <Moon className="h-3 w-3 text-indigo-400" />
                          <span>Dark</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setLoaded(false);
                          setImgError(false);
                          setFit((prev) => (prev === 'cover' ? 'contain' : 'cover'));
                        }}
                        title={
                          fit === 'cover'
                            ? 'Switch to show full product photo'
                            : 'Switch to full-bleed editorial crop'
                        }
                        className="bg-surface text-muted hover:text-foreground inline-flex h-8 items-center gap-1 rounded-xl px-2.5 text-[11px] font-medium transition"
                      >
                        {fit === 'cover' ? (
                          <Minimize2 className="h-3 w-3" />
                        ) : (
                          <Maximize2 className="h-3 w-3" />
                        )}
                        <span>{fit === 'cover' ? 'Fill' : 'Fit'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Preview Canvas */}
                  <div
                    className={`bg-surface relative mx-auto flex w-full items-center justify-center overflow-hidden rounded-2xl transition-all ${
                      format === 'portrait'
                        ? 'aspect-[4/5] max-h-[52vh] max-w-[400px]'
                        : 'aspect-[1200/630] max-h-[38vh]'
                    }`}
                  >
                    <div className="absolute left-2.5 top-2.5 z-10 rounded-full bg-black/60 px-2.5 py-0.5 font-mono text-[10px] text-white/90">
                      {format === 'portrait' ? '1080 × 1350 HD' : '1200 × 630 HD'}
                    </div>

                    {!loaded && !imgError && (
                      <div className="text-muted absolute inset-0 flex flex-col items-center justify-center gap-2">
                        <Spinner size="md" />
                        <p className="text-xs">Rendering studio card…</p>
                      </div>
                    )}

                    {imgError ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
                        <AlertCircle className="h-6 w-6 text-amber-500" />
                        <p className="text-xs font-medium">Card didn&apos;t load</p>
                        <button
                          type="button"
                          onClick={() => {
                            setImgError(false);
                            setLoaded(false);
                            setV((n) => n + 1);
                          }}
                          className="bg-foreground text-background mt-1 inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold"
                        >
                          <RefreshCw className="h-3 w-3" />
                          Retry
                        </button>
                      </div>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={cardUrl}
                        src={cardUrl}
                        alt={`${product.title} studio share card`}
                        className={`h-full w-full object-contain transition-opacity duration-200 ${
                          loaded ? 'opacity-100' : 'opacity-0'
                        }`}
                        onLoad={() => {
                          setLoaded(true);
                          setImgError(false);
                        }}
                        onError={() => {
                          setLoaded(true);
                          setImgError(true);
                        }}
                      />
                    )}
                  </div>

                  {/* Multi-Photo Switcher */}
                  {images.length > 1 && (
                    <div className="flex items-center justify-center gap-2">
                      {images.slice(0, 5).map((imgUrl, idx) => (
                        <button
                          key={imgUrl + idx}
                          type="button"
                          onClick={() => {
                            if (idx !== photoIdx) {
                              setLoaded(false);
                              setImgError(false);
                              setPhotoIdx(idx);
                            }
                          }}
                          className={`h-11 w-11 overflow-hidden rounded-xl transition-all ${
                            idx === photoIdx
                              ? 'ring-foreground scale-105 ring-2 ring-offset-2'
                              : 'opacity-60 hover:opacity-100'
                          }`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={imgUrl} alt="" className="h-full w-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Quick Download / Share / Link Bar */}
                  <div className="space-y-2 pt-1">
                    <button
                      type="button"
                      onClick={download}
                      disabled={downloading}
                      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-red-700 px-4 text-xs font-semibold text-white transition hover:bg-red-800 disabled:opacity-60"
                    >
                      {downloading ? <Spinner size="sm" /> : <Download className="h-4 w-4" />}
                      {downloading ? 'Preparing HD PNG…' : 'Download High-Res Card'}
                    </button>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={share}
                        className="bg-surface text-foreground hover:bg-surface/80 inline-flex h-10 items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-medium transition"
                      >
                        <Share2 className="h-3.5 w-3.5" />
                        Share card
                      </button>
                      <button
                        type="button"
                        onClick={copyShareLink}
                        className="bg-surface text-foreground hover:bg-surface/80 inline-flex h-10 items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-medium transition"
                      >
                        {copiedLink ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                            Link copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            Copy link
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right Column: Verndly AI Copywriter & Live Card Customizer */}
                <div className="flex flex-col gap-4 lg:col-span-6">
                  {/* Verndly AI Generator Box */}
                  <div className="bg-surface/70 space-y-3 rounded-2xl p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <Wand2 className="h-3.5 w-3.5 text-red-700 dark:text-red-400" />
                          <h4 className="text-foreground text-xs font-semibold">
                            Verndly AI Copywriter
                          </h4>
                        </div>
                        <p className="text-muted mt-0.5 text-[11px] leading-relaxed">
                          Turn your listing into bold, scroll-stopping studio copy and a
                          ready-to-post WhatsApp caption.
                        </p>
                      </div>
                      {hasCustomCopy && (
                        <button
                          type="button"
                          onClick={resetCopy}
                          className="text-muted hover:text-foreground inline-flex shrink-0 items-center gap-1 text-[11px] font-medium"
                          title="Reset to defaults"
                        >
                          <RotateCcw className="h-3 w-3" />
                          Reset
                        </button>
                      )}
                    </div>

                    {/* Tone Pills */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {TONE_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setTone(opt.value)}
                          className={`rounded-xl px-3 py-1.5 text-[11px] font-semibold transition ${
                            tone === opt.value
                              ? 'bg-foreground text-background'
                              : 'bg-background text-muted hover:text-foreground'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => void handleGenerateAiCopy(tone)}
                      disabled={aiGenerating}
                      className="bg-foreground text-background inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl px-4 text-xs font-semibold transition hover:opacity-90 disabled:opacity-60"
                    >
                      {aiGenerating ? <Spinner size="xs" /> : <Sparkles className="h-3.5 w-3.5" />}
                      {aiGenerating ? 'Writing studio copy…' : 'Write Wow Copy with Verndly AI'}
                    </button>
                  </div>

                  {/* Manual / AI-Populated Copy Tweaks */}
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-muted mb-1 block text-[10px] font-semibold uppercase tracking-wider">
                          Top Badge
                        </label>
                        <input
                          type="text"
                          maxLength={20}
                          value={badge}
                          onChange={(e) => setBadge(e.target.value)}
                          placeholder="Best Seller"
                          className="bg-surface text-foreground placeholder:text-muted/60 h-10 w-full rounded-xl px-3 text-xs focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-muted mb-1 block text-[10px] font-semibold uppercase tracking-wider">
                          Button Label
                        </label>
                        <input
                          type="text"
                          maxLength={14}
                          value={cta}
                          onChange={(e) => setCta(e.target.value)}
                          placeholder="Buy Now"
                          className="bg-surface text-foreground placeholder:text-muted/60 h-10 w-full rounded-xl px-3 text-xs focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-muted mb-1 block text-[10px] font-semibold uppercase tracking-wider">
                        Bold Headline
                      </label>
                      <input
                        type="text"
                        maxLength={42}
                        value={headline}
                        onChange={(e) => setHeadline(e.target.value)}
                        placeholder={product.title}
                        className="bg-surface text-foreground placeholder:text-muted/60 h-10 w-full rounded-xl px-3 text-xs font-medium focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-muted mb-1 block text-[10px] font-semibold uppercase tracking-wider">
                        Punchy Tagline
                      </label>
                      <input
                        type="text"
                        maxLength={44}
                        value={tagline}
                        onChange={(e) => setTagline(e.target.value)}
                        placeholder={storeName ? `Curated by ${storeName}` : 'Own the moment'}
                        className="bg-surface text-foreground placeholder:text-muted/60 h-10 w-full rounded-xl px-3 text-xs focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-muted mb-1 block text-[10px] font-semibold uppercase tracking-wider">
                        Short Description (2 lines)
                      </label>
                      <textarea
                        rows={2}
                        maxLength={110}
                        value={blurb}
                        onChange={(e) => setBlurb(e.target.value)}
                        placeholder="Crisp 1–2 line studio highlight that reads cleanly on mobile..."
                        className="bg-surface text-foreground placeholder:text-muted/60 w-full resize-none rounded-xl px-3 py-2.5 text-xs leading-relaxed focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Bonus AI Ready-to-Post WhatsApp / Instagram Caption */}
                  {socialCaption && (
                    <div className="bg-surface/60 space-y-2 rounded-2xl p-3.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-muted text-[10px] font-semibold uppercase tracking-wider">
                          Ready-to-Post Caption
                        </span>
                        <button
                          type="button"
                          onClick={copyCaption}
                          className="text-foreground inline-flex items-center gap-1 text-[11px] font-semibold hover:opacity-80"
                        >
                          {copiedCaption ? (
                            <>
                              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              Copy caption + link
                            </>
                          )}
                        </button>
                      </div>
                      <p className="text-foreground whitespace-pre-line text-xs leading-relaxed">
                        {socialCaption}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
