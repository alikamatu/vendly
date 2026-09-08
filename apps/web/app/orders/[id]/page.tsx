"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
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
  RotateCcw,
  Receipt,
  XCircle,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";
import Header from "@/components/layout/Header";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import { useAuth } from "@/lib/contexts/auth-context";
import { orderApi } from "@/lib/api/order";
import { launchPaystackInline } from "@/lib/paystack";
import ReturnRequestModal from "@/components/orders/ReturnRequestModal";
import EscalateDisputeModal from "@/components/orders/EscalateDisputeModal";
import PaymentProcessingModal from "@/components/orders/PaymentProcessingModal";
import CancelOrderModal from "@/components/orders/CancelOrderModal";
import OrderReceiptModal from "@/components/orders/OrderReceiptModal";
import { useRealtimeOrders } from "@/hooks/useRealtimeOrders";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function BuyerOrderDetailPage() {
  const { id } = useParams();
  const { token, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [order, setOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [isEscalateModalOpen, setIsEscalateModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [paymentModalState, setPaymentModalState] = useState<'verifying' | 'success' | 'failed' | null>(null);
  const [paymentErrorMessage, setPaymentErrorMessage] = useState('');
  const [isPaying, setIsPaying] = useState(false);

  // Real-time synchronization
  useRealtimeOrders({
    onOrderEvent: (e) => {
      if (e.orderId === id) {
        fetchOrderDetails();
      }
    },
  });

  useEffect(() => {
    if (token && id) {
      fetchOrderDetails();
    }
  }, [token, id]);

  // If URL has ?receipt=1, auto open receipt modal
  useEffect(() => {
    if (searchParams.get('receipt') === '1' || searchParams.get('receipt') === 'true') {
      setIsReceiptModalOpen(true);
    }
  }, [searchParams]);

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
        <Header />
        <div className="flex h-[60vh] items-center justify-center">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="bg-background min-h-screen">
        <Header />
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

  const isPaid =
    order.status === 'PAID' ||
    order.payment_info?.status === 'SUCCESS';

  const canPay =
    order.status === 'AWAITING_PAYMENT' ||
    (order.status === 'PENDING' && order.payment_info?.provider === 'PAYSTACK' && !isPaid);

  const canCancel =
    order.status === 'PENDING' || order.status === 'AWAITING_PAYMENT';

  const isReturnable = ['DELIVERED', 'COMPLETED', 'PAID', 'FULFILLED'].includes(
    order.status.toUpperCase(),
  );

  const hasReturnRequest = !!order.return_request;

  const handlePayNow = async () => {
    if (!token || !order) return;
    setIsPaying(true);
    try {
      const buyerEmail =
        (order.buyer?.email && order.buyer.email.includes('@'))
          ? order.buyer.email
          : (user?.email && user.email.includes('@'))
            ? user.email
            : 'customer@verndly.com';

      const initResult = await orderApi.retryPayment(token, order.id);

      await launchPaystackInline({
        email: buyerEmail,
        amount: Number(order.total_amount),
        reference: initResult.reference,
        accessCode: initResult.access_code,
        authorizationUrl: initResult.authorization_url,
        onSuccess: async (res) => {
          setPaymentModalState('verifying');
          try {
            await orderApi.verifyOrderPayment(token, res.reference, order.id);
            setPaymentModalState('success');
            fetchOrderDetails();
          } catch (err: any) {
            setPaymentErrorMessage(err.message || 'Payment verification failed');
            setPaymentModalState('failed');
          }
        },
        onClose: () => {
          setIsPaying(false);
        },
      });
    } catch (err: any) {
      toast.error(err.message || 'Failed to initialize payment');
      setIsPaying(false);
    }
  };

  return (
    <div className="bg-background min-h-screen">
      <Header />

      <main className="mx-auto max-w-3xl px-4 pb-20 pt-24 sm:px-6 md:px-8">
        <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
          <Link
            href="/orders"
            className="text-muted hover:text-foreground inline-flex items-center gap-2 text-xs font-normal transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Orders
          </Link>

          <div className="flex items-center gap-2">
            {isPaid && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsReceiptModalOpen(true)}
                className="h-8 px-3 text-[10px] rounded-xl font-medium uppercase tracking-wider"
              >
                <Receipt className="h-3 w-3 mr-1.5" />
                Receipt
              </Button>
            )}
            {canCancel && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCancelModalOpen(true)}
                className="h-8 px-3 text-[10px] rounded-xl font-medium uppercase tracking-wider text-red-600 hover:bg-red-500/5"
              >
                <XCircle className="h-3 w-3 mr-1.5" />
                Cancel
              </Button>
            )}
            {canPay && (
              <Button
                variant="primary"
                size="sm"
                onClick={handlePayNow}
                isLoading={isPaying}
                className="h-8 px-4 text-[10px] rounded-xl font-medium uppercase tracking-wider"
              >
                <CreditCard className="h-3 w-3 mr-1.5" />
                Pay Now
              </Button>
            )}
            <button
              onClick={copyOrderId}
              className="text-muted hover:text-foreground bg-surface hover:bg-surface/80 flex h-8 items-center justify-center gap-1.5 rounded-xl px-3 transition-colors text-[10px] font-medium uppercase tracking-wider"
            >
              <Copy className="h-3 w-3" />
              <span>Copy ID</span>
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Main Order Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="overflow-hidden rounded-3xl bg-surface/40 p-6 sm:p-8 border-0 shadow-none" hoverEffect={false}>
              <div className="mb-8 flex flex-col justify-between gap-4 pb-6 sm:flex-row sm:items-center border-b border-border/30">
                <div className="flex items-center gap-4">
                  <div className="bg-surface rounded-2xl p-3.5">
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
                  <div className="bg-surface/80 flex items-center gap-2 rounded-xl px-3.5 py-1.5 shadow-none">
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

                <div className="space-y-3">
                  {order.items.map((item: any) => (
                    <div key={item.id} className="bg-surface/30 flex items-center gap-4 rounded-2xl p-4 transition-colors hover:bg-surface/50 border-0 shadow-none">
                      <div className="bg-surface group relative h-20 w-20 shrink-0 overflow-hidden rounded-xl">
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

              {/* Order Total Breakdown */}
              <div className="mt-8 border-t border-border/30 pt-6 space-y-2.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Items Subtotal</span>
                  <span className="font-mono text-foreground">
                    GH₵ {Number(order.total_amount).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Delivery &amp; Logistics</span>
                  <span className="text-emerald-600 font-medium">Free / Included</span>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-border/40">
                  <div>
                    <p className="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">
                      Total Amount
                    </p>
                    <span className="text-[10px] text-emerald-600 font-medium">
                      {isPaid ? "Payment Settled" : "Awaiting Payment"}
                    </span>
                  </div>
                  <p className="text-primary text-2xl font-bold tracking-tight">
                    GH₵{Number(order.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Grid Details */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="h-full rounded-3xl bg-surface/40 p-6 border-0 shadow-none" hoverEffect={false}>
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
                    <span className="bg-surface rounded-md px-2 py-0.5 text-[10px] font-normal uppercase">
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
              <Card className="h-full rounded-3xl bg-surface/40 p-6 border-0 shadow-none" hoverEffect={false}>
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
                    <span className="bg-surface rounded-md px-2 py-0.5 text-[10px] font-normal uppercase">
                      {order.payment_info?.provider || "Unknown"}
                    </span>
                  </div>
                  {order.payment_info?.reference && (
                    <div className="flex justify-between text-xs items-start gap-4">
                      <span className="text-muted font-normal shrink-0">Reference:</span>
                      <span className="font-medium text-right break-all text-[10px] uppercase text-muted/80">{order.payment_info.reference}</span>
                    </div>
                  )}
                  {order.payment_info?.provider_ref && (
                    <div className="flex justify-between text-xs items-start gap-4">
                      <span className="text-muted font-normal shrink-0">Paystack Tx ID:</span>
                      <span className="font-mono text-right break-all text-[10px] uppercase text-muted/80">{order.payment_info.provider_ref}</span>
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          </div>

          {/* Returns & Refund Section */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="rounded-3xl bg-surface/40 p-6 sm:p-8 overflow-hidden relative border-0 shadow-none" hoverEffect={false}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-bl-[100px] -z-10" />

              <div className="space-y-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium uppercase tracking-tight flex items-center gap-2">
                      <RotateCcw className="h-5 w-5 text-amber-500" />
                      Returns, Replacements &amp; Refunds
                    </h3>
                    <p className="text-muted mt-1 text-xs font-normal max-w-md leading-relaxed">
                      Every order is backed by Verndly 7-Day Buyer Protection. Return damaged, defective, or incorrect items for a full escrow refund.
                    </p>
                  </div>

                  {!hasReturnRequest && isReturnable && (
                    <Button
                      onClick={() => setIsReturnModalOpen(true)}
                      className="rounded-xl px-6 h-11 text-[10px] font-medium uppercase tracking-wider shrink-0"
                    >
                      Request Return
                    </Button>
                  )}
                </div>

                {/* If order is refunded */}
                {order.status === 'REFUNDED' && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-5 h-5 shrink-0" />
                        <span className="text-xs font-bold uppercase tracking-wider">
                          Full Refund Processed
                        </span>
                      </div>
                      <span className="font-mono text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                        GH₵ {parseFloat(order.total_amount).toFixed(2)}
                      </span>
                    </div>
                    <p className="text-xs text-muted leading-relaxed">
                      Funds have been credited directly back to your original payment account. Mobile money balances reflect in <strong>24–48 hours</strong>; bank card statements appear in <strong>3–7 business days</strong>.
                    </p>
                    {order.return_request?.refund_ref && (
                      <p className="font-mono text-[10px] text-muted-foreground">
                        Refund Reference: {order.return_request.refund_ref}
                      </p>
                    )}
                  </div>
                )}

                {/* If Return Request exists */}
                {hasReturnRequest && (
                  <div className="p-5 rounded-2xl bg-surface/60 border border-border/40 space-y-5">
                    {/* Stepper tracker */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                      <div className="p-3 rounded-xl bg-surface border border-border/30 space-y-1">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Step 1</span>
                        <p className="text-xs font-medium">Request Filed</p>
                      </div>
                      <div className={`p-3 rounded-xl border space-y-1 ${
                        order.return_request.status === 'PENDING' ? 'bg-amber-500/10 border-amber-500/30' : 'bg-surface border-border/30'
                      }`}>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-muted">Step 2</span>
                        <p className="text-xs font-medium">Seller 48h Review</p>
                      </div>
                      <div className={`p-3 rounded-xl border space-y-1 ${
                        ['APPROVED', 'ESCALATED'].includes(order.return_request.status) ? 'bg-blue-500/10 border-blue-500/30' : 'bg-surface border-border/30'
                      }`}>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-muted">Step 3</span>
                        <p className="text-xs font-medium">
                          {order.return_request.status === 'ESCALATED' ? 'Trust & Safety' : 'Inspection'}
                        </p>
                      </div>
                      <div className={`p-3 rounded-xl border space-y-1 ${
                        order.return_request.status === 'REFUNDED' || order.status === 'REFUNDED' ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-surface border-border/30'
                      }`}>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-muted">Step 4</span>
                        <p className="text-xs font-medium">Refund Executed</p>
                      </div>
                    </div>

                    {/* Details and Reason */}
                    <div className="space-y-2 pt-2 border-t border-border/30">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-foreground">
                          Reason: {order.return_request.reason.replace(/_/g, ' ')}
                        </span>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md ${
                          order.return_request.status === 'APPROVED' ? 'bg-blue-500/10 text-blue-500' :
                          order.return_request.status === 'REJECTED' ? 'bg-red-500/10 text-red-500' :
                          order.return_request.status === 'ESCALATED' ? 'bg-purple-500/10 text-purple-500' :
                          order.return_request.status === 'REFUNDED' ? 'bg-emerald-500/10 text-emerald-500' :
                          'bg-amber-500/10 text-amber-500'
                        }`}>
                          {order.return_request.status}
                        </span>
                      </div>
                      <p className="text-xs text-muted leading-relaxed italic">
                        "{order.return_request.description}"
                      </p>
                    </div>

                    {/* Status Specific Alerts */}
                    {order.return_request.status === 'PENDING' && (
                      <div className="p-3.5 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs flex items-center gap-2">
                        <Clock className="w-4 h-4 shrink-0" />
                        <span>Merchant is currently reviewing your evidence within the 48-hour SLA window.</span>
                      </div>
                    )}

                    {order.return_request.status === 'APPROVED' && order.status !== 'REFUNDED' && (
                      <div className="p-3.5 rounded-xl bg-blue-500/10 text-blue-700 dark:text-blue-300 text-xs flex items-center gap-2">
                        <Package className="w-4 h-4 shrink-0" />
                        <span>Return authorized. Please dispatch the packaged goods to the merchant collection point. Refund will be triggered upon physical receipt.</span>
                      </div>
                    )}

                    {order.return_request.status === 'REJECTED' && (
                      <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 space-y-3">
                        <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-semibold text-xs">
                          <XCircle className="w-4 h-4 shrink-0" />
                          <span>Seller Rejected This Return</span>
                        </div>
                        {order.return_request.seller_response && (
                          <p className="text-xs text-muted">
                            Seller explanation: "{order.return_request.seller_response}"
                          </p>
                        )}
                        <div className="pt-2 border-t border-red-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <p className="text-[11px] text-muted">
                            Disagree with the seller's determination? Escalate to Verndly Trust &amp; Safety for binding arbitration.
                          </p>
                          <Button
                            size="sm"
                            onClick={() => setIsEscalateModalOpen(true)}
                            className="bg-amber-600 hover:bg-amber-700 text-white shrink-0 text-xs gap-1.5"
                          >
                            <ShieldAlert className="w-3.5 h-3.5" />
                            Escalate to Support
                          </Button>
                        </div>
                      </div>
                    )}

                    {order.return_request.status === 'ESCALATED' && (
                      <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 space-y-2">
                        <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-semibold text-xs">
                          <ShieldAlert className="w-4 h-4 shrink-0" />
                          <span>Under Impartial Admin Arbitration</span>
                        </div>
                        <p className="text-xs text-muted leading-relaxed">
                          Your case has been escalated to Verndly Trust &amp; Safety. A compliance officer is reviewing the evidence and will issue a binding decision shortly.
                        </p>
                      </div>
                    )}
                  </div>
                )}
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

      <EscalateDisputeModal
        isOpen={isEscalateModalOpen}
        onClose={() => setIsEscalateModalOpen(false)}
        orderId={order.id}
        orderNumber={order.id.slice(-6).toUpperCase()}
        token={token!}
        onSuccess={fetchOrderDetails}
      />

      {paymentModalState && (
        <PaymentProcessingModal
          isOpen={!!paymentModalState}
          onClose={() => setPaymentModalState(null)}
          status={paymentModalState}
          errorMessage={paymentErrorMessage}
          orderNumber={order.id.slice(-8).toUpperCase()}
          orderId={order.id}
          reference={order.payment_info?.reference}
          amount={order.total_amount}
          onViewReceipt={() => {
            setPaymentModalState(null);
            setIsReceiptModalOpen(true);
          }}
          onRetry={handlePayNow}
        />
      )}

      {isCancelModalOpen && (
        <CancelOrderModal
          isOpen={isCancelModalOpen}
          onClose={() => setIsCancelModalOpen(false)}
          orderId={order.id}
          orderNumber={order.id.slice(-8).toUpperCase()}
          token={token!}
          onOrderCancelled={fetchOrderDetails}
        />
      )}

      {isReceiptModalOpen && (
        <OrderReceiptModal
          isOpen={isReceiptModalOpen}
          onClose={() => setIsReceiptModalOpen(false)}
          order={order}
        />
      )}
    </div>
  );
}
