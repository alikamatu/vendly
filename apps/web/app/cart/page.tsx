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

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl bg-surface/50 border border-border/50"
    >
      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden shrink-0 bg-surface border border-border/50">
        <img
          src={item.imageUrl || "/placeholder-product.png"}
          alt=""
          className="w-full h-full object-cover"
        />
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

export default function CartPage() {
  const { groupedByVendor, itemCount, totalPrice, updateQuantity, removeItem } = useCart();

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="Cart" />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 md:px-8 pt-20 sm:pt-24 pb-28 sm:pb-24">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-bold text-muted hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Continue shopping
        </Link>

        <AnimatePresence mode="wait">
          {itemCount === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="py-16 sm:py-24 text-center"
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", damping: 20 }}
                className="w-20 h-20 mx-auto rounded-3xl bg-surface border-2 border-dashed border-border flex items-center justify-center mb-6"
              >
                <ShoppingCart className="w-10 h-10 text-muted" />
              </motion.div>
              <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight text-foreground">
                Your cart is empty
              </h2>
              <p className="text-xs text-muted font-medium mt-2 max-w-xs mx-auto">
                Add items from campus sellers to see them here, grouped by store.
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
                    className="p-4 sm:p-6 border border-border/50 rounded-3xl overflow-hidden"
                    hoverEffect={false}
                  >
                    <div className="flex items-center gap-3 pb-4 mb-4 border-b border-border/50">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl overflow-hidden bg-surface border border-border/50 shrink-0">
                        {group.logoUrl ? (
                          <img
                            src={group.logoUrl}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-sm font-black text-muted uppercase">
                            {(group.storeName || "?")[0]}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-black text-foreground uppercase tracking-tight truncate">
                          {group.storeName || "Store"}
                        </h3>
                        <p className="text-[10px] font-bold text-muted">@{group.storeLink}</p>
                      </div>
                      <Link
                        href={`/s/${group.storeLink}`}
                        className="p-2.5 rounded-xl bg-surface border border-border/50 text-muted hover:text-primary hover:border-primary/30 transition-all shrink-0"
                        title="View store"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    </div>
                    <div className="space-y-3">
                      <AnimatePresence>
                        {group.items.map((item) => (
                          <CartLine
                            key={item.productId}
                            item={item}
                            onUpdateQty={updateQuantity}
                            onRemove={removeItem}
                          />
                        ))}
                      </AnimatePresence>
                    </div>
                  </Card>
                </motion.section>
              ))}

              {/* Sticky bottom bar: mobile first */}
              <motion.div
                layout
                className="fixed bottom-0 left-0 right-0 z-20 p-4 bg-background/95 backdrop-blur-md border-t border-border shadow-[0_-4px_24px_rgba(0,0,0,0.08)] dark:shadow-[0_-4px_24px_rgba(0,0,0,0.3)]"
              >
                <div className="max-w-3xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-bold text-muted uppercase tracking-widest">
                      Total ({itemCount} {itemCount === 1 ? "item" : "items"})
                    </p>
                    <p className="text-xl sm:text-2xl font-black text-foreground">
                      GH₵{totalPrice.toLocaleString()}
                    </p>
                  </div>
                  <Button
                    size="lg"
                    className="w-full sm:w-auto min-w-[180px] rounded-2xl font-black uppercase tracking-widest text-xs"
                  >
                    <ShoppingCart className="w-4 h-4" /> Checkout
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
