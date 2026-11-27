/**
 * Ghanaian SMS phone normalization (`233XXXXXXXXX` — 12 digits total:
 * `233` country code + 9-digit subscriber number), SMS segment calculator,
 * and curated Verndly Admin SMS templates.
 */

export interface ParsedGhanaPhone {
  raw: string;
  normalized: string | null;
  valid: boolean;
  reason?: string;
}

/**
 * Formats any Ghanaian phone input into strict 12-digit `233XXXXXXXXX` format:
 * - Removes the leading `0` from 10-digit numbers (`0244123456`) and prepends `233` -> `233244123456`
 * - Prepends `233` to 9-digit subscriber numbers (`244123456`) -> `233244123456`
 * - Fixes redundant `2330` typo (`2330244123456` / `+2330244123456`) -> `233244123456`
 * - Strips `+` / `00` international prefixes (`+233244123456`, `00233244123456`) -> `233244123456`
 */
export function normalizeGhanaSmsNumber(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let digits = String(raw).replace(/\D/g, '');
  if (!digits) return null;

  if (digits.startsWith('00233')) {
    digits = digits.slice(2);
  }

  if (digits.length === 13 && digits.startsWith('2330')) {
    digits = `233${digits.slice(4)}`;
  }

  if (digits.length === 10 && digits.startsWith('0')) {
    digits = `233${digits.slice(1)}`;
  }

  if (digits.length === 9 && !digits.startsWith('0')) {
    digits = `233${digits}`;
  }

  if (/^233[1-9]\d{8}$/.test(digits)) {
    return digits;
  }

  return null;
}

export function parseManualGhanaPhones(input: string): ParsedGhanaPhone[] {
  const tokens = input
    .split(/[\n,;]+/)
    .map((t) => t.trim())
    .filter(Boolean);

  return tokens.map((raw) => {
    const normalized = normalizeGhanaSmsNumber(raw);
    if (normalized) {
      return { raw, normalized, valid: true };
    }
    const digitsOnly = raw.replace(/\D/g, '');
    let reason = 'Must be a valid Ghana number (e.g. 0244123456 or 233244123456)';
    if (digitsOnly.length < 9) {
      reason = 'Too short — expected 9 or 10 local digits, or 12 digits with 233';
    } else if (digitsOnly.length > 13) {
      reason = 'Too many digits';
    }
    return { raw, normalized: null, valid: false, reason };
  });
}

// Standard GSM-7 basic character set check (Unicode/emojis drop segment size from 160 -> 70)
const GSM_7_RE =
  /^[@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&'()*+,\-./0-9:;<=>?¡A-ZÄÖÑÜ§¿a-zäöñüà^{}\\[~\]|€]*$/;

export function computeSmsMetrics(text: string): {
  length: number;
  encoding: 'GSM-7' | 'Unicode';
  segments: number;
  perSegment: number;
  remainingInSegment: number;
} {
  const length = text.length;
  const isGsm = GSM_7_RE.test(text);
  const encoding: 'GSM-7' | 'Unicode' = isGsm ? 'GSM-7' : 'Unicode';

  if (length === 0) {
    return {
      length: 0,
      encoding,
      segments: 0,
      perSegment: isGsm ? 160 : 70,
      remainingInSegment: isGsm ? 160 : 70,
    };
  }

  const singleLimit = isGsm ? 160 : 70;
  const multiLimit = isGsm ? 153 : 67;

  if (length <= singleLimit) {
    return {
      length,
      encoding,
      segments: 1,
      perSegment: singleLimit,
      remainingInSegment: singleLimit - length,
    };
  }

  const segments = Math.ceil(length / multiLimit);
  const remainingInSegment = segments * multiLimit - length;
  return {
    length,
    encoding,
    segments,
    perSegment: multiLimit,
    remainingInSegment,
  };
}

export function interpolateSmsPreview(
  template: string,
  sample: { name?: string | null; storeName?: string | null },
): string {
  const fullName = (sample.name || 'Kwame Mensah').trim() || 'Kwame Mensah';
  const firstName = fullName.split(/\s+/)[0] || 'Kwame';
  const storeName = (sample.storeName || 'your Verndly store').trim();

  return template
    .replace(/\{first_name\}/gi, firstName)
    .replace(/\{name\}/gi, fullName)
    .replace(/\{store_name\}/gi, storeName);
}

export type SmsTemplateCategory = 'Onboarding' | 'Verification' | 'Operations' | 'Growth';

export interface SmsTemplateItem {
  id: string;
  title: string;
  category: SmsTemplateCategory;
  description: string;
  body: string;
}

export const ADMIN_SMS_TEMPLATES: SmsTemplateItem[] = [
  {
    id: 'seller_approved_create_store',
    title: 'Seller Approved — Create Your Store',
    category: 'Verification',
    description: 'Notify approved sellers to create their storefront and start listing.',
    body: 'Hi {first_name}, great news! Your Verndly seller account has been approved. Log in at verndly.com/dashboard to create your store and upload your first products.',
  },
  {
    id: 'finish_store_onboarding',
    title: 'Finish Store Onboarding',
    category: 'Onboarding',
    description: 'Nudge sellers who started signing up but have not completed onboarding.',
    body: 'Hi {first_name}, you are almost live on Verndly! Finish setting up your store profile and delivery info at verndly.com/dashboard so buyers can start ordering from you.',
  },
  {
    id: 'setup_payout_momo',
    title: 'Add Payout / MoMo Details',
    category: 'Onboarding',
    description: 'Remind sellers to add Mobile Money or bank details for settlements.',
    body: 'Hi {first_name}, please add your Mobile Money or bank payout details at verndly.com/dashboard/settings so Verndly can settle your order payouts seamlessly.',
  },
  {
    id: 'upload_products_ai',
    title: 'Upload Products with Verndly AI',
    category: 'Onboarding',
    description: 'Encourage live stores to list inventory fast using AI photo/WhatsApp import.',
    body: 'Hi {first_name}, {store_name} is ready for orders! Drop your product photos or WhatsApp catalog at verndly.com/dashboard/products/add and let Verndly AI list them in seconds.',
  },
  {
    id: 'verification_needs_info',
    title: 'Verification Follow-Up',
    category: 'Verification',
    description: 'Ask a seller to update missing ID or store verification details.',
    body: 'Hi {first_name}, we reviewed your Verndly verification and need one quick update to approve your store. Check verndly.com/seller-verification or message us on WhatsApp: +233 53 406 5652.',
  },
  {
    id: 'pending_order_nudge',
    title: 'Pending Order Action Reminder',
    category: 'Operations',
    description: 'Alert a seller to confirm and fulfil a waiting customer order.',
    body: 'Hi {first_name}, you have a customer order waiting on Verndly. Please open verndly.com/dashboard/orders now to confirm and arrange delivery.',
  },
  {
    id: 'buyer_deals_promo',
    title: 'Marketplace Deals Announcement',
    category: 'Growth',
    description: 'Share curated deals and 3-day Paystack escrow trust message with shoppers.',
    body: 'Hi {first_name}, fresh deals just landed across verified Ghana stores on Verndly — every online order is protected by 3-day Paystack escrow. Shop now at verndly.com',
  },
  {
    id: 'support_checkin',
    title: 'Personal Support Check-In',
    category: 'Operations',
    description: 'Friendly check-in with direct Verndly WhatsApp support line.',
    body: 'Hi {first_name}, this is the Verndly team checking in! Need any help setting up your store or managing orders? Reach us anytime on WhatsApp at +233 53 406 5652.',
  },
];
