import { SUPPORT_CONTACT } from '@/lib/contact';

export interface SiteFaqEntry {
  question: string;
  answer: string;
  tags: string[];
  link?: { label: string; href: string };
}

/**
 * Single source of truth for /faq visible accordion AND FAQPage JSON-LD (T06).
 * Keep visible text and structured data generated strictly from this array so they never drift.
 */
export const SITE_FAQ_ITEMS: SiteFaqEntry[] = [
  {
    question: 'How do I create an account?',
    answer:
      'Tap Sign up in the top-right, fill in your name, phone, and email, then verify your inbox. You can shop right away.',
    tags: ['account'],
  },
  {
    question: 'How does Buyer Protection and Escrow work on Verndly?',
    answer:
      'Every purchase on Verndly is safeguarded by Paystack escrow. When you pay online via Paystack (MTN Mobile Money, Telecel Cash, AirtelTigo Money, card, or bank transfer), your payment is held securely in escrow and only released after delivery and our 7-day buyer protection window.',
    tags: ['escrow', 'buyer protection', 'safety'],
    link: { label: 'Read Buyer Protection', href: '/buyer-protection' },
  },
  {
    question: 'What payment methods are supported on Verndly?',
    answer:
      'Verndly checkout runs through Paystack, including MTN Mobile Money, Telecel Cash, AirtelTigo Money, Visa, Mastercard, and bank transfer. Orders are paid before dispatch. Verndly does not use cash on delivery.',
    tags: ['payment', 'momo', 'paystack'],
  },
  {
    question: 'How do independent sellers get verified on Verndly?',
    answer:
      'Sellers can verify with a valid Ghana Card and sales proof, an active Instagram or TikTok store link, or a short manual review with our Accra team. Registered businesses may also submit ORC documents. Reviews typically complete within 24–48 hours before the Verified Merchant badge is awarded.',
    tags: ['seller', 'verification'],
    link: { label: 'Sell on Verndly', href: '/sell' },
  },
  {
    question: "What is Verndly's 7-Day Return and Refund Policy?",
    answer:
      'Buyers have 7 calendar days from delivery confirmation to request a return or replacement if an item arrives damaged, defective, incomplete, or materially different from the seller listing. Approved claims are refunded directly to the buyer via Paystack gateway reversal.',
    tags: ['returns', 'refunds'],
    link: { label: 'Returns & Refunds Policy', href: '/returns' },
  },
  {
    question: 'How long does courier delivery take in Ghana?',
    answer:
      "Each seller publishes their dispatch window on their storefront — typically same-day, next-day, or 2–3 business days depending on the item and delivery zone. Check the seller's storefront for their exact schedule.",
    tags: ['delivery', 'shipping'],
    link: { label: 'Shipping & Delivery', href: '/shipping' },
  },
  {
    question: 'How does Verndly Pro work for sellers?',
    answer:
      'Verndly Pro is an optional merchant subscription (GH₵57/month, billed via Paystack) that includes featured placement, a downloadable storefront QR code, and stock alerts. Manage your subscription anytime from Dashboard → Settings.',
    tags: ['seller', 'pro'],
    link: { label: 'Seller Settings', href: '/dashboard/settings' },
  },
  {
    question: 'Is my data safe?',
    answer:
      'Yes. Payments are processed directly by Paystack — Verndly never sees or stores your full card details.',
    tags: ['privacy', 'security'],
    link: { label: 'Privacy Policy', href: '/privacy' },
  },
  {
    question: 'How do I contact support?',
    answer: `Email ${SUPPORT_CONTACT.email}, WhatsApp or call ${SUPPORT_CONTACT.phoneDisplay} (${SUPPORT_CONTACT.hours}), or send a message through our contact page.`,
    tags: ['support', 'contact'],
    link: { label: 'Contact Us', href: '/contact' },
  },
];
