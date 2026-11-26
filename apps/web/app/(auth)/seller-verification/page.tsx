import React, { Suspense } from 'react';
import Link from 'next/link';
import { Clock, FileCheck2, MessageSquare, Store, ArrowRight } from 'lucide-react';
import Header from '@/components/layout/Header';
import BreadcrumbJsonLd from '@/components/seo/BreadcrumbJsonLd';
import { buildMetadata } from '@/lib/seo';
import { SUPPORT_CONTACT } from '@/lib/contact';
import SellerVerificationForm from './SellerVerificationForm';

export const metadata = buildMetadata({
  title: 'Get verified to sell on Verndly',
  description:
    'Get verified to sell on Verndly in 24–48 hours using an existing Instagram or TikTok store link, your Ghana Card and sales proof, or a quick manual review with our Accra team.',
  path: '/seller-verification',
  keywords: [
    'get verified to sell on verndly',
    'verndly seller verification',
    'verified merchant ghana',
    'sell online accra ghana',
  ],
});

const VERIFICATION_TRACKS = [
  {
    step: '01',
    Icon: Store,
    title: 'Existing store link',
    description:
      'Already selling on Instagram, TikTok, Shopify, or a Google Drive catalog? Share your link and confirm ownership in minutes.',
  },
  {
    step: '02',
    Icon: FileCheck2,
    title: 'Ghana Card & sales proof',
    description:
      'No ORC company certificate needed to start. Upload a valid Ghana Card paired with recent receipts or product stock proof.',
  },
  {
    step: '03',
    Icon: MessageSquare,
    title: 'Direct support review',
    description:
      'Launching your very first brand? Complete a quick manual onboarding review with our Accra team via WhatsApp or email.',
  },
];

export default function SellerVerificationPage() {
  return (
    <div className="bg-background text-foreground min-h-screen">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', path: '/' },
          { name: 'Sell on Verndly', path: '/sell' },
          { name: 'Seller Verification', path: '/seller-verification' },
        ]}
      />

      <Header />

      <main className="mx-auto max-w-5xl space-y-16 px-4 pb-28 pt-14 md:space-y-20 md:px-8 md:pt-20">
        {/* Server-rendered Hero */}
        <section className="max-w-3xl space-y-6">
          <div className="bg-surface text-muted inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.14em]">
            <Clock className="h-3.5 w-3.5 text-[var(--color-accent)]" />
            24–48 hour review · Accra team
          </div>

          <h1 className="text-foreground text-3xl font-medium leading-[1.08] tracking-tight sm:text-4xl md:text-5xl">
            Get verified to sell on Verndly.
          </h1>

          <p className="text-muted text-sm leading-relaxed md:text-base">
            Every seller on Verndly is identity-checked before publishing so shoppers in Accra and
            across Ghana know they are buying from a real business. Choose whichever verification
            track fits your stage — no business registration certificate required to get started.
          </p>
        </section>

        {/* Three Verification Tracks — Server-rendered HTML */}
        <section aria-label="Three verification tracks" className="space-y-6">
          <div className="space-y-1">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--color-accent)]">
              Three Ways to Verify
            </p>
            <h2 className="text-foreground text-2xl font-medium tracking-tight">
              Pick the track that fits your store.
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {VERIFICATION_TRACKS.map(({ step, Icon, title, description }) => (
              <article key={step} className="bg-surface space-y-4 rounded-3xl p-7">
                <div className="flex items-center justify-between">
                  <div className="bg-background text-foreground flex h-10 w-10 items-center justify-center rounded-2xl">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-muted font-mono text-xs">{step}</span>
                </div>
                <h3 className="text-foreground text-base font-medium tracking-tight">{title}</h3>
                <p className="text-muted text-xs leading-relaxed">{description}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Auth-gated interactive submission panel */}
        <section aria-label="Submit seller verification">
          <Suspense
            fallback={
              <div className="bg-surface space-y-4 rounded-3xl p-8 md:p-10">
                <h2 className="text-foreground text-2xl font-medium tracking-tight">
                  Sign in to submit your verification
                </h2>
                <p className="text-muted max-w-xl text-sm leading-relaxed">
                  Create a free Verndly account or sign in to submit your store link, upload your
                  Ghana Card and sales proof, or request a manual review.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/register?redirect=/seller-verification"
                    className="bg-foreground text-background inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-xs font-medium"
                  >
                    Create seller account
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                  <Link
                    href="/login?redirect=/seller-verification"
                    className="bg-background text-foreground inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-xs font-medium"
                  >
                    Sign in to continue
                  </Link>
                </div>
              </div>
            }
          >
            <SellerVerificationForm />
          </Suspense>
        </section>

        {/* Helpful link back to seller overview */}
        <div className="text-muted flex flex-wrap items-center justify-between gap-4 text-xs">
          <p>
            Want to learn more about selling on Verndly before applying?{' '}
            <Link href="/sell" className="text-foreground underline underline-offset-2">
              See full seller overview
            </Link>
            .
          </p>
          <p>Typical review turnaround: 24–48 hours ({SUPPORT_CONTACT.hours}).</p>
        </div>
      </main>
    </div>
  );
}
