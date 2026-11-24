import React from 'react';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import Header from '@/components/layout/Header';
import { buildMetadata, SITE_URL } from '@/lib/seo';
import BreadcrumbJsonLd from '@/components/seo/BreadcrumbJsonLd';
import JsonLd from '@/components/seo/JsonLd';
import { ALL_BLOG_POSTS } from '@/lib/content/blog-posts';
import BlogIndexClient from '@/components/editorial/BlogIndexClient';

export const metadata = buildMetadata({
  title: 'Verndly Journal — Ghana Marketplace Guides, Fee Comparisons & Escrow Safety',
  description:
    'Clear, research-backed guides for Ghanaian online buyers and independent sellers: marketplace fee math, avoiding MoMo scams, how Paystack escrow works, and growing a verified store.',
  path: '/blog',
  keywords: [
    'verndly blog',
    'online shopping guide ghana',
    'sell online ghana guide',
    'marketplace fees ghana',
    'avoid momo scams ghana',
  ],
});

export default function BlogPage() {
  const spotlight = ALL_BLOG_POSTS.slice(0, 2);

  return (
    <div className="bg-background text-foreground min-h-screen">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', path: '/' },
          { name: 'Blog & Guides', path: '/blog' },
        ]}
      />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Blog',
          name: 'Verndly Journal & Commerce Guides',
          description:
            'Guides for Ghanaian shoppers and independent sellers on marketplace fees, Paystack escrow, scam prevention, and verified commerce.',
          url: `${SITE_URL}/blog`,
          blogPost: ALL_BLOG_POSTS.map((post) => ({
            '@type': 'BlogPosting',
            headline: post.title,
            description: post.metaDescription,
            url: `${SITE_URL}/blog/${post.slug}`,
            datePublished: post.publishedAt,
            dateModified: post.updatedAt,
          })),
        }}
      />

      <Header />

      <main className="mx-auto max-w-6xl space-y-20 px-4 pb-28 pt-16 md:space-y-24 md:px-8 md:pt-24">
        {/* Hero */}
        <header className="max-w-3xl space-y-6">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--color-accent)]">
            Verndly Journal
          </p>
          <h1 className="text-4xl font-medium leading-[1.06] tracking-tight sm:text-5xl md:text-6xl">
            Clear answers on buying and selling online in Ghana.
          </h1>
          <p className="text-muted text-base leading-relaxed md:text-lg">
            Real cedi fee math, scam prevention backed by Ghana&apos;s Cyber Security Authority
            advisories, and plain-English guides to Paystack escrow for independent entrepreneurs
            and shoppers.
          </p>
        </header>

        {/* Featured Spotlights (#1 & #2) */}
        <section aria-label="Featured guides" className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {spotlight.map((post, idx) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className={`group flex flex-col justify-between gap-10 rounded-3xl p-8 transition-opacity hover:opacity-95 md:p-10 ${
                idx === 0 ? 'bg-foreground text-background' : 'bg-surface text-foreground'
              }`}
            >
              <div className="space-y-5">
                <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-wider opacity-70">
                  <span>{post.eyebrow}</span>
                  <span>{post.readingTime}</span>
                </div>

                <h2 className="text-2xl font-medium leading-snug tracking-tight md:text-3xl">
                  {post.title}
                </h2>

                <p className="text-sm leading-relaxed opacity-75">{post.summary}</p>
              </div>

              <div className="flex items-center justify-between text-xs font-medium">
                <span>{idx === 0 ? 'Open guide + fee calculator' : 'Read safety guide'}</span>
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </div>
            </Link>
          ))}
        </section>

        {/* All Guides Interactive Index */}
        <section className="space-y-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-medium tracking-tight">All guides &amp; comparisons</h2>
            <p className="text-muted text-sm">
              {ALL_BLOG_POSTS.length} research-backed articles answering the real questions Ghanaian
              buyers and sellers ask.
            </p>
          </div>
          <BlogIndexClient posts={ALL_BLOG_POSTS} />
        </section>

        {/* Bottom quick links to core landing pages */}
        <section className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="bg-surface space-y-4 rounded-3xl p-8">
            <p className="font-mono text-[11px] uppercase tracking-wider text-[var(--color-accent)]">
              For Sellers
            </p>
            <h3 className="text-2xl font-medium tracking-tight">Sell on Verndly at 4% flat.</h3>
            <p className="text-muted text-sm leading-relaxed">
              Verified store badge, Paystack processing included, and protection from fake MoMo
              screenshots and POD no-shows.
            </p>
            <Link
              href="/sell"
              className="text-foreground inline-flex items-center gap-2 pt-1 text-xs font-medium transition-colors hover:text-[var(--color-accent)]"
            >
              Explore Sell on Verndly
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="bg-surface space-y-4 rounded-3xl p-8">
            <p className="font-mono text-[11px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              For Buyers
            </p>
            <h3 className="text-2xl font-medium tracking-tight">7-Day Buyer Protection.</h3>
            <p className="text-muted text-sm leading-relaxed">
              Every online checkout is held safely in Paystack escrow until you receive and inspect
              your item.
            </p>
            <Link
              href="/buyer-protection"
              className="text-foreground inline-flex items-center gap-2 pt-1 text-xs font-medium transition-colors hover:text-[var(--color-accent)]"
            >
              See how escrow protects you
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
