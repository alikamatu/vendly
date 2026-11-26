import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ShoppingBag,
  Store,
  CreditCard,
  Truck,
  ShieldCheck,
  Mail,
  HelpCircle,
  ArrowRight,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import { buildMetadata } from '@/lib/seo';
import BreadcrumbJsonLd from '@/components/seo/BreadcrumbJsonLd';

export const metadata: Metadata = buildMetadata({
  title: 'Help Center',
  description:
    'Guides, policies, escrow answers, and direct support for buying and selling on Verndly Ghana.',
  path: '/help',
  keywords: ['verndly help center', 'verndly support', 'ghana marketplace help'],
});

const SECTIONS = [
  {
    title: 'Buying',
    Icon: ShoppingBag,
    description: 'Find items, place orders, and track delivery.',
    links: [
      { label: 'Browsing & search', href: '/products' },
      { label: 'Placing an order', href: '/faq#create-account' },
      { label: 'Tracking your order', href: '/faq#tracking-your-order' },
      { label: 'Shipping & delivery', href: '/shipping' },
    ],
  },
  {
    title: 'Selling',
    Icon: Store,
    description: 'Open your store, list products, manage orders.',
    links: [
      { label: 'Sell on Verndly (4% fee)', href: '/sell' },
      { label: 'Apply for verification', href: '/seller-verification' },
      {
        label: 'Seller fee calculator (4% flat)',
        href: '/blog/ghana-marketplace-seller-fees-vs-verndly',
      },
      { label: 'How verification works', href: '/faq#seller-verification' },
    ],
  },
  {
    title: 'Payments & payouts',
    Icon: CreditCard,
    description: 'How money moves on Verndly.',
    links: [
      { label: 'Payment methods', href: '/faq#payment-methods' },
      { label: 'Seller payouts', href: '/faq#seller-payouts' },
      { label: 'Refunds', href: '/returns' },
    ],
  },
  {
    title: 'Delivery',
    Icon: Truck,
    description: 'Pickup, delivery, and service areas.',
    links: [
      { label: 'Service areas', href: '/shipping' },
      { label: 'Delivery times', href: '/shipping' },
      { label: 'Pickup option', href: '/shipping' },
    ],
  },
  {
    title: 'Trust & safety',
    Icon: ShieldCheck,
    description: 'Buyer protection and how we keep Verndly safe.',
    links: [
      { label: '3-Day Buyer Protection', href: '/buyer-protection' },
      { label: 'Shop safely & avoid MoMo scams', href: '/blog/how-to-shop-online-safely-in-ghana' },
      { label: 'Reporting an issue', href: '/contact' },
      { label: 'Terms & Privacy', href: '/terms' },
    ],
  },
];

export default function HelpCenterPage() {
  return (
    <div className="bg-background min-h-screen">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', path: '/' },
          { name: 'Help Center', path: '/help' },
        ]}
      />
      <Header />

      <main className="mx-auto max-w-6xl space-y-10 px-4 pb-24 pt-10 md:px-8 md:pb-32 md:pt-16">
        <header className="space-y-3 text-center">
          <p className="text-primary text-[10px] font-medium uppercase tracking-wider">Support</p>
          <h1 className="text-3xl font-medium tracking-tight md:text-5xl">How can we help?</h1>
          <p className="text-muted mx-auto max-w-2xl text-sm leading-relaxed md:text-base">
            Browse guides by topic, find quick answers in the FAQ, or reach out to a human — we
            usually reply within 24 hours.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {SECTIONS.map(({ title, Icon, description, links }) => (
            <article
              key={title}
              className="border-border bg-surface/40 space-y-4 rounded-3xl border p-5 md:p-6"
            >
              <div className="flex items-center gap-3">
                <span className="bg-primary/10 text-primary inline-flex h-11 w-11 items-center justify-center rounded-2xl">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-sm font-medium tracking-tight">{title}</h2>
                  <p className="text-muted text-[11px] leading-snug">{description}</p>
                </div>
              </div>
              <ul className="space-y-1.5 pt-1">
                {links.map((l) => (
                  <li key={l.label + l.href}>
                    <Link
                      href={l.href}
                      className="text-foreground/80 hover:text-primary inline-flex items-center gap-1.5 text-[12px] font-normal transition-colors"
                    >
                      {l.label}
                      <ArrowRight className="h-3 w-3 opacity-60" />
                    </Link>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <div className="border-border bg-surface flex flex-col items-start justify-between gap-4 rounded-3xl border p-6 md:flex-row md:items-center md:p-8">
          <div className="space-y-1.5">
            <h3 className="text-lg font-medium tracking-tight">Still need a hand?</h3>
            <p className="text-muted text-[12px]">
              We usually reply within 24 hours. For urgent order issues, WhatsApp us.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/faq"
              className="border-border bg-surface hover:bg-background inline-flex h-11 items-center gap-1.5 rounded-2xl border px-5 text-[11px] font-medium uppercase tracking-wider transition-colors"
            >
              <HelpCircle className="h-3.5 w-3.5" />
              Browse FAQ
            </Link>
            <Link
              href="/contact"
              className="bg-primary text-background inline-flex h-11 items-center gap-1.5 rounded-2xl px-5 text-[11px] font-medium uppercase tracking-wider transition-opacity hover:opacity-90"
            >
              <Mail className="h-3.5 w-3.5" />
              Contact support
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
