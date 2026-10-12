'use client';

import React from 'react';
import Link from 'next/link';
import { Sparkles, BadgeCheck, MapPin, Clock, Truck } from 'lucide-react';
import Card from '@/components/ui/Card';

const SERVICE_AREA_LABEL: Record<string, string> = {
  SAME_CITY: 'Same city only',
  NEARBY_STATES: 'Nearby states',
  NATIONWIDE: 'Nationwide',
};

const DELIVERY_LABEL: Record<string, string> = {
  SAME_DAY: 'Same day',
  NEXT_DAY: 'Next day',
  TWO_TO_THREE_DAYS: '2–3 days',
  FOUR_TO_SEVEN_DAYS: '4–7 days',
  MORE_THAN_ONE_WEEK: '1+ week',
};

interface SellerCardProps {
  seller: {
    store_name: string;
    store_link: string;
    logo_url?: string | null;
    bio?: string | null;
    location?: string | null;
    is_pro?: boolean;
    is_verified?: boolean;
    service_area?: string | null;
    avg_delivery_time?: string | null;
  };
}

export default function SellerCard({ seller }: SellerCardProps) {
  const [logoError, setLogoError] = React.useState(false);

  return (
    <Card
      className={`rounded-[2rem] border p-5 ${
        seller.is_pro
          ? 'border-[var(--color-accent,#fb923c)]/40 bg-[var(--color-accent,#fb923c)]/5'
          : 'border-border/30 bg-surface/50'
      }`}
      hoverEffect={false}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-start gap-4">
          <div className="relative shrink-0">
            <div className="bg-border/20 border-border/50 h-14 w-14 overflow-hidden rounded-2xl border">
              {seller.logo_url && !logoError ? (
                <img
                  src={seller.logo_url}
                  alt={seller.store_name}
                  onError={() => setLogoError(true)}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="bg-primary/5 text-primary flex h-full w-full items-center justify-center text-lg font-medium uppercase">
                  {(seller.store_name || '?')[0]}
                </div>
              )}
            </div>
            {seller.is_pro && (
              <span className="absolute -bottom-1 left-1/2 inline-flex -translate-x-1/2 items-center gap-0.5 rounded-full bg-[var(--color-accent,#fb923c)] px-1.5 py-0.5 text-[8px] font-medium uppercase tracking-wider text-white shadow-sm">
                <Sparkles className="h-2 w-2" />
                Pro
              </span>
            )}
          </div>

          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-foreground truncate text-sm font-medium uppercase tracking-tight">
                {seller.store_name}
              </h4>
              {seller.is_verified && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-500/10 px-1.5 py-0.5 text-[9px] font-normal text-blue-500">
                  <BadgeCheck className="h-2.5 w-2.5" /> Verified
                </span>
              )}
            </div>
            <p className="text-muted text-[10px] font-normal">@{seller.store_link}</p>
            {(seller.location || seller.service_area || seller.avg_delivery_time) && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {seller.location && <Chip icon={MapPin}>{seller.location}</Chip>}
                {seller.service_area && (
                  <Chip icon={Truck}>
                    {SERVICE_AREA_LABEL[seller.service_area] ?? seller.service_area}
                  </Chip>
                )}
                {seller.avg_delivery_time && (
                  <Chip icon={Clock}>
                    Delivers in{' '}
                    {DELIVERY_LABEL[seller.avg_delivery_time] ?? seller.avg_delivery_time}
                  </Chip>
                )}
              </div>
            )}
          </div>
        </div>

        <Link
          href={`/s/${seller.store_link}`}
          className="inline-flex h-10 flex-shrink-0 items-center justify-center rounded-2xl bg-white px-4 text-[10px] font-medium uppercase tracking-wider text-black transition-opacity hover:opacity-90"
        >
          Visit shop
        </Link>
      </div>
    </Card>
  );
}

function Chip({ icon: Icon, children }: { icon: any; children: React.ReactNode }) {
  return (
    <span className="bg-background/60 border-border/50 text-muted inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-normal uppercase tracking-wider">
      <Icon className="h-2.5 w-2.5" />
      {children}
    </span>
  );
}
