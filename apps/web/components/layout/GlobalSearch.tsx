"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Loader2, ArrowRight, ShoppingBag, Store, Tag, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { productApi } from "@/lib/api/product";
import Portal from "../common/Portal";

// aliases used to bypass strict framer-motion prop typings
const MotionDiv: any = motion.div;
const MotionButton: any = motion.button;

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCats, setIsLoadingCats] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Handle body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      fetchCategories();
    } else {
      document.body.style.overflow = "unset";
      setQuery("");
      setSuggestions([]);
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Focus effect
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 500); // Slightly longer wait for portal/animation
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Search effect
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (query.trim().length > 1) {
        fetchSuggestions();
      } else {
        setSuggestions([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const fetchCategories = async () => {
    try {
      setIsLoadingCats(true);
      const data = await productApi.getCategories();
      setCategories(data);
    } catch (err) {
      console.error("Failed to fetch categories", err);
    } finally {
      setIsLoadingCats(false);
    }
  };

  const fetchSuggestions = async () => {
    try {
      setIsLoading(true);
      const data = await productApi.searchProducts(query);
      setSuggestions(data);
    } catch (err) {
      console.error("Failed to search products", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (item: any) => {
    router.push(`/product/${item.id}`);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  };

  return (
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[10000] flex items-end">
             {/* Backdrop */}
{/* backdrop; cast to any to sidestep motion typing limits */}
              {/* Note: we create a local alias at top of file */}
              <MotionDiv
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={onClose}
               className="absolute inset-0 bg-black/80 backdrop-blur-md"
             />

             {/* Search Drawer */}
             <MotionDiv
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 32, stiffness: 350 }}
                drag="y"
                dragConstraints={{ top: 0 }}
                dragElastic={0.2}
                onDragEnd={( _event: any, info: any ) => {
                  if (info.offset.y > 100) onClose();
                }}
                className="relative w-full bg-background rounded-t-[3rem] shadow-2xl flex flex-col h-[90vh] md:h-[85vh] overflow-hidden border-t border-border"
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
             >
                {/* Drag Handle */}
                <div className="w-16 h-1.5 bg-border/40 rounded-full mx-auto mt-4 shrink-0" />

                {/* Header */}
                <header className="px-6 pt-6 pb-6 md:px-12 md:pt-10 border-b border-border/50 shrink-0">
                  <div className="max-w-4xl mx-auto flex items-center gap-4">
                    <div className="relative flex-1 group">
                      <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-muted group-focus-within:text-primary transition-colors" />
                      <input
                        ref={inputRef}
                        type="text"
                        placeholder="Search products, categories, stores..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="w-full h-14 md:h-16 pl-14 pr-14 bg-surface/50 border-2 border-border/50 rounded-3xl text-sm md:text-base font-bold outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/5 transition-all"
                      />
                      {isLoading && (
                        <div className="absolute right-14 top-1/2 -translate-y-1/2">
                          <Loader2 className="w-5 h-5 text-primary animate-spin" />
                        </div>
                      )}
                    </div>
                    <button 
                      onClick={onClose}
                      className="p-3 md:p-4 rounded-2xl bg-surface border border-border/50 text-muted active:scale-90 transition-all shadow-sm"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </header>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-8 md:px-12 md:py-10">
                   <div className="max-w-4xl mx-auto space-y-10">
                      {query.length > 0 ? (
                        <div className="space-y-6">
                           <p className="px-2 text-[10px] font-black uppercase tracking-[0.3em] text-primary/60">Results</p>
                           {suggestions.length > 0 ? (
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                               {suggestions.map((item, idx) => (
                                  <MotionButton
                                   key={item.id}
                                   initial={{ opacity: 0, y: 10 }}
                                   animate={{ opacity: 1, y: 0 }}
                                   transition={{ delay: idx * 0.03 }}
                                   onClick={() => handleSelect(item)}
                                   className="flex items-center gap-4 p-4 rounded-3xl bg-surface/30 border border-border/50 hover:border-primary/30 hover:bg-primary transition-all text-left group"
                                 >
                                    <div className="w-16 h-16 rounded-2xl border border-border/50 overflow-hidden bg-white shrink-0 relative group">
                                      {item.video_url ? (
                                        <video 
                                          src={item.video_url} 
                                          autoPlay 
                                          muted 
                                          loop 
                                          playsInline 
                                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                        />
                                      ) : (
                                        <img src={item.image_urls[0] || '/placeholder.png'} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="" />
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                       <h4 className="text-xs font-black uppercase tracking-tight truncate mb-1">{item.title}</h4>
                                       <div className="flex items-center gap-3">
                                          <span className="text-[9px] font-black uppercase tracking-widest text-primary">{item.category}</span>
                                          <span className="text-[9px] font-bold text-muted uppercase tracking-widest italic">{item.seller.store_name}</span>
                                       </div>
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-all" />
                                 </MotionButton>
                               ))}
                             </div>
                           ) : !isLoading && (
                             <div className="py-20 text-center space-y-4">
                               <ShoppingBag className="w-12 h-12 text-muted mx-auto opacity-10" />
                               <p className="text-[11px] font-black uppercase tracking-widest text-muted">No products found</p>
                             </div>
                           )}
                        </div>
                      ) : (
                        <div className="space-y-10">
                          <section className="space-y-6">
                            <div className="flex items-center gap-3">
                              <Sparkles className="w-4 h-4 text-primary" />
                              <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-foreground">Trending Categories</h3>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                              {isLoadingCats ? (
                                Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-14 bg-surface rounded-2xl animate-pulse" />)
                              ) : (
                                categories.map((cat, idx) => (
                                  <MotionButton
                                    key={cat.id}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: idx * 0.04 }}
                                    onClick={() => setQuery(cat.name)}
                                    className="flex items-center gap-3 p-4 rounded-3xl bg-surface border border-border/50 hover:border-primary/30 hover:bg-white transition-all text-left active:scale-95 group"
                                  >
                                    <Tag className="w-4 h-4 text-primary group-hover:rotate-12 transition-transform" />
                                    <span className="text-[10px] font-black uppercase tracking-tight truncate">{cat.name}</span>
                                  </MotionButton>
                                ))
                              )}
                            </div>
                          </section>
                        </div>
                      )}
                   </div>
                </div>

                {/* Footer */}
                <footer className="px-10 py-6 border-t border-border/50 bg-background shrink-0 flex items-center justify-between">
                   <p className="text-[9px] font-black text-muted uppercase tracking-widest opacity-40">Drag down to close</p>
                   <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                </footer>
             </MotionDiv>
          </div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
