'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Sparkles, ShoppingBag, Layers, ChevronRight, Search, X } from 'lucide-react';
import Link from 'next/link';
import { productApi } from '@/lib/api/product';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import Loading from '../loading';

const getCategoryImageUrl = (name: string, customUrl?: string | null) => {
  if (customUrl) return customUrl;
  const normalized = name.toLowerCase();
  if (
    normalized.includes('electronic') ||
    normalized.includes('phone') ||
    normalized.includes('laptop') ||
    normalized.includes('gadget')
  ) {
    return 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=800&auto=format&fit=crop&q=80';
  }
  if (
    normalized.includes('cloth') ||
    normalized.includes('wear') ||
    normalized.includes('fashion') ||
    normalized.includes('shoe') ||
    normalized.includes('bag')
  ) {
    return 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&auto=format&fit=crop&q=80';
  }
  if (
    normalized.includes('book') ||
    normalized.includes('study') ||
    normalized.includes('education') ||
    normalized.includes('note')
  ) {
    return 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800&auto=format&fit=crop&q=80';
  }
  if (
    normalized.includes('home') ||
    normalized.includes('furniture') ||
    normalized.includes('decor') ||
    normalized.includes('appliances')
  ) {
    return 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=800&auto=format&fit=crop&q=80';
  }
  if (
    normalized.includes('cosmetic') ||
    normalized.includes('beauty') ||
    normalized.includes('care') ||
    normalized.includes('perfume') ||
    normalized.includes('makeup')
  ) {
    return 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&auto=format&fit=crop&q=80';
  }
  if (
    normalized.includes('food') ||
    normalized.includes('drink') ||
    normalized.includes('snack') ||
    normalized.includes('grocery') ||
    normalized.includes('meal')
  ) {
    return 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&auto=format&fit=crop&q=80';
  }
  if (
    normalized.includes('service') ||
    normalized.includes('job') ||
    normalized.includes('gig') ||
    normalized.includes('tutoring')
  ) {
    return 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&auto=format&fit=crop&q=80';
  }
  return 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80';
};

export default function CategoryGalleryPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    Promise.all([
      productApi.getCategories().catch(() => []),
      productApi.getBrands().catch(() => []),
      productApi.getProducts().catch(() => []),
    ])
      .then(([cats, brs, prds]) => {
        setCategories(cats);
        setBrands(brs);
        setProducts(prds);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  // Map brands by category
  const categoriesWithDetails = useMemo(() => {
    return categories.map((cat) => {
      const catBrands = brands.filter(
        (b) => String(b.category_id) === String(cat.id) || b.category?.name === cat.name,
      );
      const catProductsCount = products.filter(
        (p) => String(p.category).toLowerCase() === String(cat.name).toLowerCase(),
      ).length;

      return {
        ...cat,
        brands: catBrands,
        productCount: catProductsCount,
      };
    });
  }, [categories, brands, products]);

  // Filtered lists based on searchQuery for dynamic client side search optimization
  const filteredCategories = useMemo(() => {
    if (!searchQuery) return categoriesWithDetails;
    const query = searchQuery.toLowerCase();
    return categoriesWithDetails.filter(
      (cat) =>
        cat.name.toLowerCase().includes(query) ||
        (cat.description && cat.description.toLowerCase().includes(query)) ||
        cat.brands.some((b: any) => b.name.toLowerCase().includes(query)),
    );
  }, [categoriesWithDetails, searchQuery]);

  const filteredBrands = useMemo(() => {
    if (!searchQuery) return brands;
    const query = searchQuery.toLowerCase();
    return brands.filter(
      (b) =>
        b.name.toLowerCase().includes(query) ||
        (b.category?.name && b.category.name.toLowerCase().includes(query)),
    );
  }, [brands, searchQuery]);

  if (isLoading) {
    return <Loading />;
  }

  // SEO JSON-LD
  const galleryJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Category & Brand Showcase - Verndly',
    description:
      'Explore all product categories, special brands, and verified young entrepreneur lists.',
    itemListElement: categoriesWithDetails.map((cat, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      item: {
        '@type': 'Class',
        name: cat.name,
        description: cat.description || `Browse custom verified listings under ${cat.name}`,
        image: getCategoryImageUrl(cat.name, cat.image_url),
      },
    })),
  };

  return (
    <div className="bg-background min-h-screen pb-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(galleryJsonLd) }}
      />

      <DashboardHeader title="Collections" />

      {/* Header back bar */}
      <div className="mx-auto max-w-7xl px-4 pb-4 pt-8 md:px-8">
        <Link
          href="/"
          className="text-muted-foreground hover:text-primary group inline-flex items-center gap-2 text-xs font-normal transition-colors"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Back to Marketplace
        </Link>
      </div>

      {/* Showcase Hero Intro */}
      <section className="mx-auto max-w-7xl space-y-4 px-4 py-8 md:px-8">
        <div className="text-primary flex items-center gap-2 text-[10px] font-medium uppercase tracking-wider">
          <Sparkles className="h-3.5 w-3.5 animate-pulse" />
          Immersive Catalog
        </div>
        <h1 className="text-foreground text-3xl font-medium uppercase tracking-tight md:text-5xl">
          Categories & Brands
        </h1>
        <p className="text-muted-foreground max-w-xl text-sm leading-relaxed">
          Discover a rich ecosystem of verified brands and categories. Easily narrow down your
          search by selecting a brand tag or category cards below.
        </p>

        {/* Real-time search optimization to enhance discovery experience */}
        <div className="max-w-md pt-2">
          <div className="group relative">
            <div className="text-muted-foreground group-focus-within:text-primary pointer-events-none absolute inset-y-0 left-4 flex items-center transition-colors duration-200">
              <Search className="h-4 w-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search categories, collections, or brands..."
              className="bg-surface border-border focus:border-primary focus:ring-primary/10 h-11 w-full rounded-xl border pl-11 pr-11 text-xs transition-all duration-200 focus:outline-none focus:ring-4"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-4 flex items-center transition-colors duration-200"
                type="button"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Custom category grids */}
      <section className="mx-auto max-w-7xl px-4 py-10 md:px-8">
        {filteredCategories.length === 0 ? (
          <div className="border-border bg-surface/30 rounded-2xl border border-dashed py-16 text-center">
            <Layers className="text-muted-foreground mx-auto mb-3 h-8 w-8 animate-pulse opacity-45" />
            <p className="text-muted-foreground text-xs font-medium">
              No categories found matching your query.
            </p>
          </div>
        ) : (
          <div className="border-border/20 grid grid-cols-1 gap-0 border-l border-t md:grid-cols-2 lg:grid-cols-3">
            {filteredCategories.map((cat, index) => {
              const bgUrl = getCategoryImageUrl(cat.name, cat.image_url);

              return (
                <motion.div
                  key={cat.id || cat.name}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4, delay: index * 0.03 }}
                  className="border-border/20 bg-surface group relative flex aspect-square flex-col justify-end overflow-hidden rounded-none border-b border-r p-6 shadow-none transition-all duration-300"
                >
                  {/* Background image & gradient overlay */}
                  <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                    style={{ backgroundImage: `url(${bgUrl})` }}
                  />

                  {/* Content Overlay */}
                  <div className="relative z-[2] w-full space-y-4 text-white">
                    <div className="flex items-start justify-between">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[10px] font-normal uppercase tracking-wider backdrop-blur-md">
                        <ShoppingBag className="h-3 w-3" />
                        {cat.productCount} active item{cat.productCount === 1 ? '' : 's'}
                      </span>

                      <Link
                        href={`/products?category=${encodeURIComponent(cat.name)}`}
                        className="bg-primary flex h-8 w-8 items-center justify-center rounded-full text-white transition-transform hover:scale-110 active:scale-95"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-xl font-medium uppercase tracking-tight md:text-2xl">
                        {cat.name}
                      </h3>
                      {cat.description && (
                        <p className="line-clamp-2 text-xs text-white/70">{cat.description}</p>
                      )}
                    </div>

                    {/* Horizontally scrolling brand tags */}
                    <div className="space-y-2 border-t border-white/10 pt-2">
                      <p className="text-[10px] font-normal uppercase tracking-wider text-white/40">
                        Available Brands
                      </p>
                      {cat.brands.length === 0 ? (
                        <p className="text-[11px] italic text-white/50">Generic or custom brands</p>
                      ) : (
                        <div className="scrollbar-hide flex max-h-[80px] flex-wrap gap-1.5 overflow-y-auto">
                          {cat.brands.map((b: any) => (
                            <Link
                              key={b.id}
                              href={`/products?category=${encodeURIComponent(cat.name)}&brand=${encodeURIComponent(b.name)}`}
                              className="hover:bg-primary/80 inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-medium transition-colors"
                            >
                              {b.image_url && (
                                <img
                                  src={b.image_url}
                                  alt=""
                                  className="h-3.5 w-3.5 rounded-full bg-white object-contain p-0.5"
                                />
                              )}
                              {b.name}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>

      {/* Global Brands Directory Section */}
      <section className="bg-surface/30 border-border/40 mx-auto max-w-7xl rounded-[3rem] border px-4 py-10 md:px-8">
        <div className="space-y-8">
          <div className="space-y-2">
            <h2 className="text-foreground flex items-center gap-2 text-xl font-medium uppercase tracking-tight md:text-2xl">
              <Layers className="text-primary h-5 w-5" />
              General Brand Directory
            </h2>
            <p className="text-muted-foreground text-xs">
              Browse some of the most popular associated brands on the independent marketplace.
            </p>
          </div>

          {filteredBrands.length === 0 ? (
            <p className="text-muted-foreground text-xs italic">
              No registered brands match your search.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6">
              {filteredBrands.map((b) => (
                <Link
                  key={b.id}
                  href={`/products?category=${encodeURIComponent(b.category?.name || '')}&brand=${encodeURIComponent(b.name)}`}
                  className="bg-surface border-border hover:border-primary/40 group flex flex-col items-center justify-center rounded-3xl border p-4 transition-all duration-300 hover:shadow-lg"
                >
                  <div className="border-border mb-2 flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border bg-white p-2 transition-transform group-hover:scale-105">
                    {b.image_url ? (
                      <img
                        src={b.image_url}
                        alt={b.name}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <span className="text-muted-foreground/30 text-sm font-medium uppercase">
                        {b.name.charAt(0)}
                      </span>
                    )}
                  </div>
                  <span className="text-foreground w-full truncate text-center text-[11px] font-normal">
                    {b.name}
                  </span>
                  <span className="text-muted-foreground w-full truncate text-center text-[9px]">
                    {b.category?.name || 'Generic'}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
