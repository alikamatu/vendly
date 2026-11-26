import AiNativeHomepage, { type HomepageFaqEntry } from '@/components/homepage/AiNativeHomepage';
import { buildMetadata, SITE_URL } from '@/lib/seo';
import BreadcrumbJsonLd from '@/components/seo/BreadcrumbJsonLd';
import FaqJsonLd from '@/components/seo/FaqJsonLd';
import ItemListJsonLd from '@/components/seo/ItemListJsonLd';
import JsonLd from '@/components/seo/JsonLd';
import {
  fetchCategoriesServer,
  fetchHomeProductsServer,
  fetchTopProVendorsServer,
} from '@/lib/server-api';
import { filterRailProducts } from '@/lib/product-visibility';
import { getProductPath } from '@/lib/product-slug';

export const metadata = buildMetadata({
  title: 'Verndly — Ghana’s AI-Native Marketplace for Verified Stores',
  description:
    'Shop verified independent stores in Ghana with Verndly AI, or launch your online storefront in seconds from product photos, a website URL, or WhatsApp screenshots. Protected by 3-day Paystack escrow.',
  path: '/homepage',
  keywords: [
    'Verndly',
    'Verndly AI',
    'AI marketplace Ghana',
    'online shopping Ghana',
    'verified stores Accra',
    'Paystack escrow marketplace',
    'import WhatsApp catalog Ghana',
    'sell online Ghana free storefront',
    'Mobile Money online shopping Ghana',
  ],
});

const HOMEPAGE_FAQS: HomepageFaqEntry[] = [
  {
    question: 'What makes Verndly an AI-native marketplace?',
    answer:
      'Verndly embeds Verndly AI into both shopping and selling. Buyers can describe what they want, their occasion, or their GH₵ budget in plain English to find in-stock items from verified Ghanaian stores. Sellers can upload raw photos, paste their existing website URL, or drop WhatsApp Business catalog screenshots to generate complete product listings automatically.',
  },
  {
    question: 'How does 3-day Paystack escrow protect buyers and sellers in Ghana?',
    answer:
      'When a buyer pays with MTN Mobile Money, Telecel Cash, AirtelTigo Money, or a bank card, Paystack verifies and holds the payment in escrow. Sellers know the funds are genuinely secured before dispatching a rider, and buyers have up to 3 days after delivery to inspect their item before payout settles.',
  },
  {
    question: 'Can I import my existing website or WhatsApp Business catalog into Verndly?',
    answer:
      'Yes. Verndly supports one-click imports from Shopify, WooCommerce, Jumia, custom storefronts, WhatsApp product links (wa.me/p/...), Meta Commerce CSVs, and WhatsApp catalog screenshots — automatically cropping product photos, matching Verndly categories, and saving images to fast CDN storage.',
  },
  {
    question: 'How much does it cost to open a verified storefront on Verndly?',
    answer:
      'Opening a verified storefront on Verndly costs GH₵ 0 with zero monthly rent or subscription required. Every approved merchant receives a dedicated verndly.com/s/yourstore link, QR code sharing, Verndly AI listing tools, and escrow-protected checkout.',
  },
];

interface RawProductRecord {
  id?: string | number;
  slug?: string;
  title?: string;
  price?: number | string;
  original_price?: number | string | null;
  currency?: string;
  category?: string;
  image_urls?: string[];
  seller?: {
    store_name?: string;
    store_link?: string;
  } | null;
}

interface RawCategoryRecord {
  id?: string | number;
  name?: string;
}

interface RawVendorRecord {
  id?: string | number;
  store_name?: string;
  store_link?: string;
  logo_url?: string | null;
  bio?: string | null;
}

export default async function AiHomepageRoute() {
  const [rawProducts, rawCategories, rawTopVendors] = await Promise.all([
    fetchHomeProductsServer(24),
    fetchCategoriesServer(),
    fetchTopProVendorsServer(8),
  ]);

  const inStockProducts = filterRailProducts(rawProducts) as RawProductRecord[];
  const featuredProducts = inStockProducts.slice(0, 8).map((p) => ({
    id: String(p.id ?? ''),
    slug: p.slug,
    title: String(p.title || ''),
    price: p.price ?? 0,
    original_price: p.original_price ?? null,
    currency: p.currency || 'GHS',
    category: String(p.category || 'General'),
    image_urls: Array.isArray(p.image_urls) ? p.image_urls : [],
    seller: p.seller
      ? {
          store_name: p.seller.store_name,
          store_link: p.seller.store_link,
        }
      : null,
  }));

  const categories = Array.isArray(rawCategories)
    ? (rawCategories as RawCategoryRecord[])
        .filter((c) => Boolean(c?.id && c?.name))
        .map((c) => ({ id: String(c.id), name: String(c.name) }))
    : [];

  const topVendors = Array.isArray(rawTopVendors)
    ? (rawTopVendors as RawVendorRecord[])
        .filter((v) => Boolean(v?.store_name && v?.store_link))
        .map((v) => ({
          id: String(v.id || v.store_link),
          store_name: String(v.store_name),
          store_link: String(v.store_link),
          logo_url: v.logo_url || null,
          bio: v.bio || null,
        }))
    : [];

  const platformApplicationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Verndly',
    url: `${SITE_URL}/homepage`,
    applicationCategory: 'ShoppingApplication',
    operatingSystem: 'Web, iOS, Android',
    description:
      'AI-native e-commerce marketplace in Ghana connecting shoppers with identity-verified stores under 3-day Paystack escrow protection.',
    areaServed: {
      '@type': 'Country',
      name: 'Ghana',
    },
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'GHS',
      description: 'Free verified storefront setup and AI-assisted shopping.',
    },
    featureList: [
      'Verndly AI conversational product search in GH₵',
      'AI photo-to-listing bulk studio (up to 20 photos)',
      'One-click Website & WhatsApp Business catalog importer',
      '3-day Paystack escrow for MTN Mobile Money, Telecel Cash, AirtelTigo Money, and cards',
    ],
  };

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: 'Verndly', path: '/' },
          { name: 'AI-Native Homepage', path: '/homepage' },
        ]}
      />
      <JsonLd data={platformApplicationJsonLd} />
      <FaqJsonLd items={HOMEPAGE_FAQS} />
      {featuredProducts.length > 0 && (
        <ItemListJsonLd
          name="Verified Products on Verndly AI Marketplace"
          description="In-stock products from verified Ghanaian entrepreneurs on Verndly."
          items={featuredProducts.map((p) => ({
            id: p.id,
            name: p.title,
            url: getProductPath(p),
            image: p.image_urls[0] || null,
            price: p.price,
            currency: p.currency || 'GHS',
          }))}
        />
      )}

      <AiNativeHomepage
        featuredProducts={featuredProducts}
        categories={categories}
        topVendors={topVendors}
        faqs={HOMEPAGE_FAQS}
      />
    </>
  );
}
