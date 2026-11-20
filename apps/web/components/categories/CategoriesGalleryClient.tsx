'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Layers, Search, ShoppingBag, X } from 'lucide-react';
import Header from '@/components/layout/Header';
import { CATEGORY_PROFILES, slugifyCategory } from '@/lib/content/categories';

interface CategoriesGalleryClientProps {
  initialCategories: any[];
  initialBrands: any[];
  initialProducts: any[];
}

export default function CategoriesGalleryClient({
  initialCategories,
  initialBrands,
  initialProducts,
}: CategoriesGalleryClientProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Merge API categories with our rich SEO category profiles so the directory is
  // always populated, indexable, and links to real /categories/[slug] pages.
  const categoriesWithDetails = useMemo(() => {
    const source =
      initialCategories.length > 0
        ? initialCategories
        : CATEGORY_PROFILES.map((p) => ({
            id: p.slug,
            name: p.apiName,
            description: p.subheadline,
          }));

    return source.map((cat) => {
      const slug = slugifyCategory(cat.name);
      const profile = CATEGORY_PROFILES.find((p) => p.slug === slug);
      const catBrands = initialBrands.filter(
        (b) => String(b.category_id) === String(cat.id) || b.category?.name === cat.name,
      );
      const catProductsCount = initialProducts.filter(
        (p) => String(p.category).toLowerCase() === String(cat.name).toLowerCase(),
      ).length;

      return {
        ...cat,
        slug,
        displayName: profile?.name || cat.name,
        description: cat.description || profile?.subheadline || '',
        brands: catBrands,
        productCount: catProductsCount,
      };
    });
  }, [initialCategories, initialBrands, initialProducts]);

  const filteredCategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return categoriesWithDetails;
    return categoriesWithDetails.filter(
      (cat) =>
        cat.name.toLowerCase().includes(q) ||
        cat.displayName.toLowerCase().includes(q) ||
        (cat.description && cat.description.toLowerCase().includes(q)) ||
        cat.brands.some((b: any) => b.name.toLowerCase().includes(q)),
    );
  }, [categoriesWithDetails, searchQuery]);

  const filteredBrands = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return initialBrands;
    return initialBrands.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        (b.category?.name && b.category.name.toLowerCase().includes(q)),
    );
  }, [initialBrands, searchQuery]);

  return (
    <div className="bg-background text-foreground min-h-screen pb-28">
      <Header />

      <main className="mx-auto max-w-6xl space-y-16 px-4 pt-10 md:px-8 md:pt-16">
        <div className="space-y-6">
          <Link
            href="/"
            className="bg-surface text-muted hover:text-foreground inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Marketplace
          </Link>

          <header className="max-w-3xl space-y-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--color-accent)]">
              Verified Directory · Ghana
            </p>
            <h1 className="text-3xl font-medium leading-[1.08] tracking-tight sm:text-4xl md:text-5xl">
              Categories &amp; Independent Brands.
            </h1>
            <p className="text-muted text-sm leading-relaxed md:text-base">
              Browse curated shopping categories across Ghana — from independent fashion and
              authentic skincare to verified electronics and home essentials, every purchase backed
              by 7-day Paystack escrow.
            </p>
          </header>

          {/* Search input — zero borders, zero shadows */}
          <div className="max-w-md pt-1">
            <div className="relative">
              <Search className="text-muted pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search categories, collections, or brands…"
                aria-label="Search categories and brands"
                className="bg-surface text-foreground placeholder:text-muted h-11 w-full rounded-full pl-11 pr-10 text-xs outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-muted hover:text-foreground absolute inset-y-0 right-4 flex items-center"
                  type="button"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Category cards grid — minimal, flat tonal, zero borders/shadows/blur */}
        <section aria-label="Product categories">
          {filteredCategories.length === 0 ? (
            <div className="bg-surface space-y-2 rounded-3xl px-6 py-16 text-center">
              <Layers className="text-muted mx-auto h-7 w-7 opacity-50" />
              <p className="text-muted text-sm">No categories match your search.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {filteredCategories.map((cat) => (
                <article
                  key={cat.id || cat.name}
                  className="bg-surface hover:bg-foreground/[0.05] group flex flex-col justify-between gap-6 rounded-3xl p-7 transition-colors"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="bg-background text-muted inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-[11px]">
                        <ShoppingBag className="h-3 w-3" />
                        {cat.productCount > 0
                          ? `${cat.productCount} listing${cat.productCount === 1 ? '' : 's'}`
                          : 'Verified category'}
                      </span>

                      <Link
                        href={`/categories/${cat.slug}`}
                        aria-label={`Explore ${cat.displayName}`}
                        className="bg-foreground text-background inline-flex h-8 w-8 items-center justify-center rounded-full transition-transform group-hover:translate-x-0.5"
                      >
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>

                    <div className="space-y-2">
                      <h2 className="text-foreground text-xl font-medium tracking-tight">
                        <Link
                          href={`/categories/${cat.slug}`}
                          className="transition-colors hover:text-[var(--color-accent)]"
                        >
                          {cat.displayName}
                        </Link>
                      </h2>
                      {cat.description && (
                        <p className="text-muted line-clamp-3 text-xs leading-relaxed">
                          {cat.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    {cat.brands.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {cat.brands.slice(0, 5).map((b: any) => (
                          <Link
                            key={b.id || b.name}
                            href={`/products?category=${encodeURIComponent(cat.name)}&brand=${encodeURIComponent(b.name)}`}
                            className="bg-background text-muted hover:text-foreground rounded-full px-2.5 py-1 text-[11px] transition-colors"
                          >
                            {b.name}
                          </Link>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1 text-xs font-medium">
                      <Link
                        href={`/categories/${cat.slug}`}
                        className="text-foreground transition-colors hover:text-[var(--color-accent)]"
                      >
                        Explore {cat.displayName}
                      </Link>
                      <Link
                        href={`/products?category=${encodeURIComponent(cat.name)}`}
                        className="text-muted hover:text-foreground transition-colors"
                      >
                        Filter catalog
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Brands directory */}
        {filteredBrands.length > 0 && (
          <section className="bg-surface space-y-6 rounded-3xl p-8 md:p-10">
            <div className="space-y-1">
              <p className="text-muted font-mono text-[11px] uppercase tracking-wider">
                Brand Directory
              </p>
              <h2 className="text-2xl font-medium tracking-tight">Popular brands on Verndly</h2>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
              {filteredBrands.map((b: any) => (
                <Link
                  key={b.id || b.name}
                  href={`/products?category=${encodeURIComponent(b.category?.name || '')}&brand=${encodeURIComponent(b.name)}`}
                  className="bg-background flex flex-col items-center justify-center gap-2 rounded-2xl p-4 transition-opacity hover:opacity-85"
                >
                  <div className="bg-surface flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl p-1.5">
                    {b.image_url ? (
                      <img
                        src={b.image_url}
                        alt={b.name}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <span className="text-muted text-sm font-medium uppercase">
                        {b.name.charAt(0)}
                      </span>
                    )}
                  </div>
                  <span className="text-foreground w-full truncate text-center text-xs font-medium">
                    {b.name}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
