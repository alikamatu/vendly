'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  MessageCircle,
  Phone,
  MapPin,
  Clock,
  Truck,
  Globe,
  ExternalLink,
  Store,
  BadgeCheck,
  Building2,
  Calendar,
} from 'lucide-react';

const MotionDiv = motion.div as any;

interface StorefrontContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  store: {
    store_name: string;
    store_link: string;
    logo_url?: string | null;
    bio?: string | null;
    whatsapp_number?: string | null;
    location?: string | null;
    area?: string | null;
    delivery_policies?: string | null;
    business_hours?: string | null;
    service_area?: string | null;
    avg_delivery_time?: string | null;
    social_links?: Record<string, string> | null;
    is_verified?: boolean;
    is_pro?: boolean;
  };
}

export function formatWhatsappUrl(phone?: string | null, storeName = 'store', storeLink = '') {
  if (!phone) return null;
  let clean = phone.replace(/[^\d]/g, '');
  // Format local Ghana numbers 054... to international 23354...
  if (clean.startsWith('0') && clean.length === 10) {
    clean = '233' + clean.slice(1);
  }
  const text = encodeURIComponent(
    `Hello ${storeName}, I am viewing your storefront on Verndly (@${storeLink}) and would like to make an inquiry.`
  );
  return `https://wa.me/${clean}?text=${text}`;
}

export default function StorefrontContactModal({
  isOpen,
  onClose,
  store,
}: StorefrontContactModalProps) {
  if (!isOpen) return null;

  const whatsappUrl = formatWhatsappUrl(store.whatsapp_number, store.store_name, store.store_link);
  const socials = store.social_links || {};

  const sanitizeHandle = (val?: string) => {
    if (!val) return '';
    return val.replace(/^@/, '').trim();
  };

  const socialLinksConfig = [
    {
      key: 'instagram',
      label: 'Instagram',
      handle: sanitizeHandle(socials.instagram),
      url: socials.instagram
        ? socials.instagram.startsWith('http')
          ? socials.instagram
          : `https://instagram.com/${sanitizeHandle(socials.instagram)}`
        : null,
      icon: (
        <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
      ),
      color: 'text-pink-500 bg-pink-500/10 border-pink-500/20',
    },
    {
      key: 'tiktok',
      label: 'TikTok',
      handle: sanitizeHandle(socials.tiktok),
      url: socials.tiktok
        ? socials.tiktok.startsWith('http')
          ? socials.tiktok
          : `https://tiktok.com/@${sanitizeHandle(socials.tiktok)}`
        : null,
      icon: (
        <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
          <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 2.89 3.5 2.75 1.44-.07 2.67-.97 3.09-2.31.25-.72.31-1.5.29-2.26.03-5.27.01-10.54.02-15.81z" />
        </svg>
      ),
      color: 'text-neutral-800 dark:text-neutral-200 bg-neutral-500/10 border-neutral-500/20',
    },
    {
      key: 'twitter',
      label: 'X (Twitter)',
      handle: sanitizeHandle(socials.twitter),
      url: socials.twitter
        ? socials.twitter.startsWith('http')
          ? socials.twitter
          : `https://x.com/${sanitizeHandle(socials.twitter)}`
        : null,
      icon: (
        <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
      color: 'text-neutral-800 dark:text-neutral-200 bg-neutral-500/10 border-neutral-500/20',
    },
    {
      key: 'facebook',
      label: 'Facebook',
      handle: sanitizeHandle(socials.facebook),
      url: socials.facebook
        ? socials.facebook.startsWith('http')
          ? socials.facebook
          : `https://facebook.com/${sanitizeHandle(socials.facebook)}`
        : null,
      icon: (
        <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
      color: 'text-blue-600 bg-blue-500/10 border-blue-500/20',
    },
    {
      key: 'youtube',
      label: 'YouTube',
      handle: sanitizeHandle(socials.youtube),
      url: socials.youtube
        ? socials.youtube.startsWith('http')
          ? socials.youtube
          : `https://youtube.com/@${sanitizeHandle(socials.youtube)}`
        : null,
      icon: (
        <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      ),
      color: 'text-red-500 bg-red-500/10 border-red-500/20',
    },
    {
      key: 'website',
      label: 'Website',
      handle: socials.website ? socials.website.replace(/^https?:\/\//, '') : '',
      url: socials.website
        ? socials.website.startsWith('http')
          ? socials.website
          : `https://${socials.website}`
        : null,
      icon: <Globe className="h-4 w-4" />,
      color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    },
  ].filter((s) => s.url);

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
                <Store className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-foreground)]">
                Store Details & Contact
              </h3>
            </div>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-muted)] hover:bg-[var(--color-background)] hover:text-[var(--color-foreground)] transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
            {/* Primary Action: Direct WhatsApp Chat */}
            {whatsappUrl ? (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-3 w-full rounded-2xl bg-emerald-600 px-5 py-4 text-white hover:bg-emerald-700 active:scale-[0.99] transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                    <MessageCircle className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-semibold uppercase tracking-wider">Chat on WhatsApp</p>
                    <p className="text-[11px] text-white/80">Direct DM with seller for inquiries</p>
                  </div>
                </div>
                <ExternalLink className="h-4 w-4 opacity-70" />
              </a>
            ) : (
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] p-4 text-center">
                <p className="text-xs text-[var(--color-muted)]">
                  Seller has not linked a direct WhatsApp number yet.
                </p>
              </div>
            )}

            {/* Social Channels */}
            {socialLinksConfig.length > 0 && (
              <div className="space-y-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                  Social Channels
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {socialLinksConfig.map((s) => (
                    <a
                      key={s.key}
                      href={s.url!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center gap-2.5 rounded-xl border p-3 text-xs font-medium transition-colors hover:opacity-80 ${s.color}`}
                    >
                      {s.icon}
                      <span className="truncate">{s.label}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Location & Policies */}
            <div className="space-y-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] p-4">
              {/* Location */}
              {(store.area || store.location) && (
                <div className="flex items-start gap-2.5 text-xs text-[var(--color-foreground)]">
                  <MapPin className="h-4 w-4 shrink-0 text-[var(--color-accent)] mt-0.5" />
                  <div>
                    <p className="font-medium uppercase text-[10px] tracking-wider text-[var(--color-muted)]">
                      Location & Area
                    </p>
                    <p className="font-normal">{[store.area, store.location].filter(Boolean).join(' · ')}</p>
                  </div>
                </div>
              )}

              {/* Delivery Speed / Policy */}
              {store.avg_delivery_time && (
                <div className="flex items-start gap-2.5 text-xs text-[var(--color-foreground)] pt-2 border-t border-[var(--color-border)]/60">
                  <Truck className="h-4 w-4 shrink-0 text-[var(--color-accent)] mt-0.5" />
                  <div>
                    <p className="font-medium uppercase text-[10px] tracking-wider text-[var(--color-muted)]">
                      Dispatch Speed
                    </p>
                    <p className="font-normal">{store.avg_delivery_time.replace(/_/g, ' ')}</p>
                  </div>
                </div>
              )}

              {/* Business Hours */}
              {store.business_hours && (
                <div className="flex items-start gap-2.5 text-xs text-[var(--color-foreground)] pt-2 border-t border-[var(--color-border)]/60">
                  <Clock className="h-4 w-4 shrink-0 text-[var(--color-accent)] mt-0.5" />
                  <div>
                    <p className="font-medium uppercase text-[10px] tracking-wider text-[var(--color-muted)]">
                      Business Hours
                    </p>
                    <p className="font-normal">{store.business_hours}</p>
                  </div>
                </div>
              )}

              {/* Delivery Policies */}
              {store.delivery_policies && (
                <div className="flex items-start gap-2.5 text-xs text-[var(--color-foreground)] pt-2 border-t border-[var(--color-border)]/60">
                  <Calendar className="h-4 w-4 shrink-0 text-[var(--color-accent)] mt-0.5" />
                  <div>
                    <p className="font-medium uppercase text-[10px] tracking-wider text-[var(--color-muted)]">
                      Delivery Policies
                    </p>
                    <p className="font-normal text-[11px] leading-relaxed text-[var(--color-muted)]">
                      {store.delivery_policies}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </MotionDiv>
      </div>
    </AnimatePresence>
  );
}
