"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
} from "lucide-react";
import Spinner from "@/components/ui/Spinner";
import { toast } from "sonner";

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
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://verndly.com";

type CardFormat = "portrait" | "landscape";
type CardTheme = "dark" | "light";

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
  const [format, setFormat] = useState<CardFormat>("portrait");
  const [theme, setTheme] = useState<CardTheme>("dark");
  const [v, setV] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const cardUrl = `/api/cards/product/${product.id}?theme=${theme}&format=${format}${v ? `&v=${v}` : ""}`;
  const productUrl = `${PUBLIC_SITE_URL}/product/${product.id}`;

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
      toast.success("Product link copied!");
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
      const a = document.createElement("a");
      a.href = url;
      const safeName = product.title
        .replace(/[^a-z0-9-_]+/gi, "-")
        .replace(/^-+|-+$/g, "")
        .toLowerCase()
        .slice(0, 40);
      a.download = `${safeName || "product"}-verndly-${format}-${theme}.png`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Card downloaded!");
    } catch (e: any) {
      toast.error(e?.message || "Download failed");
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
        const f = new File(
          [blob],
          `${product.id}-verndly-${format}-${theme}.png`,
          { type: "image/png" }
        );
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
              className="bg-background border border-border/80 rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-hidden flex flex-col"
            >
              {/* Sticky Header */}
              <div className="flex items-center justify-between gap-2 px-4 sm:px-5 py-3 border-b border-border/60 bg-background shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
                    <Sparkles className="w-3.5 h-3.5 text-accent" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-semibold tracking-tight text-foreground">
                        Product Share Card
                      </h3>
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-surface border border-border text-muted uppercase tracking-wider">
                        Pro
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={download}
                    disabled={downloading}
                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-accent text-white text-xs font-semibold hover:opacity-90 transition disabled:opacity-60"
                    aria-label="Download PNG"
                  >
                    {downloading ? (
                      <Spinner size="xs" />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}
                    <span className="hidden sm:inline">Download</span>
                  </button>
                  <button
                    onClick={onClose}
                    aria-label="Close"
                    className="p-1.5 rounded-lg hover:bg-surface text-muted transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Controls Bar: Format + Theme */}
              <div className="px-4 sm:px-5 py-2.5 bg-surface/50 border-b border-border/60 flex flex-wrap items-center justify-between gap-2 shrink-0">
                {/* Format Segmented Control */}
                <div className="inline-flex items-center p-0.5 bg-background border border-border/70 rounded-lg text-xs">
                  <button
                    type="button"
                    onClick={() => handleFormatChange("portrait")}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition ${
                      format === "portrait"
                        ? "bg-surface text-foreground font-medium border border-border/80"
                        : "text-muted hover:text-foreground"
                    }`}
                  >
                    <Smartphone className="w-3 h-3" />
                    <span>Story / Status (4:5)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFormatChange("landscape")}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition ${
                      format === "landscape"
                        ? "bg-surface text-foreground font-medium border border-border/80"
                        : "text-muted hover:text-foreground"
                    }`}
                  >
                    <Monitor className="w-3 h-3" />
                    <span>Post / Link (16:9)</span>
                  </button>
                </div>

                {/* Theme Segmented Control */}
                <div className="inline-flex items-center p-0.5 bg-background border border-border/70 rounded-lg text-xs">
                  <button
                    type="button"
                    onClick={() => handleThemeChange("dark")}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition ${
                      theme === "dark"
                        ? "bg-surface text-foreground font-medium border border-border/80"
                        : "text-muted hover:text-foreground"
                    }`}
                  >
                    <Moon className="w-3 h-3 text-indigo-400" />
                    <span>Dark</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleThemeChange("light")}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition ${
                      theme === "light"
                        ? "bg-surface text-foreground font-medium border border-border/80"
                        : "text-muted hover:text-foreground"
                    }`}
                  >
                    <Sun className="w-3 h-3 text-amber-500" />
                    <span>Light</span>
                  </button>
                </div>
              </div>

              {/* Modal Body & Image Preview */}
              <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
                {/* Dynamic Preview Container */}
                <div
                  className={`relative rounded-xl overflow-hidden border border-border/70 bg-surface/60 flex items-center justify-center mx-auto transition-all ${
                    format === "portrait"
                      ? "aspect-[4/5] max-h-[48vh] w-full max-w-[420px]"
                      : "aspect-[1200/630] max-h-[38vh] w-full"
                  }`}
                >
                  {/* Resolution Tag */}
                  <div className="absolute top-2.5 left-2.5 z-10 text-[10px] font-mono px-2 py-0.5 rounded-full bg-black/60 text-white/90 border border-white/10">
                    {format === "portrait" ? "1080 × 1350 HD" : "1200 × 630 HD"}
                  </div>

                  {!loaded && !imgError && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted">
                      <Spinner size="md" />
                      <p className="text-xs">Generating high-res card…</p>
                    </div>
                  )}

                  {imgError ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center px-6">
                      <AlertCircle className="w-6 h-6 text-amber-500" />
                      <p className="text-xs font-medium">Card didn&apos;t load</p>
                      <p className="text-[11px] text-muted max-w-xs">
                        The server couldn&apos;t render this card. Try Regenerate,
                        or download directly below.
                      </p>
                    </div>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={`${cardUrl}-${v}`}
                      src={cardUrl}
                      alt={`${product.title} share card`}
                      className={`w-full h-full object-contain transition-opacity duration-200 ${
                        loaded ? "opacity-100" : "opacity-0"
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
                  className="w-full inline-flex items-center justify-center gap-2 h-11 px-4 rounded-xl bg-accent text-white text-sm font-semibold hover:opacity-90 transition disabled:opacity-60"
                >
                  {downloading ? (
                    <Spinner size="sm" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  {downloading ? "Preparing High-Res PNG…" : "Download High-Res Card"}
                </button>

                {/* Secondary Actions */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={share}
                    className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg border border-border text-xs font-medium hover:bg-surface transition"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    Share card
                  </button>
                  <button
                    onClick={copyShareLink}
                    className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg border border-border text-xs font-medium hover:bg-surface transition"
                  >
                    {copied ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copy product link
                      </>
                    )}
                  </button>
                </div>

                {/* Footer Utilities */}
                <div className="flex items-center justify-between pt-1 text-[11px] text-muted border-t border-border/50">
                  <button
                    onClick={() => {
                      setLoaded(false);
                      setImgError(false);
                      setV((x) => x + 1);
                    }}
                    className="inline-flex items-center gap-1 text-muted hover:text-foreground transition"
                    title="Re-render with fresh data"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Regenerate card
                  </button>

                  <span className="truncate max-w-[260px] text-right">
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
