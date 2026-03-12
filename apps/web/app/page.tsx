"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, FilterX, Sparkles, Compass } from "lucide-react";
import { productApi } from "@/lib/api/product";
import ProductCard from "@/components/products/ProductCard";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import ProductFilters from "@/components/products/ProductFilters";
import Loading from "./loading";
import ModernHero from "@/components/common/ModernHero";
import Container from "@/components/common/Container";

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
  const filteredProducts = useMemo(() => {
    let result = [...products];

    if (activeCategory) {
      result = result.filter(p => p.category === activeCategory);
    }

    result = result.filter(p => {
      const price = parseFloat(p.price);
      return price >= priceRange[0] && price <= priceRange[1];
    });

    // Sort
    result.sort((a, b) => {
      if (sortBy === "price_asc") return parseFloat(a.price) - parseFloat(b.price);
      if (sortBy === "price_desc") return parseFloat(b.price) - parseFloat(a.price);
      if (sortBy === "alpha") return a.title.localeCompare(b.title);
      // Newest (Default)
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });

    return result;
  }, [products, activeCategory, priceRange, sortBy]);

  if (isLoading) return <Loading />;

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="Home" />
      
      {/* Modern Hero Section */}
      <ModernHero />

      {/* Descriptive Marketplace Section */}
      <section className="relative py-12 overflow-hidden bg-surface/30">
      </section>

      <main className="max-w-7xl mx-auto px-4 md:px-8 pb-32 space-y-12 relative z-10">
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
            resultsCount={filteredProducts.length}
          />
        </div>

        {/* Product Grid */}
        <section className="columns-2 md:columns-3 lg:columns-4 gap-2">
           <AnimatePresence mode="popLayout">
            {filteredProducts.length > 0 ? (
              filteredProducts.map((product, idx) => (
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
              ))
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="col-span-full py-32 text-center space-y-6 border-2 border-dashed border-border rounded-[3rem] bg-surface/30"
              >
                <div className="w-20 h-20 bg-surface rounded-full flex items-center justify-center mx-auto shadow-sm">
                  <FilterX size={32} className="text-muted opacity-30" />
                </div>
                <div>
                   <h3 className="text-xl font-black uppercase tracking-tight">No items match your filters</h3>
                   <p className="text-sm text-muted font-bold mt-2 max-w-xs mx-auto">
                     Try adjusting your price range or category to find more amazing campus deals.
                   </p>
                </div>
                <button 
                  onClick={() => {
                    setActiveCategory(null);
                    setPriceRange([0, 100000]);
                  }}
                  className="text-[10px] font-black uppercase tracking-[0.2em] text-primary hover:underline"
                >
                  Clear all filters
                </button>
              </motion.div>
            )}
           </AnimatePresence>
        </section>
      </main>
    </div>
  );
}