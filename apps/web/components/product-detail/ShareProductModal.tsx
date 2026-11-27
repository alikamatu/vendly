'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Share2, Copy, Check, Download, MessageCircle, Send, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

const MotionDiv = motion.div as any;

interface ShareProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: {
    id: string;
    title: string;
    price: string | number;
    image_urls?: string[];
    seller?: {
      store_name?: string;
      store_link?: string;
    };
  };
}

export default function ShareProductModal({ isOpen, onClose, product }: ShareProductModalProps) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const productUrl = typeof window !== 'undefined' ? window.location.href : '';
  const imageUrl = product.image_urls?.[0] || '/placeholder-product.png';
  const studioCardUrl = `/api/cards/product/${encodeURIComponent(String(product.id))}?theme=light&format=portrait`;
  const shareText = `Check out ${product.title} on Verndly! GH₵ ${parseFloat(String(product.price)).toLocaleString()}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(productUrl);
      setCopied(true);
      toast.success('Product link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy link.');
    }
  };

  const handleDownloadCard = async () => {
    setDownloading(true);
    try {
      const res = await fetch(studioCardUrl);
      if (!res.ok) throw new Error('Card render failed');
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${product.title?.replace(/[^a-zA-Z0-9]/g, '_') || 'product'}-verndly-card.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      toast.success('Studio product card saved!');
    } catch {
      window.open(studioCardUrl, '_blank');
    } finally {
      setDownloading(false);
    }
  };

  const handleWhatsAppShare = () => {
    const text = `${shareText}\n${productUrl}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleTwitterShare = () => {
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(productUrl)}`,
      '_blank',
    );
  };

  const handleTelegramShare = () => {
    window.open(
      `https://t.me/share/url?url=${encodeURIComponent(productUrl)}&text=${encodeURIComponent(shareText)}`,
      '_blank',
    );
  };

  const handleNativeShare = async () => {
    if (typeof navigator === 'undefined' || !navigator.share) return;
    try {
      // Try sharing with studio product card PNG first
      if ((navigator as any).canShare) {
        try {
          const res = await fetch(studioCardUrl);
          if (res.ok) {
            const blob = await res.blob();
            const file = new File(
              [blob],
              `${product.title?.replace(/[^a-zA-Z0-9]/g, '_') || 'product'}-verndly-card.png`,
              { type: 'image/png' },
            );
            if ((navigator as any).canShare({ files: [file] })) {
              await (navigator as any).share({
                title: product.title,
                text: shareText,
                url: productUrl,
                files: [file],
              });
              return;
            }
          }
        } catch {
          // Fall through to text share
        }
      }

      await navigator.share({
        title: product.title,
        text: shareText,
        url: productUrl,
      });
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        toast.error('Could not share link.');
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4">
          {/* Strictly solid backdrop (borderless, shadowless, NO blur) */}
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60"
            aria-hidden="true"
          />

          {/* Modal Container: Mobile-first bottom sheet, centered on desktop */}
          {/* Strictly borderless, shadowless, NO blur style */}
          <MotionDiv
            role="dialog"
            aria-modal="true"
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="bg-background text-foreground relative z-10 w-full overflow-hidden rounded-t-[2.5rem] border-0 shadow-none sm:max-w-md sm:rounded-[2.5rem]"
          >
            {/* Mobile drag bar */}
            <div className="flex justify-center pb-1 pt-3 sm:hidden">
              <div className="bg-muted/40 h-1 w-10 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between border-0 px-6 pb-2 pt-3 sm:pt-6">
              <div className="flex items-center gap-2">
                <div className="bg-foreground/5 text-foreground flex h-7 w-7 items-center justify-center rounded-full">
                  <Share2 className="h-3.5 w-3.5" />
                </div>
                <h2 className="text-foreground text-sm font-semibold uppercase tracking-wider">
                  Share Product
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="bg-surface hover:bg-surface/80 text-foreground rounded-full border-0 p-2 shadow-none transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content */}
            <div className="space-y-4 p-6">
              {/* Product Preview Card with High-Res Image */}
              <div className="bg-surface flex items-center gap-3.5 rounded-2xl border-0 p-3.5 shadow-none">
                <img
                  src={imageUrl}
                  alt={product.title}
                  className="bg-background h-16 w-16 shrink-0 rounded-xl border-0 object-cover"
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <h3 className="text-foreground line-clamp-1 text-xs font-medium uppercase tracking-tight">
                    {product.title}
                  </h3>
                  <p className="text-primary text-xs font-semibold">
                    GH₵ {parseFloat(String(product.price)).toLocaleString()}
                  </p>
                  {product.seller?.store_link && (
                    <p className="text-muted text-[10px]">@{product.seller.store_link}</p>
                  )}
                </div>
              </div>

              {/* One-Click Copy Link Box */}
              <div className="bg-surface flex items-center justify-between gap-2 rounded-2xl border-0 p-3 shadow-none">
                <p className="text-muted flex-1 truncate font-mono text-xs">{productUrl}</p>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="bg-foreground text-background flex shrink-0 items-center gap-1.5 rounded-xl border-0 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider shadow-none transition-opacity hover:opacity-90"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              {/* Social Channels (Borderless & Shadowless) */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={handleWhatsAppShare}
                  className="bg-surface hover:bg-surface/80 text-foreground flex flex-col items-center gap-1.5 rounded-2xl border-0 p-3 shadow-none transition-colors"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                    <MessageCircle className="h-4 w-4" />
                  </div>
                  <span className="text-[11px] font-medium">WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={handleTwitterShare}
                  className="bg-surface hover:bg-surface/80 text-foreground flex flex-col items-center gap-1.5 rounded-2xl border-0 p-3 shadow-none transition-colors"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-500/10 text-sky-600">
                    <Send className="h-4 w-4" />
                  </div>
                  <span className="text-[11px] font-medium">X / Twitter</span>
                </button>

                <button
                  type="button"
                  onClick={handleTelegramShare}
                  className="bg-surface hover:bg-surface/80 text-foreground flex flex-col items-center gap-1.5 rounded-2xl border-0 p-3 shadow-none transition-colors"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/10 text-blue-600">
                    <Send className="h-4 w-4" />
                  </div>
                  <span className="text-[11px] font-medium">Telegram</span>
                </button>
              </div>

              {/* Actions: Save Studio Card / Native Share */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleDownloadCard}
                  disabled={downloading}
                  className="bg-surface hover:bg-surface/80 text-foreground flex h-11 w-full items-center justify-center gap-2 rounded-xl border-0 text-xs font-medium shadow-none transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>{downloading ? 'Saving...' : 'Save Studio Card'}</span>
                </button>

                {typeof navigator !== 'undefined' && (navigator as any).share && (
                  <button
                    type="button"
                    onClick={handleNativeShare}
                    className="bg-foreground text-background flex h-11 w-full items-center justify-center gap-2 rounded-xl border-0 text-xs font-semibold uppercase tracking-wider shadow-none transition-opacity hover:opacity-90"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    <span>More Apps</span>
                  </button>
                )}
              </div>
            </div>
          </MotionDiv>
        </div>
      )}
    </AnimatePresence>
  );
}
