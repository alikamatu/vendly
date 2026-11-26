import React from 'react';
import Link from 'next/link';
import { ArrowRight, Check, X, ShieldCheck, Clock, RefreshCcw, Scale } from 'lucide-react';
import Header from '@/components/layout/Header';
import { buildMetadata } from '@/lib/seo';
import BreadcrumbJsonLd from '@/components/seo/BreadcrumbJsonLd';
import FaqJsonLd from '@/components/seo/FaqJsonLd';
import { EscrowFlowSvg } from '@/components/editorial/VisualDiagrams';

export const metadata = buildMetadata({
  title: 'Verndly Buyer Protection — 3-Day Paystack Escrow Guarantee',
  description:
    "How Verndly's 3-day Paystack escrow protects online shoppers in Ghana. Funds are held safely until delivery and inspection, with 48-hour dispute response and direct MoMo or card reversals.",
  path: '/buyer-protection',
  keywords: [
    'buyer protection ghana',
    '3 day return policy online ghana',
    'escrow payment ghana',
    'refund online shopping ghana',
    'verndly buyer protection',
  ],
});

const PILLARS = [
  {
    Icon: ShieldCheck,
    title: 'Paystack Custodial Escrow',
    detail:
      "Payments via MTN MoMo, Telecel Cash, AirtelTigo Money, Visa, or Mastercard are held securely by Paystack — never sent directly to a stranger's personal wallet.",
  },
  {
    Icon: Clock,
    title: '3-Day Inspection Window',
    detail:
      'You get 3 full calendar days after verified courier delivery to unbox, try on, and test your order before funds settle permanently.',
  },
  {
    Icon: Scale,
    title: '48-Hour Seller SLA & Arbitration',
    detail:
      'Merchants must respond to return claims within 48 hours. Unresolved or ignored claims auto-escalate to Verndly Trust & Safety for binding arbitration.',
  },
  {
    Icon: RefreshCcw,
    title: 'Direct MoMo & Card Refunds',
    detail:
      'Approved refunds reverse automatically via Paystack back to your original Mobile Money account or bank card within 24–48 hours — no store-credit traps.',
  },
];

const COVERED_ITEMS = [
  'Order never arrives or parcel is confirmed lost in transit (100% refund including delivery fee)',
  'Item arrives physically damaged, broken, leaking, or crushed during courier transit',
  'Product is defective, non-functional, or fails to power on during the 3-day window',
  'Wrong color, size, model, storage capacity, or materially different from listing photos',
  'Missing accessories, parts, or incomplete quantity from your order summary',
  'Counterfeit or misrepresented merchandise sold as original',
];

const NOT_COVERED_ITEMS = [
  'Payments made outside verndly.com via direct personal MoMo transfers in DMs',
  'Damage caused by buyer misuse, drops, liquid spills, or unauthorized repair after delivery',
  'Claims opened after the 3-calendar-day post-delivery inspection window expires',
  'Change-of-mind returns unless the individual merchant voluntarily agrees (buyer covers return courier)',
];

const PROTECTION_FAQS = [
  {
    question: 'What happens if my order is wrong, damaged, or never arrives?',
    answer:
      'Open a claim from your Orders page within 3 calendar days of delivery (or contact support@verndly.com if your order has not arrived past the seller’s stated delivery window). For verified defective, wrong, damaged, or undelivered orders, approved refunds reverse directly via Paystack.',
  },
  {
    question: 'How does escrow protect me compared to Pay on Delivery?',
    answer:
      "Pay on Delivery ends your protection the second the rider leaves. Verndly's Paystack escrow protects you both before delivery (no upfront scam risk) and for 3 full days after delivery while you test your item thoroughly.",
  },
  {
    question: 'Who pays the return courier fee if the seller made a mistake?',
    answer:
      'The seller covers 100% of return courier fees whenever a return is caused by defect, transit damage, or an incorrect item dispatched.',
  },
  {
    question: 'Do buyers pay an extra fee for Verndly Buyer Protection?',
    answer:
      'No. Every eligible order on Verndly includes 3-day Paystack escrow protection automatically at GH₵ 0 buyer surcharge.',
  },
  {
    question: 'How fast do refunds return to MTN MoMo or my bank card?',
    answer:
      'Once a return or lost-parcel claim is approved, Verndly triggers an immediate Paystack gateway reversal. Mobile Money reversals typically land within 24–48 hours; debit cards follow standard bank settlement cycles.',
  },
];

export default function BuyerProtectionPage() {
  return (
    <div className="bg-background text-foreground min-h-screen">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', path: '/' },
          { name: 'Buyer Protection', path: '/buyer-protection' },
        ]}
      />
      <FaqJsonLd items={PROTECTION_FAQS} />

      <Header />

      <main className="mx-auto max-w-6xl space-y-24 px-4 pb-28 pt-16 md:space-y-32 md:px-8 md:pt-24">
        {/* Hero */}
        <section className="max-w-4xl space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            3-Day Escrow Guarantee
          </div>

          <h1 className="text-4xl font-medium leading-[1.06] tracking-tight sm:text-5xl md:text-6xl">
            Shop independent Ghanaian stores.{' '}
            <span className="text-muted">Your money stays safe until you inspect.</span>
          </h1>

          <p className="text-muted max-w-2xl text-base leading-relaxed md:text-lg">
            Every purchase paid on Verndly is protected by Paystack custodial escrow at zero extra
            cost to buyers. If an item arrives damaged, defective, wrong, or never shows up, your
            money reverses straight back to your Mobile Money or card.
          </p>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <Link
              href="/products"
              className="bg-foreground text-background inline-flex items-center justify-center gap-2 rounded-full px-7 py-4 text-sm font-medium transition-opacity hover:opacity-90"
            >
              Shop protected products
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/returns"
              className="bg-surface text-foreground hover:bg-foreground/[0.06] inline-flex items-center justify-center rounded-full px-7 py-4 text-sm font-medium transition-colors"
            >
              Read full legal returns policy
            </Link>
          </div>
        </section>

        {/* Visual Flow */}
        <section className="space-y-6">
          <div className="max-w-2xl space-y-2">
            <p className="text-muted text-[11px] font-medium uppercase tracking-[0.14em]">
              How Escrow Protects You
            </p>
            <h2 className="text-2xl font-medium tracking-tight md:text-3xl">
              Four automatic safeguards on every order.
            </h2>
          </div>

          <EscrowFlowSvg />

          <div className="grid grid-cols-1 gap-4 pt-4 md:grid-cols-2">
            {PILLARS.map(({ Icon, title, detail }) => (
              <div key={title} className="bg-surface space-y-3 rounded-3xl p-7">
                <div className="bg-background text-foreground flex h-10 w-10 items-center justify-center rounded-2xl">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-medium tracking-tight">{title}</h3>
                <p className="text-muted text-sm leading-relaxed">{detail}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Covered vs Not Covered */}
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="bg-surface space-y-6 rounded-3xl p-8">
            <div className="space-y-2">
              <span className="font-mono text-[11px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                100% Covered
              </span>
              <h2 className="text-2xl font-medium tracking-tight">What qualifies for a refund</h2>
            </div>
            <ul className="space-y-4">
              {COVERED_ITEMS.map((item) => (
                <li
                  key={item}
                  className="text-foreground/90 flex items-start gap-3 text-sm leading-relaxed"
                >
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    <Check className="h-3 w-3" />
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-surface space-y-6 rounded-3xl p-8">
            <div className="space-y-2">
              <span className="text-muted font-mono text-[11px] uppercase tracking-wider">
                Clear Boundaries
              </span>
              <h2 className="text-2xl font-medium tracking-tight">What is not covered</h2>
            </div>
            <ul className="space-y-4">
              {NOT_COVERED_ITEMS.map((item) => (
                <li
                  key={item}
                  className="text-muted flex items-start gap-3 text-sm leading-relaxed"
                >
                  <span className="bg-background text-muted mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full">
                    <X className="h-3 w-3" />
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* FAQs */}
        <section className="space-y-8">
          <div className="max-w-2xl space-y-2">
            <p className="text-muted text-[11px] font-medium uppercase tracking-[0.14em]">
              Buyer Protection FAQ
            </p>
            <h2 className="text-3xl font-medium tracking-tight">Questions shoppers ask most.</h2>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {PROTECTION_FAQS.map((faq) => (
              <article key={faq.question} className="bg-surface space-y-3 rounded-3xl p-7">
                <h3 className="text-base font-medium tracking-tight">{faq.question}</h3>
                <p className="text-muted text-sm leading-relaxed">{faq.answer}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Related safety guides */}
        <section className="bg-surface flex flex-col justify-between gap-6 rounded-3xl p-8 md:flex-row md:items-center md:p-12">
          <div className="max-w-xl space-y-2">
            <p className="font-mono text-[11px] uppercase tracking-wider text-[var(--color-accent)]">
              Go deeper
            </p>
            <h2 className="text-2xl font-medium tracking-tight md:text-3xl">
              Learn how to spot MoMo scams and verify Ghanaian sellers.
            </h2>
            <p className="text-muted text-sm leading-relaxed">
              Read our practical guides on safe online shopping, Pay on Delivery vs Escrow, and our
              7-point seller legitimacy checklist.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-3">
            <Link
              href="/blog/how-to-shop-online-safely-in-ghana"
              className="bg-foreground text-background inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-xs font-medium transition-opacity hover:opacity-90"
            >
              Safe shopping guide
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/blog/pay-on-delivery-vs-escrow-ghana"
              className="bg-background text-foreground inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-xs font-medium transition-opacity hover:opacity-80"
            >
              POD vs Escrow
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
