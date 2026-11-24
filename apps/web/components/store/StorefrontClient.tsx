'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Search, SlidersHorizontal, ArrowUpDown, X, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { storeApi } from '@/lib/api/store';
import { productApi } from '@/lib/api/product';
import { isPubliclyVisible } from '@/lib/product-visibility';
import ProductCard from '@/components/products/ProductCard';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import Header from '@/components/layout/Header';
import RecentlyViewed from '@/components/home/RecentlyViewed';
import StorefrontHeader from '@/components/store/StorefrontHeader';
import Select from '@/components/ui/Select';

export default function StorefrontClient({
  slug: initialSlug,
  initialStore = null,
  initialProducts = [],
}: {
  slug?: string;
  initialStore?: any;
  initialProducts?: any[];
}) {
  const params = useParams();
  const slug = initialSlug || (params?.slug as string);
  const [store, setStore] = useState<any>(initialStore);
  const [products, setProducts] = useState<any[]>(initialProducts);
  const [loading, setLoading] = useState(!initialStore);
  const [error, setError] = useState<string | null>(null);

  // In-store search, category, and sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'newest' | 'price_asc' | 'price_desc'>('newest');

  useEffect(() => {
    if (!slug) return;

    const fetchStoreData = async () => {
      try {
        if (!initialStore) setLoading(true);
        const [storeData, productsData] = await Promise.all([
          storeApi.getStoreBySlug(slug as string),
          productApi.getProductsByStoreSlug(slug as string),
        ]);
        if (storeData) setStore(storeData);
        if (Array.isArray(productsData)) {
          setProducts(productsData.filter(isPubliclyVisible));
        }
      } catch (err: any) {
        if (!initialStore) setError(err.message || 'Failed to load store');
      } finally {
        setLoading(false);
      }
    };

    fetchStoreData();
  }, [slug, initialStore]);

  // Extract unique categories from products
  const categories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach((p) => {
      if (p.category) cats.add(p.category);
    });
    return Array.from(cats);
  }, [products]);

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        const matchesCat =
          selectedCategory === 'ALL' ||
          p.category?.toLowerCase() === selectedCategory.toLowerCase();

        const q = searchQuery.toLowerCase().trim();
        const matchesSearch =
          !q ||
          p.title?.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.category?.toLowerCase().includes(q);

        return matchesCat && matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === 'price_asc') {
          return parseFloat(a.price || 0) - parseFloat(b.price || 0);
        }
        if (sortBy === 'price_desc') {
          return parseFloat(b.price || 0) - parseFloat(a.price || 0);
        }
        // newest
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      });
  }, [products, selectedCategory, searchQuery, sortBy]);

  if (loading) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="xl" />
          <p className="text-muted text-xs font-medium uppercase tracking-wider">
            Loading storefront…
          </p>
        </div>
      </div>
    );
  }

  if (error || !store) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6 text-center">
          <div className="bg-destructive/10 mx-auto flex h-20 w-20 items-center justify-center rounded-full">
            <ShoppingBag className="text-destructive h-10 w-10" />
          </div>
          <h1 className="text-2xl font-bold uppercase tracking-tight">Store Not Found</h1>
          <p className="text-muted-foreground text-sm">
            {error || "The store you're looking for doesn't exist or has been moved."}
          </p>
          <Link href="/" className="block w-full">
            <Button variant="primary" className="w-full">
              Back to Discovery
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen text-[var(--color-foreground)]">
      <Header />

      <div className="mx-auto max-w-7xl px-4 pb-24 pt-6 md:px-8 md:pb-32 md:pt-10">
        {/* Storefront Hero & Header with Direct WhatsApp Action & Share Modal */}
        <StorefrontHeader store={store} productsCount={products.length} />

        {/* In-Store Filter & Search Toolbar */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            {/* Search Input */}
            <div className="relative max-w-md flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted)]" />
              <input
                type="text"
                placeholder={`Search in ${store.store_name}…`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="focus:border-[var(--color-accent)]/60 h-11 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] pl-10 pr-9 text-xs text-[var(--color-foreground)] transition-colors placeholder:text-[var(--color-muted)] focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Custom Sort Dropdown */}
            <div className="w-44 shrink-0">
              <Select
                value={sortBy}
                onChange={(val) => setSortBy(val as any)}
                options={[
                  { value: 'newest', label: 'Latest Arrivals' },
                  { value: 'price_asc', label: 'Price: Low to High' },
                  { value: 'price_desc', label: 'Price: High to Low' },
                ]}
                size="sm"
              />
            </div>
          </div>

          {/* Category Filter Pills */}
          {categories.length > 0 && (
            <div className="scrollbar-none flex items-center gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => setSelectedCategory('ALL')}
                className={`shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all ${
                  selectedCategory === 'ALL'
                    ? 'bg-[var(--color-foreground)] text-[var(--color-background)]'
                    : 'border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)] hover:text-[var(--color-foreground)]'
                }`}
              >
                All ({products.length})
              </button>
              {categories.map((cat) => {
                const count = products.filter(
                  (p) => p.category?.toLowerCase() === cat.toLowerCase(),
                ).length;
                const isSelected = selectedCategory.toLowerCase() === cat.toLowerCase();
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all ${
                      isSelected
                        ? 'bg-[var(--color-foreground)] text-[var(--color-background)]'
                        : 'border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)] hover:text-[var(--color-foreground)]'
                    }`}
                  >
                    {cat} ({count})
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Products Section Header */}
        <div className="mb-6 flex items-center justify-between px-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
            Catalog ({filteredProducts.length})
          </h2>
          {(searchQuery || selectedCategory !== 'ALL') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('ALL');
              }}
              className="text-xs font-medium text-[var(--color-accent)] hover:underline"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Products Grid Layout */}
        <AnimatePresence mode="popLayout">
          {filteredProducts.length > 0 ? (
            <motion.div layout className="columns-2 gap-3 space-y-3 md:columns-3 lg:columns-4">
              {filteredProducts.map((product, idx) => (
                <div key={product.id} className="break-inside-avoid">
                  <ProductCard product={product} index={idx} />
                </div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-[var(--color-surface)]/50 space-y-4 rounded-3xl border border-dashed border-[var(--color-border)] p-8 py-24 text-center"
            >
              <div className="bg-[var(--color-border)]/40 mx-auto flex h-14 w-14 items-center justify-center rounded-2xl text-[var(--color-muted)]">
                <ShoppingBag className="h-7 w-7 opacity-60" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-foreground)]">
                  {searchQuery || selectedCategory !== 'ALL'
                    ? 'No matching products found'
                    : 'No items listed yet'}
                </h3>
                <p className="mx-auto max-w-sm text-xs text-[var(--color-muted)]">
                  {searchQuery || selectedCategory !== 'ALL'
                    ? 'Try adjusting your search terms or category selection to see more items.'
                    : "This store hasn't published any items yet. Check back soon!"}
                </p>
              </div>
              {(searchQuery || selectedCategory !== 'ALL') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('ALL');
                  }}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[var(--color-accent)] px-4 text-xs font-medium text-white transition-opacity hover:opacity-90"
                >
                  Clear Filters
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Recently Viewed */}
        <div className="mt-20">
          <RecentlyViewed limit={12} title="Pick up where you left off" />
        </div>
      </div>
    </div>
  );
}
