"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
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
} from "lucide-react";
import Button from "@/components/ui/Button";
import { toast } from "sonner";

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
  service_area?: "SAME_CITY" | "NEARBY_STATES" | "NATIONWIDE" | null;
  avg_delivery_time?:
    | "SAME_DAY"
    | "NEXT_DAY"
    | "TWO_TO_THREE_DAYS"
    | "FOUR_TO_SEVEN_DAYS"
    | "MORE_THAN_ONE_WEEK"
    | null;
}

const SERVICE_AREA_LABEL: Record<NonNullable<StorefrontHeaderData["service_area"]>, string> = {
  SAME_CITY: "Same city only",
  NEARBY_STATES: "Nearby states",
  NATIONWIDE: "Nationwide",
};

const DELIVERY_LABEL: Record<NonNullable<StorefrontHeaderData["avg_delivery_time"]>, string> = {
  SAME_DAY: "Same day",
  NEXT_DAY: "Next day",
  TWO_TO_THREE_DAYS: "2–3 days",
  FOUR_TO_SEVEN_DAYS: "4–7 days",
  MORE_THAN_ONE_WEEK: "1+ week",
};

function memberSinceLabel(value: StorefrontHeaderData["member_since"]) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

interface StorefrontHeaderProps {
  store: StorefrontHeaderData;
  productsCount: number;
}

export default function StorefrontHeader({ store, productsCount }: StorefrontHeaderProps) {
  const [shared, setShared] = useState(false);
  const memberSince = memberSinceLabel(store.member_since);
  const locationLabel = [store.area, store.location].filter(Boolean).join(" · ");

  async function handleShare() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (typeof navigator !== "undefined" && (navigator as any).share) {
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
      toast.success("Link copied");
      setTimeout(() => setShared(false), 1800);
    } catch {
      toast.error("Could not copy");
    }
  }

  function openWhatsapp() {
    if (!store.whatsapp_number) {
      toast.error("Seller hasn't shared a number yet.");
      return;
    }
    const num = store.whatsapp_number.replace(/[^\d]/g, "");
    window.open(`https://wa.me/${num}`, "_blank");
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`relative rounded-3xl border p-5 md:p-7 mb-10 ${
        store.is_pro
          ? "border-[var(--color-accent)]/40 bg-gradient-to-br from-[var(--color-accent)]/8 via-[var(--color-surface)] to-[var(--color-surface)]"
          : "border-[var(--color-border)] bg-[var(--color-surface)]"
      }`}
    >
      <div className="flex flex-col md:flex-row gap-5 md:gap-7 items-start">
        {/* Logo + role pill */}
        <div className="shrink-0 flex items-start gap-3 md:block">
          <div className="relative">
            <div className="w-20 h-20 md:w-28 md:h-28 rounded-3xl overflow-hidden border border-[var(--color-border)] bg-[var(--color-background)]">
              {store.logo_url ? (
                <img
                  src={store.logo_url}
                  alt={store.store_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-[var(--color-accent)]/10 text-2xl md:text-3xl font-black uppercase text-[var(--color-accent)]">
                  {store.store_name.slice(0, 2)}
                </div>
              )}
            </div>
            {store.is_pro && (
              <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-[var(--color-accent)] text-white shadow-sm">
                <Sparkles className="w-3 h-3" />
                Pro
              </span>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 space-y-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-[var(--color-foreground)]">
                {store.store_name}
              </h1>
              {store.is_verified && (
                <span
                  title="Verified seller"
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-500"
                >
                  <BadgeCheck className="w-3 h-3" /> Verified
                </span>
              )}
            </div>
            <p className="text-[var(--color-accent)] text-sm font-bold tracking-tight">
              @{store.store_link}
            </p>
          </div>

          {store.bio && (
            <p className="text-[13px] text-[var(--color-foreground)]/80 leading-relaxed max-w-2xl">
              {store.bio}
            </p>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            {locationLabel && (
              <Chip icon={MapPin}>{locationLabel}</Chip>
            )}
            <Chip icon={ShoppingBag}>
              {productsCount} {productsCount === 1 ? "Item" : "Items"}
            </Chip>
            {store.service_area && (
              <Chip icon={Truck}>{SERVICE_AREA_LABEL[store.service_area]}</Chip>
            )}
            {store.avg_delivery_time && (
              <Chip icon={Clock}>Delivers in {DELIVERY_LABEL[store.avg_delivery_time]}</Chip>
            )}
            {memberSince && (
              <Chip icon={CalendarDays}>Member since {memberSince}</Chip>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="w-full md:w-auto md:max-w-[200px] flex flex-row md:flex-col gap-2">
          <Button
            variant="primary"
            className="flex-1 md:w-full gap-2 shadow-none"
            onClick={openWhatsapp}
          >
            <MessageCircle className="w-4 h-4" />
            Contact
          </Button>
          <Button
            variant="secondary"
            className="flex-1 md:w-full gap-2 text-[11px] uppercase font-black tracking-widest shadow-none"
            onClick={handleShare}
          >
            {shared ? <Check className="w-3 h-3" /> : <Share2 className="w-3 h-3" />}
            {shared ? "Copied" : "Share"}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

function Chip({ icon: Icon, children }: { icon: any; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--color-background)] border border-[var(--color-border)] text-[10px] font-black uppercase tracking-widest text-[var(--color-muted)]">
      <Icon className="w-3 h-3" />
      {children}
    </span>
  );
}
