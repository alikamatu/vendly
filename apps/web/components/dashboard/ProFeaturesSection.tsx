'use client';

import React, { useState } from 'react';
import { QrCode, BarChart3, Megaphone, Sparkles, Lock } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/contexts/auth-context';
import { useProStatus } from '@/hooks/useProStatus';
import ProFeatureCard from './ProFeatureCard';
import StorefrontQRModal from './StorefrontQRModal';

export default function ProFeaturesSection() {
  const { user } = useAuth();
  const { status } = useProStatus();
  const [qrOpen, setQrOpen] = useState(false);

  const isPro = !!status?.is_pro;
  const storeLink = user?.seller_profile?.store_link;
  const storeName = user?.seller_profile?.store_name || 'My store';

  return (
    <section className="space-y-4">
      <header className="flex items-center justify-between gap-3 px-1">
        <div className="space-y-0.5">
          <p className="inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-[var(--color-accent)]">
            <Sparkles className="h-3 w-3" />
            Verndly Pro
          </p>
          <h3 className="text-sm font-medium uppercase tracking-tight text-[var(--color-foreground)]">
            Pro features
          </h3>
        </div>
        {!isPro && (
          <Link
            href="/dashboard/settings"
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[var(--color-accent)] px-4 text-[11px] font-medium uppercase tracking-wider text-white transition-opacity hover:opacity-90"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Upgrade
          </Link>
        )}
        {isPro && (
          <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 text-[10px] font-medium uppercase tracking-wider text-emerald-600">
            <Sparkles className="h-3 w-3" />
            Active
          </span>
        )}
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4 lg:grid-cols-3">
        <ProFeatureCard
          icon={QrCode}
          title="Storefront QR code"
          description="Generate a high-res QR that lands buyers directly on your shop. Print, share, stick on packaging."
          isPro={isPro}
          accent="accent"
          cta={
            storeLink
              ? { label: 'Generate', onClick: () => setQrOpen(true) }
              : { label: 'Set up store', href: '/dashboard/settings/store' }
          }
        />

        <ProFeatureCard
          icon={BarChart3}
          title="Advanced analytics"
          description="Track conversion rates, revenue trends, top-selling products, and buyer drop-off funnels in real time."
          isPro={isPro}
          accent="accent"
          previewHref="/dashboard/analytics"
          cta={{ label: 'View analytics', href: '/dashboard/analytics' }}
        />

        <ProFeatureCard
          icon={Megaphone}
          title="Featured placement"
          description="Pro sellers get bumped to the top of their category lists and into the Featured Marketplace rotation."
          isPro={isPro}
          cta={{ label: 'Open category', href: '/categories' }}
        />
      </div>

      {!isPro && (
        <div className="flex items-start gap-2.5 rounded-2xl bg-[var(--color-surface)] px-4 py-3">
          <Lock className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[var(--color-muted)]" />
          <p className="text-xs leading-snug text-[var(--color-muted)]">
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
