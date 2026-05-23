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
  Copy,
  Check,
  Star,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import { toast } from 'sonner';

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
  NEARBY_STATES: 'Nearby states',
  NATIONWIDE: 'Nationwide',
};

const DELIVERY_LABEL: Record<NonNullable<StorefrontHeaderData['avg_delivery_time']>, string> = {
  SAME_DAY: 'Same day',
  NEXT_DAY: 'Next day',
  TWO_TO_THREE_DAYS: '2–3 days',
  FOUR_TO_SEVEN_DAYS: '4–7 days',
  MORE_THAN_ONE_WEEK: '1+ week',
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
  const [shared, setShared] = useState(false);
  const memberSince = memberSinceLabel(store.member_since);
  const locationLabel = [store.area, store.location].filter(Boolean).join(' · ');

  async function handleShare() {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      try {
        await (navigator as any).share({ title: store.store_name, url });
        return;
      } catch {
        // fall through to copy
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setShared(true);
      toast.success('Link copied');
      setTimeout(() => setShared(false), 1800);
    } catch {
      toast.error('Could not copy');
    }
  }

  function openWhatsapp() {
    if (!store.whatsapp_number) {
      toast.error("Seller hasn't shared a number yet.");
      return;
    }
    const num = store.whatsapp_number.replace(/[^\d]/g, '');
    window.open(`https://wa.me/${num}`, '_blank');
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`relative mb-10 rounded-3xl border p-5 md:p-7 ${
        store.is_pro
          ? 'border-[var(--color-accent)]/40 from-[var(--color-accent)]/8 bg-gradient-to-br via-[var(--color-surface)] to-[var(--color-surface)]'
          : 'border-[var(--color-border)] bg-[var(--color-surface)]'
      }`}
    >
      <div className="flex flex-col items-start gap-5 md:flex-row md:gap-7">
        {/* Logo + role pill */}
        <div className="flex shrink-0 items-start gap-3 md:block">
          <div className="relative">
            <div className="h-20 w-20 overflow-hidden rounded-3xl border border-[var(--color-border)] bg-[var(--color-background)] md:h-28 md:w-28">
              {store.logo_url ? (
                <img
                  src={store.logo_url}
                  alt={store.store_name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="bg-[var(--color-accent)]/10 flex h-full w-full items-center justify-center text-2xl font-medium uppercase text-[var(--color-accent)] md:text-3xl">
                  {store.store_name.slice(0, 2)}
                </div>
              )}
            </div>
            {store.is_pro && (
              <span className="absolute -bottom-2 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-[var(--color-accent)] px-2 py-1 text-[9px] font-medium uppercase tracking-wider text-white shadow-sm">
                <Sparkles className="h-3 w-3" />
                Pro
              </span>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1 space-y-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-medium uppercase tracking-tight text-[var(--color-foreground)] md:text-3xl">
                {store.store_name}
              </h1>
              {store.is_verified && (
                <span
                  title="Verified seller"
                  className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-normal text-blue-500"
                >
                  <BadgeCheck className="h-3 w-3" /> Verified
                </span>
              )}
            </div>
            <p className="text-sm font-normal tracking-tight text-[var(--color-accent)]">
              @{store.store_link}
            </p>
          </div>

          {store.bio && (
            <p className="text-[var(--color-foreground)]/80 max-w-2xl text-[13px] leading-relaxed">
              {store.bio}
            </p>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            {store.rating_count !== undefined && store.rating_count > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-amber-500">
                <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                {store.rating_avg !== undefined ? store.rating_avg.toFixed(1) : '0.0'} ★ (
                {store.rating_count})
              </span>
            )}
            {locationLabel && <Chip icon={MapPin}>{locationLabel}</Chip>}
            <Chip icon={ShoppingBag}>
              {productsCount} {productsCount === 1 ? 'Item' : 'Items'}
            </Chip>
            {store.service_area && (
              <Chip icon={Truck}>{SERVICE_AREA_LABEL[store.service_area]}</Chip>
            )}
            {store.avg_delivery_time && (
              <Chip icon={Clock}>Delivers in {DELIVERY_LABEL[store.avg_delivery_time]}</Chip>
            )}
            {memberSince && <Chip icon={CalendarDays}>Member since {memberSince}</Chip>}
          </div>
        </div>

        {/* Actions */}
        <div className="flex w-full flex-row gap-2 md:w-auto md:max-w-[200px] md:flex-col">
          <Button
            variant="primary"
            className="flex-1 gap-2 shadow-none md:w-full"
            onClick={openWhatsapp}
          >
            <MessageCircle className="h-4 w-4" />
            Contact
          </Button>
          <Button
            variant="secondary"
            className="flex-1 gap-2 text-[11px] font-medium uppercase tracking-wider shadow-none md:w-full"
            onClick={handleShare}
          >
            {shared ? <Check className="h-3 w-3" /> : <Share2 className="h-3 w-3" />}
            {shared ? 'Copied' : 'Share'}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

function Chip({ icon: Icon, children }: { icon: any; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-[var(--color-muted)]">
      <Icon className="h-3 w-3" />
      {children}
    </span>
  );
}
