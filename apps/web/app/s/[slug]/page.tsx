"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, MessageCircle, Share2, ShoppingBag, Loader2 } from "lucide-react";
import Link from "next/link";
import { storeApi } from "@/lib/api/store";
import { productApi } from "@/lib/api/product";
import ProductCard from "@/components/products/ProductCard";
import Button from "@/components/ui/Button";
import DashboardHeader from "@/components/dashboard/DashboardHeader";

export default function StorePage() {
  const { slug } = useParams();
  const [store, setStore] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;

    const fetchStoreData = async () => {
      try {
        setLoading(true);
        const [storeData, productsData] = await Promise.all([
          storeApi.getStoreBySlug(slug as string),
          productApi.getProductsByStoreSlug(slug as string)
        ]);
        setStore(storeData);
        setProducts(productsData);
      } catch (err: any) {
        setError(err.message || "Failed to load store");
      } finally {
        setLoading(false);
      }
    };

    fetchStoreData();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-muted-foreground font-medium animate-pulse">Loading storefront...</p>
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
          <h1 className="text-2xl font-black uppercase tracking-tight">Store Not Found</h1>
          <p className="text-muted-foreground">{error || "The store you're looking for doesn't exist or has been moved."}</p>
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
    <div className="min-h-screen bg-background">
      <DashboardHeader title={store.store_name} />

      <div className="max-w-7xl mx-auto px-6 md:px-8 pt-10 pb-32">
        {/* Simplified Store Header - At very top below navbar */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row gap-8 items-start border-b border-border pb-12 mb-12"
        >
          {/* Logo - Flat, No Shadow */}
          <div className="shrink-0">
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-3xl overflow-hidden border border-border bg-muted">
              {store.logo_url ? (
                <img src={store.logo_url} alt={store.store_name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-primary/5 text-3xl font-black uppercase text-primary">
                  {store.store_name[0]}
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 space-y-4 pt-1">
            <div className="space-y-1">
              <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter text-foreground">
                {store.store_name}
              </h1>
              <p className="text-primary text-sm font-bold tracking-tight">@{store.store_link}</p>
            </div>
            
            <p className="text-muted-foreground text-sm leading-relaxed max-w-2xl font-medium">
              {store.bio || "Welcome to my shop!"}
            </p>

            <div className="flex flex-wrap gap-3 pt-1 text-[10px] font-black uppercase tracking-widest">
              {store.location && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-full text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  {store.location}
                </div>
              )}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-full text-muted-foreground">
                <ShoppingBag className="w-3 h-3" />
                {products.length} Items
              </div>
            </div>
          </div>

          {/* Actions - Flat Buttons */}
          <div className="shrink-0 w-full md:w-auto flex flex-col gap-3 md:pt-2">
            <Button 
              variant="primary" 
              className="w-full md:px-8 gap-2 shadow-none"
              onClick={() => window.open(`https://wa.me/${store.whatsapp_number}`, '_blank')}
            >
              <MessageCircle className="w-4 h-4" />
              Contact Seller
            </Button>
            <Button variant="secondary" className="w-full gap-2 text-[10px] uppercase font-black tracking-widest shadow-none">
              <Share2 className="w-3 h-3" />
              Share Shop
            </Button>
          </div>
        </motion.div>

        {/* Products Section - Masonry Layout like Homepage */}
        <div className="space-y-8">
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground px-2">
            Available Products
          </h2>

          <AnimatePresence mode="popLayout">
            {products.length > 0 ? (
              <motion.div 
                layout
                className="columns-2 md:columns-3 lg:columns-4 gap-6 space-y-6"
              >
                {products.map((product, idx) => (
                  <ProductCard key={product.id} product={product} index={idx} />
                ))}
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-20 text-center space-y-4 bg-muted/10 rounded-[2rem] border-2 border-dashed border-border"
              >
                <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto opacity-40">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                  No items listed yet
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
