'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Share2, Copy, Check, MessageCircle, Send } from 'lucide-react';
import { toast } from 'sonner';
import {
  productShareDetails,
  productShareImagePath,
  shareProduct,
  type ShareableProduct,
} from '@/lib/share/product-share';

interface ShareProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: ShareableProduct & {
    price?: string | number | null;
    image_urls?: string[] | null;
  };
}

function formatPrice(price?: string | number | null): string | null {
  const value = parseFloat(String(price ?? ''));
  if (!Number.isFinite(value)) return null;
  return `GH₵ ${value.toLocaleString('en-GH', { maximumFractionDigits: 0 })}`;
}

export default function ShareProductModal({ isOpen, onClose, product }: ShareProductModalProps) {
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const { title, store, url } = productShareDetails(product, origin);
  const price = formatPrice(product.price);
  const fallbackSrc = product.image_urls?.[0];
  const sharedSrc = productShareImagePath(String(product.id));
  const [failedId, setFailedId] = useState<string | null>(null);
  const previewSrc = failedId === String(product.id) && fallbackSrc ? fallbackSrc : sharedSrc;
  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Link copied');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy the link.');
    }
  };

  const handleShare = async () => {
    setSharing(true);
    try {
      const result = await shareProduct(product);
      if (result === 'shared') onClose();
      else if (result === 'unavailable') toast.error('Could not share this product.');
    } finally {
      setSharing(false);
    }
  };

  const openShareWindow = (href: string) => {
    window.open(href, '_blank', 'noopener,noreferrer');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60"
          >
            <button
              type="button"
              aria-label="Close share modal"
              onClick={onClose}
              className="h-full w-full cursor-default"
            />
          </motion.div>

          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="bg-background text-foreground relative z-10 w-full overflow-hidden rounded-t-[2.5rem] sm:max-w-sm sm:rounded-[2.5rem]"
          >
            <div role="dialog" aria-modal="true" aria-labelledby="share-product-title">
              <div className="flex justify-center pb-1 pt-3 sm:hidden">
                <div className="bg-muted/40 h-1 w-10 rounded-full" />
              </div>

              <div className="flex items-center justify-end px-4 pt-3 sm:pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="bg-surface text-foreground rounded-full p-2 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-5 px-6 pb-6">
                <div className="flex flex-col items-center text-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewSrc}
                    alt=""
                    onError={() => {
                      if (fallbackSrc) setFailedId(String(product.id));
                    }}
                    className="bg-surface h-56 w-56 rounded-2xl object-cover"
                  />
                  <h2
                    id="share-product-title"
                    className="text-foreground mt-4 line-clamp-2 text-lg font-semibold tracking-tight"
                  >
                    {title}
                  </h2>
                  {store && <p className="text-muted mt-1 text-sm">{store}</p>}
                  {price && <p className="text-foreground mt-1 text-sm font-medium">{price}</p>}
                </div>

                <div className="space-y-2">
                  {/* {canNativeShare && (
                  <button
                    type="button"
                    onClick={handleShare}
                    disabled={sharing}
                    className="bg-foreground text-background flex h-12 w-full items-center justify-center gap-2 rounded-full text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
                  >
                    <Share2 className="h-4 w-4" />
                    {sharing ? 'Preparing…' : 'Share'}
                  </button>
                )} */}
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="bg-surface text-foreground flex h-12 w-full items-center justify-center gap-2 rounded-full text-sm font-semibold"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? 'Copied' : 'Copy link'}
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      openShareWindow(
                        `https://api.whatsapp.com/send?text=${encodeURIComponent(`${title}\n${url}`)}`,
                      )
                    }
                    className="bg-surface text-foreground flex flex-col items-center gap-1.5 rounded-2xl p-3"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                      <MessageCircle className="h-4 w-4" />
                    </span>
                    <span className="text-[11px] font-medium">WhatsApp</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      openShareWindow(
                        `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
                      )
                    }
                    className="bg-surface text-foreground flex flex-col items-center gap-1.5 rounded-2xl p-3"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-500/10 text-sky-600">
                      <Send className="h-4 w-4" />
                    </span>
                    <span className="text-[11px] font-medium">X</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      openShareWindow(
                        `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
                      )
                    }
                    className="bg-surface text-foreground flex flex-col items-center gap-1.5 rounded-2xl p-3"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/10 text-blue-600">
                      <Send className="h-4 w-4" />
                    </span>
                    <span className="text-[11px] font-medium">Telegram</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
