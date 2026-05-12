"use client";

import React, { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useCart } from "@/lib/contexts/cart-context";
import { useAuth } from "@/lib/contexts/auth-context";
import { storeApi } from "@/lib/api/store";
import { orderApi } from "@/lib/api/order";

export default function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const storeLink = searchParams.get("store");
  const { groupedByVendor, removeItem } = useCart();
  const { token } = useAuth();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingStore, setIsLoadingStore] = useState(false);
  const [paymentTiming, setPaymentTiming] = useState("BOTH");
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    customerName: "",
    customerPhone: "",
    deliveryMethod: "PICKUP",
    deliveryLocation: "",
    deliveryNotes: "",
    paymentMethod: "PAYSTACK",
  });

  const group = useMemo(
    () => groupedByVendor.find((vendor) => vendor.storeLink === storeLink),
    [groupedByVendor, storeLink],
  );

  useEffect(() => {
    const loadStore = async () => {
      if (!storeLink) return;
      setIsLoadingStore(true);
      try {
        const store = await storeApi.getStoreBySlug(storeLink);
        const timing = store.payment_timing || "BOTH";
        setPaymentTiming(timing);
        setFormData((prev) => ({
          ...prev,
          paymentMethod:
            timing === "UPFRONT_ONLY"
              ? "PAYSTACK"
              : timing === "DELIVERY_ONLY"
              ? "CASH_ON_DELIVERY"
              : prev.paymentMethod,
        }));
      } catch (err: any) {
        setError(err.message || "Failed to load store payment setup");
      } finally {
        setIsLoadingStore(false);
      }
    };
    loadStore();
  }, [storeLink]);

  const submitOrder = async () => {
    if (!token || !group) return;
    if (!formData.customerName || !formData.customerPhone || !formData.deliveryLocation) {
      setError("Please complete all required checkout fields.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const result = await orderApi.createOrder(token, group.storeLink, group.items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
      })), formData);

      group.items.forEach((item) => removeItem(item.productId));

      if (result.authorization_url) {
        window.location.href = result.authorization_url;
        return;
      }

      router.push("/orders");
    } catch (err: any) {
      setError(err.message || "Failed to place order");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!group || !storeLink) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <DashboardHeader title="Checkout" />
        <main className="max-w-2xl mx-auto px-4 pt-24 pb-20">
          <Card className="p-6 rounded-3xl" hoverEffect={false}>
            <p className="text-sm font-bold">Store group not found in cart.</p>
            <Link href="/cart" className="inline-block mt-4">
              <Button className="rounded-2xl">Back to Cart</Button>
            </Link>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <DashboardHeader title="Checkout" />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 pt-24 pb-20 space-y-6">
        <Link href="/cart" className="inline-flex items-center gap-2 text-xs font-bold text-muted hover:text-foreground">
          <ArrowLeft className="w-4 h-4" />
          Back to Cart
        </Link>

        <Card className="p-5 sm:p-6 rounded-3xl space-y-5" hoverEffect={false}>
          <div>
            <h1 className="text-lg font-black uppercase tracking-tight">Checkout</h1>
            <p className="text-[10px] font-bold text-muted uppercase tracking-widest mt-1">
              Store: {group.storeName}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              value={formData.customerName}
              onChange={(e) => setFormData((prev) => ({ ...prev, customerName: e.target.value }))}
              placeholder="Full Name"
              className="h-11 rounded-2xl border border-border/50 bg-surface px-4 text-xs font-bold outline-none"
            />
            <input
              value={formData.customerPhone}
              onChange={(e) => setFormData((prev) => ({ ...prev, customerPhone: e.target.value }))}
              placeholder="Phone Number"
              className="h-11 rounded-2xl border border-border/50 bg-surface px-4 text-xs font-bold outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, deliveryMethod: "PICKUP" }))}
              className={`h-11 rounded-2xl text-[10px] font-black uppercase ${formData.deliveryMethod === "PICKUP" ? "bg-primary text-white" : "bg-surface border border-border/50"}`}
            >
              Pickup
            </button>
            <button
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, deliveryMethod: "DELIVERY" }))}
              className={`h-11 rounded-2xl text-[10px] font-black uppercase ${formData.deliveryMethod === "DELIVERY" ? "bg-primary text-white" : "bg-surface border border-border/50"}`}
            >
              Delivery
            </button>
          </div>

          <input
            value={formData.deliveryLocation}
            onChange={(e) => setFormData((prev) => ({ ...prev, deliveryLocation: e.target.value }))}
            placeholder={formData.deliveryMethod === "DELIVERY" ? "Delivery location" : "Pickup point"}
            className="h-11 rounded-2xl border border-border/50 bg-surface px-4 text-xs font-bold outline-none w-full"
          />

          <textarea
            value={formData.deliveryNotes}
            onChange={(e) => setFormData((prev) => ({ ...prev, deliveryNotes: e.target.value }))}
            placeholder="Notes (optional)"
            className="h-24 rounded-2xl border border-border/50 bg-surface p-4 text-xs font-bold outline-none w-full resize-none"
          />

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, paymentMethod: "PAYSTACK" }))}
              disabled={paymentTiming === "DELIVERY_ONLY"}
              className={`h-11 rounded-2xl text-[10px] font-black uppercase ${formData.paymentMethod === "PAYSTACK" ? "bg-primary text-white" : "bg-surface border border-border/50"} disabled:opacity-40`}
            >
              Pay Now
            </button>
            <button
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, paymentMethod: "CASH_ON_DELIVERY" }))}
              disabled={paymentTiming === "UPFRONT_ONLY"}
              className={`h-11 rounded-2xl text-[10px] font-black uppercase ${formData.paymentMethod === "CASH_ON_DELIVERY" ? "bg-primary text-white" : "bg-surface border border-border/50"} disabled:opacity-40`}
            >
              Pay on Delivery
            </button>
          </div>

          {error && <p className="text-[10px] font-bold text-red-500">{error}</p>}
          {isLoadingStore && <p className="text-[10px] font-bold text-muted">Loading store payment rules...</p>}

          <div className="flex items-center justify-between pt-2">
            <p className="text-sm font-black">Total: GH₵{group.totalPrice.toLocaleString()}</p>
            <Button
              onClick={submitOrder}
              disabled={isSubmitting || isLoadingStore}
              className="h-11 rounded-2xl text-[10px] font-black uppercase tracking-widest px-6"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Place Order"}
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
}
