import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';
import BreadcrumbJsonLd from '@/components/seo/BreadcrumbJsonLd';

export const metadata: Metadata = buildMetadata({
  title: 'Contact Us — Support & Inquiries',
  description:
    'Reach Verndly support in Accra, Ghana via email, phone, or WhatsApp (+233 53 406 5652). We respond to buyer and seller inquiries within 24 hours.',
  path: '/contact',
  keywords: ['contact verndly', 'verndly support ghana', 'verndly whatsapp'],
});

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', path: '/' },
          { name: 'Contact', path: '/contact' },
        ]}
      />
      {children}
    </>
  );
}
