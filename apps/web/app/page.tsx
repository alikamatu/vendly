"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { productApi } from "@/lib/api/product";
import ProductCard from "@/components/products/ProductCard";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import ProductFilters from "@/components/products/ProductFilters";
import Loading from "./loading";
import ModernHero from "@/components/common/ModernHero";

export default function HomePage() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filtering states
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100000]);
  const [sortBy, setSortBy] = useState("newest");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsData, categoriesData] = await Promise.all([
          productApi.getProducts(),
          productApi.getCategories()
        ]);
        setProducts(productsData);
        setCategories(categoriesData);
      } catch (err) {
        console.error("Failed to fetch products/categories", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // Filter and Sort Logic
  const { promoProducts, regularProducts } = useMemo(() => {
    let result = [...products];

    if (activeCategory) {
      result = result.filter(p => p.category === activeCategory);
    }

    result = result.filter(p => {
      const price = parseFloat(p.price);
      return price >= priceRange[0] && price <= priceRange[1];
    });

    // Reusable sort function
    const sortFn = (a: any, b: any) => {
      if (sortBy === "price_asc") return parseFloat(a.price) - parseFloat(b.price);
      if (sortBy === "price_desc") return parseFloat(b.price) - parseFloat(a.price);
      if (sortBy === "alpha") return a.title.localeCompare(b.title);
      // Newest (Default)
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    };

    const promo = result.filter(p => p.is_featured).sort(sortFn);
    const regular = result.filter(p => !p.is_featured).sort(sortFn);

    return { promoProducts: promo, regularProducts: regular };
  }, [products, activeCategory, priceRange, sortBy]);

  if (isLoading) return <Loading />;

  const hasProducts = promoProducts.length > 0 || regularProducts.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="Home" />

      {/* Modern Hero Section */}
      <ModernHero />

      {/* Descriptive Marketplace Section */}
      <section className="relative py-3 overflow-hidden">
      </section>

      <main id="marketplace" className="max-w-7xl mx-auto px-4 md:px-8 pb-32 space-y-20 relative z-10">
        {/* Filters Component */}
        <div className="bg-background/80 backdrop-blur-xl sticky top-20 z-30 py-6 -mx-4 px-4 border-b border-border/50 md:rounded-[2.5rem] md:border md:static md:bg-transparent md:backdrop-blur-none md:p-0 md:border-none">
          <ProductFilters
            categories={categories}
            currentCategory={activeCategory}
            onCategoryChange={setActiveCategory}
            priceRange={priceRange}
            onPriceChange={setPriceRange}
            sortBy={sortBy}
            onSortChange={setSortBy}
            resultsCount={promoProducts.length + regularProducts.length}
          />
        </div>

        {/* Featured Section */}
        {promoProducts.length > 0 && (
          <section className="space-y-8">
            <div className="flex items-center gap-4">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/20 to-primary/40" />
              <h2 className="text-[10px] uppercase tracking-[0.4em] text-primary font-black flex items-center gap-2">
                Featured Marketplace
              </h2>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent via-primary/20 to-primary/40" />
            </div>
            
            <div className="columns-2 md:columns-3 lg:columns-4 gap-4">
              <AnimatePresence mode="popLayout">
                {promoProducts.map((product, idx) => (
                  <motion.div
                    key={product.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3 }}
                  >
                    <ProductCard product={product} index={idx} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </section>
        )}

        {/* Regular Product Grid */}
        <section className="space-y-8">
          {promoProducts.length > 0 && regularProducts.length > 0 && (
            <div className="flex items-center gap-4">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent to-border/50" />
              <h2 className="text-[10px] uppercase tracking-[0.4em] text-muted font-bold">
                Daily Discoveries
              </h2>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent to-border/50" />
            </div>
          )}

          {!hasProducts ? (
            <div className="py-32 text-center space-y-6 border-2 border-dashed border-border rounded-[3rem] bg-surface/30">
              <div>
                <h3 className="text-xl uppercase tracking-tight">No items match your filters</h3>
                <p className="text-sm text-muted mt-2 max-w-xs mx-auto">
                  Try adjusting your price range or category to find more amazing campus deals.
                </p>
              </div>
              <button
                onClick={() => {
                  setActiveCategory(null);
                  setPriceRange([0, 100000]);
                }}
                className="text-[10px] uppercase tracking-[0.2em] text-primary hover:underline"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="columns-2 md:columns-3 lg:columns-4 gap-4">
              <AnimatePresence mode="popLayout">
                {regularProducts.map((product, idx) => (
                  <motion.div
                    key={product.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3 }}
                  >
                    <ProductCard product={product} index={idx} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}