import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import Header from '@/components/layout/Header';
import { buildMetadata } from '@/lib/seo';
import BreadcrumbJsonLd from '@/components/seo/BreadcrumbJsonLd';

export const metadata: Metadata = buildMetadata({
  title: 'About Verndly',
  description:
    'Verndly is a Ghanaian marketplace built in Accra for verified independent businesses and young entrepreneurs, backed by Paystack escrow.',
  path: '/about',
  keywords: ['about verndly', 'verndly ghana', 'verified marketplace ghana'],
});

const STORY_SECTIONS = [
  {
    number: '01',
    title: 'Why we built this',
    body: (
      <p>
        Talented independent sellers were running businesses in Instagram DMs and WhatsApp threads —
        losing sales to lost messages and getting burned by unpaid deliveries, while buyers worried
        about paying Mobile Money upfront. Verndly gives them a verified storefront, real payments,
        and buyer protection without losing the personal feel of independent commerce.
      </p>
    ),
  },
  {
    number: '02',
    title: 'What we offer',
    body: (
      <ul className="space-y-2.5">
        <li>
          A discovery-first marketplace with categories, search, and direct merchant storefronts.
        </li>
        <li>A flat 4% seller fee with zero buyer surcharges.</li>
        <li>Delivery and store pickup workflows built for how people actually buy in Ghana.</li>
        <li>Buyer protection backed by Paystack escrow and our Accra support team.</li>
      </ul>
    ),
  },
  {
    number: '03',
    title: 'Where we operate',
    body: (
      <p>
        We&apos;re live in Accra and onboarding verified sellers across Ghana. Want Verndly in your
        area or interested in opening a store?{' '}
        <Link
          href="/contact"
          className="text-foreground underline underline-offset-4 hover:text-[var(--color-accent)]"
        >
          Get in touch
        </Link>
        .
      </p>
    ),
  },
  {
    number: '04',
    title: 'Team',
    body: (
      <p>
        Verndly is built in Accra by a small team working on safer checkout for independent Ghanaian
        sellers. We hire in public — see the{' '}
        <Link
          href="/contact"
          className="text-foreground underline underline-offset-4 hover:text-[var(--color-accent)]"
        >
          contact page
        </Link>{' '}
        if you would like to help.
      </p>
    ),
  },
];

export default function AboutPage() {
  return (
    <div className="bg-background text-foreground min-h-screen">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', path: '/' },
          { name: 'About', path: '/about' },
        ]}
      />
      <Header />

      <main className="mx-auto max-w-4xl space-y-16 px-4 pb-28 pt-16 md:px-8 md:pt-24">
        <header className="max-w-2xl space-y-5">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--color-accent)]">
            About Verndly
          </p>
          <h1 className="text-4xl font-medium leading-[1.08] tracking-tight sm:text-5xl">
            Safer online commerce for independent Ghanaian businesses.
          </h1>
          <p className="text-muted text-base leading-relaxed">
            Verndly is a curated marketplace built so verified young entrepreneurs and small
            businesses can sell with the same trust, polish, and payment protection as established
            retailers.
          </p>
        </header>

        <div className="space-y-6">
          {STORY_SECTIONS.map((section) => (
            <section key={section.number} className="bg-surface space-y-3 rounded-3xl p-7 md:p-9">
              <div className="flex items-center gap-3">
                <span className="text-muted font-mono text-xs">{section.number}</span>
                <h2 className="text-foreground text-xl font-medium tracking-tight">
                  {section.title}
                </h2>
              </div>
              <div className="text-muted text-sm leading-[1.75] md:text-[15px]">{section.body}</div>
            </section>
          ))}
        </div>

        <section className="bg-foreground text-background flex flex-col justify-between gap-6 rounded-3xl p-8 sm:flex-row sm:items-center md:p-10">
          <div className="max-w-md space-y-2">
            <h2 className="text-2xl font-medium tracking-tight">Ready to explore or sell?</h2>
            <p className="text-sm opacity-75">
              Browse verified independent stores or open your own storefront in Accra and across
              Ghana.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-3">
            <Link
              href="/products"
              className="bg-background text-foreground inline-flex items-center gap-2 rounded-full px-6 py-3 text-xs font-medium transition-opacity hover:opacity-90"
            >
              Browse marketplace
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/sell"
              className="bg-background/12 text-background hover:bg-background/20 inline-flex items-center rounded-full px-6 py-3 text-xs font-medium transition-colors"
            >
              Sell on Verndly
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
