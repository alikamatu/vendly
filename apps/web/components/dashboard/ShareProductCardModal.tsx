'use client';

import React, { useEffect, useState } from 'react';
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
} from 'lucide-react';
import Spinner from '@/components/ui/Spinner';
import { getProductPath } from '@/lib/product-slug';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
  product: {
    id: string;
    title: string;
  };
  storeName?: string | null;
  storeLink?: string | null;
}

const PUBLIC_SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || 'https://verndly.com';

type CardFormat = 'portrait' | 'landscape';
type CardTheme = 'dark' | 'light';

/**
 * High-Resolution Share Card Generator Modal
 *
 * Provides sellers with magazine-grade social cards formatted for:
 *  - Portrait 4:5 (1080×1350) - WhatsApp Status, Instagram Post/Story, TikTok
 *  - Landscape 16:9 (1200×630) - Twitter/X, Chat Link Previews, Facebook
 *
 * Supports Dark Luxury and Studio Light aesthetic modes.
 */
export default function ShareProductCardModal({
  open,
  onClose,
  product,
  storeName,
  storeLink,
}: Props) {
  const [format, setFormat] = useState<CardFormat>('portrait');
  const [theme, setTheme] = useState<CardTheme>('dark');
  const [v, setV] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const cardUrl = `/api/cards/product/${product.id}?theme=${theme}&format=${format}${v ? `&v=${v}` : ''}`;
  const productUrl = `${PUBLIC_SITE_URL}${getProductPath({
    id: product.id,
    title: product.title,
    storeLink,
    storeName,
  })}`;

  useEffect(() => {
    if (!open) {
      setLoaded(false);
      setCopied(false);
    }
  }, [open]);

  const handleFormatChange = (newFormat: CardFormat) => {
    if (newFormat === format) return;
    setLoaded(false);
    setImgError(false);
    setFormat(newFormat);
  };

  const handleThemeChange = (newTheme: CardTheme) => {
    if (newTheme === theme) return;
    setLoaded(false);
    setImgError(false);
    setTheme(newTheme);
  };

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(productUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      toast.success('Product link copied!');
    } catch {
      toast.error("Couldn't copy. Long-press the URL instead.");
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
      const safeName = product.title
        .replace(/[^a-z0-9-_]+/gi, '-')
        .replace(/^-+|-+$/g, '')
        .toLowerCase()
        .slice(0, 40);
      a.download = `${safeName || 'product'}-verndly-${format}-${theme}.png`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Card downloaded!');
    } catch (e: any) {
      toast.error(e?.message || 'Download failed');
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
        title: product.title,
        text: storeName ? `${product.title} — by ${storeName}` : product.title,
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
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-3 sm:p-4"
          onClick={onClose}
        >
          <div onClick={(e) => e.stopPropagation()} className="contents">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.15 }}
              className="bg-background border-border/80 flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border"
            >
              {/* Sticky Header */}
              <div className="border-border/60 bg-background flex shrink-0 items-center justify-between gap-2 border-b px-4 py-3 sm:px-5">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="bg-accent/10 border-accent/20 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border">
                    <Sparkles className="text-accent h-3.5 w-3.5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-foreground text-sm font-semibold tracking-tight">
                        Product Share Card
                      </h3>
                      <span className="bg-surface border-border text-muted rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                        Pro
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    onClick={download}
                    disabled={downloading}
                    className="bg-accent inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                    aria-label="Download PNG"
                  >
                    {downloading ? <Spinner size="xs" /> : <Download className="h-3.5 w-3.5" />}
                    <span className="hidden sm:inline">Download</span>
                  </button>
                  <button
                    onClick={onClose}
                    aria-label="Close"
                    className="hover:bg-surface text-muted rounded-lg p-1.5 transition"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Controls Bar: Format + Theme */}
              <div className="bg-surface/50 border-border/60 flex shrink-0 flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5 sm:px-5">
                {/* Format Segmented Control */}
                <div className="bg-background border-border/70 inline-flex items-center rounded-lg border p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => handleFormatChange('portrait')}
                    className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition ${
                      format === 'portrait'
                        ? 'bg-surface text-foreground border-border/80 border font-medium'
                        : 'text-muted hover:text-foreground'
                    }`}
                  >
                    <Smartphone className="h-3 w-3" />
                    <span>Story / Status (4:5)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFormatChange('landscape')}
                    className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition ${
                      format === 'landscape'
                        ? 'bg-surface text-foreground border-border/80 border font-medium'
                        : 'text-muted hover:text-foreground'
                    }`}
                  >
                    <Monitor className="h-3 w-3" />
                    <span>Post / Link (16:9)</span>
                  </button>
                </div>

                {/* Theme Segmented Control */}
                <div className="bg-background border-border/70 inline-flex items-center rounded-lg border p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => handleThemeChange('dark')}
                    className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition ${
                      theme === 'dark'
                        ? 'bg-surface text-foreground border-border/80 border font-medium'
                        : 'text-muted hover:text-foreground'
                    }`}
                  >
                    <Moon className="h-3 w-3 text-indigo-400" />
                    <span>Dark</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleThemeChange('light')}
                    className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition ${
                      theme === 'light'
                        ? 'bg-surface text-foreground border-border/80 border font-medium'
                        : 'text-muted hover:text-foreground'
                    }`}
                  >
                    <Sun className="h-3 w-3 text-amber-500" />
                    <span>Light</span>
                  </button>
                </div>
              </div>

              {/* Modal Body & Image Preview */}
              <div className="space-y-4 overflow-y-auto p-4 sm:p-5">
                {/* Dynamic Preview Container */}
                <div
                  className={`border-border/70 bg-surface/60 relative mx-auto flex items-center justify-center overflow-hidden rounded-xl border transition-all ${
                    format === 'portrait'
                      ? 'aspect-[4/5] max-h-[48vh] w-full max-w-[420px]'
                      : 'aspect-[1200/630] max-h-[38vh] w-full'
                  }`}
                >
                  {/* Resolution Tag */}
                  <div className="absolute left-2.5 top-2.5 z-10 rounded-full border border-white/10 bg-black/60 px-2 py-0.5 font-mono text-[10px] text-white/90">
                    {format === 'portrait' ? '1080 × 1350 HD' : '1200 × 630 HD'}
                  </div>

                  {!loaded && !imgError && (
                    <div className="text-muted absolute inset-0 flex flex-col items-center justify-center gap-2">
                      <Spinner size="md" />
                      <p className="text-xs">Generating high-res card…</p>
                    </div>
                  )}

                  {imgError ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
                      <AlertCircle className="h-6 w-6 text-amber-500" />
                      <p className="text-xs font-medium">Card didn&apos;t load</p>
                      <p className="text-muted max-w-xs text-[11px]">
                        The server couldn&apos;t render this card. Try Regenerate, or download
                        directly below.
                      </p>
                    </div>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={`${cardUrl}-${v}`}
                      src={cardUrl}
                      alt={`${product.title} share card`}
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

                {/* Primary Download Button */}
                <button
                  onClick={download}
                  disabled={downloading}
                  className="bg-accent inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                >
                  {downloading ? <Spinner size="sm" /> : <Download className="h-4 w-4" />}
                  {downloading ? 'Preparing High-Res PNG…' : 'Download High-Res Card'}
                </button>

                {/* Secondary Actions */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={share}
                    className="border-border hover:bg-surface inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    Share card
                  </button>
                  <button
                    onClick={copyShareLink}
                    className="border-border hover:bg-surface inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition"
                  >
                    {copied ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        Copy product link
                      </>
                    )}
                  </button>
                </div>

                {/* Footer Utilities */}
                <div className="text-muted border-border/50 flex items-center justify-between border-t pt-1 text-[11px]">
                  <button
                    onClick={() => {
                      setLoaded(false);
                      setImgError(false);
                      setV((x) => x + 1);
                    }}
                    className="text-muted hover:text-foreground inline-flex items-center gap-1 transition"
                    title="Re-render with fresh data"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Regenerate card
                  </button>

                  <span className="max-w-[260px] truncate text-right">
                    Destination: <span className="text-foreground/80">{productUrl}</span>
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
