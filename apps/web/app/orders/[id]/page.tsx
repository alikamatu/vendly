"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ShoppingBag,
  CheckCircle2,
  AlertCircle,
  Clock,
  Package,
  Copy,
  Truck,
  CreditCard,
  RotateCcw
} from "lucide-react";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useAuth } from "@/lib/contexts/auth-context";
import { orderApi } from "@/lib/api/order";
import ReturnRequestModal from "@/components/orders/ReturnRequestModal";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function BuyerOrderDetailPage() {
  const { id } = useParams();
  const { token } = useAuth();
  const router = useRouter();

  const [order, setOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);

  useEffect(() => {
    if (token && id) {
      fetchOrderDetails();
    }
  }, [token, id]);

  async function fetchOrderDetails() {
    try {
      setIsLoading(true);
      const data = await orderApi.getBuyerOrderDetails(token!, id as string);
      setOrder(data);
    } catch (err: any) {
      setError(err.message || "Failed to load order details");
    } finally {
      setIsLoading(false);
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status.toUpperCase()) {
      case "COMPLETED":
      case "DELIVERED":
      case "FULFILLED":
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case "PENDING":
        return <Clock className="h-4 w-4 text-orange-500" />;
      case "AWAITING_PAYMENT":
        return <Clock className="h-4 w-4 text-amber-500" />;
      case "PAID":
        return <CheckCircle2 className="text-primary h-4 w-4" />;
      default:
        return <Package className="text-muted h-4 w-4" />;
    }
  };

  const copyOrderId = () => {
    navigator.clipboard.writeText(order?.id || "");
    toast.success("Order ID copied to clipboard");
  };

  if (isLoading) {
    return (
      <div className="bg-background min-h-screen">
        <DashboardHeader title="Order Details" />
        <div className="flex h-[60vh] items-center justify-center">
          <div className="text-primary h-8 w-8 animate-spin rounded-full border-4 border-current border-t-transparent" />
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="bg-background min-h-screen">
        <DashboardHeader title="Order Details" />
        <main className="mx-auto max-w-3xl px-4 pb-20 pt-24 sm:px-6">
          <Link
            href="/orders"
            className="text-muted hover:text-foreground mb-6 inline-flex items-center gap-2 text-xs font-normal transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Orders
          </Link>
          <div className="flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-500">
            <AlertCircle className="h-4 w-4" />
            <p className="text-[10px] font-medium uppercase tracking-wider">
              {error || "Order not found"}
            </p>
          </div>
        </main>
      </div>
    );
  }

  const isReturnable = ["DELIVERED", "COMPLETED", "PAID", "FULFILLED"].includes(
    order.status.toUpperCase()
  );

  const hasReturnRequest = !!order.return_request;

  return (
    <div className="bg-background min-h-screen">
      <DashboardHeader title={`Order #${order.id.slice(-8).toUpperCase()}`} />

      <main className="mx-auto max-w-3xl px-4 pb-20 pt-24 sm:px-6 md:px-8">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/orders"
            className="text-muted hover:text-foreground inline-flex items-center gap-2 text-xs font-normal transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Orders
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={copyOrderId}
              className="text-muted hover:text-foreground bg-surface hover:bg-surface/80 flex h-8 items-center justify-center gap-2 rounded-xl px-3 transition-colors"
            >
              <Copy className="h-3 w-3" />
              <span className="text-[9px] font-medium uppercase tracking-wider">Copy ID</span>
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Main Order Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="border-border/50 overflow-hidden rounded-[2.5rem] border p-6 sm:p-8" hoverEffect={false}>
              <div className="border-border/50 mb-8 flex flex-col justify-between gap-4 border-b pb-6 sm:flex-row sm:items-center">
                <div className="flex items-center gap-4">
                  <div className="bg-surface border-border/50 rounded-2xl border p-3.5">
                    <ShoppingBag className="text-primary h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-medium uppercase tracking-tight">
                      Order #{order.id.slice(-8).toUpperCase()}
                    </h2>
                    <p className="text-muted mt-1 text-[11px] font-normal uppercase tracking-wider">
                      Placed {new Date(order.created_at).toLocaleDateString()} at {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-start gap-2 sm:items-end">
                  <div className="border-border/50 bg-surface/50 flex items-center gap-2 rounded-xl border px-3 py-1.5">
                    {getStatusIcon(order.status)}
                    <span className="text-[10px] font-medium uppercase tracking-wider">
                      {order.status.replace("_", " ")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Items */}
              <div className="space-y-6">
                <h3 className="text-[10px] font-medium uppercase tracking-wider text-muted">
                  Order Items ({order.items.length})
                </h3>

                <div className="space-y-4">
                  {order.items.map((item: any) => (
                    <div key={item.id} className="bg-surface/30 border-border/50 flex items-center gap-4 rounded-2xl border p-4 transition-colors hover:bg-surface/50">
                      <div className="border-border/50 bg-surface group relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border">
                        {item.product.video_url ? (
                          <video
                            src={item.product.video_url}
                            autoPlay
                            muted
                            loop
                            playsInline
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <img
                            src={item.product.image_urls?.[0]}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <Link href={`/product/${item.product.id}`} className="hover:text-primary transition-colors">
                          <h4 className="truncate text-sm font-medium uppercase tracking-tight">
                            {item.product.title}
                          </h4>
                        </Link>

                        {item.product.seller && (
                          <p className="text-muted mt-1 text-[10px] font-normal uppercase tracking-wider">
                            Sold by: <Link href={`/s/${item.product.seller.store_link}`} className="hover:text-primary text-foreground">{item.product.seller.store_name}</Link>
                          </p>
                        )}

                        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                          <p className="text-muted text-[11px] font-normal">
                            Qty: {item.quantity} × GH₵{parseFloat(item.price).toLocaleString()}
                          </p>

                          {isReturnable && (
                            <Link href={`/product/${item.product.id}#reviews`}>
                              <Button size="sm" variant="secondary" className="h-7 px-3 text-[9px] rounded-lg">
                                Review Product
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                      <div className="text-right self-start mt-1 hidden sm:block">
                        <p className="text-sm font-medium">
                          GH₵{(parseFloat(item.price) * item.quantity).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-border/50 mt-8 flex items-center justify-between border-t pt-6">
                <p className="text-muted text-[11px] font-medium uppercase tracking-wider">
                  Total Amount
                </p>
                <p className="text-primary text-2xl font-medium tracking-tight">
                  GH₵{parseFloat(order.total_amount).toLocaleString()}
                </p>
              </div>
            </Card>
          </motion.div>

          {/* Grid Details */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="h-full border-border/50 rounded-[2.5rem] border p-6" hoverEffect={false}>
                <div className="mb-4 flex items-center gap-2">
                  <Truck className="h-4 w-4 text-muted" />
                  <h3 className="text-[10px] font-medium uppercase tracking-wider text-muted">
                    Delivery Details
                  </h3>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted font-normal">Name:</span>
                    <span className="font-medium text-right">{order.customer_name}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted font-normal">Phone:</span>
                    <span className="font-medium text-right">{order.customer_phone}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted font-normal">Method:</span>
                    <span className="bg-surface border-border/50 rounded-md border px-2 py-0.5 text-[10px] font-normal uppercase">
                      {order.delivery_method}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs items-start gap-4">
                    <span className="text-muted font-normal shrink-0">
                      {order.delivery_method === "DELIVERY" ? "Address:" : "Pickup:"}
                    </span>
                    <span className="font-medium text-right line-clamp-2">{order.delivery_location}</span>
                  </div>

                  {order.delivery_notes && (
                    <div className="bg-surface/30 mt-4 rounded-xl p-3">
                      <span className="text-muted text-[9px] uppercase tracking-wider block mb-1">Notes</span>
                      <p className="text-xs italic text-foreground/80">"{order.delivery_notes}"</p>
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <Card className="h-full border-border/50 rounded-[2.5rem] border p-6" hoverEffect={false}>
                <div className="mb-4 flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-muted" />
                  <h3 className="text-[10px] font-medium uppercase tracking-wider text-muted">
                    Payment Info
                  </h3>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-xs items-center">
                    <span className="text-muted font-normal">Status:</span>
                    <span className="text-[10px] font-medium uppercase">
                      {order.payment_info?.status === "SUCCESS" || order.status === "PAID" ? (
                        <span className="flex items-center gap-1.5 text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-md">
                          <CheckCircle2 className="h-3 w-3" /> Paid
                        </span>
                      ) : order.payment_info?.status === "FAILED" ? (
                        <span className="flex items-center gap-1.5 text-red-500 bg-red-500/10 px-2.5 py-1 rounded-md">
                          <AlertCircle className="h-3 w-3" /> Failed
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-orange-500 bg-orange-500/10 px-2.5 py-1 rounded-md">
                          <Clock className="h-3 w-3" /> Pending
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted font-normal">Provider:</span>
                    <span className="bg-surface border-border/50 rounded-md border px-2 py-0.5 text-[10px] font-normal uppercase">
                      {order.payment_info?.provider || "Unknown"}
                    </span>
                  </div>
                  {order.payment_info?.reference && (
                    <div className="flex justify-between text-xs items-start gap-4">
                      <span className="text-muted font-normal shrink-0">Reference:</span>
                      <span className="font-medium text-right break-all text-[10px] uppercase text-muted/80">{order.payment_info.reference}</span>
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          </div>

          {/* Returns Section */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="border-border/50 rounded-[2.5rem] border p-6 sm:p-8 overflow-hidden relative" hoverEffect={false}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-bl-[100px] -z-10" />

              <div className="flex flex-col gap-6 sm:flex-row sm:items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium uppercase tracking-tight flex items-center gap-2">
                    <RotateCcw className="h-5 w-5 text-amber-500" />
                    Returns & Refunds
                  </h3>
                  <p className="text-muted mt-2 text-xs font-normal max-w-md leading-relaxed">
                    If there is an issue with your order, you can request a return within 7 days of delivery. Protected by Vendly Buyer Protection.
                  </p>
                </div>

                <div className="shrink-0">
                  {hasReturnRequest ? (
                    <div className="bg-surface border-border/50 rounded-2xl border p-4 space-y-2">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-[10px] font-medium uppercase tracking-wider text-muted">Status</span>
                        <span className={`text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-md ${order.return_request.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-500' :
                          order.return_request.status === 'REJECTED' ? 'bg-red-500/10 text-red-500' :
                            'bg-amber-500/10 text-amber-500'
                          }`}>
                          {order.return_request.status}
                        </span>
                      </div>
                      <div className="text-[11px] font-medium truncate max-w-[200px]">
                        {order.return_request.reason.replace(/_/g, ' ')}
                      </div>
                      <p className="text-xs text-muted font-normal line-clamp-2">
                        {order.return_request.description}
                      </p>
                    </div>
                  ) : isReturnable ? (
                    <Button
                      onClick={() => setIsReturnModalOpen(true)}
                      className="rounded-xl px-6 h-12 text-[10px] font-medium uppercase tracking-wider"
                    >
                      Request Return
                    </Button>
                  ) : (
                    <div className="bg-surface/50 border-border/50 rounded-xl border px-4 py-3 text-center">
                      <span className="text-[10px] font-medium uppercase tracking-wider text-muted">
                        Not eligible for return yet
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </main>

      <ReturnRequestModal
        isOpen={isReturnModalOpen}
        onClose={() => setIsReturnModalOpen(false)}
        orderId={order.id}
        token={token!}
        onSuccess={fetchOrderDetails}
      />
    </div>
  );
}
