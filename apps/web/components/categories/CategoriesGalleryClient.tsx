'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Layers, Search, ShoppingBag, X } from 'lucide-react';
import Header from '@/components/layout/Header';
import { CATEGORY_PROFILES, slugifyCategory } from '@/lib/content/categories';
import { isBrandAllowedPublicly, SHOW_BRAND_RAIL } from '@/lib/brand-guard';
import { filterRailProducts } from '@/lib/product-visibility';

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

  // Only approved, in-stock products qualify a category for the public directory (CT-02).
  const inStockProducts = useMemo(() => filterRailProducts(initialProducts), [initialProducts]);

  const categoriesWithDetails = useMemo(() => {
    const source =
      initialCategories.length > 0
        ? initialCategories
        : CATEGORY_PROFILES.map((p) => ({
            id: p.slug,
            name: p.apiName,
            description: p.subheadline,
          }));

    return source
      .map((cat) => {
        const slug = slugifyCategory(cat.name);
        const profile = CATEGORY_PROFILES.find((p) => p.slug === slug);
        const catBrands = SHOW_BRAND_RAIL
          ? initialBrands.filter(
              (b) =>
                isBrandAllowedPublicly(b?.name) &&
                (String(b.category_id) === String(cat.id) || b.category?.name === cat.name),
            )
          : [];
        const catProductsCount = inStockProducts.filter(
          (p) =>
            String(p.category || '')
              .trim()
              .toLowerCase() ===
            String(cat.name || '')
              .trim()
              .toLowerCase(),
        ).length;

        const isDevices =
          String(cat.name || '')
            .trim()
            .toLowerCase() === 'devices';
        const safeDescription = isDevices
          ? 'Phones, computers, and electronics from verified sellers.'
          : cat.description || profile?.subheadline || '';

        return {
          ...cat,
          slug,
          productsHref: `/products?category=${encodeURIComponent(cat.name)}`,
          displayName: profile?.name || cat.name,
          description: safeDescription,
          brands: catBrands,
          productCount: catProductsCount,
        };
      })
      .filter((cat) => cat.productCount > 0)
      .sort(
        (a, b) => b.productCount - a.productCount || a.displayName.localeCompare(b.displayName),
      );
  }, [initialCategories, initialBrands, inStockProducts]);

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
    if (!SHOW_BRAND_RAIL) return [];
    const allowed = initialBrands.filter((b) => isBrandAllowedPublicly(b?.name));
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allowed;
    return allowed.filter(
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
              Accra Catalog
            </p>
            <h1 className="text-3xl font-medium leading-[1.08] tracking-tight sm:text-4xl md:text-5xl">
              Shop by category.
            </h1>
            <p className="text-muted text-sm leading-relaxed md:text-base">
              Browse categories from verified independent sellers in Accra. Every order is backed by
              3-day Paystack escrow.
            </p>
          </header>

          {/* Search input — shown when there are at least 3 active categories */}
          {(categoriesWithDetails.length >= 3 || searchQuery.length > 0) && (
            <div className="max-w-md pt-1">
              <div className="relative">
                <Search className="text-muted pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search categories…"
                  aria-label="Search categories"
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
          )}
        </div>

        {/* Category listing — simple list when < 3 categories qualify, grid otherwise */}
        <section aria-label="Product categories">
          {filteredCategories.length === 0 ? (
            <div className="bg-surface space-y-4 rounded-3xl px-6 py-16 text-center">
              <Layers className="text-muted mx-auto h-7 w-7 opacity-50" />
              <p className="text-muted text-sm">
                {searchQuery
                  ? 'No stocked categories match your search.'
                  : 'New categories appear here automatically as verified sellers list in-stock items.'}
              </p>
              <Link
                href="/products"
                className="bg-foreground text-background inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-medium transition-opacity hover:opacity-90"
              >
                Browse all products
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ) : filteredCategories.length < 3 ? (
            <div className="space-y-6">
              <ul className="space-y-3">
                {filteredCategories.map((cat) => (
                  <li key={cat.id || cat.name}>
                    <Link
                      href={cat.productsHref}
                      className="bg-surface hover:bg-foreground/[0.05] group flex flex-col justify-between gap-4 rounded-3xl p-6 transition-colors sm:flex-row sm:items-center"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-3">
                          <h2 className="text-foreground text-lg font-medium tracking-tight transition-colors group-hover:text-[var(--color-accent)]">
                            {cat.displayName}
                          </h2>
                          <span className="bg-background text-muted inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-[11px]">
                            <ShoppingBag className="h-3 w-3" />
                            {cat.productCount} listing{cat.productCount === 1 ? '' : 's'}
                          </span>
                        </div>
                        {cat.description && (
                          <p className="text-muted max-w-2xl text-xs leading-relaxed">
                            {cat.description}
                          </p>
                        )}
                      </div>
                      <span className="text-foreground inline-flex shrink-0 items-center gap-1.5 text-xs font-medium">
                        View products
                        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>

              <div>
                <Link
                  href="/products"
                  className="bg-foreground text-background inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-medium transition-opacity hover:opacity-90"
                >
                  Browse all products
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {filteredCategories.map((cat) => (
                <article
                  key={cat.id || cat.name}
                  className="bg-surface hover:bg-foreground/[0.05] group relative flex cursor-pointer flex-col justify-between gap-6 rounded-3xl p-7 transition-colors"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="bg-background text-muted inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-[11px]">
                        <ShoppingBag className="h-3 w-3" />
                        {cat.productCount} listing{cat.productCount === 1 ? '' : 's'}
                      </span>

                      <span
                        aria-hidden="true"
                        className="bg-foreground text-background inline-flex h-8 w-8 items-center justify-center rounded-full transition-transform group-hover:translate-x-0.5"
                      >
                        <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </div>

                    <div className="space-y-2">
                      <h2 className="text-foreground text-xl font-medium tracking-tight">
                        <Link
                          href={cat.productsHref}
                          className="transition-colors after:absolute after:inset-0 group-hover:text-[var(--color-accent)]"
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
                      <div className="relative z-10 flex flex-wrap gap-1.5">
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
                      <span className="text-foreground inline-flex items-center gap-1.5 transition-colors group-hover:text-[var(--color-accent)]">
                        View {cat.displayName} products
                        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                      </span>
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
