'use client';

import React from 'react';
import Header from '@/components/layout/Header';
import { ArrowUp, BookOpen, ShieldCheck, Mail } from 'lucide-react';
import Link from 'next/link';

export interface LegalSection {
  title: string;
  badge?: string;
  body: React.ReactNode;
}

interface LegalPageProps {
  eyebrow?: string;
  title: string;
  description?: string;
  updatedAt?: string;
  sections: LegalSection[];
  children?: React.ReactNode;
}

export default function LegalPage({
  eyebrow = 'Legal & Compliance',
  title,
  description,
  updatedAt,
  sections,
  children,
}: LegalPageProps) {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="bg-background text-foreground min-h-screen">
      <Header />

      <main className="mx-auto max-w-4xl px-4 pb-24 pt-10 md:px-8 md:pb-32 md:pt-16">
        {/* Document Header */}
        <header className="border-border/60 mb-10 space-y-4 border-b pb-8 md:mb-12">
          <div className="flex items-center gap-2">
            <span className="text-primary bg-primary/10 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
              {eyebrow}
            </span>
            <span className="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">
              Official Policy
            </span>
          </div>

          <h1 className="text-foreground text-3xl font-semibold tracking-tight md:text-5xl">
            {title}
          </h1>

          {description && (
            <p className="text-muted-foreground max-w-3xl text-sm leading-relaxed md:text-base">
              {description}
            </p>
          )}

          <div className="text-muted-foreground flex flex-wrap items-center gap-4 pt-2 text-[11px]">
            {updatedAt && (
              <span className="font-mono">
                Effective Date: <strong>{updatedAt}</strong>
              </span>
            )}
            <span>·</span>
            <span>Applicable in Ghana</span>
          </div>
        </header>

        {/* Top Table of Contents Card */}
        {sections.length > 1 && (
          <aside className="border-border/80 bg-surface/80 mb-12 rounded-2xl border p-6">
            <div className="mb-4 flex items-center gap-2">
              <BookOpen size={16} className="text-primary" />
              <h2 className="text-foreground text-xs font-semibold uppercase tracking-wider">
                Table of Contents & Quick Navigation
              </h2>
            </div>
            <p className="text-muted-foreground mb-4 text-xs leading-relaxed">
              Select any clause below to jump directly to its full provisions:
            </p>
            <ol className="grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2">
              {sections.map((s, i) => (
                <li key={i} className="min-w-0">
                  <a
                    href={`#${slugify(s.title)}`}
                    className="text-foreground/80 hover:text-primary group flex items-center gap-2 py-0.5 text-[12.5px] transition-colors"
                  >
                    <span className="text-muted-foreground group-hover:text-primary w-5 shrink-0 font-mono text-[11px]">
                      {String(i + 1).padStart(2, '0')}.
                    </span>
                    <span className="truncate group-hover:underline">{s.title}</span>
                  </a>
                </li>
              ))}
            </ol>
          </aside>
        )}

        {children}

        {/* Document Sections */}
        <div className="space-y-12 md:space-y-16">
          {sections.map((s, i) => (
            <section
              key={i}
              className="border-border/40 scroll-mt-24 space-y-4 border-t pt-4"
              id={slugify(s.title)}
            >
              <div className="flex items-center gap-3">
                <span className="bg-primary/10 text-primary flex h-6 w-6 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-bold">
                  {i + 1}
                </span>
                <h2 className="text-foreground text-lg font-semibold tracking-tight md:text-xl">
                  {s.title}
                </h2>
                {s.badge && (
                  <span className="bg-surface border-border text-muted-foreground rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider">
                    {s.badge}
                  </span>
                )}
              </div>

              <div className="text-foreground/90 space-y-4 pl-0 text-[13.5px] leading-relaxed md:pl-9 md:text-sm">
                {s.body}
              </div>
            </section>
          ))}
        </div>

        {/* Bottom Contact & Escalation Box */}
        <div className="border-border/80 bg-surface/50 mt-16 space-y-4 rounded-2xl border p-6 md:p-8">
          <div className="flex items-center gap-2">
            <Mail size={16} className="text-primary" />
            <h3 className="text-foreground text-sm font-semibold uppercase tracking-wider">
              Questions & Legal Inquiries
            </h3>
          </div>
          <p className="text-muted-foreground text-xs leading-relaxed md:text-sm">
            If you have questions regarding these terms, your rights as a consumer, or merchant
            compliance obligations, please contact our Legal & Compliance Office at{' '}
            <a
              href="mailto:legal@verndly.com"
              className="text-primary font-medium underline underline-offset-2"
            >
              legal@verndly.com
            </a>{' '}
            or write to Verndly Financial & Legal Services, Accra, Ghana.
          </p>
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={scrollToTop}
              className="text-primary inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold hover:underline"
            >
              <ArrowUp size={13} />
              <span>Back to Top</span>
            </button>
            <span className="text-muted-foreground font-mono text-[11px]">
              Document Version: 2026.4
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
