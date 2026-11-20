'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

interface JumiaCategoryPreset {
  id: string;
  label: string;
  jumiaCommissionPct: number;
  defaultShippingContribution: number;
  examplePrice: number;
}

/**
 * Based on Jumia Ghana VendorHub published commission bands (5%–20%)
 * plus seller shipping contribution bands (GHS 6–45 depending on parcel weight/tier).
 */
const CATEGORY_PRESETS: JumiaCategoryPreset[] = [
  {
    id: 'fashion',
    label: 'Fashion & Shoes',
    jumiaCommissionPct: 20,
    defaultShippingContribution: 15,
    examplePrice: 250,
  },
  {
    id: 'beauty',
    label: 'Beauty & Skincare',
    jumiaCommissionPct: 20,
    defaultShippingContribution: 12,
    examplePrice: 180,
  },
  {
    id: 'groceries',
    label: 'Food & Groceries',
    jumiaCommissionPct: 20,
    defaultShippingContribution: 10,
    examplePrice: 120,
  },
  {
    id: 'home',
    label: 'Home & Kitchen',
    jumiaCommissionPct: 12,
    defaultShippingContribution: 25,
    examplePrice: 650,
  },
  {
    id: 'accessories',
    label: 'Phone & Tech Accessories',
    jumiaCommissionPct: 12,
    defaultShippingContribution: 10,
    examplePrice: 200,
  },
  {
    id: 'electronics',
    label: 'Phones & Laptops',
    jumiaCommissionPct: 5,
    defaultShippingContribution: 35,
    examplePrice: 2500,
  },
];

const VERNDLY_FEE_PCT = 4;

function formatGhs(amount: number): string {
  return `GH₵ ${amount.toLocaleString('en-GH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function FeeCalculator({
  compact = false,
  showCta = true,
}: {
  compact?: boolean;
  showCta?: boolean;
}) {
  const [selectedId, setSelectedId] = useState<string>('fashion');
  const [price, setPrice] = useState<number>(250);
  const [monthlyOrders, setMonthlyOrders] = useState<number>(40);
  const [jumiaShipping, setJumiaShipping] = useState<number>(15);

  const preset = useMemo(
    () => CATEGORY_PRESETS.find((c) => c.id === selectedId) ?? CATEGORY_PRESETS[0],
    [selectedId],
  );

  const handleCategoryChange = (item: JumiaCategoryPreset) => {
    setSelectedId(item.id);
    setPrice(item.examplePrice);
    setJumiaShipping(item.defaultShippingContribution);
  };

  const calc = useMemo(() => {
    const safePrice = Math.max(0, Number.isFinite(price) ? price : 0);
    const safeOrders = Math.max(1, Number.isFinite(monthlyOrders) ? monthlyOrders : 1);
    const safeShip = Math.max(0, Number.isFinite(jumiaShipping) ? jumiaShipping : 0);

    const verndlyFee = safePrice * (VERNDLY_FEE_PCT / 100);
    const verndlyNet = Math.max(0, safePrice - verndlyFee);

    const jumiaCommission = safePrice * (preset.jumiaCommissionPct / 100);
    const jumiaTotalFee = jumiaCommission + safeShip;
    const jumiaNet = Math.max(0, safePrice - jumiaTotalFee);

    const diffPerOrder = verndlyNet - jumiaNet;
    const monthlySavings = diffPerOrder * safeOrders;
    const annualSavings = monthlySavings * 12;

    const verndlyKeepPct = safePrice > 0 ? (verndlyNet / safePrice) * 100 : 96;
    const jumiaKeepPct = safePrice > 0 ? Math.max(0, (jumiaNet / safePrice) * 100) : 0;

    return {
      safePrice,
      safeOrders,
      verndlyFee,
      verndlyNet,
      jumiaCommission,
      jumiaTotalFee,
      jumiaNet,
      diffPerOrder,
      monthlySavings,
      annualSavings,
      verndlyKeepPct,
      jumiaKeepPct,
    };
  }, [price, monthlyOrders, jumiaShipping, preset]);

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
          against Jumia Ghana&apos;s 5–20% category commission plus per-order shipping contribution.
        </p>
      </div>

      {/* Category pills */}
      <div className="space-y-2.5">
        <span className="text-muted block text-xs">Choose your product category</span>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_PRESETS.map((item) => {
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
                <span className="ml-1.5 font-mono opacity-60">{item.jumiaCommissionPct}%</span>
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
            Jumia shipping charge (GH₵ 6–45)
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
              {preset.jumiaCommissionPct}% + shipping
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
              <dt>Category commission ({preset.jumiaCommissionPct}%)</dt>
              <dd className="font-mono tabular-nums">-{formatGhs(calc.jumiaCommission)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Seller shipping contribution</dt>
              <dd className="font-mono tabular-nums">-{formatGhs(jumiaShipping)}</dd>
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
        Methodology: Jumia Ghana rates reflect published VendorHub category commissions (5%–20%)
        plus standard per-order seller shipping contributions (GH₵ 6–45). Verndly deducts a flat 4%
        platform fee on completed orders; Paystack processing is absorbed within that 4%, and buyers
        pay standard delivery directly at checkout with zero platform surcharge.
      </p>
    </section>
  );
}
