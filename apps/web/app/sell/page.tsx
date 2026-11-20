import React from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Check,
  ShieldCheck,
  Store,
  FileCheck2,
  MessageSquare,
  Sparkles,
  Truck,
  Banknote,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import { buildMetadata, SITE_URL } from '@/lib/seo';
import BreadcrumbJsonLd from '@/components/seo/BreadcrumbJsonLd';
import FaqJsonLd from '@/components/seo/FaqJsonLd';
import JsonLd from '@/components/seo/JsonLd';
import FeeCalculator from '@/components/editorial/FeeCalculator';
import { EscrowFlowSvg } from '@/components/editorial/VisualDiagrams';

export const metadata = buildMetadata({
  title: 'Sell on Verndly — Verified Store, Flat 4% Fee, Paid via Escrow',
  description:
    'Open a verified online store in Ghana on Verndly. Keep 96% of every sale with a flat 4% fee (Paystack included), zero setup costs, and escrow protection against fake MoMo screenshots and no-show buyers.',
  path: '/sell',
  keywords: [
    'sell online ghana',
    'become a seller ghana',
    'online marketplace for small business ghana',
    'sell on verndly',
    'cheapest marketplace to sell in ghana',
    '4% seller fee ghana',
  ],
});

const SELLER_METRICS = [
  {
    value: '4%',
    label: 'Flat fee, all-in',
    detail: 'Includes Paystack MoMo & card processing. Zero buyer surcharge.',
  },
  {
    value: '96%',
    label: 'Kept by you',
    detail: 'No 20% fashion commission and no seller shipping deductions.',
  },
  {
    value: '24–48h',
    label: 'Fast verification',
    detail: 'Start with your Ghana Card or existing Instagram/TikTok store.',
  },
  {
    value: '16',
    label: 'Regions nationwide',
    detail: 'Ship safely to Accra, Kumasi, Takoradi, Tamale & beyond.',
  },
];

const VERIFICATION_PATHS = [
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

const SELLER_BENEFITS = [
  {
    Icon: ShieldCheck,
    title: 'Zero fake MoMo screenshots',
    body: 'Orders only confirm after Paystack cryptographically verifies payment into escrow. Never squint at an edited SMS alert again.',
  },
  {
    Icon: Banknote,
    title: 'Zero pay-on-delivery no-shows',
    body: 'Every buyer funds their order before you pack or call a dispatch rider — stop losing courier fares to ghosted deliveries.',
  },
  {
    Icon: Truck,
    title: 'Keep your delivery & pickup workflow',
    body: 'Set same-day, 24-hour, or made-to-order dispatch windows and offer free Store Pickup from your workshop or showroom.',
  },
  {
    Icon: Sparkles,
    title: 'Your own storefront link & QR',
    body: 'Share verndly.com/s/yourstore in your Instagram bio, WhatsApp Business catalog, and printed packaging tags.',
  },
];

const COMPARISON_ROWS = [
  {
    metric: 'Commission on Fashion, Beauty & Groceries',
    verndly: '4% flat',
    jumia: '20%',
    social: '0% (manual DMs)',
  },
  {
    metric: 'Paystack / MoMo processing fee',
    verndly: 'Included in 4%',
    jumia: 'Varies / bundled',
    social: '1.95% extra or risky direct MoMo',
  },
  {
    metric: 'Seller shipping contribution per order',
    verndly: 'GH₵ 0',
    jumia: 'GH₵ 6 – GH₵ 45',
    social: 'Lost on POD rejections',
  },
  {
    metric: 'Protection against fake screenshots & no-shows',
    verndly: 'Built-in Paystack Escrow',
    jumia: 'Platform managed',
    social: 'None',
  },
  {
    metric: 'Cold buyer trust (Verified Badge)',
    verndly: 'Verified Merchant + 7-day guarantee',
    jumia: 'Marketplace trust',
    social: 'Low — buyers fear MoMo scams',
  },
  {
    metric: 'Setup / monthly storefront fee',
    verndly: 'GH₵ 0',
    jumia: 'Training & account setup',
    social: 'GH₵ 0',
  },
];

const SELLER_FAQS = [
  {
    question: 'How much does it cost to sell on Verndly?',
    answer:
      'Opening a verified store and listing products on Verndly is free. Verndly charges a single flat 4% platform fee only when an order completes successfully. You keep 96% of every sale.',
  },
  {
    question: "Does the 4% fee include Paystack's Mobile Money and card fee?",
    answer:
      "Yes. Because checkout funds are collected into Verndly's Paystack escrow ledger first, Paystack's 1.95% collection cost is absorbed within our flat 4% fee. Sellers are not charged a separate Paystack processing fee on top.",
  },
  {
    question: 'Do I need a registered business (ORC) to start selling on Verndly?',
    answer:
      'No. While registered companies are welcome, solo founders and young entrepreneurs can verify with a valid Ghana Card and sales proof, an active Instagram/TikTok store link, or manual review with our support team.',
  },
  {
    question: 'How and when do I receive my payouts?',
    answer:
      'When a buyer pays, 96% of the order value is credited immediately to your Pending Escrow balance. Once delivery is confirmed and cleared, funds move to your Available Balance and settle directly to your registered Ghanaian bank account via Paystack Transfers.',
  },
  {
    question:
      'How does Verndly protect sellers against Pay on Delivery losses and fake MoMo alerts?',
    answer:
      'Buyers fund their orders upfront via Paystack (MTN MoMo, Telecel Cash, AirtelTigo Money, Visa, or Mastercard) before you ever dispatch. You never hand goods to a rider without cryptographically verified payment held in escrow.',
  },
  {
    question: 'Can I still link my Verndly store from Instagram and WhatsApp?',
    answer:
      'Yes. Every verified seller receives a clean storefront URL (verndly.com/s/yourstore), direct WhatsApp chat button, and downloadable QR code so social followers can check out safely in seconds.',
  },
];

export default function SellPage() {
  return (
    <div className="bg-background text-foreground min-h-screen">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', path: '/' },
          { name: 'Sell on Verndly', path: '/sell' },
        ]}
      />
      <FaqJsonLd items={SELLER_FAQS} />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Service',
          name: 'Sell on Verndly Ghana',
          provider: {
            '@type': 'Organization',
            name: 'Verndly',
            url: SITE_URL,
          },
          areaServed: {
            '@type': 'Country',
            name: 'Ghana',
          },
          description:
            'Verified online storefronts for Ghanaian independent businesses and young entrepreneurs with a flat 4% seller fee (Paystack included) and escrow payment protection.',
          url: `${SITE_URL}/sell`,
        }}
      />

      <Header />

      <main className="mx-auto max-w-6xl space-y-24 px-4 pb-28 pt-16 md:space-y-32 md:px-8 md:pt-24">
        {/* Hero */}
        <section className="max-w-4xl space-y-8">
          <div className="bg-surface text-muted inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.14em]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
            Sell on Verndly · Ghana
          </div>

          <h1 className="text-foreground text-4xl font-medium leading-[1.06] tracking-tight sm:text-5xl md:text-6xl">
            A verified store for your brand.{' '}
            <span className="text-muted">Flat 4% fee. Paid via escrow.</span>
          </h1>

          <p className="text-muted max-w-2xl text-base leading-relaxed md:text-lg">
            Stop losing 20% to legacy marketplace commissions or chasing unpaid Instagram DMs.
            Verndly gives Ghanaian entrepreneurs a clean storefront, Paystack escrow checkout, and
            nationwide reach — while you keep 96% of every sale.
          </p>

          <div className="flex flex-col items-stretch gap-3 pt-2 sm:flex-row sm:items-center">
            <Link
              href="/seller-verification"
              className="bg-foreground text-background inline-flex items-center justify-center gap-2 rounded-full px-7 py-4 text-sm font-medium transition-opacity hover:opacity-90"
            >
              Apply for verification
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/blog/jumia-seller-fees-ghana-2026-vs-verndly"
              className="bg-surface text-foreground hover:bg-foreground/[0.06] inline-flex items-center justify-center gap-2 rounded-full px-7 py-4 text-sm font-medium transition-colors"
            >
              Compare vs Jumia fees
            </Link>
          </div>
        </section>

        {/* Key metrics band */}
        <section
          aria-label="Seller economics summary"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {SELLER_METRICS.map((item) => (
            <div key={item.label} className="bg-surface space-y-3 rounded-3xl p-7">
              <p className="text-foreground text-4xl font-medium tabular-nums tracking-tight">
                {item.value}
              </p>
              <p className="text-foreground text-sm font-medium">{item.label}</p>
              <p className="text-muted text-xs leading-relaxed">{item.detail}</p>
            </div>
          ))}
        </section>

        {/* Interactive Fee Calculator */}
        <FeeCalculator showCta={false} />

        {/* Escrow flow visual */}
        <section className="space-y-8">
          <div className="max-w-2xl space-y-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--color-accent)]">
              How Money Moves
            </p>
            <h2 className="text-3xl font-medium tracking-tight md:text-4xl">
              Confirmed payment before you ever call a rider.
            </h2>
            <p className="text-muted text-sm leading-relaxed md:text-base">
              Escrow protects both sides. Buyers pay via MTN MoMo, Telecel Cash, AirtelTigo Money,
              or card into Paystack custody — so cold shoppers trust your store instantly, and you
              never dispatch an unpaid order.
            </p>
          </div>

          <div className="bg-background rounded-3xl">
            <EscrowFlowSvg />
          </div>

          <div className="grid grid-cols-1 gap-4 pt-2 md:grid-cols-2">
            {SELLER_BENEFITS.map(({ Icon, title, body }) => (
              <div key={title} className="bg-surface space-y-3 rounded-3xl p-7">
                <div className="bg-background text-foreground flex h-10 w-10 items-center justify-center rounded-2xl">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-foreground text-base font-medium tracking-tight">{title}</h3>
                <p className="text-muted text-sm leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Comparison Table */}
        <section className="space-y-8">
          <div className="max-w-2xl space-y-3">
            <p className="text-muted text-[11px] font-medium uppercase tracking-[0.14em]">
              Side-by-Side
            </p>
            <h2 className="text-3xl font-medium tracking-tight md:text-4xl">
              Verndly vs Jumia vs Instagram DMs.
            </h2>
            <p className="text-muted text-sm leading-relaxed md:text-base">
              Keep your margins intact without sacrificing buyer confidence.
            </p>
          </div>

          <div className="bg-surface overflow-x-auto rounded-3xl p-2 sm:p-4">
            <table className="w-full min-w-[640px] border-collapse text-left">
              <thead>
                <tr className="text-muted text-[11px] uppercase tracking-wider">
                  <th className="px-5 py-4 font-medium">What matters to sellers</th>
                  <th className="text-foreground px-5 py-4 font-medium">Verndly</th>
                  <th className="px-5 py-4 font-medium">Jumia Ghana</th>
                  <th className="px-5 py-4 font-medium">Instagram / WhatsApp</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {COMPARISON_ROWS.map((row, index) => (
                  <tr key={row.metric} className={index % 2 === 0 ? 'bg-background' : 'bg-surface'}>
                    <td className="text-foreground rounded-l-2xl px-5 py-4 font-medium">
                      {row.metric}
                    </td>
                    <td className="px-5 py-4 font-medium text-emerald-600 dark:text-emerald-400">
                      <span className="inline-flex items-center gap-1.5">
                        <Check className="h-3.5 w-3.5 shrink-0" />
                        {row.verndly}
                      </span>
                    </td>
                    <td className="text-muted px-5 py-4">{row.jumia}</td>
                    <td className="text-muted rounded-r-2xl px-5 py-4">{row.social}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Verification Paths */}
        <section className="space-y-8">
          <div className="max-w-2xl space-y-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--color-accent)]">
              Three Ways to Verify
            </p>
            <h2 className="text-3xl font-medium tracking-tight md:text-4xl">
              Get verified in 24–48 hours. No red tape.
            </h2>
            <p className="text-muted text-sm leading-relaxed md:text-base">
              Every seller on Verndly earns a Verified Merchant badge so shoppers know you are real.
              Pick whichever verification track fits your stage today.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {VERIFICATION_PATHS.map(({ step, Icon, title, description }) => (
              <div key={step} className="bg-surface space-y-5 rounded-3xl p-7">
                <div className="flex items-center justify-between">
                  <div className="bg-background text-foreground flex h-11 w-11 items-center justify-center rounded-2xl">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-muted font-mono text-xs">{step}</span>
                </div>
                <div className="space-y-2">
                  <h3 className="text-foreground text-base font-medium tracking-tight">{title}</h3>
                  <p className="text-muted text-sm leading-relaxed">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Seller FAQ */}
        <section className="space-y-8">
          <div className="max-w-2xl space-y-2">
            <p className="text-muted text-[11px] font-medium uppercase tracking-[0.14em]">
              Common Questions
            </p>
            <h2 className="text-3xl font-medium tracking-tight md:text-4xl">
              Straight answers on fees, payouts &amp; requirements.
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {SELLER_FAQS.map((faq) => (
              <article key={faq.question} className="bg-surface space-y-3 rounded-3xl p-7">
                <h3 className="text-foreground text-base font-medium tracking-tight">
                  {faq.question}
                </h3>
                <p className="text-muted text-sm leading-relaxed">{faq.answer}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Closing CTA */}
        <section className="bg-foreground text-background flex flex-col justify-between gap-8 rounded-3xl p-8 md:flex-row md:items-center md:p-14">
          <div className="max-w-xl space-y-3">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--color-accent)]">
              Ready to launch
            </p>
            <h2 className="text-3xl font-medium tracking-tight md:text-4xl">
              Turn browsers into verified, paid orders.
            </h2>
            <p className="text-sm leading-relaxed opacity-75">
              Free storefront setup. Flat 4% fee all-in. Paystack escrow on every transaction.
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
            <Link
              href="/seller-verification"
              className="bg-background text-foreground inline-flex items-center justify-center gap-2 rounded-full px-7 py-4 text-sm font-medium transition-opacity hover:opacity-90"
            >
              Start Selling Free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/blog"
              className="bg-background/12 text-background hover:bg-background/20 inline-flex items-center justify-center rounded-full px-7 py-4 text-sm font-medium transition-colors"
            >
              Read Seller Guides
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
