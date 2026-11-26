import React from 'react';
import { calculateMarketplaceComparison, formatGhs } from '@/lib/content/marketplace-rates';

/**
 * Minimal, geometric, Linear/Apple/Google-inspired inline SVG diagrams.
 * Strictly zero shadows, zero blur filters, zero heavy chrome — pure flat vector
 * geometry that inherits Verndly light & dark theme CSS tokens automatically.
 */

export function EscrowFlowSvg({ className = 'w-full h-auto' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 880 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="How Verndly Paystack escrow works in four steps: Buyer pays via MoMo or card, Paystack escrow holds funds, Merchant dispatches tracked parcel, and Funds release after delivery inspection."
      className={className}
    >
      {/* Connector track */}
      <line
        x1="120"
        y1="82"
        x2="760"
        y2="82"
        stroke="currentColor"
        strokeOpacity="0.14"
        strokeWidth="2"
        strokeDasharray="4 6"
      />

      {/* Step 1: Buyer Pays */}
      <g transform="translate(24, 24)">
        <rect width="184" height="172" rx="20" fill="var(--color-surface)" />
        <rect
          x="20"
          y="20"
          width="44"
          height="44"
          rx="12"
          fill="var(--color-foreground)"
          fillOpacity="0.06"
        />
        <rect
          x="33"
          y="34"
          width="18"
          height="14"
          rx="3"
          stroke="var(--color-foreground)"
          strokeWidth="1.6"
        />
        <line x1="33" y1="39" x2="51" y2="39" stroke="var(--color-foreground)" strokeWidth="1.6" />
        <text
          x="150"
          y="36"
          textAnchor="end"
          fill="var(--color-muted)"
          fontSize="11"
          fontFamily="var(--font-mono)"
        >
          01
        </text>
        <text x="20" y="96" fill="var(--color-foreground)" fontSize="14" fontWeight="500">
          Buyer pays
        </text>
        <text x="20" y="118" fill="var(--color-muted)" fontSize="12">
          MTN MoMo, Telecel,
        </text>
        <text x="20" y="136" fill="var(--color-muted)" fontSize="12">
          AT Money, or Card.
        </text>
        <text x="20" y="156" fill="var(--color-muted)" fontSize="11" fontFamily="var(--font-mono)">
          0% buyer fee
        </text>
      </g>

      {/* Step 2: Escrow Vault */}
      <g transform="translate(240, 24)">
        <rect width="184" height="172" rx="20" fill="var(--color-foreground)" />
        <rect
          x="20"
          y="20"
          width="44"
          height="44"
          rx="12"
          fill="var(--color-background)"
          fillOpacity="0.12"
        />
        <path
          d="M42 30L51 34V41.5C51 46.8 47.1 51.4 42 53C36.9 51.4 33 46.8 33 41.5V34L42 30Z"
          stroke="var(--color-background)"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path
          d="M38.5 41.5L41 44L46 39"
          stroke="var(--color-accent)"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <text
          x="164"
          y="36"
          textAnchor="end"
          fill="var(--color-background)"
          fillOpacity="0.55"
          fontSize="11"
          fontFamily="var(--font-mono)"
        >
          02
        </text>
        <text x="20" y="96" fill="var(--color-background)" fontSize="14" fontWeight="500">
          Held in escrow
        </text>
        <text x="20" y="118" fill="var(--color-background)" fillOpacity="0.72" fontSize="12">
          Funds sit in Paystack
        </text>
        <text x="20" y="136" fill="var(--color-background)" fillOpacity="0.72" fontSize="12">
          custody — never direct.
        </text>
        <text x="20" y="156" fill="var(--color-accent)" fontSize="11" fontFamily="var(--font-mono)">
          VERIFIED PAYMENT
        </text>
      </g>

      {/* Step 3: Courier & Inspect */}
      <g transform="translate(456, 24)">
        <rect width="184" height="172" rx="20" fill="var(--color-surface)" />
        <rect
          x="20"
          y="20"
          width="44"
          height="44"
          rx="12"
          fill="var(--color-foreground)"
          fillOpacity="0.06"
        />
        <path
          d="M32 36H45V47H32V36ZM45 40H50L53 43.5V47H45V40Z"
          stroke="var(--color-foreground)"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <circle cx="36" cy="49" r="2" fill="var(--color-foreground)" />
        <circle cx="49" cy="49" r="2" fill="var(--color-foreground)" />
        <text
          x="164"
          y="36"
          textAnchor="end"
          fill="var(--color-muted)"
          fontSize="11"
          fontFamily="var(--font-mono)"
        >
          03
        </text>
        <text x="20" y="96" fill="var(--color-foreground)" fontSize="14" fontWeight="500">
          Deliver &amp; inspect
        </text>
        <text x="20" y="118" fill="var(--color-muted)" fontSize="12">
          Tracked courier drop
        </text>
        <text x="20" y="136" fill="var(--color-muted)" fontSize="12">
          + 3-day protection.
        </text>
        <text x="20" y="156" fill="var(--color-muted)" fontSize="11" fontFamily="var(--font-mono)">
          3-day window
        </text>
      </g>

      {/* Step 4: Seller Paid */}
      <g transform="translate(672, 24)">
        <rect width="184" height="172" rx="20" fill="var(--color-surface)" />
        <rect x="20" y="20" width="44" height="44" rx="12" fill="#10b981" fillOpacity="0.14" />
        <path
          d="M36 42L40.5 46.5L49 37.5"
          stroke="#10b981"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <text
          x="164"
          y="36"
          textAnchor="end"
          fill="var(--color-muted)"
          fontSize="11"
          fontFamily="var(--font-mono)"
        >
          04
        </text>
        <text x="20" y="96" fill="var(--color-foreground)" fontSize="14" fontWeight="500">
          Seller keeps 96%
        </text>
        <text x="20" y="118" fill="var(--color-muted)" fontSize="12">
          Auto Paystack payout
        </text>
        <text x="20" y="136" fill="var(--color-muted)" fontSize="12">
          to seller bank account.
        </text>
        <text x="20" y="156" fill="#10b981" fontSize="11" fontFamily="var(--font-mono)">
          4% flat fee all-in
        </text>
      </g>
    </svg>
  );
}

export function FeeSplitSvg({ className = 'w-full h-auto' }: { className?: string }) {
  const sample = calculateMarketplaceComparison({
    categoryId: 'fashion',
    price: 250,
    fulfillment: 'dropship',
  });
  const trackWidth = 696;
  const verndlyBarWidth = Math.round((sample.verndlyKeepPct / 100) * trackWidth);
  const legacyKeepWidth = Math.round((sample.legacyKeepPct / 100) * trackWidth);
  const legacyCommWidth = Math.round((sample.legacyCommission / sample.safePrice) * trackWidth);
  const legacyShipWidth = Math.max(8, trackWidth - legacyKeepWidth - legacyCommWidth - 8);

  return (
    <svg
      viewBox="0 0 760 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`Fee comparison visual on a GH₵ 250 fashion item: Verndly seller keeps ${formatGhs(sample.verndlyNet)} (${sample.verndlyKeepPct.toFixed(0)}%), while a traditional marketplace seller keeps ${formatGhs(sample.legacyNet)} (${sample.legacyKeepPct.toFixed(1)}%) after 20% commission and GH₵ ${sample.legacyShipping} shipping contribution.`}
      className={className}
    >
      <rect width="760" height="220" rx="24" fill="var(--color-surface)" />

      {/* Header label */}
      <text
        x="32"
        y="40"
        fill="var(--color-muted)"
        fontSize="11"
        fontFamily="var(--font-mono)"
        letterSpacing="0.08em"
      >
        WORKED EXAMPLE · GH₵ 250 FASHION ITEM (DROPSHIP)
      </text>

      {/* Row 1: Verndly */}
      <text x="32" y="82" fill="var(--color-foreground)" fontSize="14" fontWeight="500">
        Verndly (4% flat, Paystack included)
      </text>
      <text
        x="728"
        y="82"
        textAnchor="end"
        fill="#10b981"
        fontSize="14"
        fontWeight="600"
        fontFamily="var(--font-mono)"
      >
        You keep {formatGhs(sample.verndlyNet)} ({sample.verndlyKeepPct.toFixed(0)}%)
      </text>
      <rect
        x="32"
        y="94"
        width={trackWidth}
        height="22"
        rx="11"
        fill="var(--color-foreground)"
        fillOpacity="0.06"
      />
      <rect
        x="32"
        y="94"
        width={verndlyBarWidth}
        height="22"
        rx="11"
        fill="var(--color-foreground)"
      />
      <rect
        x={32 + verndlyBarWidth + 4}
        y="94"
        width={Math.max(12, trackWidth - verndlyBarWidth - 4)}
        height="22"
        rx="11"
        fill="var(--color-accent)"
      />

      {/* Row 2: Traditional marketplaces */}
      <text x="32" y="154" fill="var(--color-foreground)" fontSize="14" fontWeight="500">
        Traditional marketplaces (20% fashion fee + GH₵ {sample.legacyShipping} shipping)
      </text>
      <text
        x="728"
        y="154"
        textAnchor="end"
        fill="var(--color-muted)"
        fontSize="14"
        fontWeight="500"
        fontFamily="var(--font-mono)"
      >
        You keep {formatGhs(sample.legacyNet)} ({sample.legacyKeepPct.toFixed(1)}%)
      </text>
      <rect
        x="32"
        y="166"
        width={trackWidth}
        height="22"
        rx="11"
        fill="var(--color-foreground)"
        fillOpacity="0.06"
      />
      <rect
        x="32"
        y="166"
        width={legacyKeepWidth}
        height="22"
        rx="11"
        fill="var(--color-foreground)"
        fillOpacity="0.32"
      />
      <rect
        x={32 + legacyKeepWidth + 4}
        y="166"
        width={legacyCommWidth}
        height="22"
        rx="11"
        fill="var(--color-accent)"
        fillOpacity="0.75"
      />
      <rect
        x={32 + legacyKeepWidth + legacyCommWidth + 8}
        y="166"
        width={legacyShipWidth}
        height="22"
        rx="11"
        fill="var(--color-accent)"
        fillOpacity="0.35"
      />
    </svg>
  );
}

export function GhanaDeliveryNetworkSvg({ className = 'w-full h-auto' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 760 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Verndly seller-configured delivery options: Greater Accra courier dispatch, free store pickup where offered, and seller-arranged regional shipping."
      className={className}
    >
      <rect width="760" height="220" rx="24" fill="var(--color-surface)" />

      {/* Connecting lines */}
      <path
        d="M250 110 L296 110"
        stroke="var(--color-foreground)"
        strokeOpacity="0.22"
        strokeWidth="2"
        strokeDasharray="5 5"
      />
      <path
        d="M492 110 L538 110"
        stroke="var(--color-foreground)"
        strokeOpacity="0.22"
        strokeWidth="2"
        strokeDasharray="5 5"
      />

      {/* Option 1: Greater Accra Courier */}
      <g transform="translate(42, 48)">
        <rect width="208" height="124" rx="20" fill="var(--color-foreground)" />
        <circle cx="24" cy="30" r="5" fill="var(--color-accent)" />
        <text x="38" y="34" fill="var(--color-background)" fontSize="14" fontWeight="500">
          Greater Accra
        </text>
        <text x="24" y="64" fill="var(--color-background)" fillOpacity="0.78" fontSize="12">
          Live verified stores today
        </text>
        <text x="24" y="84" fill="var(--color-background)" fillOpacity="0.78" fontSize="12">
          via seller dispatch riders
        </text>
        <text x="24" y="108" fill="var(--color-accent)" fontSize="11" fontFamily="var(--font-mono)">
          SAME-DAY / NEXT-DAY
        </text>
      </g>

      {/* Option 2: Store Pickup */}
      <g transform="translate(296, 48)">
        <rect width="196" height="124" rx="20" fill="var(--color-background)" />
        <circle cx="24" cy="30" r="5" fill="#10b981" />
        <text x="38" y="34" fill="var(--color-foreground)" fontSize="14" fontWeight="500">
          Store Pickup
        </text>
        <text x="24" y="64" fill="var(--color-muted)" fontSize="12">
          Collect directly from
        </text>
        <text x="24" y="84" fill="var(--color-muted)" fontSize="12">
          participating shops
        </text>
        <text x="24" y="108" fill="#10b981" fontSize="11" fontFamily="var(--font-mono)">
          GH₵ 0 · FREE PICKUP
        </text>
      </g>

      {/* Option 3: Other Regions */}
      <g transform="translate(538, 48)">
        <rect width="180" height="124" rx="20" fill="var(--color-background)" />
        <circle cx="24" cy="30" r="5" fill="var(--color-foreground)" />
        <text x="38" y="34" fill="var(--color-foreground)" fontSize="14" fontWeight="500">
          Other Regions
        </text>
        <text x="24" y="64" fill="var(--color-muted)" fontSize="12">
          Where enabled by the
        </text>
        <text x="24" y="84" fill="var(--color-muted)" fontSize="12">
          individual merchant
        </text>
        <text x="24" y="108" fill="var(--color-muted)" fontSize="11" fontFamily="var(--font-mono)">
          SELLER-ARRANGED
        </text>
      </g>
    </svg>
  );
}
