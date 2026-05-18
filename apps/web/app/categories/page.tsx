"use client";

import React, { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Sparkles, ShoppingBag, Layers, ChevronRight } from "lucide-react";
import Link from "next/link";
import { productApi } from "@/lib/api/product";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import Loading from "../loading";

const getCategoryImageUrl = (name: string, customUrl?: string | null) => {
  if (customUrl) return customUrl;
  const normalized = name.toLowerCase();
  if (normalized.includes("electronic") || normalized.includes("phone") || normalized.includes("laptop") || normalized.includes("gadget")) {
    return "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=800&auto=format&fit=crop&q=80";
  }
  if (normalized.includes("cloth") || normalized.includes("wear") || normalized.includes("fashion") || normalized.includes("shoe") || normalized.includes("bag")) {
    return "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&auto=format&fit=crop&q=80";
  }
  if (normalized.includes("book") || normalized.includes("study") || normalized.includes("education") || normalized.includes("note")) {
    return "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800&auto=format&fit=crop&q=80";
  }
  if (normalized.includes("home") || normalized.includes("furniture") || normalized.includes("decor") || normalized.includes("appliances")) {
    return "https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=800&auto=format&fit=crop&q=80";
  }
  if (normalized.includes("cosmetic") || normalized.includes("beauty") || normalized.includes("care") || normalized.includes("perfume") || normalized.includes("makeup")) {
    return "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&auto=format&fit=crop&q=80";
  }
  if (normalized.includes("food") || normalized.includes("drink") || normalized.includes("snack") || normalized.includes("grocery") || normalized.includes("meal")) {
    return "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&auto=format&fit=crop&q=80";
  }
  if (normalized.includes("service") || normalized.includes("job") || normalized.includes("gig") || normalized.includes("tutoring")) {
    return "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&auto=format&fit=crop&q=80";
  }
  return "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80";
};

export default function CategoryGalleryPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
        (b) => String(b.category_id) === String(cat.id) || b.category?.name === cat.name
      );
      const catProductsCount = products.filter(
        (p) => String(p.category).toLowerCase() === String(cat.name).toLowerCase()
      ).length;

      return {
        ...cat,
        brands: catBrands,
        productCount: catProductsCount,
      };
    });
  }, [categories, brands, products]);

  if (isLoading) {
    return <Loading />;
  }

  // SEO JSON-LD
  const galleryJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "Category & Brand Showcase - Vendly",
    "description": "Explore all product categories, special brands, and verified student entrepreneur lists.",
    "itemListElement": categoriesWithDetails.map((cat, idx) => ({
      "@type": "ListItem",
      "position": idx + 1,
      "item": {
        "@type": "Class",
        "name": cat.name,
        "description": cat.description || `Browse custom verified listings under ${cat.name}`,
        "image": getCategoryImageUrl(cat.name, cat.image_url),
      },
    })),
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(galleryJsonLd) }}
      />

      <DashboardHeader title="Collections" />

      {/* Header back bar */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-8 pb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Marketplace
        </Link>
      </div>

      {/* Showcase Hero Intro */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-4">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.4em] text-primary font-black">
          <Sparkles className="w-3.5 h-3.5 animate-pulse" />
          Immersive Catalog
        </div>
        <h1 className="text-3xl md:text-5xl uppercase tracking-tight font-black text-foreground">
          Categories & Brands
        </h1>
        <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
          Discover a rich ecosystem of campus-verified brands and categories. Easily narrow down your search by selecting a brand tag or category cards below.
        </p>
      </section>

      {/* Custom category grids */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categoriesWithDetails.map((cat, index) => {
            const bgUrl = getCategoryImageUrl(cat.name, cat.image_url);

            return (
              <motion.div
                key={cat.id || cat.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                className="group relative h-[380px] rounded-[2.5rem] overflow-hidden border border-border/40 hover:border-primary/40 transition-all duration-300 flex flex-col justify-end p-6 hover:shadow-2xl hover:shadow-primary/5 bg-surface"
              >
                {/* Background image & gradient overlay */}
                <div
                  className="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform duration-500"
                  style={{ backgroundImage: `url(${bgUrl})` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent z-[1]" />

                {/* Content Overlay */}
                <div className="relative z-[2] space-y-4 w-full text-white">
                  <div className="flex justify-between items-start">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-[10px] font-bold uppercase tracking-wider">
                      <ShoppingBag className="w-3 h-3" />
                      {cat.productCount} active item{cat.productCount === 1 ? "" : "s"}
                    </span>
                    
                    <Link
                      href={`/?category=${encodeURIComponent(cat.name)}`}
                      className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white hover:scale-110 active:scale-95 transition-transform"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight">
                      {cat.name}
                    </h3>
                    {cat.description && (
                      <p className="text-xs text-white/70 line-clamp-2">
                        {cat.description}
                      </p>
                    )}
                  </div>

                  {/* Horizontally scrolling brand tags */}
                  <div className="space-y-2 pt-2 border-t border-white/10">
                    <p className="text-[10px] uppercase tracking-wider text-white/40 font-bold">
                      Available Brands
                    </p>
                    {cat.brands.length === 0 ? (
                      <p className="text-[11px] text-white/50 italic">
                        Generic or custom brands
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 max-h-[80px] overflow-y-auto scrollbar-hide">
                        {cat.brands.map((b: any) => (
                          <Link
                            key={b.id}
                            href={`/?category=${encodeURIComponent(cat.name)}&brand=${encodeURIComponent(b.name)}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 hover:bg-primary/80 transition-colors text-[10px] font-medium"
                          >
                            {b.image_url && (
                              <img
                                src={b.image_url}
                                alt=""
                                className="w-3.5 h-3.5 object-contain bg-white rounded-full p-0.5"
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
      </section>

      {/* Global Brands Directory Section */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 py-10 bg-surface/30 rounded-[3rem] border border-border/40">
        <div className="space-y-8">
          <div className="space-y-2">
            <h2 className="text-xl md:text-2xl font-extrabold uppercase tracking-tight text-foreground flex items-center gap-2">
              <Layers className="w-5 h-5 text-primary" />
              General Brand Directory
            </h2>
            <p className="text-xs text-muted-foreground">
              Browse some of the most popular associated brands on the campus marketplace.
            </p>
          </div>

          {brands.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">
              No registered brands yet.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {brands.map((b) => (
                <Link
                  key={b.id}
                  href={`/?category=${encodeURIComponent(b.category?.name || "")}&brand=${encodeURIComponent(b.name)}`}
                  className="flex flex-col items-center justify-center p-4 rounded-3xl bg-surface border border-border hover:border-primary/40 transition-all duration-300 group hover:shadow-lg"
                >
                  <div className="h-12 w-12 rounded-2xl overflow-hidden bg-white border border-border flex items-center justify-center p-2 mb-2 group-hover:scale-105 transition-transform">
                    {b.image_url ? (
                      <img src={b.image_url} alt={b.name} className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-sm font-black uppercase text-muted-foreground/30">
                        {b.name.charAt(0)}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-bold text-foreground text-center truncate w-full">
                    {b.name}
                  </span>
                  <span className="text-[9px] text-muted-foreground truncate w-full text-center">
                    {b.category?.name || "Generic"}
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
