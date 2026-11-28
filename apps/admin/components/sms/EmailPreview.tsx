'use client';

import React, { useState } from 'react';
import { Monitor, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AdminEmailTemplate } from '@/lib/admin-email-templates';

const STATUS_STYLES: Record<
  AdminEmailTemplate['statusVariant'],
  { bg: string; fg: string; border: string }
> = {
  success: { bg: '#ecfdf5', fg: '#047857', border: '#a7f3d0' },
  pending: { bg: '#fffbeb', fg: '#b45309', border: '#fde68a' },
  warning: { bg: '#fff7ed', fg: '#c2410c', border: '#fed7aa' },
  error: { bg: '#fef2f2', fg: '#b91c1c', border: '#fecaca' },
  info: { bg: '#eff6ff', fg: '#1d4ed8', border: '#bfdbfe' },
};

interface EmailPreviewProps {
  fromAddress: string;
  toLabel: string;
  subject: string;
  preheader: string;
  eyebrow: string;
  statusLabel: string;
  statusVariant: AdminEmailTemplate['statusVariant'];
  headline: string;
  paragraphs: string[];
  ctaLabel: string;
  ctaUrl: string;
}

/**
 * Faithful, always-light mockup of the Verndly transactional email so admins
 * see what recipients actually receive (inbox header + email card).
 */
export function EmailPreview({
  fromAddress,
  toLabel,
  subject,
  preheader,
  eyebrow,
  statusLabel,
  statusVariant,
  headline,
  paragraphs,
  ctaLabel,
  ctaUrl,
}: EmailPreviewProps) {
  const [mode, setMode] = useState<'desktop' | 'mobile'>('desktop');
  const status = STATUS_STYLES[statusVariant] ?? STATUS_STYLES.info;
  const font =
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
          Email preview
        </p>
        <div className="border-border bg-background inline-flex rounded-lg border p-0.5">
          {(
            [
              { id: 'desktop', icon: Monitor, label: 'Desktop' },
              { id: 'mobile', icon: Smartphone, label: 'Mobile' },
            ] as const
          ).map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setMode(id)}
              aria-label={`${label} preview`}
              className={cn(
                'inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold transition-colors',
                mode === id
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="h-3 w-3" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Mail client frame */}
      <div className="border-border overflow-hidden rounded-2xl border bg-slate-200 dark:bg-slate-800">
        {/* Inbox header */}
        <div className="space-y-1.5 border-b border-slate-200 bg-white px-4 py-3 text-slate-900">
          <p className="text-[13px] font-semibold leading-snug">{subject}</p>
          <div className="space-y-0.5 text-[11px] text-slate-500">
            <p className="truncate">
              <span className="mr-1.5 font-semibold text-slate-400">From</span>
              Verndly &lt;{fromAddress || 'support@verndly.com'}&gt;
            </p>
            <p className="truncate">
              <span className="mr-1.5 font-semibold text-slate-400">To</span>
              {toLabel}
            </p>
          </div>
          {preheader && <p className="truncate text-[11px] italic text-slate-400">{preheader}</p>}
        </div>

        {/* Email canvas */}
        <div
          className="max-h-[560px] overflow-y-auto px-3 py-5 sm:px-5"
          style={{ fontFamily: font }}
        >
          <div
            className={cn(
              'mx-auto w-full overflow-hidden rounded-xl border border-slate-200 bg-white transition-all duration-200',
              mode === 'mobile' ? 'max-w-[340px]' : 'max-w-[560px]',
            )}
          >
            <div className="h-1 bg-red-500" />
            <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logos/verndly.png" alt="" className="h-6 w-6 object-contain" />
              <span className="text-[15px] font-semibold tracking-tight text-slate-900">
                Verndly
              </span>
            </div>

            <div className={cn('space-y-4', mode === 'mobile' ? 'px-5 py-6' : 'px-8 py-8')}>
              <div className="space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-red-500">
                  {eyebrow}
                </p>
                <span
                  className="inline-block rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider"
                  style={{ background: status.bg, color: status.fg, borderColor: status.border }}
                >
                  {statusLabel}
                </span>
              </div>

              <h1
                className={cn(
                  'font-semibold leading-tight tracking-tight text-slate-900',
                  mode === 'mobile' ? 'text-[19px]' : 'text-[22px]',
                )}
              >
                {headline}
              </h1>

              {paragraphs.map((paragraph, index) => (
                <p key={index} className="text-[13.5px] leading-[1.68] text-slate-600">
                  {paragraph}
                </p>
              ))}

              <div className="pt-1">
                <span className="inline-block rounded-md bg-red-600 px-7 py-3 text-[13.5px] font-semibold text-white">
                  {ctaLabel}
                </span>
              </div>

              <p className="break-all rounded-md border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-[10.5px] leading-relaxed text-slate-500">
                {ctaUrl}
              </p>
            </div>

            <div className="border-t border-slate-100 bg-slate-50 px-6 py-4 text-center text-[11px] leading-relaxed text-slate-400">
              <p>Verndly · Accra, Ghana</p>
              <p>Payments protected by 3-day Paystack escrow.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
