"use client";

import React, { useState, useEffect } from "react";
import { ShoppingBag, Search, Filter, Sparkles } from "lucide-react";
import { productApi } from "@/lib/api/product";
import ProductCard from "@/components/products/ProductCard";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import Loading from "./loading";
import ModernHero from "@/components/common/ModernHero";

export default function HomePage() {
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const data = await productApi.getProducts();
        setProducts(data);
      } catch (err) {
        console.error("Failed to fetch products", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProducts();
  }, []);

  if (isLoading) return <Loading />;

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="Home" />
      
      {/* Modern Hero Section */}
      <ModernHero />

      <main className="max-w-7xl mx-auto px-6 md:px-8 pb-32 space-y-12 relative z-10 -mt-20">
        {/* Search & Filter Bar */}
        <section className="flex flex-col md:flex-row md:items-center gap-4 bg-surface/50 backdrop-blur-xl p-4 rounded-[2.5rem] border border-border/50 shadow-2xl shadow-primary/5">
           <div className="relative flex-1 group">
             <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-muted group-focus-within:text-primary transition-colors" />
             <input 
               type="text"
               placeholder="Search for products, stores, categories..."
               className="w-full h-16 pl-14 pr-6 bg-surface border border-border/50 rounded-[2rem] text-xs font-bold outline-none focus:border-primary/50 shadow-sm transition-all"
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
             />
           </div>
           <button className="h-16 px-8 bg-surface border border-border/50 rounded-[2rem] flex items-center justify-center gap-3 hover:border-primary/30 transition-all active:scale-95 group">
             <Filter className="w-4 h-4 text-muted group-hover:text-primary transition-colors" />
             <span className="text-xs font-bold">Filters</span>
           </button>
        </section>

        {/* Masonry Grid */}
        <section className="columns-2 md:columns-3 lg:columns-4 gap-6 space-y-6">
           {products.length > 0 ? (
             products.map((product, idx) => (
               <ProductCard key={product.id} product={product} index={idx} />
             ))
           ) : (
             <div className="col-span-full py-20 text-center space-y-4 border-2 border-dashed border-border rounded-[3rem] bg-surface/50">
               <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary">
                 <ShoppingBag className="w-8 h-8" />
               </div>
               <div>
                  <h3 className="text-md font-black uppercase">No products found</h3>
                  <p className="text-xs text-muted font-medium mt-1">Be the first to list something amazing!</p>
               </div>
             </div>
           )}
        </section>
      </main>
    </div>
  );
}