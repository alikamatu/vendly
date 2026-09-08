'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Share2,
  Copy,
  Check,
  Download,
  MessageCircle,
  Send,
  Sparkles,
} from 'lucide-react';
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

export default function ShareProductModal({
  isOpen,
  onClose,
  product,
}: ShareProductModalProps) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const productUrl = typeof window !== 'undefined' ? window.location.href : '';
  const imageUrl = product.image_urls?.[0] || '/placeholder-product.png';
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

  const handleDownloadImage = async () => {
    if (!imageUrl) return;
    setDownloading(true);
    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${product.title?.replace(/[^a-zA-Z0-9]/g, '_') || 'product'}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      toast.success('Product image saved!');
    } catch {
      window.open(imageUrl, '_blank');
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
      '_blank'
    );
  };

  const handleTelegramShare = () => {
    window.open(
      `https://t.me/share/url?url=${encodeURIComponent(productUrl)}&text=${encodeURIComponent(shareText)}`,
      '_blank'
    );
  };

  const handleNativeShare = async () => {
    if (typeof navigator === 'undefined' || !navigator.share) return;
    try {
      // Try sharing with file if image is accessible
      if (imageUrl && (navigator as any).canShare) {
        try {
          const res = await fetch(imageUrl);
          if (res.ok) {
            const blob = await res.blob();
            const ext = blob.type.split('/')[1] || 'jpg';
            const file = new File(
              [blob],
              `${product.title?.replace(/[^a-zA-Z0-9]/g, '_') || 'product'}.${ext}`,
              { type: blob.type }
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
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
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
            className="relative z-10 w-full sm:max-w-md bg-background rounded-t-[2.5rem] sm:rounded-[2.5rem] border-0 shadow-none overflow-hidden text-foreground"
          >
            {/* Mobile drag bar */}
            <div className="pt-3 pb-1 sm:hidden flex justify-center">
              <div className="w-10 h-1 rounded-full bg-muted/40" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-3 sm:pt-6 pb-2 border-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-foreground/5 flex items-center justify-center text-foreground">
                  <Share2 className="w-3.5 h-3.5" />
                </div>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                  Share Product
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="p-2 rounded-full bg-surface hover:bg-surface/80 text-foreground border-0 shadow-none transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Product Preview Card with High-Res Image */}
              <div className="bg-surface rounded-2xl p-3.5 flex items-center gap-3.5 border-0 shadow-none">
                <img
                  src={imageUrl}
                  alt={product.title}
                  className="w-16 h-16 rounded-xl object-cover bg-background shrink-0 border-0"
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <h3 className="text-xs font-medium text-foreground line-clamp-1 uppercase tracking-tight">
                    {product.title}
                  </h3>
                  <p className="text-xs font-semibold text-primary">
                    GH₵ {parseFloat(String(product.price)).toLocaleString()}
                  </p>
                  {product.seller?.store_link && (
                    <p className="text-[10px] text-muted">@{product.seller.store_link}</p>
                  )}
                </div>
              </div>

              {/* One-Click Copy Link Box */}
              <div className="bg-surface rounded-2xl p-3 flex items-center justify-between gap-2 border-0 shadow-none">
                <p className="text-xs text-muted truncate flex-1 font-mono">{productUrl}</p>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-3 py-1.5 rounded-xl bg-foreground text-background text-xs font-semibold uppercase tracking-wider shrink-0 flex items-center gap-1.5 border-0 shadow-none hover:opacity-90 transition-opacity"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
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
                  className="p-3 rounded-2xl bg-surface hover:bg-surface/80 flex flex-col items-center gap-1.5 text-foreground border-0 shadow-none transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                    <MessageCircle className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-medium">WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={handleTwitterShare}
                  className="p-3 rounded-2xl bg-surface hover:bg-surface/80 flex flex-col items-center gap-1.5 text-foreground border-0 shadow-none transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-sky-500/10 text-sky-600 flex items-center justify-center">
                    <Send className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-medium">X / Twitter</span>
                </button>

                <button
                  type="button"
                  onClick={handleTelegramShare}
                  className="p-3 rounded-2xl bg-surface hover:bg-surface/80 flex flex-col items-center gap-1.5 text-foreground border-0 shadow-none transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center">
                    <Send className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-medium">Telegram</span>
                </button>
              </div>

              {/* Actions: Save Image / Native Share */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleDownloadImage}
                  disabled={downloading}
                  className="w-full h-11 rounded-xl bg-surface hover:bg-surface/80 text-foreground text-xs font-medium flex items-center justify-center gap-2 border-0 shadow-none transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{downloading ? 'Saving...' : 'Save Photo'}</span>
                </button>

                {typeof navigator !== 'undefined' && (navigator as any).share && (
                  <button
                    type="button"
                    onClick={handleNativeShare}
                    className="w-full h-11 rounded-xl bg-foreground text-background text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 border-0 shadow-none hover:opacity-90 transition-opacity"
                  >
                    <Share2 className="w-3.5 h-3.5" />
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
