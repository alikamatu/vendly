import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowRight, ShieldCheck, Store } from 'lucide-react';
import Header from '@/components/layout/Header';
import { buildMetadata } from '@/lib/seo';
import BreadcrumbJsonLd from '@/components/seo/BreadcrumbJsonLd';
import ItemListJsonLd from '@/components/seo/ItemListJsonLd';
import FaqJsonLd from '@/components/seo/FaqJsonLd';
import {
  CATEGORY_PROFILES,
  getCategoryProfileBySlug,
  slugifyCategory,
} from '@/lib/content/categories';
import { fetchBrowseProductsServer, fetchCategoriesServer } from '@/lib/server-api';

export function generateStaticParams() {
  return CATEGORY_PROFILES.map((c) => ({ slug: c.slug }));
}

function titleFromSlug(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const profile = getCategoryProfileBySlug(slug);
  const label = profile?.name || titleFromSlug(slug);

  return buildMetadata({
    title: profile?.metaTitle || `${label} from Verified Stores in Ghana`,
    description:
      profile?.metaDescription ||
      `Shop verified ${label} products from trusted independent Ghanaian businesses on Verndly. Protected by 7-day Paystack escrow and tracked nationwide delivery.`,
    path: `/categories/${slug}`,
    keywords: profile?.keywords || [
      `${label.toLowerCase()} ghana`,
      `buy ${label.toLowerCase()} online ghana`,
      'verified stores ghana',
      'verndly',
    ],
  });
}

export default async function CategoryDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const profile = getCategoryProfileBySlug(slug);
  const apiCategories =
    await fetchCategoriesServer<Array<{ name: string; description?: string }>>();

  const matchedApiCat = apiCategories.find((c) => slugifyCategory(c.name) === slug.toLowerCase());
  const queryCategoryName = profile?.apiName || matchedApiCat?.name || titleFromSlug(slug);
  const displayName = profile?.name || matchedApiCat?.name || titleFromSlug(slug);

  const { data: products } = await fetchBrowseProductsServer({
    category: queryCategoryName,
    limit: 24,
  });

  const headline = profile?.headline || `${displayName} from verified independent Ghanaian stores.`;
  const subheadline =
    profile?.subheadline ||
    matchedApiCat?.description ||
    `Discover authentic ${displayName.toLowerCase()} listings from identity-verified Ghanaian merchants — every order protected by 7-day Paystack escrow.`;

  const editorialCopy = profile?.editorialCopy || [
    `Every ${displayName.toLowerCase()} merchant on Verndly passes manual verification before listing products. When you pay with MTN Mobile Money, Telecel Cash, AirtelTigo Money, or card, Paystack holds your funds safely in escrow until delivery is confirmed and your 7-day inspection window passes.`,
    `Explore verified storefronts based in Greater Accra and across Ghana with seller-configured delivery rates, store pickup where offered, and zero hidden rider fees.`,
  ];

  const highlights = profile?.buyerHighlights || [
    {
      title: 'Verified Ghanaian merchants',
      detail: 'Every seller passes identity and storefront checks before going live.',
    },
    {
      title: '7-day Paystack escrow',
      detail:
        'Inspect your order for 7 calendar days after delivery with direct MoMo/card refund protection.',
    },
    {
      title: 'Nationwide delivery or free pickup',
      detail:
        'Same-day express in major cities, 24–48h inter-regional shipping, or GH₵ 0 store pickup.',
    },
  ];

  const faqs = profile?.faqs || [
    {
      question: `Is it safe to buy ${displayName.toLowerCase()} online in Ghana on Verndly?`,
      answer:
        'Yes. Every payment runs through Paystack custodial escrow and includes a 7-Day Buyer Protection Guarantee covering damaged, defective, wrong, or undelivered orders.',
    },
  ];

  const otherCategories = CATEGORY_PROFILES.filter((c) => c.slug !== slug).slice(0, 6);

  return (
    <div className="bg-background text-foreground min-h-screen">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', path: '/' },
          { name: 'Categories', path: '/categories' },
          { name: displayName, path: `/categories/${slug}` },
        ]}
      />
      {products.length > 0 && (
        <ItemListJsonLd
          name={`${displayName} on Verndly`}
          description={subheadline}
          items={products.map((p: any) => ({
            id: String(p.id),
            name: p.title,
            url: `/product/${p.id}`,
            image: p.image_urls?.[0] || null,
            price: p.price,
            currency: p.currency || 'GHS',
            description: p.description,
          }))}
        />
      )}
      <FaqJsonLd items={faqs} />

      <Header />

      <main className="mx-auto max-w-6xl space-y-20 px-4 pb-28 pt-14 md:px-8 md:pt-20">
        {/* Category Hero */}
        <header className="max-w-4xl space-y-6">
          <nav aria-label="Breadcrumb" className="text-muted flex items-center gap-2 text-xs">
            <Link href="/" className="hover:text-foreground transition-colors">
              Home
            </Link>
            <span>/</span>
            <Link href="/categories" className="hover:text-foreground transition-colors">
              Categories
            </Link>
            <span>/</span>
            <span className="text-foreground">{displayName}</span>
          </nav>

          <h1 className="text-3xl font-medium leading-[1.08] tracking-tight sm:text-4xl md:text-5xl">
            {headline}
          </h1>

          <p className="text-muted max-w-2xl text-base leading-relaxed md:text-lg">{subheadline}</p>

          <div className="flex flex-wrap gap-3 pt-1">
            <Link
              href={`/products?category=${encodeURIComponent(queryCategoryName)}`}
              className="bg-foreground text-background inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-xs font-medium transition-opacity hover:opacity-90"
            >
              Filter all {displayName}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/buyer-protection"
              className="bg-surface text-foreground hover:bg-foreground/[0.06] inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-xs font-medium transition-colors"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              7-Day Escrow Guarantee
            </Link>
          </div>
        </header>

        {/* Highlights Strip */}
        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {highlights.map((item) => (
            <div key={item.title} className="bg-surface space-y-2 rounded-3xl p-6">
              <h2 className="text-foreground text-sm font-medium">{item.title}</h2>
              <p className="text-muted text-xs leading-relaxed">{item.detail}</p>
            </div>
          ))}
        </section>

        {/* Live SSR Product Listings */}
        <section className="space-y-6">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="text-muted font-mono text-[11px] uppercase tracking-wider">
                Verified Catalog
              </p>
              <h2 className="mt-1 text-2xl font-medium tracking-tight">
                {products.length > 0
                  ? `${products.length} ${displayName} listings ready to ship`
                  : `Featured ${displayName} on Verndly`}
              </h2>
            </div>
            <Link
              href={`/products?category=${encodeURIComponent(queryCategoryName)}`}
              className="text-muted hover:text-foreground inline-flex items-center gap-1 text-xs font-medium transition-colors"
            >
              Open full filter view
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {products.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {products.map((product: any) => {
                const img = product.image_urls?.[0] || '/placeholder-product.png';
                const priceNum = Number(product.price || 0);
                return (
                  <Link
                    key={product.id}
                    href={`/product/${product.id}`}
                    className="bg-surface group flex flex-col overflow-hidden rounded-3xl transition-opacity hover:opacity-95"
                  >
                    <div className="bg-foreground/[0.04] aspect-[4/5] w-full overflow-hidden">
                      <img
                        src={img}
                        alt={product.title}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                    </div>
                    <div className="flex flex-1 flex-col justify-between space-y-1.5 p-4">
                      <div className="space-y-1">
                        <h3 className="text-foreground line-clamp-2 text-sm font-medium leading-snug">
                          {product.title}
                        </h3>
                        {product.seller?.store_name && (
                          <p className="text-muted truncate text-[11px]">
                            {product.seller.store_name}
                          </p>
                        )}
                      </div>
                      <p className="text-foreground pt-1 text-sm font-medium tabular-nums">
                        GH₵ {priceNum.toLocaleString('en-GH', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="bg-surface flex flex-col justify-between gap-6 rounded-3xl p-10 md:flex-row md:items-center md:p-12">
              <div className="max-w-lg space-y-2">
                <h3 className="text-foreground text-lg font-medium">
                  Browse the live marketplace or sell your {displayName.toLowerCase()} here.
                </h3>
                <p className="text-muted text-sm leading-relaxed">
                  Explore all active verified products across Ghana, or open your own verified{' '}
                  {displayName.toLowerCase()} store at a flat 4% fee.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/products"
                  className="bg-foreground text-background inline-flex items-center gap-2 rounded-full px-6 py-3 text-xs font-medium"
                >
                  Browse all products
                </Link>
                <Link
                  href="/sell"
                  className="bg-background text-foreground inline-flex items-center gap-2 rounded-full px-6 py-3 text-xs font-medium"
                >
                  <Store className="h-3.5 w-3.5" />
                  Sell {displayName}
                </Link>
              </div>
            </div>
          )}
        </section>

        {/* Rich Indexable Editorial Copy */}
        <section className="bg-surface max-w-4xl space-y-6 rounded-3xl p-8 md:p-12">
          <p className="text-muted font-mono text-[11px] uppercase tracking-wider">
            About {displayName} on Verndly
          </p>
          <div className="text-foreground/85 space-y-4 text-sm leading-[1.75] md:text-[15px]">
            {editorialCopy.map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>
          {profile?.relatedGuideSlug && (
            <div className="pt-2">
              <Link
                href={`/blog/${profile.relatedGuideSlug}`}
                className="text-foreground inline-flex items-center gap-2 text-xs font-medium transition-colors hover:text-[var(--color-accent)]"
              >
                Read the related Verndly guide
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </section>

        {/* Category FAQs */}
        {faqs.length > 0 && (
          <section className="space-y-6">
            <h2 className="text-2xl font-medium tracking-tight">{displayName} shopping FAQs</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {faqs.map((faq) => (
                <article key={faq.question} className="bg-surface space-y-2 rounded-3xl p-6">
                  <h3 className="text-foreground text-sm font-medium">{faq.question}</h3>
                  <p className="text-muted text-xs leading-relaxed sm:text-sm">{faq.answer}</p>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* Explore Other Categories */}
        <section className="space-y-5">
          <h2 className="text-xl font-medium tracking-tight">Explore more categories</h2>
          <div className="flex flex-wrap gap-2.5">
            {otherCategories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/categories/${cat.slug}`}
                className="bg-surface text-foreground hover:bg-foreground hover:text-background rounded-full px-5 py-2.5 text-xs font-medium transition-colors"
              >
                {cat.name}
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
