"use client";

import React from "react";
import Link from "next/link";
import { Sparkles, BadgeCheck, MapPin, Clock, Truck } from "lucide-react";
import Card from "@/components/ui/Card";

const SERVICE_AREA_LABEL: Record<string, string> = {
  SAME_CITY: "Same city only",
  NEARBY_STATES: "Nearby states",
  NATIONWIDE: "Nationwide",
};

const DELIVERY_LABEL: Record<string, string> = {
  SAME_DAY: "Same day",
  NEXT_DAY: "Next day",
  TWO_TO_THREE_DAYS: "2–3 days",
  FOUR_TO_SEVEN_DAYS: "4–7 days",
  MORE_THAN_ONE_WEEK: "1+ week",
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
  return (
    <Card
      className={`p-5 border rounded-[2rem] ${
        seller.is_pro
          ? "border-[var(--color-accent,#fb923c)]/40 bg-gradient-to-br from-[var(--color-accent,#fb923c)]/8 via-surface/40 to-surface/40"
          : "border-border/30 bg-surface/50"
      }`}
      hoverEffect={false}
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-4 min-w-0 flex-1">
          <div className="relative shrink-0">
            <div className="w-14 h-14 rounded-2xl bg-border/20 overflow-hidden border border-border/50">
              {seller.logo_url ? (
                <img src={seller.logo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-lg font-black uppercase bg-primary/5 text-primary">
                  {(seller.store_name || "?")[0]}
                </div>
              )}
            </div>
            {seller.is_pro && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest bg-[var(--color-accent,#fb923c)] text-white shadow-sm">
                <Sparkles className="w-2 h-2" />
                Pro
              </span>
            )}
          </div>

          <div className="min-w-0 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-black uppercase tracking-tight text-foreground truncate">
                {seller.store_name}
              </h4>
              {seller.is_verified && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-blue-500/10 text-blue-500">
                  <BadgeCheck className="w-2.5 h-2.5" /> Verified
                </span>
              )}
            </div>
            <p className="text-[10px] text-muted font-bold">@{seller.store_link}</p>
            {(seller.location || seller.service_area || seller.avg_delivery_time) && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {seller.location && <Chip icon={MapPin}>{seller.location}</Chip>}
                {seller.service_area && (
                  <Chip icon={Truck}>{SERVICE_AREA_LABEL[seller.service_area] ?? seller.service_area}</Chip>
                )}
                {seller.avg_delivery_time && (
                  <Chip icon={Clock}>
                    Delivers in {DELIVERY_LABEL[seller.avg_delivery_time] ?? seller.avg_delivery_time}
                  </Chip>
                )}
              </div>
            )}
          </div>
        </div>

        <Link
          href={`/s/${seller.store_link}`}
          className="px-4 h-10 inline-flex items-center justify-center rounded-2xl bg-white text-black text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-opacity flex-shrink-0"
        >
          Visit shop
        </Link>
      </div>
    </Card>
  );
}

function Chip({ icon: Icon, children }: { icon: any; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-background/60 border border-border/50 text-muted">
      <Icon className="w-2.5 h-2.5" />
      {children}
    </span>
  );
}
