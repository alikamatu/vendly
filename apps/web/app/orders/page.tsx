"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag,
  Package,
  Calendar,
  ChevronRight,
  Loader2,
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
} from "lucide-react";
import Link from "next/link";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useAuth } from "@/lib/contexts/auth-context";
import { orderApi } from "@/lib/api/order";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export default function BuyerOrdersPage() {
  const { token } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isRetrying, setIsRetrying] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      fetchOrders();
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;

    const reference = searchParams.get("reference");
    const orderId = searchParams.get("order_id");
    const shouldVerify = searchParams.get("order_payment");
    if (!reference || !orderId || !shouldVerify) return;

    let cancelled = false;
    const verify = async () => {
      try {
        setIsVerifying(true);
        await orderApi.verifyOrderPayment(token, reference, orderId);
        if (!cancelled) {
          await fetchOrders();
          router.replace(pathname);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || "Payment verification failed");
        }
      } finally {
        if (!cancelled) {
          setIsVerifying(false);
        }
      }
    };
    verify();

    return () => {
      cancelled = true;
    };
  }, [token, searchParams, pathname, router]);

  useEffect(() => {
    if (!token) return;
    const interval = setInterval(() => {
      fetchOrders();
    }, 15000);
    return () => clearInterval(interval);
  }, [token]);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const data = await orderApi.getBuyerOrders(token!);
      setOrders(data);
    } catch (err: any) {
      setError(err.message || "Failed to load orders");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetryPayment = async (orderId: string) => {
    if (!token) return;
    try {
      setIsRetrying(orderId);
      const result = await orderApi.retryPayment(token, orderId);
      if (result.authorization_url) {
        window.location.href = result.authorization_url;
      }
    } catch (err: any) {
      setError(err.message || "Failed to re-initialize payment");
      setIsRetrying(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toUpperCase()) {
      case "COMPLETED":
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case "PENDING":
        return <Clock className="w-4 h-4 text-orange-500" />;
      case "AWAITING_PAYMENT":
        return <Clock className="w-4 h-4 text-amber-500" />;
      case "PAID":
        return <CheckCircle2 className="w-4 h-4 text-primary" />;
      default:
        return <Package className="w-4 h-4 text-muted" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="My Orders" />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 md:px-8 pt-24 pb-20">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-xs font-normal text-muted hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Dashboard
        </Link>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-xl font-medium uppercase tracking-tight">
              Order History
            </h2>
            <p className="text-[10px] text-muted font-normal uppercase tracking-wider mt-1">
              Track your verified entrepreneur purchases • {orders.length} total
            </p>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-500/10 text-red-500 rounded-2xl mb-8 border border-red-500/20">
            <AlertCircle className="w-4 h-4" />
            <p className="text-[10px] font-medium uppercase tracking-wider">
              {error}
            </p>
          </div>
        )}

        {isVerifying && (
          <div className="flex items-center gap-3 p-4 bg-primary/10 text-primary rounded-2xl mb-8 border border-primary/20">
            <Loader2 className="w-4 h-4 animate-spin" />
            <p className="text-[10px] font-medium uppercase tracking-wider">
              Verifying payment and syncing order status...
            </p>
          </div>
        )}

        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {orders.length > 0 ? (
              orders.map((order, idx) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card
                    className="p-5 sm:p-6 border border-border/50 rounded-3xl overflow-hidden hover:bg-surface/30 transition-all"
                    hoverEffect={false}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-border/50">
                      <div className="flex items-center gap-3">
                        <div className="p-3 rounded-2xl bg-surface border border-border/50">
                          <ShoppingBag className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-[10px] font-medium text-muted uppercase tracking-wider leading-none mb-1">
                            Order ID
                          </p>
                          <p className="text-sm font-medium text-foreground">
                            #{order.id.slice(-8).toUpperCase()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-right hidden sm:block">
                          <p className="text-[10px] font-medium text-muted uppercase tracking-wider leading-none mb-1">
                            Placed On
                          </p>
                          <p className="text-xs font-normal">
                            {new Date(order.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border/50 bg-surface/50`}
                        >
                          {getStatusIcon(order.status)}
                          <span className="text-[10px] font-medium uppercase tracking-wider">
                            {order.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Seller Info */}
                    {order.items[0]?.product?.seller && (
                      <div className="mb-6 px-4 py-3 rounded-2xl bg-surface/50 border border-border/30 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg overflow-hidden bg-background border border-border/50 flex items-center justify-center">
                            {order.items[0].product.seller.logo_url ? (
                              <img
                                src={order.items[0].product.seller.logo_url}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-[10px] font-medium">
                                {order.items[0].product.seller.store_name[0]}
                              </span>
                            )}
                          </div>
                          <div>
                            <p className="text-[9px] font-medium text-muted uppercase tracking-wider leading-none">
                              Sold by
                            </p>
                            <Link
                              href={`/s/${order.items[0].product.seller.store_link}`}
                              className="text-[11px] font-normal text-foreground hover:text-primary transition-colors"
                            >
                              {order.items[0].product.seller.store_name}
                            </Link>
                          </div>
                        </div>
                        <Link
                          href={`/s/${order.items[0].product.seller.store_link}`}
                        >
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 text-[9px] font-medium uppercase tracking-wider px-4"
                          >
                            Visit Store
                          </Button>
                        </Link>
                      </div>
                    )}

                    <div className="space-y-4">
                      {order.items.map((item: any) => (
                        <div key={item.id} className="flex items-center gap-4">
                          <div className="w-16 h-16 rounded-xl border border-border/50 overflow-hidden shrink-0 bg-surface relative group">
                            {item.product.video_url ? (
                              <video
                                src={item.product.video_url}
                                autoPlay
                                muted
                                loop
                                playsInline
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <img
                                src={item.product.image_urls[0]}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-[11px] font-medium uppercase tracking-tight truncate">
                              {item.product.title}
                            </h4>
                            <p className="text-[10px] text-muted font-normal">
                              Qty: {item.quantity} • GH₵
                              {parseFloat(item.price).toLocaleString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-medium">
                              GH₵
                              {(
                                parseFloat(item.price) * item.quantity
                              ).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Order & Payment Details */}
                    <div className="mt-6 pt-6 border-t border-border/50 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <p className="text-[10px] font-medium text-muted uppercase tracking-wider border-b border-border/50 pb-2">Delivery Details</p>
                        <div className="space-y-2">
                          <p className="text-xs"><span className="text-muted font-normal">Name:</span> {order.customer_name}</p>
                          <p className="text-xs"><span className="text-muted font-normal">Phone:</span> {order.customer_phone}</p>
                          <p className="text-xs"><span className="text-muted font-normal">Method:</span> <span className="uppercase font-normal text-[10px] bg-surface px-2 py-0.5 rounded-md border border-border/50">{order.delivery_method}</span></p>
                          <p className="text-xs"><span className="text-muted font-normal">{order.delivery_method === 'DELIVERY' ? 'Address:' : 'Pickup at:'}</span> {order.delivery_location}</p>
                          {order.delivery_notes && (
                            <p className="text-xs mt-1 text-muted italic">"{order.delivery_notes}"</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <p className="text-[10px] font-medium text-muted uppercase tracking-wider border-b border-border/50 pb-2">Payment Details</p>
                        <div className="space-y-2">
                          <p className="text-xs"><span className="text-muted font-normal">Provider:</span> <span className={`uppercase font-normal text-[10px] px-2 py-0.5 rounded-md border ${order.payment_info?.provider === 'PAYSTACK' ? 'bg-primary/10 text-primary border-primary/20' : 'bg-surface border-border/50'}`}>{order.payment_info?.provider || 'Unknown'}</span></p>
                          <p className="text-xs flex items-center gap-2"><span className="text-muted font-normal">Status:</span> 
                            <span className="uppercase font-normal text-[10px]">
                              {order.payment_info?.status === 'SUCCESS' ? (
                                <span className="text-emerald-500 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Paid</span>
                              ) : order.payment_info?.status === 'FAILED' ? (
                                <span className="text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Failed</span>
                              ) : (
                                <span className="text-orange-500 flex items-center gap-1"><Clock className="w-3 h-3" /> Pending</span>
                              )}
                            </span>
                          </p>
                          {order.payment_info?.reference && (
                            <p className="text-[10px] text-muted truncate"><span className="font-normal">Ref:</span> {order.payment_info.reference}</p>
                          )}
                          {order.status === 'AWAITING_PAYMENT' && (
                            <div className="pt-2">
                              <Button
                                size="sm"
                                onClick={() => handleRetryPayment(order.id)}
                                isLoading={isRetrying === order.id}
                                className="h-8 text-[9px] font-medium uppercase tracking-wider px-4 rounded-xl flex items-center gap-2"
                              >
                                <CheckCircle2 className="w-3 h-3" /> Complete Payment
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 pt-6 border-t border-border/50 flex items-center justify-between">
                      <p className="text-[10px] font-medium text-muted uppercase tracking-wider">
                        Total Amount
                      </p>
                      <p className="text-lg font-medium text-primary">
                        GH₵{parseFloat(order.total_amount).toLocaleString()}
                      </p>
                    </div>
                  </Card>
                </motion.div>
              ))
            ) : (
              <div className="py-20 text-center space-y-4 border border-dashed border-border/50 rounded-[2.5rem] bg-surface/10">
                <Package className="w-12 h-12 text-muted mx-auto opacity-10" />
                <div className="space-y-1">
                  <p className="text-[11px] text-muted font-medium uppercase tracking-wider">
                    No orders yet
                  </p>
                  <p className="text-[9px] text-muted/60 font-medium uppercase tracking-wider italic">
                    Your shopping journey with verified entrepreneurs starts
                    here
                  </p>
                </div>
                <Link href="/" className="inline-block mt-4">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="rounded-xl px-8 text-[9px] font-medium uppercase tracking-wider"
                  >
                    Post First Order
                  </Button>
                </Link>
              </div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
