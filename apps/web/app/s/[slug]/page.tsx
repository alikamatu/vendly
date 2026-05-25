"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, Loader2 } from "lucide-react";
import Link from "next/link";
import { storeApi } from "@/lib/api/store";
import { productApi } from "@/lib/api/product";
import ProductCard from "@/components/products/ProductCard";
import Button from "@/components/ui/Button";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import RecentlyViewed from "@/components/home/RecentlyViewed";
import StorefrontHeader from "@/components/store/StorefrontHeader";

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
          <h1 className="text-2xl font-medium uppercase tracking-tight">Store Not Found</h1>
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

      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-6 md:pt-10 pb-24 md:pb-32">
        <StorefrontHeader store={store} productsCount={products.length} />

        {/* Products Section - Masonry Layout like Homepage */}
        <div className="space-y-8">
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground px-2">
            Available Products
          </h2>

          <AnimatePresence mode="popLayout">
            {products.length > 0 ? (
              <motion.div 
                layout
                className="columns-2 md:columns-3 lg:columns-4 gap-2"
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
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  No items listed yet
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-16">
            <RecentlyViewed limit={12} title="Pick up where you left off" />
          </div>
        </div>
      </div>
    </div>
  );
}
