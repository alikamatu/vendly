"use client";

import React from "react";
import Header from "@/components/layout/Header";
import { ArrowUp, BookOpen, ShieldCheck, Mail } from "lucide-react";
import Link from "next/link";

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
  eyebrow = "Legal & Compliance",
  title,
  description,
  updatedAt,
  sections,
  children,
}: LegalPageProps) {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      <main className="max-w-4xl mx-auto px-4 md:px-8 pt-10 md:pt-16 pb-24 md:pb-32">
        {/* Document Header */}
        <header className="mb-10 md:mb-12 space-y-4 border-b border-border/60 pb-8">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
              {eyebrow}
            </span>
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Official Policy
            </span>
          </div>

          <h1 className="text-3xl md:text-5xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>

          {description && (
            <p className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-3xl">
              {description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-4 pt-2 text-[11px] text-muted-foreground">
            {updatedAt && (
              <span className="font-mono">
                Effective Date: <strong>{updatedAt}</strong>
              </span>
            )}
            <span>·</span>
            <span>Applicable across Ghana & International Orders</span>
            <span>·</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
              <ShieldCheck size={13} />
              Legally Binding Agreement
            </span>
          </div>
        </header>

        {/* Top Table of Contents Card */}
        {sections.length > 1 && (
          <aside className="mb-12 p-6 rounded-2xl border border-border/80 bg-surface/80">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen size={16} className="text-primary" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                Table of Contents & Quick Navigation
              </h2>
            </div>
            <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
              Select any clause below to jump directly to its full provisions:
            </p>
            <ol className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
              {sections.map((s, i) => (
                <li key={i} className="min-w-0">
                  <a
                    href={`#${slugify(s.title)}`}
                    className="text-[12.5px] text-foreground/80 hover:text-primary transition-colors flex items-center gap-2 group py-0.5"
                  >
                    <span className="text-[11px] font-mono text-muted-foreground group-hover:text-primary shrink-0 w-5">
                      {String(i + 1).padStart(2, "0")}.
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
              className="scroll-mt-24 pt-4 border-t border-border/40 space-y-4"
              id={slugify(s.title)}
            >
              <div className="flex items-center gap-3">
                <span className="h-6 w-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-mono text-xs font-bold shrink-0">
                  {i + 1}
                </span>
                <h2 className="text-lg md:text-xl font-semibold tracking-tight text-foreground">
                  {s.title}
                </h2>
                {s.badge && (
                  <span className="text-[9px] font-semibold uppercase tracking-wider bg-surface border border-border px-2 py-0.5 rounded-full text-muted-foreground">
                    {s.badge}
                  </span>
                )}
              </div>

              <div className="text-[13.5px] md:text-sm leading-relaxed text-foreground/90 space-y-4 pl-0 md:pl-9">
                {s.body}
              </div>
            </section>
          ))}
        </div>

        {/* Bottom Contact & Escalation Box */}
        <div className="mt-16 p-6 md:p-8 rounded-2xl border border-border/80 bg-surface/50 space-y-4">
          <div className="flex items-center gap-2">
            <Mail size={16} className="text-primary" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
              Questions & Legal Inquiries
            </h3>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
            If you have questions regarding these terms, your rights as a consumer, or merchant
            compliance obligations, please contact our Legal & Compliance Office at{" "}
            <a
              href="mailto:legal@verndly.com"
              className="text-primary font-medium underline underline-offset-2"
            >
              legal@verndly.com
            </a>{" "}
            or write to Verndly Financial & Legal Services, Accra, Ghana.
          </p>
          <div className="pt-2 flex items-center justify-between">
            <button
              onClick={scrollToTop}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline cursor-pointer"
            >
              <ArrowUp size={13} />
              <span>Back to Top</span>
            </button>
            <span className="text-[11px] text-muted-foreground font-mono">
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
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

