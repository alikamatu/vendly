"use client";

import React from "react";
import Link from "next/link";
import { Lock, Sparkles, type LucideIcon } from "lucide-react";

interface ProFeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  isPro: boolean;
  /** When unlocked, render an action button; otherwise an upgrade prompt. */
  cta?: { label: string; onClick: () => void } | { label: string; href: string };
  accent?: "accent" | "neutral";
}

export default function ProFeatureCard({
  icon: Icon,
  title,
  description,
  isPro,
  cta,
  accent = "neutral",
}: ProFeatureCardProps) {
  const unlocked = isPro;

  const cardClass = unlocked
    ? "border-[var(--color-border)] bg-[var(--color-surface)]"
    : "border-[var(--color-border)] bg-[var(--color-surface)]/60";

  const iconClass = unlocked
    ? accent === "accent"
      ? "bg-[var(--color-accent)]/15 text-[var(--color-accent)]"
      : "bg-[var(--color-foreground)]/10 text-[var(--color-foreground)]"
    : "bg-[var(--color-border)]/40 text-[var(--color-muted)]";

  function renderCta() {
    if (!cta) return null;
    const btnClass =
      "h-9 inline-flex items-center justify-center gap-1.5 px-3.5 rounded-xl text-[11px] font-medium uppercase tracking-wider transition-opacity";
    if (!unlocked) {
      return (
        <Link
          href="/dashboard/settings"
          className={`${btnClass} bg-[var(--color-accent)] text-white hover:opacity-90`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Upgrade
        </Link>
      );
    }
    if ("href" in cta) {
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
      className={`relative rounded-3xl border p-4 md:p-5 flex flex-col gap-4 transition-colors ${cardClass}`}
    >
      {!unlocked && (
        <span className="absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-medium uppercase tracking-wider bg-[var(--color-foreground)]/[0.06] text-[var(--color-muted)]">
          <Lock className="w-2.5 h-2.5" />
          Pro
        </span>
      )}
      {unlocked && (
        <span className="absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-medium uppercase tracking-wider bg-[var(--color-accent)]/15 text-[var(--color-accent)]">
          <Sparkles className="w-2.5 h-2.5" />
          Pro
        </span>
      )}

      <div className="flex items-start gap-3">
        <div
          className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${iconClass}`}
        >
          <Icon className="w-5 h-5" />
        </div>
        <div className="space-y-1 min-w-0">
          <h3 className="text-sm font-medium text-[var(--color-foreground)] leading-tight">
            {title}
          </h3>
          <p className="text-[11px] text-[var(--color-muted)] leading-snug">
            {description}
          </p>
        </div>
      </div>

      <div className="flex justify-end">{renderCta()}</div>
    </div>
  );
}
