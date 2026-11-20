import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ArrowLeft, ArrowRight, ArrowUpRight, Check } from 'lucide-react';
import Header from '@/components/layout/Header';
import { buildMetadata } from '@/lib/seo';
import ArticleJsonLd from '@/components/seo/ArticleJsonLd';
import BreadcrumbJsonLd from '@/components/seo/BreadcrumbJsonLd';
import FaqJsonLd from '@/components/seo/FaqJsonLd';
import FeeCalculator from '@/components/editorial/FeeCalculator';
import {
  EscrowFlowSvg,
  FeeSplitSvg,
  GhanaDeliveryNetworkSvg,
} from '@/components/editorial/VisualDiagrams';
import { ALL_BLOG_POSTS, getBlogPostBySlug, getRelatedBlogPosts } from '@/lib/content/blog-posts';

export function generateStaticParams() {
  return ALL_BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPostBySlug(slug);

  if (!post) {
    return buildMetadata({
      title: 'Article not found',
      description: 'The requested guide could not be found on Verndly.',
      path: `/blog/${slug}`,
      noindex: true,
    });
  }

  return buildMetadata({
    title: post.metaTitle,
    description: post.metaDescription,
    path: `/blog/${post.slug}`,
    type: 'article',
    keywords: post.keywords,
  });
}

function renderVisual(visual?: 'escrow-flow' | 'fee-split' | 'delivery-network') {
  if (visual === 'escrow-flow') return <EscrowFlowSvg />;
  if (visual === 'fee-split') return <FeeSplitSvg />;
  if (visual === 'delivery-network') return <GhanaDeliveryNetworkSvg />;
  return null;
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getBlogPostBySlug(slug);
  if (!post) notFound();

  const related = getRelatedBlogPosts(post);

  return (
    <div className="bg-background text-foreground min-h-screen">
      <ArticleJsonLd
        title={post.title}
        description={post.metaDescription}
        path={`/blog/${post.slug}`}
        publishedAt={post.publishedAt}
        updatedAt={post.updatedAt}
        section={post.eyebrow}
        keywords={post.keywords}
      />
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', path: '/' },
          { name: 'Blog', path: '/blog' },
          { name: post.shortTitle, path: `/blog/${post.slug}` },
        ]}
      />
      <FaqJsonLd items={post.faqs} />

      <Header />

      <main className="mx-auto max-w-6xl px-4 pb-28 pt-12 md:px-8 md:pt-20">
        {/* Back link */}
        <div className="mb-10">
          <Link
            href="/blog"
            className="bg-surface text-muted hover:text-foreground inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            All guides
          </Link>
        </div>

        {/* Article Header */}
        <header className="mb-14 max-w-3xl space-y-6">
          <div className="text-muted flex flex-wrap items-center gap-3 font-mono text-[11px] uppercase tracking-[0.12em]">
            <span className="text-[var(--color-accent)]">{post.eyebrow}</span>
            <span>·</span>
            <span>{post.audience}</span>
            <span>·</span>
            <span>{post.readingTime}</span>
            <span>·</span>
            <span>Updated {post.updatedAt}</span>
          </div>

          <h1 className="text-foreground text-3xl font-medium leading-[1.08] tracking-tight sm:text-4xl md:text-5xl">
            {post.title}
          </h1>

          <p className="text-muted text-base leading-relaxed md:text-lg">{post.summary}</p>
        </header>

        {/* Key Takeaways Card */}
        <section
          aria-label="Key takeaways"
          className="bg-surface mb-14 max-w-4xl space-y-4 rounded-3xl p-7 md:p-9"
        >
          <p className="text-muted font-mono text-[11px] uppercase tracking-[0.14em]">
            Key Takeaways
          </p>
          <ul className="space-y-3">
            {post.keyTakeaways.map((point) => (
              <li
                key={point}
                className="text-foreground/90 flex items-start gap-3 text-sm leading-relaxed"
              >
                <span className="bg-foreground text-background mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full">
                  <Check className="h-2.5 w-2.5" />
                </span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Optional Hero Visual */}
        {post.heroVisual && <div className="mb-16 max-w-4xl">{renderVisual(post.heroVisual)}</div>}

        {/* Interactive Fee Calculator (for #1 & #11) */}
        {post.includeFeeCalculator && (
          <div className="mb-16 max-w-4xl">
            <FeeCalculator compact />
          </div>
        )}

        {/* Body + Sticky Outline Grid */}
        <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-[1fr_240px] lg:gap-16">
          <article className="min-w-0 max-w-3xl space-y-16">
            {post.sections.map((section) => (
              <section key={section.id} id={section.id} className="scroll-mt-24 space-y-5">
                <h2 className="text-foreground text-2xl font-medium tracking-tight md:text-3xl">
                  {section.heading}
                </h2>

                <div className="text-foreground/85 space-y-4 text-[15px] leading-[1.75] md:text-base">
                  {section.paragraphs.map((p, idx) => (
                    <p key={idx}>{p}</p>
                  ))}
                </div>

                {section.bullets && section.bullets.length > 0 && (
                  <ul className="space-y-3 pt-2">
                    {section.bullets.map((b) => (
                      <li key={b.label} className="bg-surface space-y-1.5 rounded-2xl p-5">
                        <p className="text-foreground text-sm font-medium">{b.label}</p>
                        <p className="text-muted text-sm leading-relaxed">{b.text}</p>
                      </li>
                    ))}
                  </ul>
                )}

                {section.table && (
                  <div className="bg-surface my-6 overflow-x-auto rounded-3xl p-2 sm:p-4">
                    {section.table.caption && (
                      <p className="text-muted px-4 pb-3 pt-2 font-mono text-[11px] uppercase tracking-wider">
                        {section.table.caption}
                      </p>
                    )}
                    <table className="w-full min-w-[520px] border-collapse text-left">
                      <thead>
                        <tr className="text-muted text-[11px] uppercase tracking-wider">
                          {section.table.headers.map((header) => (
                            <th key={header} className="px-4 py-3 font-medium">
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="text-xs sm:text-sm">
                        {section.table.rows.map((row, rowIdx) => (
                          <tr
                            key={rowIdx}
                            className={rowIdx % 2 === 0 ? 'bg-background' : 'bg-surface'}
                          >
                            {row.map((cell, cellIdx) => (
                              <td
                                key={cellIdx}
                                className={`px-4 py-3.5 ${
                                  cellIdx === 0
                                    ? 'text-foreground rounded-l-xl font-medium'
                                    : cellIdx === row.length - 1
                                      ? 'text-foreground/85 rounded-r-xl'
                                      : 'text-muted'
                                }`}
                              >
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {section.callout && (
                  <div
                    className={`space-y-2 rounded-2xl p-6 ${
                      section.callout.tone === 'emerald'
                        ? 'text-foreground bg-emerald-500/10'
                        : section.callout.tone === 'accent'
                          ? 'bg-[var(--color-accent)]/10 text-foreground'
                          : 'bg-surface text-foreground'
                    }`}
                  >
                    <p
                      className={`font-mono text-[11px] uppercase tracking-wider ${
                        section.callout.tone === 'emerald'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : section.callout.tone === 'accent'
                            ? 'text-[var(--color-accent)]'
                            : 'text-muted'
                      }`}
                    >
                      {section.callout.eyebrow}
                    </p>
                    <p className="text-sm leading-relaxed">{section.callout.text}</p>
                  </div>
                )}

                {section.visual && <div className="pt-2">{renderVisual(section.visual)}</div>}
              </section>
            ))}

            {/* FAQ Section */}
            <section id="faq" className="scroll-mt-24 space-y-6 pt-4">
              <div className="space-y-1">
                <p className="text-muted font-mono text-[11px] uppercase tracking-[0.14em]">
                  Frequently Asked Questions
                </p>
                <h2 className="text-2xl font-medium tracking-tight md:text-3xl">Quick answers</h2>
              </div>

              <div className="space-y-3">
                {post.faqs.map((faq) => (
                  <div key={faq.question} className="bg-surface space-y-2 rounded-2xl p-6">
                    <h3 className="text-foreground text-base font-medium">{faq.question}</h3>
                    <p className="text-muted text-sm leading-relaxed">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Primary CTA Banner */}
            <section className="bg-foreground text-background space-y-5 rounded-3xl p-8 md:p-10">
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--color-accent)]">
                {post.cta.eyebrow}
              </p>
              <h2 className="text-2xl font-medium tracking-tight md:text-3xl">
                {post.cta.heading}
              </h2>
              <p className="max-w-xl text-sm leading-relaxed opacity-75">{post.cta.description}</p>
              <div className="flex flex-wrap gap-3 pt-2">
                <Link
                  href={post.cta.primaryHref}
                  className="bg-background text-foreground inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-xs font-medium transition-opacity hover:opacity-90"
                >
                  {post.cta.primaryLabel}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                {post.cta.secondaryLabel && post.cta.secondaryHref && (
                  <Link
                    href={post.cta.secondaryHref}
                    className="bg-background/12 text-background hover:bg-background/20 inline-flex items-center rounded-full px-6 py-3.5 text-xs font-medium transition-colors"
                  >
                    {post.cta.secondaryLabel}
                  </Link>
                )}
              </div>
            </section>
          </article>

          {/* Sticky Right Rail Outline */}
          <aside className="sticky top-24 hidden space-y-8 lg:block">
            <div className="bg-surface space-y-4 rounded-2xl p-6">
              <p className="text-muted font-mono text-[11px] uppercase tracking-wider">
                On this page
              </p>
              <nav aria-label="Table of contents">
                <ul className="space-y-2.5">
                  {post.sections.map((section) => (
                    <li key={section.id}>
                      <a
                        href={`#${section.id}`}
                        className="text-muted hover:text-foreground block text-xs leading-snug transition-colors"
                      >
                        {section.heading}
                      </a>
                    </li>
                  ))}
                  <li>
                    <a
                      href="#faq"
                      className="text-muted hover:text-foreground block text-xs leading-snug transition-colors"
                    >
                      Frequently asked questions
                    </a>
                  </li>
                </ul>
              </nav>
            </div>

            <div className="bg-surface space-y-3 rounded-2xl p-6">
              <p className="font-mono text-[11px] uppercase tracking-wider text-[var(--color-accent)]">
                Start with Verndly
              </p>
              <p className="text-foreground text-sm font-medium leading-snug">
                Flat 4% seller fee. 7-day escrow for every buyer.
              </p>
              <div className="flex flex-col gap-2 pt-1">
                <Link
                  href="/sell"
                  className="bg-foreground text-background inline-flex items-center justify-center rounded-full px-4 py-2.5 text-xs font-medium transition-opacity hover:opacity-90"
                >
                  Sell on Verndly
                </Link>
                <Link
                  href="/products"
                  className="bg-background text-foreground inline-flex items-center justify-center rounded-full px-4 py-2.5 text-xs font-medium transition-opacity hover:opacity-80"
                >
                  Shop marketplace
                </Link>
              </div>
            </div>
          </aside>
        </div>

        {/* Related Guides */}
        <section className="mt-24 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-medium tracking-tight">Related guides</h2>
            <Link
              href="/blog"
              className="text-muted hover:text-foreground text-xs font-medium transition-colors"
            >
              View all guides
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {related.map((item) => (
              <Link
                key={item.slug}
                href={`/blog/${item.slug}`}
                className="bg-surface hover:bg-foreground/[0.05] group flex flex-col justify-between gap-6 rounded-3xl p-6 transition-colors"
              >
                <div className="space-y-3">
                  <span className="text-muted font-mono text-[11px]">{item.audience}</span>
                  <h3 className="text-base font-medium leading-snug tracking-tight transition-colors group-hover:text-[var(--color-accent)]">
                    {item.shortTitle}
                  </h3>
                </div>
                <span className="text-foreground inline-flex items-center gap-1.5 text-xs font-medium">
                  Read guide
                  <ArrowUpRight className="text-muted h-3.5 w-3.5" />
                </span>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
