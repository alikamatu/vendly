import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';
import FaqJsonLd from '@/components/seo/FaqJsonLd';
import BreadcrumbJsonLd from '@/components/seo/BreadcrumbJsonLd';
import { SITE_FAQ_ITEMS } from '@/lib/content/faq';

export const metadata: Metadata = buildMetadata({
  title: 'Frequently Asked Questions (FAQ) — Buyer Protection & Shopping Guide',
  description:
    'Find answers to frequently asked questions about shopping, Paystack escrow payments, 3-day buyer protection, returns, delivery, and seller verification on Verndly.',
  path: '/faq',
  keywords: [
    'Verndly FAQ',
    'buyer protection Ghana',
    'Paystack escrow Ghana',
    'how to buy on Verndly',
    'returns policy Ghana',
    'seller verification',
  ],
});

export default function FaqLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', path: '/' },
          { name: 'FAQ', path: '/faq' },
        ]}
      />
      <FaqJsonLd
        items={SITE_FAQ_ITEMS.map((item) => ({
          question: item.question,
          answer: item.answer,
        }))}
      />
      {children}
    </>
  );
}
