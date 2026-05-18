"use client";

import React, { useState } from "react";
import { QrCode, BarChart3, Megaphone, Sparkles, Lock } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/contexts/auth-context";
import { useProStatus } from "@/hooks/useProStatus";
import ProFeatureCard from "./ProFeatureCard";
import StorefrontQRModal from "./StorefrontQRModal";

export default function ProFeaturesSection() {
  const { user } = useAuth();
  const { status } = useProStatus();
  const [qrOpen, setQrOpen] = useState(false);

  const isPro = !!status?.is_pro;
  const storeLink = user?.seller_profile?.store_link;
  const storeName = user?.seller_profile?.store_name || "My store";

  return (
    <section className="space-y-4">
      <header className="flex items-center justify-between gap-3 px-1">
        <div className="space-y-0.5">
          <p className="text-[10px] font-black text-[var(--color-accent)] uppercase tracking-[0.2em] inline-flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" />
            Vendly Pro
          </p>
          <h3 className="text-sm font-black uppercase tracking-tight text-[var(--color-foreground)]">
            Pro features
          </h3>
        </div>
        {!isPro && (
          <Link
            href="/dashboard/settings"
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-[var(--color-accent)] text-white text-[11px] font-black uppercase tracking-wider hover:opacity-90 transition-opacity"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Upgrade
          </Link>
        )}
        {isPro && (
          <span className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-black uppercase tracking-wider">
            <Sparkles className="w-3 h-3" />
            Active
          </span>
        )}
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        <ProFeatureCard
          icon={QrCode}
          title="Storefront QR code"
          description="Generate a high-res QR that lands buyers directly on your shop. Print, share, stick on packaging."
          isPro={isPro}
          accent="accent"
          cta={
            storeLink
              ? { label: "Generate", onClick: () => setQrOpen(true) }
              : { label: "Set up store", href: "/dashboard/settings/store" }
          }
        />

        <ProFeatureCard
          icon={BarChart3}
          title="Advanced analytics"
          description="Conversion rate, visitor sources, and low-stock alerts. Currently free preview — Pro keeps full history."
          isPro={isPro}
          cta={{ label: "Soon", href: "/dashboard" }}
        />

        <ProFeatureCard
          icon={Megaphone}
          title="Featured placement"
          description="Pro sellers get bumped to the top of their category lists and into the Featured Marketplace rotation."
          isPro={isPro}
          cta={{ label: "Open category", href: "/categories" }}
        />
      </div>

      {!isPro && (
        <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-2xl bg-[var(--color-surface)] border border-dashed border-[var(--color-border)]">
          <Lock className="w-3.5 h-3.5 mt-0.5 text-[var(--color-muted)] flex-shrink-0" />
          <p className="text-[11px] text-[var(--color-muted)] leading-snug">
            Locked features unlock instantly the moment your Pro payment is verified.
          </p>
        </div>
      )}

      {storeLink && (
        <StorefrontQRModal
          open={qrOpen}
          onClose={() => setQrOpen(false)}
          storeLink={storeLink}
          storeName={storeName}
        />
      )}
    </section>
  );
}
