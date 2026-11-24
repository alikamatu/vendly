'use client';

import React from 'react';
import Link from 'next/link';
import { Lock, Sparkles, type LucideIcon } from 'lucide-react';

interface ProFeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  isPro: boolean;
  /** When unlocked, render an action button; otherwise an upgrade prompt. */
  cta?: { label: string; onClick: () => void } | { label: string; href: string };
  previewHref?: string;
  accent?: 'accent' | 'neutral';
}

export default function ProFeatureCard({
  icon: Icon,
  title,
  description,
  isPro,
  cta,
  previewHref,
  accent = 'neutral',
}: ProFeatureCardProps) {
  const unlocked = isPro;

  const cardClass = unlocked ? 'bg-[var(--color-surface)]' : 'bg-[var(--color-surface)]/70';

  const iconClass = unlocked
    ? accent === 'accent'
      ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent)]'
      : 'bg-[var(--color-foreground)]/10 text-[var(--color-foreground)]'
    : 'bg-[var(--color-background)] text-[var(--color-muted)]';

  function renderCta() {
    if (!cta) return null;
    const btnClass =
      'h-9 inline-flex items-center justify-center gap-1.5 px-3.5 rounded-xl text-xs font-semibold transition-opacity';
    if (!unlocked) {
      return (
        <div className="flex items-center gap-2">
          {previewHref && (
            <Link
              href={previewHref}
              className={`${btnClass} bg-[var(--color-background)] text-[var(--color-foreground)] hover:opacity-80`}
            >
              Preview
            </Link>
          )}
          <Link
            href="/dashboard/settings"
            className={`${btnClass} bg-[var(--color-accent)] text-white hover:opacity-90`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Upgrade
          </Link>
        </div>
      );
    }
    if ('href' in cta) {
      return (
        <Link
          href={cta.href}
          className={`${btnClass} bg-[var(--color-foreground)] text-[var(--color-background)] hover:opacity-90`}
        >
          {cta.label}
        </Link>
      );
    }
    return (
      <button
        type="button"
        onClick={cta.onClick}
        className={`${btnClass} bg-[var(--color-foreground)] text-[var(--color-background)] hover:opacity-90`}
      >
        {cta.label}
      </button>
    );
  }

  return (
    <div
      className={`relative flex flex-col gap-4 rounded-3xl p-4 transition-colors md:p-5 ${cardClass}`}
    >
      {!unlocked && (
        <span className="bg-[var(--color-foreground)]/[0.06] absolute right-3 top-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider text-[var(--color-muted)]">
          <Lock className="h-2.5 w-2.5" />
          Pro
        </span>
      )}
      {unlocked && (
        <span className="bg-[var(--color-accent)]/15 absolute right-3 top-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider text-[var(--color-accent)]">
          <Sparkles className="h-2.5 w-2.5" />
          Pro
        </span>
      )}

      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl ${iconClass}`}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 space-y-1">
          <h3 className="text-sm font-medium leading-tight text-[var(--color-foreground)]">
            {title}
          </h3>
          <p className="text-[11px] leading-snug text-[var(--color-muted)]">{description}</p>
        </div>
      </div>

      <div className="flex justify-end">{renderCta()}</div>
    </div>
  );
}
