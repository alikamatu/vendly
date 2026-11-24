'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Search, ArrowRight } from 'lucide-react';
import Header from '@/components/layout/Header';
import { SITE_FAQ_ITEMS, type SiteFaqEntry } from '@/lib/content/faq';

export default function FAQPage() {
  const [query, setQuery] = useState('');
  const filtered = SITE_FAQ_ITEMS.filter((item) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      item.question.toLowerCase().includes(q) ||
      item.answer.toLowerCase().includes(q) ||
      item.tags.some((t) => t.toLowerCase().includes(q))
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
            Quick answers to the questions we hear most. Can&apos;t find what you need?{' '}
            <Link className="text-primary underline" href="/contact">
              Contact us
            </Link>
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
            No results for &ldquo;{query}&rdquo;. Try different keywords or contact us.
          </p>
        ) : (
          <ul className="space-y-2">
            {filtered.map((item) => (
              <FaqItem key={item.question} item={item} />
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

function FaqItem({ item }: { item: SiteFaqEntry }) {
  const [open, setOpen] = useState(true);
  return (
    <li
      id={item.id}
      className="border-border bg-surface/30 scroll-mt-24 overflow-hidden rounded-2xl border"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="hover:bg-surface/50 flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition-colors md:px-5"
      >
        <span className="text-foreground text-sm font-normal">{item.question}</span>
        <ChevronDown
          className={`text-muted h-4 w-4 flex-shrink-0 transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>
      {open && (
        <div className="text-foreground/85 space-y-2.5 px-4 pb-4 text-[13px] leading-relaxed md:px-5">
          <p>{item.answer}</p>
          {item.link && (
            <Link
              href={item.link.href}
              className="text-primary inline-flex items-center gap-1 text-xs font-medium hover:underline"
            >
              {item.link.label}
              <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </div>
      )}
    </li>
  );
}
