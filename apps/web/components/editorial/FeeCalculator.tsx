'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import {
  JUMIA_RATES_2026,
  JUMIA_RATES_LAST_CHECKED,
  JUMIA_VENDORHUB_URL,
  calculateMarketplaceComparison,
  formatGhs,
  getJumiaRateById,
  getShippingContribution,
  type FulfillmentMode,
  type JumiaCategoryRate,
} from '@/lib/content/jumia-rates-2026';

export default function FeeCalculator({
  compact = false,
  showCta = true,
}: {
  compact?: boolean;
  showCta?: boolean;
}) {
  const [selectedId, setSelectedId] = useState<string>('fashion');
  const [fulfillment, setFulfillment] = useState<FulfillmentMode>('dropship');
  const [price, setPrice] = useState<number>(250);
  const [monthlyOrders, setMonthlyOrders] = useState<number>(40);
  const [jumiaShipping, setJumiaShipping] = useState<number>(8);

  const preset = useMemo(() => getJumiaRateById(selectedId), [selectedId]);

  const handleCategoryChange = (item: JumiaCategoryRate) => {
    setSelectedId(item.id);
    setPrice(item.examplePriceGhs);
    setJumiaShipping(getShippingContribution(item, fulfillment));
  };

  const handleFulfillmentChange = (mode: FulfillmentMode) => {
    setFulfillment(mode);
    setJumiaShipping(getShippingContribution(preset, mode));
  };

  const calc = useMemo(
    () =>
      calculateMarketplaceComparison({
        categoryId: selectedId,
        price,
        fulfillment,
        shippingOverride: jumiaShipping,
        monthlyOrders,
      }),
    [selectedId, price, fulfillment, jumiaShipping, monthlyOrders],
  );

  return (
    <section
      aria-label="Ghana marketplace seller fee calculator"
      className={`bg-surface rounded-3xl ${compact ? 'p-6 md:p-8' : 'p-6 md:p-10'} space-y-8`}
    >
      <div className="space-y-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--color-accent)]">
          Interactive Calculator · GHS
        </p>
        <h2 className="text-foreground text-2xl font-medium tracking-tight md:text-3xl">
          See exactly what you keep per order.
        </h2>
        <p className="text-muted max-w-2xl text-sm leading-relaxed">
          Compare Verndly&apos;s flat 4% fee (Paystack Mobile Money &amp; card processing included)
          against Jumia Ghana&apos;s 7–20% category commission plus per-order shipping contribution
          (GH₵ 6–45).
        </p>
      </div>

      {/* Fulfillment mode toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-muted text-xs">Jumia fulfillment tier</span>
        <div className="bg-background inline-flex rounded-full p-1">
          {(
            [
              { id: 'dropship', label: 'Dropship' },
              { id: 'express', label: 'Jumia Express' },
            ] as const
          ).map((opt) => {
            const active = fulfillment === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleFulfillmentChange(opt.id)}
                className={`cursor-pointer rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                  active ? 'bg-foreground text-background' : 'text-muted hover:text-foreground'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Category pills */}
      <div className="space-y-2.5">
        <span className="text-muted block text-xs">Choose your product category</span>
        <div className="flex flex-wrap gap-2">
          {JUMIA_RATES_2026.map((item) => {
            const active = item.id === selectedId;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleCategoryChange(item)}
                className={`cursor-pointer rounded-full px-4 py-2 text-xs font-medium transition-colors ${
                  active
                    ? 'bg-foreground text-background'
                    : 'bg-background text-muted hover:text-foreground'
                }`}
              >
                {item.label}
                <span className="ml-1.5 font-mono opacity-60">{item.commissionPct}%</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Numeric controls */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <label className="bg-background block space-y-2 rounded-2xl p-4">
          <span className="text-muted block text-[11px] uppercase tracking-wider">
            Item selling price (GH₵)
          </span>
          <input
            type="number"
            min={10}
            max={100000}
            step={10}
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
            className="text-foreground w-full bg-transparent text-2xl font-medium tabular-nums outline-none"
          />
        </label>

        <label className="bg-background block space-y-2 rounded-2xl p-4">
          <span className="text-muted block text-[11px] uppercase tracking-wider">
            Monthly orders
          </span>
          <input
            type="number"
            min={1}
            max={10000}
            step={5}
            value={monthlyOrders}
            onChange={(e) => setMonthlyOrders(Number(e.target.value))}
            className="text-foreground w-full bg-transparent text-2xl font-medium tabular-nums outline-none"
          />
        </label>

        <label className="bg-background block space-y-2 rounded-2xl p-4">
          <span className="text-muted block text-[11px] uppercase tracking-wider">
            Jumia shipping ({fulfillment === 'express' ? 'Express' : 'Dropship'} · GH₵ 6–45)
          </span>
          <input
            type="number"
            min={0}
            max={200}
            step={1}
            value={jumiaShipping}
            onChange={(e) => setJumiaShipping(Number(e.target.value))}
            className="text-foreground w-full bg-transparent text-2xl font-medium tabular-nums outline-none"
          />
        </label>
      </div>

      {/* Comparison cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Verndly card */}
        <div className="bg-foreground text-background space-y-5 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider opacity-75">
              On Verndly
            </span>
            <span className="rounded-full bg-emerald-500/20 px-3 py-1 font-mono text-[11px] text-emerald-400">
              4% flat all-in
            </span>
          </div>

          <div>
            <p className="text-xs opacity-65">You keep per order</p>
            <p className="mt-1 text-3xl font-medium tabular-nums tracking-tight md:text-4xl">
              {formatGhs(calc.verndlyNet)}
            </p>
          </div>

          <div className="bg-background/15 h-2 w-full overflow-hidden rounded-full">
            <div
              className="h-full rounded-full bg-emerald-400 transition-all duration-300"
              style={{ width: `${Math.min(100, calc.verndlyKeepPct)}%` }}
            />
          </div>

          <dl className="space-y-2 pt-1 text-xs">
            <div className="flex justify-between opacity-80">
              <dt>Platform fee (4% · includes Paystack)</dt>
              <dd className="font-mono tabular-nums">-{formatGhs(calc.verndlyFee)}</dd>
            </div>
            <div className="flex justify-between opacity-80">
              <dt>Seller shipping contribution</dt>
              <dd className="font-mono tabular-nums">GH₵ 0.00</dd>
            </div>
            <div className="flex justify-between pt-2 font-medium opacity-100">
              <dt>Share you keep</dt>
              <dd className="font-mono tabular-nums">{calc.verndlyKeepPct.toFixed(1)}%</dd>
            </div>
          </dl>
        </div>

        {/* Jumia card */}
        <div className="bg-background space-y-5 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <span className="text-muted text-xs font-medium uppercase tracking-wider">
              On Jumia Ghana
            </span>
            <span className="bg-surface text-muted rounded-full px-3 py-1 font-mono text-[11px]">
              {preset.commissionPct}% + GH₵ {calc.jumiaShipping}
            </span>
          </div>

          <div>
            <p className="text-muted text-xs">You keep per order</p>
            <p className="text-foreground mt-1 text-3xl font-medium tabular-nums tracking-tight md:text-4xl">
              {formatGhs(calc.jumiaNet)}
            </p>
          </div>

          <div className="bg-surface h-2 w-full overflow-hidden rounded-full">
            <div
              className="bg-foreground/30 h-full rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, calc.jumiaKeepPct)}%` }}
            />
          </div>

          <dl className="text-muted space-y-2 pt-1 text-xs">
            <div className="flex justify-between">
              <dt>Category commission ({preset.commissionPct}%)</dt>
              <dd className="font-mono tabular-nums">-{formatGhs(calc.jumiaCommission)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Seller shipping ({fulfillment === 'express' ? 'Jumia Express' : 'Dropship'})</dt>
              <dd className="font-mono tabular-nums">-{formatGhs(calc.jumiaShipping)}</dd>
            </div>
            <div className="text-foreground flex justify-between pt-2 font-medium">
              <dt>Share you keep</dt>
              <dd className="font-mono tabular-nums">{calc.jumiaKeepPct.toFixed(1)}%</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Savings summary strip */}
      <div className="bg-background flex flex-col justify-between gap-6 rounded-2xl p-6 md:flex-row md:items-center">
        <div className="grid flex-1 grid-cols-1 gap-6 sm:grid-cols-3">
          <div>
            <p className="text-muted text-[11px] uppercase tracking-wider">Extra kept / order</p>
            <p className="text-foreground mt-1 text-xl font-medium tabular-nums">
              {calc.diffPerOrder >= 0
                ? `+${formatGhs(calc.diffPerOrder)}`
                : formatGhs(calc.diffPerOrder)}
            </p>
          </div>
          <div>
            <p className="text-muted text-[11px] uppercase tracking-wider">
              Extra kept / month ({calc.safeOrders} orders)
            </p>
            <p className="text-foreground mt-1 text-xl font-medium tabular-nums">
              {calc.monthlySavings >= 0
                ? `+${formatGhs(calc.monthlySavings)}`
                : formatGhs(calc.monthlySavings)}
            </p>
          </div>
          <div>
            <p className="text-muted text-[11px] uppercase tracking-wider">Extra kept / year</p>
            <p className="mt-1 text-xl font-medium tabular-nums text-[var(--color-accent)]">
              {calc.annualSavings >= 0
                ? `+${formatGhs(calc.annualSavings)}`
                : formatGhs(calc.annualSavings)}
            </p>
          </div>
        </div>

        {showCta && (
          <Link
            href="/sell"
            className="bg-foreground text-background inline-flex shrink-0 items-center justify-center gap-2 rounded-full px-6 py-3.5 text-xs font-medium transition-opacity hover:opacity-90"
          >
            Start selling at 4%
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>

      <p className="text-muted text-[11px] leading-relaxed">
        Methodology: Jumia Ghana 2026{' '}
        <a
          href={JUMIA_VENDORHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-foreground underline underline-offset-2"
        >
          VendorHub
        </a>{' '}
        commissions (VAT inclusive) plus the published seller shipping contribution for Dropship or
        Jumia Express. Last checked {JUMIA_RATES_LAST_CHECKED}.
      </p>
    </section>
  );
}
