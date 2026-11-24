/**
 * Single source of truth for typical 2026 Ghana legacy marketplace commission tiers
 * (7%–20%) and seller shipping contributions (Dropship vs Fulfillment Center).
 *
 * Used by `/sell` (`FeeCalculator`), `VisualDiagrams` (`FeeSplitSvg`), and
 * `/blog/ghana-marketplace-seller-fees-vs-verndly` so calculator outputs and
 * blog worked examples always match.
 */

export const RATES_LAST_CHECKED = '23 Nov 2026';
export const VERNDLY_FEE_PCT = 4;

export type FulfillmentMode = 'dropship' | 'express';

export interface MarketplaceCategoryRate {
  id: string;
  label: string;
  commissionPct: number;
  dropshipShippingGhs: number;
  expressShippingGhs: number;
  examplePriceGhs: number;
}

export const LEGACY_MARKETPLACE_RATES: readonly MarketplaceCategoryRate[] = [
  {
    id: 'fashion',
    label: 'Fashion',
    commissionPct: 20,
    dropshipShippingGhs: 8,
    expressShippingGhs: 6,
    examplePriceGhs: 250,
  },
  {
    id: 'health-beauty',
    label: 'Health and beauty',
    commissionPct: 20,
    dropshipShippingGhs: 8,
    expressShippingGhs: 6,
    examplePriceGhs: 180,
  },
  {
    id: 'grocery',
    label: 'Grocery',
    commissionPct: 20,
    dropshipShippingGhs: 8,
    expressShippingGhs: 6,
    examplePriceGhs: 120,
  },
  {
    id: 'home',
    label: 'Home',
    commissionPct: 17,
    dropshipShippingGhs: 15,
    expressShippingGhs: 10,
    examplePriceGhs: 450,
  },
  {
    id: 'electronics-accessories',
    label: 'Electronics accessories',
    commissionPct: 16,
    dropshipShippingGhs: 10,
    expressShippingGhs: 8,
    examplePriceGhs: 200,
  },
  {
    id: 'kids-baby',
    label: 'Kids and baby',
    commissionPct: 15,
    dropshipShippingGhs: 10,
    expressShippingGhs: 8,
    examplePriceGhs: 220,
  },
  {
    id: 'small-appliances',
    label: 'Small appliances',
    commissionPct: 12,
    dropshipShippingGhs: 18,
    expressShippingGhs: 12,
    examplePriceGhs: 650,
  },
  {
    id: 'large-appliances',
    label: 'Large appliances',
    commissionPct: 12,
    dropshipShippingGhs: 45,
    expressShippingGhs: 35,
    examplePriceGhs: 3200,
  },
  {
    id: 'laptops',
    label: 'Laptops',
    commissionPct: 8,
    dropshipShippingGhs: 18,
    expressShippingGhs: 12,
    examplePriceGhs: 4500,
  },
  {
    id: 'mobile-phones',
    label: 'Mobile phones',
    commissionPct: 7,
    dropshipShippingGhs: 10,
    expressShippingGhs: 8,
    examplePriceGhs: 2500,
  },
] as const;

export function getCategoryRateById(categoryId: string): MarketplaceCategoryRate {
  return LEGACY_MARKETPLACE_RATES.find((c) => c.id === categoryId) ?? LEGACY_MARKETPLACE_RATES[0];
}

export function getShippingContribution(
  rate: MarketplaceCategoryRate,
  fulfillment: FulfillmentMode,
): number {
  return fulfillment === 'express' ? rate.expressShippingGhs : rate.dropshipShippingGhs;
}

export interface ComparisonInput {
  categoryId: string;
  price: number;
  fulfillment?: FulfillmentMode;
  shippingOverride?: number;
  monthlyOrders?: number;
}

export interface ComparisonResult {
  rate: MarketplaceCategoryRate;
  fulfillment: FulfillmentMode;
  safePrice: number;
  safeOrders: number;
  legacyShipping: number;
  legacyCommission: number;
  legacyTotalFee: number;
  legacyNet: number;
  legacyKeepPct: number;
  verndlyFee: number;
  verndlyNet: number;
  verndlyKeepPct: number;
  diffPerOrder: number;
  monthlySavings: number;
  annualSavings: number;
}

export function calculateMarketplaceComparison(input: ComparisonInput): ComparisonResult {
  const rate = getCategoryRateById(input.categoryId);
  const fulfillment: FulfillmentMode = input.fulfillment ?? 'dropship';
  const safePrice = Math.max(0, Number.isFinite(input.price) ? input.price : 0);
  const safeOrders = Math.max(
    1,
    Number.isFinite(input.monthlyOrders ?? 1) ? (input.monthlyOrders ?? 1) : 1,
  );
  const defaultShipping = getShippingContribution(rate, fulfillment);
  const legacyShipping = Math.max(
    0,
    input.shippingOverride !== undefined && Number.isFinite(input.shippingOverride)
      ? input.shippingOverride
      : defaultShipping,
  );

  const verndlyFee = round2(safePrice * (VERNDLY_FEE_PCT / 100));
  const verndlyNet = round2(Math.max(0, safePrice - verndlyFee));

  const legacyCommission = round2(safePrice * (rate.commissionPct / 100));
  const legacyTotalFee = round2(legacyCommission + legacyShipping);
  const legacyNet = round2(Math.max(0, safePrice - legacyTotalFee));

  const diffPerOrder = round2(verndlyNet - legacyNet);
  const monthlySavings = round2(diffPerOrder * safeOrders);
  const annualSavings = round2(monthlySavings * 12);

  const verndlyKeepPct = safePrice > 0 ? (verndlyNet / safePrice) * 100 : 96;
  const legacyKeepPct = safePrice > 0 ? Math.max(0, (legacyNet / safePrice) * 100) : 0;

  return {
    rate,
    fulfillment,
    safePrice,
    safeOrders,
    legacyShipping,
    legacyCommission,
    legacyTotalFee,
    legacyNet,
    legacyKeepPct,
    verndlyFee,
    verndlyNet,
    verndlyKeepPct,
    diffPerOrder,
    monthlySavings,
    annualSavings,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function formatGhs(amount: number): string {
  return `GH₵ ${amount.toLocaleString('en-GH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
