'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  MapPin,
  MessageCircle,
  Share2,
  ShoppingBag,
  BadgeCheck,
  Sparkles,
  Clock,
  Truck,
  CalendarDays,
  Star,
  Info,
  ExternalLink,
  Globe,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import { toast } from 'sonner';
import StorefrontShareModal from './StorefrontShareModal';
import StorefrontContactModal, { formatWhatsappUrl } from './StorefrontContactModal';

export interface StorefrontHeaderData {
  store_name: string;
  store_link: string;
  logo_url?: string | null;
  bio?: string | null;
  whatsapp_number?: string | null;
  location?: string | null;
  area?: string | null;
  is_verified?: boolean;
  is_pro?: boolean;
  member_since?: string | Date | null;
  products_count?: number;
  rating_avg?: number;
  rating_count?: number;
  delivery_policies?: string | null;
  business_hours?: string | null;
  social_links?: Record<string, string> | null;
  service_area?: 'SAME_CITY' | 'NEARBY_STATES' | 'NATIONWIDE' | null;
  avg_delivery_time?:
    | 'SAME_DAY'
    | 'NEXT_DAY'
    | 'TWO_TO_THREE_DAYS'
    | 'FOUR_TO_SEVEN_DAYS'
    | 'MORE_THAN_ONE_WEEK'
    | null;
}

const SERVICE_AREA_LABEL: Record<NonNullable<StorefrontHeaderData['service_area']>, string> = {
  SAME_CITY: 'Same city only',
  NEARBY_STATES: 'Nearby areas',
  NATIONWIDE: 'Nationwide delivery',
};

const DELIVERY_LABEL: Record<NonNullable<StorefrontHeaderData['avg_delivery_time']>, string> = {
  SAME_DAY: 'Same day dispatch',
  NEXT_DAY: 'Next day dispatch',
  TWO_TO_THREE_DAYS: '2–3 days dispatch',
  FOUR_TO_SEVEN_DAYS: '4–7 days dispatch',
  MORE_THAN_ONE_WEEK: '1+ week dispatch',
};

function memberSinceLabel(value: StorefrontHeaderData['member_since']) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

interface StorefrontHeaderProps {
  store: StorefrontHeaderData;
  productsCount: number;
}

export default function StorefrontHeader({ store, productsCount }: StorefrontHeaderProps) {
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  const memberSince = memberSinceLabel(store.member_since);
  const locationLabel = [store.area, store.location].filter(Boolean).join(' · ');
  const socials = store.social_links || {};

  const handleMessageClick = () => {
    if (!store.whatsapp_number) {
      toast.error('This seller has not provided a WhatsApp contact yet.');
      setIsContactModalOpen(true);
      return;
    }
    const url = formatWhatsappUrl(store.whatsapp_number, store.store_name, store.store_link);
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      toast.error('Invalid WhatsApp number provided.');
    }
  };

  const sanitizeHandle = (val?: string) => {
    if (!val) return '';
    return val.replace(/^@/, '').trim();
  };

  // Quick social chips to render directly in header
  const quickSocials = [
    {
      key: 'instagram',
      name: 'Instagram',
      url: socials.instagram
        ? socials.instagram.startsWith('http')
          ? socials.instagram
          : `https://instagram.com/${sanitizeHandle(socials.instagram)}`
        : null,
      icon: (
        <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
      ),
    },
    {
      key: 'tiktok',
      name: 'TikTok',
      url: socials.tiktok
        ? socials.tiktok.startsWith('http')
          ? socials.tiktok
          : `https://tiktok.com/@${sanitizeHandle(socials.tiktok)}`
        : null,
      icon: (
        <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
          <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 2.89 3.5 2.75 1.44-.07 2.67-.97 3.09-2.31.25-.72.31-1.5.29-2.26.03-5.27.01-10.54.02-15.81z" />
        </svg>
      ),
    },
    {
      key: 'twitter',
      name: 'X',
      url: socials.twitter
        ? socials.twitter.startsWith('http')
          ? socials.twitter
          : `https://x.com/${sanitizeHandle(socials.twitter)}`
        : null,
      icon: (
        <svg className="h-3 w-3 fill-current" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
    },
    {
      key: 'facebook',
      name: 'Facebook',
      url: socials.facebook
        ? socials.facebook.startsWith('http')
          ? socials.facebook
          : `https://facebook.com/${sanitizeHandle(socials.facebook)}`
        : null,
      icon: (
        <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
    },
    {
      key: 'website',
      name: 'Website',
      url: socials.website
        ? socials.website.startsWith('http')
          ? socials.website
          : `https://${socials.website}`
        : null,
      icon: <Globe className="h-3.5 w-3.5" />,
    },
  ].filter((s) => s.url);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="relative mb-10 overflow-hidden rounded-[32px] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-none"
      >
        {/* Cover banner backdrop */}
        <div className="h-28 w-full bg-[var(--color-surface)] border-b border-[var(--color-border)]/50" />

        <div className="relative px-6 pb-6 pt-0 md:px-8 md:pb-8">
          {/* Top Row: Avatar overlapping cover + Action Buttons */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 -mt-14 mb-5">
            {/* Logo */}
            <div className="relative">
              <div className="h-24 w-24 md:h-28 md:w-28 overflow-hidden rounded-[24px] border-4 border-[var(--color-surface)] bg-[var(--color-background)] shadow-sm">
                {store.logo_url ? (
                  <img
                    src={store.logo_url}
                    alt={store.store_name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl font-bold uppercase text-[var(--color-accent)]">
                    {store.store_name.slice(0, 2)}
                  </div>
                )}
              </div>
              {store.is_pro && (
                <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full bg-[var(--color-accent)] px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow-sm">
                  <Sparkles className="h-2.5 w-2.5" />
                  PRO
                </span>
              )}
            </div>

            {/* Action Buttons: Message / WhatsApp DM, Share, Info */}
            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              <button
                onClick={handleMessageClick}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 h-11 px-5 rounded-2xl bg-emerald-600 text-white text-xs font-semibold uppercase tracking-wider hover:bg-emerald-700 active:scale-95 transition-all shadow-none"
              >
                <MessageCircle className="h-4 w-4" />
                <span>Message</span>
              </button>

              <button
                onClick={() => setIsShareModalOpen(true)}
                className="flex items-center justify-center gap-2 h-11 px-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] text-xs font-semibold uppercase tracking-wider text-[var(--color-foreground)] hover:bg-[var(--color-surface)] active:scale-95 transition-all"
              >
                <Share2 className="h-3.5 w-3.5" />
                <span>Share</span>
              </button>

              <button
                onClick={() => setIsContactModalOpen(true)}
                className="flex items-center justify-center h-11 w-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-surface)] active:scale-95 transition-all"
                title="Store details & contact"
              >
                <Info className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Store Info & Socials */}
          <div className="space-y-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-bold uppercase tracking-tight text-[var(--color-foreground)]">
                  {store.store_name}
                </h1>
                {store.is_verified && (
                  <span
                    title="Verified young entrepreneur store"
                    className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-blue-500 border border-blue-500/20"
                  >
                    <BadgeCheck className="h-3.5 w-3.5" />
                    Verified
                  </span>
                )}
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-accent)]">
                @{store.store_link}
              </p>
            </div>

            {store.bio && (
              <p className="max-w-3xl text-xs md:text-sm text-[var(--color-foreground)]/80 leading-relaxed font-normal">
                {store.bio}
              </p>
            )}

            {/* Badges & Metrics */}
            <div className="flex flex-wrap gap-2 pt-1">
              {store.rating_count !== undefined && store.rating_count > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-amber-500">
                  <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                  {store.rating_avg !== undefined ? store.rating_avg.toFixed(1) : '0.0'} ({store.rating_count})
                </span>
              )}
              {locationLabel && <Chip icon={MapPin}>{locationLabel}</Chip>}
              <Chip icon={ShoppingBag}>
                {productsCount} {productsCount === 1 ? 'Product' : 'Products'}
              </Chip>
              {store.avg_delivery_time && (
                <Chip icon={Clock}>{DELIVERY_LABEL[store.avg_delivery_time]}</Chip>
              )}
              {store.service_area && (
                <Chip icon={Truck}>{SERVICE_AREA_LABEL[store.service_area]}</Chip>
              )}
              {memberSince && <Chip icon={CalendarDays}>Joined {memberSince}</Chip>}
            </div>

            {/* Social Links Chips */}
            {quickSocials.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--color-border)]/60">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)] mr-1">
                  Connect:
                </span>
                {quickSocials.map((s) => (
                  <a
                    key={s.key}
                    href={s.url!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-2.5 py-1 text-[10px] font-medium text-[var(--color-foreground)] hover:border-[var(--color-accent)]/50 hover:text-[var(--color-accent)] transition-colors"
                  >
                    {s.icon}
                    <span>{s.name}</span>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Share Modal */}
      <StorefrontShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        store={store}
      />

      {/* Contact & Info Modal */}
      <StorefrontContactModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        store={store}
      />
    </>
  );
}

function Chip({ icon: Icon, children }: { icon: any; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-[var(--color-muted)]">
      <Icon className="h-3 w-3 text-[var(--color-accent)]" />
      {children}
    </span>
  );
}
