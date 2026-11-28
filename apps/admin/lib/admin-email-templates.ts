/**
 * Admin reminder emails. Copy follows the same voice as the transactional
 * Verndly emails (approved, rejected, deletion reminder) — not seller-dashboard notes.
 */

export type EmailTemplateCategory = 'Verification' | 'Onboarding' | 'Operations' | 'Growth';

export interface AdminEmailTemplate {
  id: string;
  title: string;
  category: EmailTemplateCategory;
  description: string;
  subject: string;
  preheader: string;
  eyebrow: string;
  statusLabel: string;
  statusVariant: 'success' | 'pending' | 'warning' | 'error' | 'info';
  headline: string;
  paragraphs: string[];
  ctaLabel: string;
  ctaPath: string;
}

export const ADMIN_EMAIL_TEMPLATES: AdminEmailTemplate[] = [
  {
    id: 'approved_create_store',
    title: 'Approved — create your store',
    category: 'Verification',
    description: 'Tell an approved seller to open their store and list products.',
    subject: "You're approved to sell on Verndly",
    preheader: 'Your verification is approved. Create your store next.',
    eyebrow: 'Verification approved',
    statusLabel: 'Approved',
    statusVariant: 'success',
    headline: "You're approved, {first_name}.",
    paragraphs: [
      'Your Verndly seller verification is approved.',
      'Create your store, add a logo, and list your first products so buyers can find you. Online payments stay in Paystack escrow until delivery and the 3-day inspection window.',
    ],
    ctaLabel: 'Create your store',
    ctaPath: '/create-store',
  },
  {
    id: 'reminder_finish_store',
    title: 'Reminder — finish your store',
    category: 'Onboarding',
    description: 'Nudge someone who was approved or started signup but has no finished store.',
    subject: 'Reminder: finish creating your Verndly store',
    preheader: 'Your store is still waiting.',
    eyebrow: 'Store setup',
    statusLabel: 'Reminder',
    statusVariant: 'pending',
    headline: 'Your store is still waiting, {first_name}.',
    paragraphs: [
      'You are approved to sell on Verndly, and your store is not finished yet.',
      'Add your store name, location, and delivery details. Buyers only see a store once that setup is complete.',
    ],
    ctaLabel: 'Finish your store',
    ctaPath: '/dashboard/settings/store',
  },
  {
    id: 'reminder_payout',
    title: 'Reminder — add payout details',
    category: 'Onboarding',
    description: 'Ask a seller to add Mobile Money or a bank account before the first payout.',
    subject: 'Reminder: add your payout details on Verndly',
    preheader: 'We cannot settle orders until payout details are saved.',
    eyebrow: 'Payouts',
    statusLabel: 'Action needed',
    statusVariant: 'warning',
    headline: 'Add where we should send your money, {first_name}.',
    paragraphs: [
      '{store_name} can take orders, but payouts cannot leave Verndly until a Mobile Money number or bank account is saved.',
      'Open payout settings and add the account that should receive settlements.',
    ],
    ctaLabel: 'Add payout details',
    ctaPath: '/dashboard/settings',
  },
  {
    id: 'reminder_first_products',
    title: 'Reminder — list your products',
    category: 'Onboarding',
    description: 'Remind a live store that has not listed inventory.',
    subject: 'Reminder: list your first products on Verndly',
    preheader: 'Buyers cannot order from an empty store.',
    eyebrow: 'Your catalog',
    statusLabel: 'Reminder',
    statusVariant: 'info',
    headline: '{store_name} is ready for products.',
    paragraphs: [
      'Hi {first_name}, your store is set up and still has nothing for buyers to purchase.',
      'Upload photos, or drop a website or WhatsApp catalog, and Verndly will turn them into listings. The first three products are what make a store look open.',
    ],
    ctaLabel: 'Add products',
    ctaPath: '/dashboard/products/add',
  },
  {
    id: 'verification_follow_up',
    title: 'Verification needs another look',
    category: 'Verification',
    description: 'Ask the applicant to update ID or store proof.',
    subject: 'Your Verndly seller application needs another look',
    preheader: 'We need one update before we can approve your store.',
    eyebrow: 'Verification update',
    statusLabel: 'Needs update',
    statusVariant: 'warning',
    headline: 'We need a bit more from you, {first_name}.',
    paragraphs: [
      'Thanks for applying to sell on Verndly. We reviewed the application and cannot approve it until the missing details are updated.',
      'Open verification, replace the document or store proof, and send it again. A complete application is reviewed within 24–48 hours.',
    ],
    ctaLabel: 'Update your application',
    ctaPath: '/seller-verification',
  },
  {
    id: 'reminder_open_order',
    title: 'Reminder — an order is waiting',
    category: 'Operations',
    description: 'Tell a seller to confirm and dispatch a waiting order.',
    subject: 'Reminder: a Verndly order is waiting on you',
    preheader: 'A buyer has paid. Confirm the order and arrange delivery.',
    eyebrow: 'Open order',
    statusLabel: 'Action needed',
    statusVariant: 'warning',
    headline: '{first_name}, a paid order is waiting.',
    paragraphs: [
      'A buyer paid on Verndly and the order is still sitting with {store_name}.',
      'Open the order, confirm it, and arrange delivery. The payment stays in Paystack escrow until the buyer receives it and the 3-day inspection window passes.',
    ],
    ctaLabel: 'Open orders',
    ctaPath: '/dashboard/orders',
  },
  {
    id: 'buyer_shop_safely',
    title: 'Shop with 3-day escrow',
    category: 'Growth',
    description: 'Invite a buyer back to verified stores.',
    subject: 'Shop verified Ghana stores on Verndly',
    preheader: 'Mobile Money and card payments stay in escrow for 3 days after delivery.',
    eyebrow: 'For buyers',
    statusLabel: 'Verndly',
    statusVariant: 'info',
    headline: '{first_name}, your next order can stay protected.',
    paragraphs: [
      'Verified independent stores on Verndly take MTN Mobile Money, Telecel Cash, AirtelTigo Money, and cards.',
      'Paystack holds the payment until delivery, and you have 3 days to inspect the item before the seller is paid.',
    ],
    ctaLabel: 'Start shopping',
    ctaPath: '/products',
  },
];

export function previewEmail(
  template: Pick<AdminEmailTemplate, 'headline' | 'paragraphs' | 'subject'>,
  sample: { name?: string | null; storeName?: string | null },
) {
  const fullName = (sample.name || 'Kwame Mensah').trim();
  const firstName = fullName.split(/\s+/)[0] || 'Kwame';
  const storeName = sample.storeName?.trim() || 'your Verndly store';
  const fill = (value: string) =>
    value
      .replace(/\{first_name\}/gi, firstName)
      .replace(/\{name\}/gi, fullName)
      .replace(/\{store_name\}/gi, storeName);
  return {
    subject: fill(template.subject),
    headline: fill(template.headline),
    paragraphs: template.paragraphs.map(fill),
  };
}
