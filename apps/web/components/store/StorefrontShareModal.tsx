'use client';

import React, { useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Share2,
  Copy,
  Check,
  Download,
  QrCode,
  ExternalLink,
  MessageCircle,
  BadgeCheck,
  Sparkles,
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { toast } from 'sonner';

const MotionDiv = motion.div as any;

interface StorefrontShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  store: {
    store_name: string;
    store_link: string;
    logo_url?: string | null;
    bio?: string | null;
    is_verified?: boolean;
    is_pro?: boolean;
    products_count?: number;
  };
}

export default function StorefrontShareModal({
  isOpen,
  onClose,
  store,
}: StorefrontShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'link' | 'qr'>('link');
  const qrCanvasRef = useRef<HTMLDivElement | null>(null);

  const storefrontUrl = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://verndly.com';
    return `${origin}/s/${store.store_link}`;
  }, [store.store_link]);

  const shareText = `Explore ${store.store_name} on Verndly! Discover verified products from young entrepreneurs.`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(storefrontUrl);
      setCopied(true);
      toast.success('Storefront link copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy link.');
    }
  };

  const handleWhatsAppShare = () => {
    const text = `${shareText}\n${storefrontUrl}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };

  const handleTwitterShare = () => {
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(storefrontUrl)}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  const handleTelegramShare = () => {
    window.open(
      `https://t.me/share/url?url=${encodeURIComponent(storefrontUrl)}&text=${encodeURIComponent(shareText)}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      try {
        await (navigator as any).share({
          title: store.store_name,
          text: shareText,
          url: storefrontUrl,
        });
      } catch {
        // User cancelled or share failed
      }
    } else {
      handleCopyLink();
    }
  };

  const handleDownloadQr = () => {
    const canvas = qrCanvasRef.current?.querySelector('canvas');
    if (!canvas) return;
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `${store.store_link}-storefront-qr.png`;
    a.click();
    toast.success('Storefront QR Code downloaded!');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <MotionDiv
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60"
        />

        {/* Modal Card */}
        <MotionDiv
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-foreground)] shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--color-border)]/60 px-6 py-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
                <Share2 className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-foreground)]">
                Share Storefront
              </h3>
            </div>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-muted)] hover:bg-[var(--color-background)] hover:text-[var(--color-foreground)] transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Store Preview Card */}
            <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] p-4">
              <div className="flex items-center gap-3.5">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
                  {store.logo_url ? (
                    <img
                      src={store.logo_url}
                      alt={store.store_name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-lg font-bold uppercase text-[var(--color-accent)]">
                      {store.store_name.slice(0, 2)}
                    </div>
                  )}
                  {store.is_pro && (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-[var(--color-accent)] px-1.5 py-0.2 text-[8px] font-bold text-white">
                      PRO
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h4 className="truncate text-base font-semibold uppercase tracking-tight text-[var(--color-foreground)]">
                      {store.store_name}
                    </h4>
                    {store.is_verified && (
                      <BadgeCheck className="h-4 w-4 shrink-0 text-blue-500" />
                    )}
                  </div>
                  <p className="text-xs text-[var(--color-accent)] font-medium">
                    @{store.store_link}
                  </p>
                  {store.bio && (
                    <p className="mt-1 line-clamp-1 text-[11px] text-[var(--color-muted)]">
                      {store.bio}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Mode Switcher: Link vs QR Code */}
            <div className="flex rounded-xl bg-[var(--color-background)] p-1 border border-[var(--color-border)]">
              <button
                onClick={() => setActiveTab('link')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === 'link'
                    ? 'bg-[var(--color-surface)] text-[var(--color-foreground)] shadow-sm'
                    : 'text-[var(--color-muted)] hover:text-[var(--color-foreground)]'
                }`}
              >
                <Share2 className="h-3.5 w-3.5" />
                Share Link
              </button>
              <button
                onClick={() => setActiveTab('qr')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === 'qr'
                    ? 'bg-[var(--color-surface)] text-[var(--color-foreground)] shadow-sm'
                    : 'text-[var(--color-muted)] hover:text-[var(--color-foreground)]'
                }`}
              >
                <QrCode className="h-3.5 w-3.5" />
                Store QR
              </button>
            </div>

            {activeTab === 'link' ? (
              <div className="space-y-4">
                {/* Store URL Copy Field */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                    Store URL
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={storefrontUrl}
                      className="h-11 flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-3.5 text-xs text-[var(--color-foreground)] focus:outline-none"
                    />
                    <button
                      onClick={handleCopyLink}
                      className="flex h-11 items-center gap-1.5 rounded-xl bg-[var(--color-accent)] px-4 text-xs font-medium text-white hover:opacity-90 active:scale-95 transition-all"
                    >
                      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>

                {/* Social Share Buttons */}
                <div className="space-y-1.5 pt-2">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                    Direct Social Share
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {/* WhatsApp */}
                    <button
                      onClick={handleWhatsAppShare}
                      className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 py-3 text-emerald-600 hover:bg-emerald-500/20 transition-colors"
                    >
                      <MessageCircle className="h-5 w-5" />
                      <span className="text-[10px] font-semibold uppercase tracking-wider">WhatsApp</span>
                    </button>

                    {/* Twitter/X */}
                    <button
                      onClick={handleTwitterShare}
                      className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] py-3 text-[var(--color-foreground)] hover:bg-[var(--color-border)]/40 transition-colors"
                    >
                      <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                      <span className="text-[10px] font-semibold uppercase tracking-wider">X (Twitter)</span>
                    </button>

                    {/* Telegram */}
                    <button
                      onClick={handleTelegramShare}
                      className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-sky-500/20 bg-sky-500/10 py-3 text-sky-600 hover:bg-sky-500/20 transition-colors"
                    >
                      <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                      </svg>
                      <span className="text-[10px] font-semibold uppercase tracking-wider">Telegram</span>
                    </button>
                  </div>
                </div>

                {/* Mobile Web Share Button */}
                {typeof navigator !== 'undefined' && (navigator as any).share && (
                  <button
                    onClick={handleNativeShare}
                    className="w-full flex items-center justify-center gap-2 h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] text-xs font-medium text-[var(--color-foreground)] hover:bg-[var(--color-surface)] transition-colors"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    Share via system menu
                  </button>
                )}
              </div>
            ) : (
              /* QR Code Section */
              <div className="flex flex-col items-center space-y-4 py-2">
                <div
                  ref={qrCanvasRef}
                  className="p-4 rounded-2xl bg-white border border-[var(--color-border)] shadow-sm"
                >
                  <QRCodeCanvas
                    value={storefrontUrl}
                    size={180}
                    level="H"
                    includeMargin={false}
                  />
                </div>

                <p className="text-[11px] text-[var(--color-muted)] text-center max-w-xs">
                  Customers can scan this QR code with their mobile phone camera to land directly on your storefront.
                </p>

                <div className="flex w-full gap-2">
                  <button
                    onClick={handleDownloadQr}
                    className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl bg-[var(--color-accent)] text-xs font-medium text-white hover:opacity-90 active:scale-95 transition-all"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download QR Code
                  </button>
                  <button
                    onClick={handleCopyLink}
                    className="flex items-center justify-center gap-1.5 h-11 px-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] text-xs font-medium text-[var(--color-foreground)] hover:bg-[var(--color-surface)] transition-colors"
                  >
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </MotionDiv>
      </div>
    </AnimatePresence>
  );
}
