/**
 * Single source of truth for escrow timing and 4% fee / Paystack settlement copy (T10: SW-03, SL-03).
 * Reuse across Footer, /sell, FeeCalculator, and blog/docs so escrow and fee terms never drift.
 */
export const ESCROW_AND_FEE_COPY = {
  escrowTrustBarDesc:
    'Payments held in Paystack escrow until delivery and the 7-day inspection window',
  feeSettlementDisclosure:
    "The 4% includes Paystack's 1.95% collection fee. Paystack payout transfer fees (currently GHS 1 to MoMo, GHS 8 to bank) are charged on settlement.",
} as const;
