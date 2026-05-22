"use client";

import React from "react";
import DashboardHeader from "@/components/dashboard/DashboardHeader";

export interface LegalSection {
  title: string;
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
  eyebrow,
  title,
  description,
  updatedAt,
  sections,
  children,
}: LegalPageProps) {
  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title={title} />

      <main className="max-w-3xl mx-auto px-4 md:px-8 pt-10 md:pt-16 pb-24 md:pb-32">
        <header className="mb-10 md:mb-14 space-y-3">
          {eyebrow && (
            <p className="text-[10px] font-medium uppercase tracking-wider text-primary">
              {eyebrow}
            </p>
          )}
          <h1 className="text-3xl md:text-4xl font-medium tracking-tight text-foreground">
            {title}
          </h1>
          {description && (
            <p className="text-sm md:text-base text-muted leading-relaxed max-w-2xl">
              {description}
            </p>
          )}
          {updatedAt && (
            <p className="text-[11px] font-normal uppercase tracking-wider text-muted/70">
              Last updated · {updatedAt}
            </p>
          )}
        </header>

        {children}

        <div className="space-y-10 md:space-y-12">
          {sections.map((s, i) => (
            <section key={i} className="space-y-3" id={slugify(s.title)}>
              <h2 className="text-lg md:text-xl font-medium tracking-tight text-foreground">
                {i + 1}. {s.title}
              </h2>
              <div className="text-[13px] md:text-sm leading-relaxed text-foreground/85 space-y-3">
                {s.body}
              </div>
            </section>
          ))}
        </div>

        {sections.length > 1 && (
          <aside className="mt-14 p-5 rounded-3xl border border-border bg-surface/30">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted mb-3">
              On this page
            </p>
            <ol className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
              {sections.map((s, i) => (
                <li key={i}>
                  <a
                    href={`#${slugify(s.title)}`}
                    className="text-[12px] font-normal text-foreground/80 hover:text-primary transition-colors"
                  >
                    {i + 1}. {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </aside>
        )}
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
