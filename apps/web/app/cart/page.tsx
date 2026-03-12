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
import { useCart } from "@/lib/cart-context";
import type { CartItem } from "@/lib/cart-context";

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

const CheckoutModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  isProcessing,
  storeName 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onConfirm: (data: any) => void;
  isProcessing: boolean;
  storeName: string;
}) => {
  const [formData, setFormData] = React.useState({
    customerName: "",
    customerPhone: "",
    deliveryMethod: "PICKUP",
    deliveryLocation: "",
    deliveryNotes: ""
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-background/80 backdrop-blur-sm cursor-pointer"
        {...({ onClick: onClose } as any)}
      />
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="relative w-full max-w-lg bg-background border border-border shadow-2xl rounded-[2.5rem] overflow-hidden p-6 sm:p-8"
      >
        <div className="mb-8">
          <h2 className="text-xl font-black uppercase tracking-tight mb-2">Checkout Details</h2>
          <p className="text-[10px] text-muted font-bold uppercase tracking-widest">Store: {storeName}</p>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted ml-1">Full Name</label>
              <input 
                value={formData.customerName}
                onChange={e => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
                placeholder="Ex. John Doe"
                className="w-full h-12 px-4 rounded-2xl bg-surface border border-border/50 text-xs font-bold focus:border-primary transition-colors outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted ml-1">Phone Number</label>
              <input 
                value={formData.customerPhone}
                onChange={e => setFormData(prev => ({ ...prev, customerPhone: e.target.value }))}
                placeholder="Ex. 0244000000"
                className="w-full h-12 px-4 rounded-2xl bg-surface border border-border/50 text-xs font-bold focus:border-primary transition-colors outline-none"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted ml-1">Delivery Method</label>
            <div className="grid grid-cols-2 gap-3 p-1 rounded-2xl bg-surface border border-border/50">
               <button 
                 onClick={() => setFormData(prev => ({ ...prev, deliveryMethod: 'PICKUP' }))}
                 className={`py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.deliveryMethod === 'PICKUP' ? 'bg-background text-primary shadow-sm' : 'text-muted'}`}
               >
                 Pickup
               </button>
               <button 
                 onClick={() => setFormData(prev => ({ ...prev, deliveryMethod: 'DELIVERY' }))}
                 className={`py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.deliveryMethod === 'DELIVERY' ? 'bg-background text-primary shadow-sm' : 'text-muted'}`}
               >
                 Delivery
               </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted ml-1">
              {formData.deliveryMethod === 'DELIVERY' ? 'Delivery Location' : 'Pickup Point'}
            </label>
            <input 
              value={formData.deliveryLocation}
              onChange={e => setFormData(prev => ({ ...prev, deliveryLocation: e.target.value }))}
              placeholder={formData.deliveryMethod === 'DELIVERY' ? "Hostel, Room #" : "Campus Landmark"}
              className="w-full h-12 px-4 rounded-2xl bg-surface border border-border/50 text-xs font-bold focus:border-primary transition-colors outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted ml-1">Notes (Optional)</label>
            <textarea 
              value={formData.deliveryNotes}
              onChange={e => setFormData(prev => ({ ...prev, deliveryNotes: e.target.value }))}
              placeholder="Any specific instructions for the seller?"
              className="w-full h-24 p-4 rounded-2xl bg-surface border border-border/50 text-xs font-bold focus:border-primary transition-colors outline-none resize-none"
            />
          </div>
        </div>

        <div className="mt-10 flex gap-3">
          <Button 
            variant="secondary" 
            className="flex-1 rounded-2xl h-12 font-black uppercase tracking-widest text-[10px]"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button 
            disabled={isProcessing || !formData.customerName || !formData.customerPhone || !formData.deliveryLocation}
            className="flex-[2] rounded-2xl h-12 font-black uppercase tracking-widest text-[10px]"
            onClick={() => onConfirm(formData)}
          >
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Order"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

import { orderApi } from "@/lib/api/order";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, Info } from "lucide-react";

export default function CartPage() {
  const { groupedByVendor, itemCount, totalPrice, updateQuantity, removeItem, clearCart } = useCart();
  const { token } = useAuth();
  const router = useRouter();
  const [isCheckingOut, setIsCheckingOut] = React.useState<string | null>(null);
  const [orderSuccess, setOrderSuccess] = React.useState<string | null>(null);
  const [activeCheckout, setActiveCheckout] = React.useState<{ storeLink: string; storeName: string; items: CartItem[] } | null>(null);

  const handleCheckoutClick = (storeLink: string, storeName: string, items: CartItem[]) => {
    if (!token) {
      router.push("/login?redirect=/cart");
      return;
    }
    setActiveCheckout({ storeLink, storeName, items });
  };

  const processOrder = async (details: any) => {
    if (!activeCheckout) return;
    
    setIsCheckingOut(activeCheckout.storeLink);
    try {
      await orderApi.createOrder(
        token!,
        activeCheckout.storeLink,
        activeCheckout.items.map(i => ({ productId: i.productId, quantity: i.quantity })),
        details
      );
      
      setOrderSuccess(activeCheckout.storeLink);
      // Remove items from cart after successful order
      activeCheckout.items.forEach(i => removeItem(i.productId));
      
      setTimeout(() => setOrderSuccess(null), 5000);
      setActiveCheckout(null);
    } catch (err: any) {
      alert(err.message || "Failed to place order");
    } finally {
      setIsCheckingOut(null);
    }
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
                  <Info className="w-4 h-4 text-white" />
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
                      
                      {orderSuccess === group.storeLink ? (
                        <div className="flex items-center gap-2 text-emerald-500 font-black text-[10px] uppercase tracking-wider bg-emerald-500/10 px-6 py-3 rounded-2xl border border-emerald-500/20">
                          <CheckCircle2 className="w-4 h-4" />
                          Order placed sucessfully!
                        </div>
                      ) : (
                        <Button 
                          size="lg"
                          disabled={isCheckingOut === group.storeLink}
                          onClick={() => handleCheckoutClick(group.storeLink, group.storeName, group.items)}
                          className="rounded-2xl px-10 font-black uppercase tracking-widest text-[10px] h-12 shadow-xl shadow-primary/10"
                        >
                          {isCheckingOut === group.storeLink ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            "Confirm Group Order"
                          )}
                        </Button>
                      )}
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

        <AnimatePresence>
          {activeCheckout && (
            <CheckoutModal 
              isOpen={!!activeCheckout}
              onClose={() => setActiveCheckout(null)}
              onConfirm={processOrder}
              isProcessing={!!isCheckingOut}
              storeName={activeCheckout.storeName}
            />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}



