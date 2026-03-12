"use client";

import React, { useState, useEffect } from "react";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import Container from "@/components/common/Container";
import ProductCard from "@/components/products/ProductCard";
import { favoriteApi } from "@/lib/api/favorite";
import { ShoppingBag, Heart, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import Loading from "../loading";

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      setIsLoading(true);
      const data = await favoriteApi.getFavorites();
      setFavorites(data);
    } catch (err) {
      console.error("Failed to load favorites", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return <Loading />;

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="My Favorites" />

      <main className="py-12 pb-32">
        <Container>
          <div className="flex items-center justify-between mb-12">
            <div className="space-y-1">
               <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight flex items-center gap-3">
                 <Heart className="text-rose-500 fill-current" size={32} />
                 My Wishlist
               </h1>
               <p className="text-sm text-muted font-bold uppercase tracking-widest opacity-60">
                 {favorites.length} items saved
               </p>
            </div>
            <Link href="/" className="hidden md:flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted hover:text-foreground transition-colors">
              <ArrowLeft size={14} /> Back to market
            </Link>
          </div>

          <AnimatePresence mode="popLayout">
            {favorites.length > 0 ? (
              <div className="columns-2 md:columns-3 lg:columns-4 gap-4">
                {favorites.map((fav, idx) => (
                  <motion.div
                    key={fav.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3 }}
                  >
                    {/* favorite object has .product nested */}
                    <ProductCard product={fav.product} index={idx} />
                  </motion.div>
                ))}
              </div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="py-32 text-center space-y-8 border-2 border-dashed border-border rounded-[3rem] bg-surface/30"
              >
                <div className="w-24 h-24 bg-surface rounded-full flex items-center justify-center mx-auto shadow-sm">
                   <Heart size={40} className="text-muted opacity-20" />
                </div>
                <div className="space-y-4">
                   <h2 className="text-2xl font-black uppercase tracking-tight">Your wishlist is empty</h2>
                   <p className="text-sm text-muted font-bold max-w-xs mx-auto leading-relaxed uppercase tracking-wide opacity-60">
                     Find products you love and click the heart icon to save them for later.
                   </p>
                </div>
                <Link href="/">
                   <motion.button
                     whileHover={{ scale: 1.05 }}
                     whileTap={{ scale: 0.95 }}
                     className="px-8 py-4 bg-primary text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-primary/20"
                   >
                     Start Exploring
                   </motion.button>
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </Container>
      </main>
    </div>
  );
}
