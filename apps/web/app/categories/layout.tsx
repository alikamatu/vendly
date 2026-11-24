import type { Metadata } from 'next';
import { buildMetadata, SITE_URL } from '@/lib/seo';
import BreadcrumbJsonLd from '@/components/seo/BreadcrumbJsonLd';
import JsonLd from '@/components/seo/JsonLd';

export const metadata: Metadata = buildMetadata({
  title: 'Browse Categories — Shop Verified Sellers in Accra',
  description:
    'Browse stocked product categories from verified independent sellers in Accra on Verndly, backed by 7-day Paystack escrow.',
  path: '/categories',
  keywords: [
    'categories Accra',
    'categories Ghana',
    'independent stores Accra',
    'online shopping categories Ghana',
  ],
});

export default function CategoriesLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', path: '/' },
          { name: 'Categories', path: '/categories' },
        ]}
      />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: 'Verndly Categories',
          description: 'Browse categories from verified independent sellers in Accra on Verndly.',
          url: `${SITE_URL}/categories`,
        }}
      />
      {children}
    </>
  );
}
