"use client";

import React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  ExternalLink,
  ShoppingBag,
} from "lucide-react";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useCart } from "@/lib/contexts/cart-context";
import type { CartItem } from "@/lib/contexts/cart-context";

function CartLine({
  item,
  onUpdateQty,
  onRemove,
}: {
  item: CartItem;
  onUpdateQty: (productId: string, qty: number) => void;
  onRemove: (productId: string) => void;
}) {
  const price = parseFloat(String(item.price));
  const subtotal = price * item.quantity;
  const videoRef = React.useRef<HTMLVideoElement>(null);

  // Auto-play video on mount/item change
  React.useEffect(() => {
    if (item.videoUrl && videoRef.current) {
      videoRef.current.play().catch(() => {
        // Silent fail for autoplay restrictions
      });
    }
  }, [item.videoUrl]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl bg-surface/50 border border-border/50 group"
    >
      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden shrink-0 bg-surface border border-border/50 relative">
        {item.videoUrl ? (
          <video
            ref={videoRef}
            src={item.videoUrl}
            muted
            loop
            playsInline
            autoPlay
            className="w-full h-full object-cover"
          />
        ) : (
          <img
            src={item.imageUrl || "/placeholder-product.png"}
            alt=""
            className="w-full h-full object-cover"
          />
        )}
      </div>
      <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-xs sm:text-sm font-black text-foreground uppercase tracking-tight line-clamp-2">
            {item.title}
          </h3>
          <p className="text-[10px] sm:text-xs font-bold text-primary mt-0.5">
            GH₵{price.toLocaleString()} each
          </p>
        </div>
        <div className="flex items-center justify-between sm:justify-end gap-3">
          <div className="flex items-center gap-1 rounded-xl bg-background border border-border/50 p-1">
            <button
              type="button"
              onClick={() => onUpdateQty(item.productId, item.quantity - 1)}
              className="p-2 rounded-lg text-muted hover:text-foreground hover:bg-surface transition-colors"
              aria-label="Decrease quantity"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="min-w-[1.5rem] text-center text-xs font-black tabular-nums">
              {item.quantity}
            </span>
            <button
              type="button"
              onClick={() => onUpdateQty(item.productId, item.quantity + 1)}
              className="p-2 rounded-lg text-muted hover:text-foreground hover:bg-surface transition-colors"
              aria-label="Increase quantity"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <span className="text-xs font-black text-foreground min-w-[4rem] text-right">
            GH₵{subtotal.toLocaleString()}
          </span>
          <button
            type="button"
            onClick={() => onRemove(item.productId)}
            className="p-2 rounded-xl text-muted hover:text-red-500 hover:bg-red-500/10 transition-colors"
            aria-label="Remove"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

import { useAuth } from "@/lib/contexts/auth-context";
import { useRouter } from "next/navigation";
import { Loader2, Info } from "lucide-react";
import { useAuthModal } from "@/lib/contexts/auth-modal-context";

export default function CartPage() {
  const { groupedByVendor, itemCount, totalPrice, updateQuantity, removeItem } = useCart();
  const { token } = useAuth();
  const { openLogin } = useAuthModal();
  const router = useRouter();
  const [isCheckingOut, setIsCheckingOut] = React.useState<string | null>(null);

  const handleCheckoutClick = async (group: any) => {
    if (!token) {
      openLogin({
        message: `Sign in to complete your purchase from ${group.storeName}`,
        onSuccess: () => {
          router.push(`/cart/checkout?store=${encodeURIComponent(group.storeLink)}`);
        }
      });
      return;
    }
    router.push(`/cart/checkout?store=${encodeURIComponent(group.storeLink)}`);
    setIsCheckingOut(group.storeLink);
    setTimeout(() => setIsCheckingOut(null), 300);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <DashboardHeader title="Cart" />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 md:px-8 pt-20 sm:pt-24 pb-28 sm:pb-24">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-bold text-muted hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Continue shopping
        </Link>

        {/* Accountability Summary */}
        <AnimatePresence mode="wait">
          {itemCount > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between px-6 py-5 bg-primary/5 rounded-[2rem] border border-primary/10 mb-8"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-primary rounded-2xl shadow-lg shadow-primary/20">
                  <Info className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-wider leading-none mb-1">Session Summary</h4>
                  <p className="text-[9px] text-muted font-bold uppercase tracking-widest">{itemCount} items • {groupedByVendor.length} stores</p>
                </div>
              </div>
              <div className="text-right pl-6 border-l border-primary/20">
                <p className="text-[10px] font-black text-muted uppercase tracking-widest leading-none mb-1">Global Total</p>
                <p className="text-base font-black text-primary">GH₵{totalPrice.toLocaleString()}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {itemCount === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="py-16 sm:py-24 text-center"
            >
              <div className="w-20 h-20 mx-auto rounded-3xl bg-surface border-2 border-dashed border-border flex items-center justify-center mb-6">
                <ShoppingCart className="w-10 h-10 text-muted" />
              </div>
              <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight">Your cart is empty</h2>
              <p className="text-xs text-muted font-medium mt-2 max-w-xs mx-auto">
                Add items from campus sellers to start building your order.
              </p>
              <Link href="/" className="inline-block mt-8">
                <Button size="lg" className="rounded-2xl font-black uppercase tracking-widest text-xs">
                  <ShoppingBag className="w-4 h-4" /> Browse products
                </Button>
              </Link>
            </motion.div>
          ) : (
            <motion.div
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              {groupedByVendor.map((group, groupIndex) => (
                <motion.section
                  key={group.storeLink}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: groupIndex * 0.05 }}
                >
                  <Card
                    className="p-5 sm:p-7 border border-border/50 rounded-[2.5rem] overflow-hidden"
                    hoverEffect={false}
                  >
                    <div className="flex items-center gap-4 pb-5 mb-5 border-b border-border/50">
                      <div className="w-12 h-12 rounded-2xl overflow-hidden bg-surface border border-border/50 shrink-0 shadow-sm">
                        {group.logoUrl ? (
                          <img src={group.logoUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-sm font-black text-muted uppercase">
                            {group.storeName[0]}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-black uppercase tracking-tight truncate leading-none mb-1">
                          {group.storeName}
                        </h3>
                        <p className="text-[10px] font-bold text-muted">@{group.storeLink}</p>
                      </div>
                      <div className="text-right hidden sm:block pr-4">
                        <p className="text-[9px] font-black text-muted uppercase tracking-widest leading-none mb-1">Store Stats</p>
                        <p className="text-[11px] font-black">{group.totalItems} items</p>
                      </div>
                      <Link
                        href={`/s/${group.storeLink}`}
                        className="p-3 rounded-2xl bg-surface border border-border/50 text-muted hover:text-primary transition-all shrink-0"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    </div>

                    <div className="space-y-4">
                      {group.items.map((item) => (
                        <CartLine
                          key={item.productId}
                          item={item}
                          onUpdateQty={updateQuantity}
                          onRemove={removeItem}
                        />
                      ))}
                    </div>

                    <div className="mt-8 pt-6 border-t border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                      <div className="flex items-center gap-8">
                        <div>
                          <p className="text-[10px] font-bold text-muted uppercase tracking-widest leading-none mb-1.5">Subtotal</p>
                          <p className="text-sm font-black text-foreground">
                            GH₵{group.totalPrice.toLocaleString()}
                          </p>
                        </div>
                      </div>
                      
                      <Button 
                        size="lg"
                        disabled={isCheckingOut === group.storeLink}
                        onClick={() => handleCheckoutClick(group)}
                        className="rounded-2xl px-10 font-black uppercase tracking-widest text-[10px] h-12 shadow-xl shadow-primary/10"
                      >
                        {isCheckingOut === group.storeLink ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          "Go to Checkout"
                        )}
                      </Button>
                    </div>
                  </Card>
                </motion.section>
              ))}

              {/* Final Conclusion */}
              <div className="pt-12 pb-20 text-center border-t border-border/50">
                <div className="max-w-xs mx-auto space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-muted uppercase tracking-widest">Total items ordered</span>
                    <span className="text-xs font-black">{itemCount}</span>
                  </div>
                  <div className="flex items-center justify-between pb-4">
                    <span className="text-sm font-black uppercase tracking-tight">Combined Cart Balance</span>
                    <span className="text-xl font-black text-primary">GH₵{totalPrice.toLocaleString()}</span>
                  </div>
                </div>
                <p className="text-[10px] text-muted italic mt-6 px-4">
                  * Note: Each store processes its own delivery. Checkout per store for maximum accountability.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </main>
    </div>
  );
}



