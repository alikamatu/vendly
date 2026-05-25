"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Download,
  Copy,
  CheckCircle2,
  Share2,
  Loader2,
  RefreshCw,
  Sparkles,
  AlertCircle,
} from "lucide-react";
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
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://vendly.market";

/**
 * Pro-only share-card preview. Loads the PNG from
 * `/api/cards/product/<id>` and gives the seller Download / Copy URL /
 * Native Share buttons.
 */
export default function ShareProductCardModal({
  open,
  onClose,
  product,
  storeName,
  storeLink,
}: Props) {
  // Cache-busting param so "Regenerate" forces a refetch from the route.
  const [v, setV] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // The card route is hosted on the same origin as the dashboard. Using a
  // relative URL means it works in local dev (localhost:3000), preview
  // deploys, and production — without needing NEXT_PUBLIC_SITE_URL set.
  // The shared *product* URL is different — that one should always point at
  // vendly.market so buyers actually land somewhere real.
  const cardUrl = `/api/cards/product/${product.id}${v ? `?v=${v}` : ""}`;
  const productUrl = `${PUBLIC_SITE_URL}/product/${product.id}`;

  useEffect(() => {
    if (!open) {
      setLoaded(false);
      setCopied(false);
    }
  }, [open]);

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(productUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy. Long-press the URL instead.");
    }
  };

  const download = async () => {
    setDownloading(true);
    try {
      // Fetch as a blob so we can give the download a clean filename.
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
        .slice(0, 50);
      a.download = `${safeName || "product"}-vendly-card.png`;
      a.click();
      URL.revokeObjectURL(url);
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
      // Try to share the actual image (richer preview on mobile).
      let files: File[] | undefined;
      try {
        const res = await fetch(cardUrl);
        const blob = await res.blob();
        const f = new File([blob], `${product.id}-vendly-card.png`, {
          type: "image/png",
        });
        // Some browsers don't support file share — feature-detect.
        if ((navigator as any).canShare?.({ files: [f] })) {
          files = [f];
        }
      } catch {
        // Fall through to URL-only share.
      }
      await (navigator as any).share({
        title: product.title,
        text: storeName ? `${product.title} — by ${storeName}` : product.title,
        url: productUrl,
        ...(files ? { files } : {}),
      });
    } catch {
      // User cancelled or share blocked — silent.
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          {/* Wrapper div carries the click-capture; the motion.div only animates.
              framer-motion's v12 typings drop generic DOM handlers, which is why
              we hoist onClick out here. */}
          <div onClick={(e) => e.stopPropagation()} className="contents">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.15 }}
            className="bg-background rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
          >
            {/* Sticky header — title + Download (always visible, never
                scrolls away) + Close. The download here mirrors the big
                primary button below; we keep both because sellers on long-
                scrolling phones miss the one below the fold. */}
            <div className="flex items-center justify-between gap-2 px-4 sm:px-5 py-3 border-b border-border/60 bg-background">
              <div className="flex items-center gap-2 min-w-0">
                <Sparkles className="w-4 h-4 text-accent shrink-0" />
                <h3 className="text-sm font-medium truncate">Share card</h3>
                <span className="text-[10px] uppercase tracking-wider text-muted shrink-0">
                  Pro
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={download}
                  disabled={downloading}
                  className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-accent text-white text-xs font-semibold hover:opacity-90 transition disabled:opacity-60"
                  aria-label="Download PNG"
                >
                  {downloading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  <span className="hidden sm:inline">Download</span>
                </button>
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="p-2 rounded-lg hover:bg-surface text-muted"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
              <div className="text-xs text-muted">
                A 4:3 image with your product photo, price, and store name —
                sized for Instagram, WhatsApp Status, Twitter/X, and Facebook.
              </div>

              <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-surface aspect-[4/3]">
                {!loaded && !imgError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <p className="text-[11px]">Rendering your card…</p>
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
                    key={v}
                    src={cardUrl}
                    alt={`${product.title} share card`}
                    className="w-full h-full object-cover"
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

              {/* Primary action: download. Bigger, full-width on mobile so
                  it can't be missed. Secondary actions below. */}
              <button
                onClick={download}
                disabled={downloading}
                className="w-full inline-flex items-center justify-center gap-2 h-12 px-4 rounded-xl bg-accent text-white text-sm font-semibold hover:opacity-90 transition disabled:opacity-60 shadow-lg shadow-accent/20"
              >
                {downloading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                {downloading ? "Preparing PNG…" : "Download as image"}
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={share}
                  className="inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-xl border border-border text-xs font-medium hover:bg-surface transition"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  Share
                </button>
                <button
                  onClick={copyShareLink}
                  className="inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-xl border border-border text-xs font-medium hover:bg-surface transition"
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

              <div className="flex justify-center">
                <button
                  onClick={() => {
                    setLoaded(false);
                    setImgError(false);
                    setV((x) => x + 1);
                  }}
                  className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-[11px] text-muted hover:text-foreground transition"
                  title="Re-render with the latest price / image"
                >
                  <RefreshCw className="w-3 h-3" />
                  Regenerate card
                </button>
              </div>

              {storeLink && (
                <p className="text-[10px] text-muted text-center pt-2">
                  Lands buyers on{" "}
                  <span className="text-foreground/80">{productUrl}</span>
                </p>
              )}
            </div>
          </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
