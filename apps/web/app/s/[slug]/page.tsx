"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag,
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  X,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { storeApi } from "@/lib/api/store";
import { productApi } from "@/lib/api/product";
import ProductCard from "@/components/products/ProductCard";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import Header from "@/components/layout/Header";
import RecentlyViewed from "@/components/home/RecentlyViewed";
import StorefrontHeader from "@/components/store/StorefrontHeader";
import Select from "@/components/ui/Select";

export default function StorePage() {
  const { slug } = useParams();
  const [store, setStore] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // In-store search, category, and sorting
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"newest" | "price_asc" | "price_desc">("newest");

  useEffect(() => {
    if (!slug) return;

    const fetchStoreData = async () => {
      try {
        setLoading(true);
        const [storeData, productsData] = await Promise.all([
          storeApi.getStoreBySlug(slug as string),
          productApi.getProductsByStoreSlug(slug as string),
        ]);
        setStore(storeData);
        setProducts(Array.isArray(productsData) ? productsData : []);
      } catch (err: any) {
        setError(err.message || "Failed to load store");
      } finally {
        setLoading(false);
      }
    };

    fetchStoreData();
  }, [slug]);

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
          selectedCategory === "ALL" ||
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
        if (sortBy === "price_asc") {
          return parseFloat(a.price || 0) - parseFloat(b.price || 0);
        }
        if (sortBy === "price_desc") {
          return parseFloat(b.price || 0) - parseFloat(a.price || 0);
        }
        // newest
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      });
  }, [products, selectedCategory, searchQuery, sortBy]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
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
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
            <ShoppingBag className="w-10 h-10 text-destructive" />
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
    <div className="min-h-screen bg-background text-[var(--color-foreground)]">
      <Header />

      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-6 md:pt-10 pb-24 md:pb-32">
        {/* Storefront Hero & Header with Direct WhatsApp Action & Share Modal */}
        <StorefrontHeader store={store} productsCount={products.length} />

        {/* In-Store Filter & Search Toolbar */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-muted)]" />
              <input
                type="text"
                placeholder={`Search in ${store.store_name}…`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-11 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] pl-10 pr-9 text-xs text-[var(--color-foreground)] placeholder:text-[var(--color-muted)] focus:outline-none focus:border-[var(--color-accent)]/60 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
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
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setSelectedCategory("ALL")}
                className={`shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all ${
                  selectedCategory === "ALL"
                    ? "bg-[var(--color-foreground)] text-[var(--color-background)]"
                    : "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
                }`}
              >
                All ({products.length})
              </button>
              {categories.map((cat) => {
                const count = products.filter(
                  (p) => p.category?.toLowerCase() === cat.toLowerCase()
                ).length;
                const isSelected = selectedCategory.toLowerCase() === cat.toLowerCase();
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all ${
                      isSelected
                        ? "bg-[var(--color-foreground)] text-[var(--color-background)]"
                        : "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
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
        <div className="flex items-center justify-between px-1 mb-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
            Catalog ({filteredProducts.length})
          </h2>
          {(searchQuery || selectedCategory !== "ALL") && (
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("ALL");
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
            <motion.div
              layout
              className="columns-2 md:columns-3 lg:columns-4 gap-3 space-y-3"
            >
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
              className="py-24 text-center space-y-4 rounded-3xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)]/50 p-8"
            >
              <div className="w-14 h-14 bg-[var(--color-border)]/40 rounded-2xl flex items-center justify-center mx-auto text-[var(--color-muted)]">
                <ShoppingBag className="w-7 h-7 opacity-60" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-foreground)]">
                  {searchQuery || selectedCategory !== "ALL"
                    ? "No matching products found"
                    : "No items listed yet"}
                </h3>
                <p className="text-xs text-[var(--color-muted)] max-w-sm mx-auto">
                  {searchQuery || selectedCategory !== "ALL"
                    ? "Try adjusting your search terms or category selection to see more items."
                    : "This store hasn't published any items yet. Check back soon!"}
                </p>
              </div>
              {(searchQuery || selectedCategory !== "ALL") && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("ALL");
                  }}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[var(--color-accent)] px-4 text-xs font-medium text-white hover:opacity-90 transition-opacity"
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
