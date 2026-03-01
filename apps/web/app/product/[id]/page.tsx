"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, 
  ShoppingCart, 
  ChevronLeft, 
  ChevronRight, 
  Store, 
  Tag, 
  Info, 
  Check, 
  Sparkles,
  Share2,
  Heart
} from "lucide-react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { productApi } from "@/lib/api/product";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

export default function ProductDetailsPage() {
  const router = useRouter();
  const { id } = useParams();
  const [product, setProduct] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const data = await productApi.getProductById(id as string);
        setProduct(data);
      } catch (err) {
        console.error("Failed to fetch product", err);
      } finally {
        setIsLoading(false);
      }
    };
    if (id) fetchProduct();
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
         <motion.div 
           animate={{ scale: [1, 1.1, 1] }} 
           transition={{ repeat: Infinity, duration: 1.5 }}
           className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full" 
         />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background p-8 text-center flex flex-col items-center justify-center gap-4">
        <h2 className="text-xl font-black uppercase">Product not found</h2>
        <Button onClick={() => router.push("/")}>Back to browse</Button>
      </div>
    );
  }

  const images: string[] = product.image_urls.length > 0 ? product.image_urls : ["/placeholder-product.png"];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-background pb-20"
    >
      {/* Navigation Header */}
      <div className="fixed top-0 inset-x-0 h-20 bg-background/80 backdrop-blur-xl z-50 flex items-center justify-between px-6 border-b border-border/50">
        <button 
          onClick={() => router.back()}
          className="p-3 rounded-2xl bg-surface hover:bg-border/20 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3">
           <button className="p-3 rounded-2xl bg-surface hover:bg-border/20 transition-colors">
             <Share2 className="w-5 h-5" />
           </button>
           <button className="p-3 rounded-2xl bg-surface hover:bg-border/20 transition-colors text-red-500">
             <Heart className="w-5 h-5" />
           </button>
        </div>
      </div>

      <main className="pt-24 max-w-7xl mx-auto px-4 md:px-8 grid md:grid-cols-2 gap-8 lg:gap-16">
        {/* Left: Image Carousel */}
        <div className="space-y-6">
           <div className="relative aspect-[4/5] md:aspect-square bg-surface rounded-[2.5rem] overflow-hidden group">
              <AnimatePresence mode="wait">
                  <motion.div 
                    key={currentImageIndex}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="w-full h-full"
                  >
                    <img 
                      src={images[currentImageIndex]}
                      alt={product.title}
                      className="w-full h-full object-cover"
                    />
                  </motion.div>
               </AnimatePresence>

              {images.length > 1 && (
                <>
                  <button 
                    onClick={() => setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-2xl bg-white/90 text-black shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => setCurrentImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-2xl bg-white/90 text-black shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}

              {/* Image Indicators */}
              <div className="absolute bottom-6 inset-x-0 flex justify-center gap-2">
                 {images.map((_, idx) => (
                   <div 
                     key={idx}
                     className={`h-1.5 rounded-full transition-all duration-300 ${
                       idx === currentImageIndex ? "w-8 bg-white" : "w-1.5 bg-white/50"
                     }`}
                   />
                 ))}
              </div>
           </div>

           {/* Thumbnails */}
           <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {images.map((src, idx) => (
                <button 
                  key={idx}
                  onClick={() => setCurrentImageIndex(idx)}
                  className={`relative w-20 h-20 rounded-2xl overflow-hidden border-2 transition-all shrink-0 ${
                    idx === currentImageIndex ? "border-primary scale-105" : "border-transparent opacity-50"
                  }`}
                >
                  <img src={src} className="w-full h-full object-cover" />
                </button>
              ))}
           </div>
        </div>

        {/* Right: Product Info */}
        <div className="space-y-10">
           <motion.div 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.2 }}
             className="space-y-4"
           >
              <div className="flex items-center gap-2 text-primary text-[10px] font-black uppercase tracking-[0.2em]">
                <Sparkles className="w-3 h-3" /> Campus Favorite
              </div>
              <h1 className="text-3xl lg:text-5xl font-black tracking-tighter leading-tight uppercase">
                {product.title}
              </h1>
              <div className="flex items-center gap-4">
                 <span className="text-3xl font-black text-red-500">
                    GH₵{parseFloat(product.price).toLocaleString()}
                 </span>
                 <div className="px-3 py-1 bg-emerald-500/10 text-emerald-500 text-[10px] font-bold rounded-full uppercase tracking-wider flex items-center gap-1">
                   <Check className="w-3 h-3" /> In Stock
                 </div>
              </div>
           </motion.div>

           {/* Tabs / Description */}
           <motion.div 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.3 }}
             className="space-y-4"
           >
              <div className="flex items-center gap-2 text-[10px] font-bold text-muted uppercase tracking-widest">
                <Info className="w-4 h-4" /> Description
              </div>
              <p className="text-sm font-medium text-muted leading-relaxed">
                {product.description || "No description provided for this item."}
              </p>
           </motion.div>

           {/* Tags */}
           {product.tags && product.tags.length > 0 && (
             <motion.div 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.4 }}
               className="flex flex-wrap gap-2"
             >
                {product.tags.map((tag: string) => (
                  <span key={tag} className="flex items-center gap-1.5 px-4 py-2 bg-surface border border-border/50 rounded-xl text-[10px] font-bold text-muted hover:text-foreground hover:border-primary/30 transition-all cursor-default uppercase">
                    <Tag className="w-3 h-3" /> {tag}
                  </span>
                ))}
             </motion.div>
           )}

           {/* Seller Info Card */}
           <motion.div 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.5 }}
           >
              <Card className="p-6 border-none bg-surface/50 rounded-[2rem]">
                 <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                       <div className="w-14 h-14 rounded-2xl bg-border/20 overflow-hidden border border-border/50">
                          {product.seller.logo_url ? (
                            <img src={product.seller.logo_url} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-lg font-black uppercase">
                               {product.seller.store_name[0]}
                            </div>
                          )}
                       </div>
                       <div>
                          <h4 className="text-sm font-black uppercase tracking-tight">{product.seller.store_name}</h4>
                          <p className="text-[10px] text-muted font-bold">@{product.seller.store_link}</p>
                       </div>
                    </div>
                    <Link 
                      href={`/s/${product.seller.store_link}`}
                      className="px-5 py-3 bg-white text-black text-[10px] font-black uppercase rounded-2xl hover:scale-105 transition-transform"
                    >
                      Visit
                    </Link>
                 </div>
              </Card>
           </motion.div>

           {/* Actions */}
           <motion.div 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.6 }}
             className="flex flex-col sm:flex-row gap-4 pt-4"
           >
              <Button className="h-16 flex-1 rounded-[2rem] font-black uppercase tracking-widest text-xs gap-3">
                <ShoppingCart className="w-4 h-4" /> Add to Cart
              </Button>
               <Button variant="secondary" className="h-16 flex-1 rounded-[2rem] font-black uppercase tracking-widest text-xs bg-black text-white border-none hover:bg-black/90 group">
                Buy Now
              </Button>
           </motion.div>
        </div>
      </main>
    </motion.div>
  );
}
