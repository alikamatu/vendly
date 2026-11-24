'use client';

import React, { useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import Header from '@/components/layout/Header';
import { SUPPORT_CONTACT } from '@/lib/contact';

interface QA {
  q: string;
  a: React.ReactNode;
  tags?: string[];
}

const QA_LIST: QA[] = [
  {
    q: 'How do I create an account?',
    a: 'Tap Sign up in the top-right, fill in your name, phone, and email, then verify your inbox. You can shop right away.',
    tags: ['account'],
  },
  {
    q: 'How do I become a seller?',
    a: (
      <>
        Visit{' '}
        <a className="text-primary underline" href="/seller-verification">
          Start selling
        </a>{' '}
        and upload your business verification document. Approvals usually take 24–48 hours.
      </>
    ),
    tags: ['seller'],
  },
  {
    q: 'What payment methods do you accept?',
    a: 'Card, mobile money, and bank transfer via Paystack. Some sellers also accept cash on delivery.',
    tags: ['payment'],
  },
  {
    q: 'How does Verndly Pro work?',
    a: (
      <>
        Pro membership is GH₵57/month, billed via Paystack. Pro sellers get featured placement, a
        downloadable storefront QR code, and advanced stock alerts. Manage your subscription from{' '}
        <a className="text-primary underline" href="/dashboard/settings">
          Dashboard → Settings
        </a>
        .
      </>
    ),
    tags: ['seller', 'pro'],
  },
  {
    q: 'How long does delivery take?',
    a: "Each seller publishes their dispatch window — typically same-day, next-day, or 2–3 days. See the seller's storefront for their exact policy.",
    tags: ['delivery'],
  },
  {
    q: 'Can I return an item?',
    a: (
      <>
        Yes — see{' '}
        <a className="text-primary underline" href="/returns">
          Returns &amp; Refunds
        </a>
        . You have 7 days from delivery to request a return.
      </>
    ),
    tags: ['returns'],
  },
  {
    q: 'Is my data safe?',
    a: (
      <>
        Yes. Payments are handled by Paystack — Verndly never sees your full card details. Read our{' '}
        <a className="text-primary underline" href="/privacy">
          privacy policy
        </a>
        .
      </>
    ),
    tags: ['privacy'],
  },
  {
    q: 'How do I contact support?',
    a: (
      <>
        Email{' '}
        <a className="text-primary underline" href={SUPPORT_CONTACT.emailHref}>
          {SUPPORT_CONTACT.email}
        </a>
        , WhatsApp{' '}
        <a className="text-primary underline" href={SUPPORT_CONTACT.whatsappHref}>
          {SUPPORT_CONTACT.phoneDisplay}
        </a>
        , or use the{' '}
        <a className="text-primary underline" href="/contact">
          contact form
        </a>
        .
      </>
    ),
    tags: ['support'],
  },
];

export default function FAQPage() {
  const [query, setQuery] = useState('');
  const filtered = QA_LIST.filter((item) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      item.q.toLowerCase().includes(q) ||
      String(item.a).toLowerCase().includes(q) ||
      (item.tags || []).some((t) => t.includes(q))
    );
  });

  return (
    <div className="bg-background min-h-screen">
      <Header />
      <main className="mx-auto max-w-3xl space-y-8 px-4 pb-24 pt-10 md:px-8 md:pb-32 md:pt-16">
        <header className="space-y-3">
          <p className="text-primary text-[10px] font-medium uppercase tracking-wider">Help</p>
          <h1 className="text-3xl font-medium tracking-tight md:text-4xl">
            Frequently asked questions
          </h1>
          <p className="text-muted text-sm leading-relaxed">
            Quick answers to the questions we hear most. Can't find what you need?{' '}
            <a className="text-primary underline" href="/contact">
              Contact us
            </a>
            .
          </p>
        </header>

        <div className="relative">
          <Search className="text-muted pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search FAQs..."
            className="bg-surface border-border focus:ring-primary/30 focus:border-primary/40 h-11 w-full rounded-2xl border pl-9 pr-3 text-[12px] font-normal outline-none focus:ring-2"
          />
        </div>

        {filtered.length === 0 ? (
          <p className="text-muted py-12 text-center text-[12px]">
            No results for "{query}". Try different keywords or contact us.
          </p>
        ) : (
          <ul className="space-y-2">
            {filtered.map((item) => (
              <FaqItem key={item.q} item={item} />
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

function FaqItem({ item }: { item: QA }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="border-border bg-surface/30 overflow-hidden rounded-2xl border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="hover:bg-surface/50 flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition-colors md:px-5"
      >
        <span className="text-foreground text-sm font-normal">{item.q}</span>
        <ChevronDown
          className={`text-muted h-4 w-4 flex-shrink-0 transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>
      {open && (
        <div className="text-foreground/85 px-4 pb-4 text-[13px] leading-relaxed md:px-5">
          {item.a}
        </div>
      )}
    </li>
  );
}
