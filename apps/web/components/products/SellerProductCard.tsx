"use client";

import React, { useRef, useState } from "react";
import { motion, AnimatePresence, HTMLMotionProps } from "framer-motion";
import { Edit2, Trash2, AlertCircle, Flame } from "lucide-react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

interface SellerProductCardProps {
  product: {
    id: string;
    title: string;
    price: string;
    image_urls: string[];
    video_url?: string | null;
    status: string;
    is_featured?: boolean;
    quantity_available: number;
    category: string;
    created_at: string;
  };
  promotionState?: "idle" | "verifying" | "payment_required" | "failed";
  onDelete: (id: string) => void;
  onToggleHotSales: (id: string, currentState: boolean) => void;
  index: number;
}

export default function SellerProductCard({ product, promotionState = "idle", onDelete, onToggleHotSales, index }: SellerProductCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const handleMouseEnter = () => {
    if (product.video_url && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  };

  const handleMouseLeave = () => {
    if (product.video_url && videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  const statusColors: Record<string, string> = {
    active: "bg-emerald-500/10 text-emerald-500",
    draft: "bg-orange-500/10 text-orange-500",
    out_of_stock: "bg-red-500/10 text-red-500",
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className="group relative"
    >
      <Card className="overflow-hidden border-none bg-surface/40 hover:bg-surface/60 transition-all p-3 rounded-[2rem]" hoverEffect={false}>
        <div className="flex gap-4">
          {/* Media Preview */}
          <div 
            className="relative h-24 w-24 shrink-0 rounded-2xl overflow-hidden border border-border/50 bg-black/5"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            {product.video_url ? (
              <video
                ref={videoRef}
                src={product.video_url}
                muted
                loop
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <img 
                src={product.image_urls?.[0] || "/placeholder-product.png"} 
                alt={product.title}
                className="w-full h-full object-cover"
              />
            )}
            <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors" />
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
            <div>
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-xs font-black text-foreground truncate uppercase tracking-tight">
                  {product.title}
                </h3>
                <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${statusColors[product.status] || "bg-muted/10 text-muted"}`}>
                  {product.status.replace('_', ' ')}
                </span>
              </div>
              <p className="text-[10px] text-muted font-bold mt-1 uppercase tracking-wider">
                {product.category} • GH₵{parseFloat(product.price).toLocaleString()}
              </p>
              {product.is_featured && (
                <p className="text-[9px] font-black mt-1 text-amber-600 uppercase tracking-wider inline-flex items-center gap-1">
                  <Flame className="w-3 h-3" />
                  Hot Sales
                </p>
              )}
              {!product.is_featured && promotionState === "verifying" && (
                <p className="text-[9px] font-black mt-1 text-blue-500 uppercase tracking-wider">
                  Verifying Payment...
                </p>
              )}
              {!product.is_featured && promotionState === "failed" && (
                <p className="text-[9px] font-black mt-1 text-red-500 uppercase tracking-wider">
                  Verification Failed
                </p>
              )}
            </div>

            <div className="flex items-center gap-4 text-[9px] font-black uppercase tracking-widest text-muted/60">
              <span className="flex items-center gap-1">
                <Package className="w-3 h-3" /> {product.quantity_available} in stock
              </span>
              <span>
                Added {new Date(product.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 justify-center">
             <button
               className={`h-11 w-11 p-0 rounded-xl border-border/50 shadow-sm flex items-center justify-center transition-colors cursor-pointer ${
                 product.is_featured
                   ? "bg-amber-500/20 text-amber-600"
                   : "bg-surface-dark hover:text-amber-600"
               }`}
               onClick={() => onToggleHotSales(product.id, Boolean(product.is_featured))}
               disabled={promotionState === "verifying"}
               title={product.is_featured ? "Disable Hot Sales" : "Enable Hot Sales for 7 GHC"}
             >
               <Flame className="w-3 h-3" />
             </button>
             <Link href={`/dashboard/products/edit/${product.id}`}>
               <button className="h-11 w-11 p-0 rounded-xl bg-surface-dark border-border/50 shadow-sm hover:text-primary flex items-center justify-center transition-colors cursor-pointer">
                 <Edit2 className="w-3 h-3" />
               </button>
             </Link>
             <button 
               className="h-11 w-11 p-0 rounded-xl bg-surface-dark border-border/50 shadow-sm hover:text-red-500 flex items-center justify-center transition-colors cursor-pointer"
               onClick={() => setShowDeleteConfirm(true)}
             >
               <Trash2 className="w-3 h-3 text-red-600" />
             </button>
          </div>
        </div>
      </Card>

      {/* Delete Confirmation Overlay */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-10 rounded-[2rem] bg-surface-dark/95 backdrop-blur-md flex flex-col items-center justify-center p-4 py-8 text-center gap-3 border border-red-500/20 shadow-2xl shadow-red-500/5"
          >
            <div className="p-2 bg-red-500/10 rounded-xl">
              <AlertCircle className="w-5 h-5 text-red-500" />
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest">Remove Product?</p>
              <p className="text-[9px] text-muted font-bold uppercase tracking-wider italic">Action cannot be reversed</p>
            </div>
            <div className="flex gap-2 w-full max-w-[160px]">
              <Button 
                variant="secondary" 
                size="sm" 
                className="flex-1 h-8 rounded-xl text-[9px] font-black uppercase tracking-widest border-border/50"
                onClick={() => setShowDeleteConfirm(false)}
              >
                No
              </Button>
              <Button 
                variant="primary" 
                size="sm" 
                className="flex-1 h-8 rounded-xl text-[9px] font-black uppercase tracking-widest bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/20"
                onClick={() => {
                  onDelete(product.id);
                  setShowDeleteConfirm(false);
                }}
              >
                Yes
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function Package({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
      <path d="m3.3 7 8.7 5 8.7-5"/>
      <path d="M12 22V12"/>
    </svg>
  );
}
