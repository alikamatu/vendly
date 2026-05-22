import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Filter, X, Tag, CreditCard, SortAsc, LayoutGrid } from "lucide-react";
import Button from "../ui/Button";
import Portal from "../common/Portal";

interface ProductFiltersProps {
  categories: any[];
  currentCategory: string | null;
  onCategoryChange: (category: string | null) => void;
  priceRange: [number, number];
  onPriceChange: (range: [number, number]) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
  resultsCount: number;
}

export default function ProductFilters({
  categories,
  currentCategory,
  onCategoryChange,
  priceRange,
  onPriceChange,
  sortBy,
  onSortChange,
  resultsCount = 0
}: ProductFiltersProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Handle body scroll lock
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isMobileMenuOpen]);

  const sortOptions = [
    { label: "Newest First", value: "newest" },
    { label: "Price: Low to High", value: "price_asc" },
    { label: "Price: High to Low", value: "price_desc" },
    { label: "Alphabetical", value: "alpha" },
  ];

  return (
    <div className="space-y-0 md:space-y-8">
      {/* Search Result Bar & Filter Toggle */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="hidden md:block">
           <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-primary mb-1">
             <LayoutGrid size={12} />
             Marketplace
           </div>
           <h2 className="text-xl md:text-2xl uppercase tracking-tight">
             {currentCategory || "All Products"} 
             <span className="ml-3 text-sm text-muted normal-case tracking-normal opacity-50">
               ({resultsCount} items)
             </span>
           </h2>
        </div>

        <div className="flex items-center gap-2">
          {/* Desktop Sort */}
          <div className="hidden md:flex items-center gap-2 bg-surface border border-border/50 rounded-2xl px-4 h-12">
             <SortAsc size={16} className="text-muted" />
             <select 
               value={sortBy}
               onChange={(e) => onSortChange(e.target.value)}
               className="bg-transparent text-[11px] font-medium uppercase tracking-wider outline-none cursor-pointer"
             >
               {sortOptions.map(opt => (
                 <option key={opt.value} value={opt.value}>{opt.label}</option>
               ))}
             </select>
          </div>

          <Button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="flex h-12 rounded-2xl gap-2 text-[10px] uppercase"
          >
            <Filter size={16} /> Refine Results
          </Button>
        </div>
      </div>

      {/* Category Pills (Horizontal Scroll) */}
      <div className="hidden md:flex items-center gap-2 overflow-x-auto pb-4 scrollbar-hide no-scrollbar -mx-4 px-4">
        <button
          onClick={() => onCategoryChange(null)}
          className={`px-6 py-3 rounded-2xl text-[10px] font-medium uppercase tracking-wider transition-all whitespace-nowrap border ${
            currentCategory === null 
              ? "bg-primary text-red-500 border-primary shadow-lg shadow-primary/20" 
              : "bg-surface text-muted border-border/50 hover:border-primary/30"
          }`}
        >
          All Items
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id || cat.name}
            onClick={() => onCategoryChange(cat.name)}
            className={`px-6 py-3 rounded-2xl text-[10px] uppercase tracking-wider transition-all whitespace-nowrap border ${
              currentCategory === cat.name
                ? "bg-primary text-red-500 border-primary shadow-lg shadow-primary/20"
                : "bg-surface text-muted border-border/50 hover:border-primary/30"
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Mobile/Refine Modal via Portal */}
      <Portal>
        <AnimatePresence>
          {isMobileMenuOpen && (
            <div className="fixed inset-0 z-[10000] flex items-end justify-center">
               {/* Backdrop */}
               <div 
                 onClick={() => setIsMobileMenuOpen(false)}
                 className="absolute inset-0"
               >
                 <motion.div 
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 1 }}
                   exit={{ opacity: 0 }}
                   className="absolute inset-0 bg-black/80 backdrop-blur-md"
                 />
               </div>

               {/* Panel */}
               <motion.div
                 initial={{ y: "100%" }}
                 animate={{ y: 0 }}
                 exit={{ y: "100%" }}
                 transition={{ type: "spring", damping: 32, stiffness: 350 }}
                 drag="y"
                 dragConstraints={{ top: 0 }}
                 dragElastic={0.2}
                 onDragEnd={(_, info) => {
                   if (info.offset.y > 100) setIsMobileMenuOpen(false);
                 }}
                 className="relative w-full max-w-2xl bg-background rounded-t-[3rem] shadow-2xl flex flex-col h-[90vh] md:h-[85vh] overflow-hidden border-t border-border"
               >
                 <div className="flex flex-col h-full" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                    {/* Drag Handle */}
                    <div className="w-16 h-1.5 bg-border/40 rounded-full mx-auto mt-4 shrink-0" />

                  <div className="px-8 py-6 md:p-10 border-b border-border/50 flex items-center justify-between shrink-0">
                     <h3 className="text-xl md:text-2xl uppercase tracking-tight">Refine Products</h3>
                     <button 
                       onClick={() => setIsMobileMenuOpen(false)}
                       className="p-3 bg-surface border border-border rounded-2xl text-muted hover:text-foreground transition-all"
                     >
                       <X size={20} />
                     </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-8 md:p-10 space-y-12 pb-32">
                     <div className="max-w-4xl mx-auto space-y-12">
                        {/* Sort Options (Mobile Only) */}
                        <section className="space-y-6 md:hidden">
                           <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-wider text-primary/60">
                              <SortAsc size={14} />
                              Order By
                           </div>
                           <div className="grid grid-cols-1 gap-2">
                             {sortOptions.map(opt => (
                                <button
                                  key={opt.value}
                                  onClick={() => onSortChange(opt.value)}
                                  className={`w-full text-left p-4 rounded-3xl text-[11px] font-medium uppercase tracking-wider transition-all border ${
                                    sortBy === opt.value ? "bg-primary/5 border-primary text-primary" : "bg-transparent border-border/50 text-muted"
                                  }`}
                                >
                                  {opt.label}
                                </button>
                             ))}
                           </div>
                        </section>

                        {/* Categories Section */}
                        <section className="space-y-6">
                           <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.3em] text-primary/60">
                              <Tag size={14} />
                              Browse Categories
                           </div>
                           <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                             <button
                               onClick={() => onCategoryChange(null)}
                               className={`w-full text-left p-5 rounded-3xl text-[11px] font-medium uppercase tracking-wider transition-all border ${
                                 currentCategory === null ? "bg-primary/5 border-primary text-primary" : "bg-transparent border-border/50 text-muted hover:bg-surface"
                               }`}
                             >
                               All Items
                             </button>
                             {categories.map((cat: any) => (
                               <button
                                 key={cat.id}
                                 onClick={() => onCategoryChange(cat.name)}
                                 className={`w-full text-left p-5 rounded-3xl text-[11px] font-medium uppercase tracking-wider transition-all border ${
                                   currentCategory === cat.name ? "bg-primary/5 border-primary text-primary" : "bg-transparent border-border/50 text-muted hover:bg-surface"
                                 }`}
                               >
                                 {cat.name}
                               </button>
                             ))}
                           </div>
                        </section>

                        {/* Price Range Section */}
                        <section className="space-y-8">
                           <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.3em] text-primary/60">
                              <CreditCard size={14} />
                              Budget Range (GH₵)
                           </div>
                           <div className="grid grid-cols-2 gap-6">
                              <div className="space-y-3">
                                 <label className="text-[10px] font-medium uppercase text-muted tracking-wider pl-2">Min Price</label>
                                 <input 
                                   type="number"
                                   value={priceRange[0]}
                                   onChange={(e) => onPriceChange([Number(e.target.value), priceRange[1]])}
                                   className="w-full h-16 bg-surface/50 border-2 border-border/50 rounded-3xl px-8 text-sm font-normal outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/5 transition-all"
                                   placeholder="0"
                                 />
                              </div>
                              <div className="space-y-3">
                                 <label className="text-[10px] font-medium uppercase text-muted tracking-wider pl-2">Max Price</label>
                                 <input 
                                   type="number"
                                   value={priceRange[1]}
                                   onChange={(e) => onPriceChange([priceRange[0], Number(e.target.value)])}
                                   className="w-full h-16 bg-surface/50 border-2 border-border/50 rounded-3xl px-8 text-sm font-normal outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/5 transition-all"
                                   placeholder="Any"
                                 />
                              </div>
                           </div>
                        </section>
                     </div>
                  </div>

                  {/* Fixed CTA at bottom */}
                  <div className="absolute bottom-0 inset-x-0 p-8 md:p-10 pt-4 bg-gradient-to-t from-background via-background to-transparent shrink-0">
                     <Button 
                       onClick={() => setIsMobileMenuOpen(false)}
                       className="w-full h-16 md:h-20 rounded-[2.5rem] uppercase tracking-wider shadow-2xl shadow-primary/20"
                     >
                       Show {resultsCount} Products
                     </Button>
                  </div>
                 </div>
               </motion.div>
            </div>
          )}
        </AnimatePresence>
      </Portal>
    </div>
  );
}
