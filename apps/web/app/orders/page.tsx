'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag,
  Package,
  Calendar,
  ChevronRight,
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Receipt,
  CreditCard,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { useAuth } from '@/lib/contexts/auth-context';
import { orderApi } from '@/lib/api/order';
import { launchPaystackInline } from '@/lib/paystack';
import PaymentProcessingModal from '@/components/orders/PaymentProcessingModal';
import CancelOrderModal from '@/components/orders/CancelOrderModal';
import OrderReceiptModal from '@/components/orders/OrderReceiptModal';
import { useRealtimeOrders } from '@/hooks/useRealtimeOrders';
import { toast } from 'sonner';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export default function BuyerOrdersPage() {
  const { token, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isRetrying, setIsRetrying] = useState<string | null>(null);
  const [cancellingOrder, setCancellingOrder] = useState<any | null>(null);
  const [receiptOrder, setReceiptOrder] = useState<any | null>(null);
  const [paymentModalState, setPaymentModalState] = useState<'verifying' | 'success' | 'failed' | null>(null);
  const [paymentErrorMessage, setPaymentErrorMessage] = useState('');

  // Real-time synchronization
  useRealtimeOrders({
    onOrderEvent: () => fetchOrders(),
  });

  async function fetchOrders() {
    try {
      setIsLoading(true);
      const data = await orderApi.getBuyerOrders(token!);
      setOrders(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load orders');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchOrders();
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;

    const reference = searchParams.get('reference');
    const orderId = searchParams.get('order_id');
    const shouldVerify = searchParams.get('order_payment');
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
          setError(err.message || 'Payment verification failed');
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

  const handleRetryPayment = async (order: any) => {
    if (!token) return;
    try {
      setIsRetrying(order.id);
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
            fetchOrders();
          } catch (err: any) {
            setPaymentErrorMessage(err.message || 'Payment verification failed');
            setPaymentModalState('failed');
          }
        },
        onClose: () => {
          setIsRetrying(null);
        },
      });
    } catch (err: any) {
      toast.error(err.message || 'Failed to re-initialize payment');
      setIsRetrying(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toUpperCase()) {
      case 'COMPLETED':
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case 'PENDING':
        return <Clock className="h-4 w-4 text-orange-500" />;
      case 'AWAITING_PAYMENT':
        return <Clock className="h-4 w-4 text-amber-500" />;
      case 'PAID':
        return <CheckCircle2 className="text-primary h-4 w-4" />;
      default:
        return <Package className="text-muted h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen">
      <Header />

      <main className="mx-auto max-w-3xl px-4 pb-20 pt-24 sm:px-6 md:px-8">
        <Link
          href="/dashboard"
          className="text-muted hover:text-foreground mb-6 inline-flex items-center gap-2 text-xs font-normal transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Dashboard
        </Link>

        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-medium uppercase tracking-tight">Order History</h2>
            <p className="text-muted mt-1 text-[10px] font-normal uppercase tracking-wider">
              Track your verified entrepreneur purchases • {orders.length} total
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-8 flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-500">
            <AlertCircle className="h-4 w-4" />
            <p className="text-[10px] font-medium uppercase tracking-wider">{error}</p>
          </div>
        )}

        {isVerifying && (
          <div className="bg-primary/10 text-primary border-primary/20 mb-8 flex items-center gap-3 rounded-2xl border p-4">
            <Spinner size="sm" />
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
                    className="overflow-hidden rounded-3xl bg-surface/40 hover:bg-surface/60 p-5 transition-colors sm:p-6 border-0 shadow-none"
                    hoverEffect={false}
                  >
                    <div className="mb-6 flex flex-col justify-between gap-4 border-b border-border/30 pb-6 sm:flex-row sm:items-center">
                      <div className="flex items-center gap-3">
                        <div className="bg-surface rounded-2xl p-3">
                          <ShoppingBag className="text-primary h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-muted mb-1 text-[10px] font-medium uppercase leading-none tracking-wider">
                            Order ID
                          </p>
                          <p className="text-foreground text-sm font-medium">
                            #{order.id.slice(-8).toUpperCase()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="hidden text-right sm:block">
                          <p className="text-muted mb-1 text-[10px] font-medium uppercase leading-none tracking-wider">
                            Placed On
                          </p>
                          <p className="text-xs font-normal">
                            {new Date(order.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div
                          className="bg-surface/80 flex items-center gap-2 rounded-xl px-3.5 py-1.5 shadow-none"
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
                      <div className="bg-surface/30 mb-6 flex items-center justify-between rounded-2xl px-4 py-3 border-0 shadow-none">
                        <div className="flex items-center gap-3">
                          <div className="bg-background flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg">
                            {order.items[0].product.seller.logo_url ? (
                              <img
                                src={order.items[0].product.seller.logo_url}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="text-[10px] font-medium">
                                {order.items[0].product.seller.store_name[0]}
                              </span>
                            )}
                          </div>
                          <div>
                            <p className="text-muted text-[9px] font-medium uppercase leading-none tracking-wider">
                              Sold by
                            </p>
                            <Link
                              href={`/s/${order.items[0].product.seller.store_link}`}
                              className="text-foreground hover:text-primary text-[11px] font-normal transition-colors"
                            >
                              {order.items[0].product.seller.store_name}
                            </Link>
                          </div>
                        </div>
                        <Link href={`/s/${order.items[0].product.seller.store_link}`}>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-4 text-[9px] font-medium uppercase tracking-wider"
                          >
                            Visit Store
                          </Button>
                        </Link>
                      </div>
                    )}

                    <div className="space-y-3">
                      {order.items.map((item: any) => (
                        <div key={item.id} className="flex items-center gap-4 bg-surface/20 rounded-2xl p-3 border-0 shadow-none">
                          <div className="bg-surface group relative h-16 w-16 shrink-0 overflow-hidden rounded-xl">
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
                                src={item.product.image_urls[0]}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="truncate text-[11px] font-medium uppercase tracking-tight">
                              {item.product.title}
                            </h4>
                            <div className="mt-1.5 flex flex-wrap items-center gap-3">
                              <p className="text-muted text-[10px] font-normal">
                                Qty: {item.quantity} • GH₵
                                {parseFloat(item.price).toLocaleString()}
                              </p>
                              {['DELIVERED', 'COMPLETED', 'PAID', 'FULFILLED'].includes(
                                order.status.toUpperCase(),
                              ) && (
                                <Link
                                  href={`/product/${item.product.id}#reviews`}
                                  className="inline-block"
                                >
                                  <span className="inline-flex h-6 cursor-pointer items-center rounded-md bg-amber-500/10 px-2 text-[9px] font-medium uppercase tracking-wider text-amber-600 transition-colors hover:bg-amber-500/20 dark:text-amber-400">
                                    Review Product
                                  </span>
                                </Link>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-medium">
                              GH₵
                              {(parseFloat(item.price) * item.quantity).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Order & Payment Details */}
                    <div className="mt-6 grid grid-cols-1 gap-4 border-t border-border/30 pt-6 sm:grid-cols-2">
                      <div className="space-y-3">
                        <p className="text-muted border-b border-border/20 pb-2 text-[10px] font-medium uppercase tracking-wider">
                          Delivery Details
                        </p>
                        <div className="space-y-2">
                          <p className="text-xs">
                            <span className="text-muted font-normal">Name:</span>{' '}
                            {order.customer_name}
                          </p>
                          <p className="text-xs">
                            <span className="text-muted font-normal">Phone:</span>{' '}
                            {order.customer_phone}
                          </p>
                          <p className="text-xs">
                            <span className="text-muted font-normal">Method:</span>{' '}
                            <span className="bg-surface rounded-md px-2 py-0.5 text-[10px] font-normal uppercase">
                              {order.delivery_method}
                            </span>
                          </p>
                          <p className="text-xs">
                            <span className="text-muted font-normal">
                              {order.delivery_method === 'DELIVERY' ? 'Address:' : 'Pickup at:'}
                            </span>{' '}
                            {order.delivery_location}
                          </p>
                          {order.delivery_notes && (
                            <p className="text-muted mt-1 text-xs italic">
                              "{order.delivery_notes}"
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <p className="text-muted border-b border-border/20 pb-2 text-[10px] font-medium uppercase tracking-wider">
                          Payment Details
                        </p>
                        <div className="space-y-2">
                          <p className="text-xs">
                            <span className="text-muted font-normal">Provider:</span>{' '}
                            <span
                              className={`rounded-md px-2 py-0.5 text-[10px] font-normal uppercase ${order.payment_info?.provider === 'PAYSTACK' ? 'bg-primary/10 text-primary' : 'bg-surface'}`}
                            >
                              {order.payment_info?.provider || 'Unknown'}
                            </span>
                          </p>
                          <p className="flex items-center gap-2 text-xs">
                            <span className="text-muted font-normal">Status:</span>
                            <span className="text-[10px] font-normal uppercase">
                              {order.payment_info?.status === 'SUCCESS' ? (
                                <span className="flex items-center gap-1 text-emerald-500">
                                  <CheckCircle2 className="h-3 w-3" /> Paid
                                </span>
                              ) : order.payment_info?.status === 'FAILED' ? (
                                <span className="flex items-center gap-1 text-red-500">
                                  <AlertCircle className="h-3 w-3" /> Failed
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-orange-500">
                                  <Clock className="h-3 w-3" /> Pending
                                </span>
                              )}
                            </span>
                          </p>
                          {order.payment_info?.reference && (
                            <p className="text-muted truncate text-[10px]">
                              <span className="font-normal">Ref:</span>{' '}
                              {order.payment_info.reference}
                            </p>
                          )}
                          {order.status === 'AWAITING_PAYMENT' && (
                            <div className="pt-2">
                              <Button
                                size="sm"
                                onClick={() => handleRetryPayment(order)}
                                isLoading={isRetrying === order.id}
                                className="flex h-8 items-center gap-2 rounded-xl px-4 text-[9px] font-medium uppercase tracking-wider"
                              >
                                <CheckCircle2 className="h-3 w-3" /> Complete Payment
                              </Button>
                            </div>
                          )}
                          {(order.status === 'PENDING' ||
                            order.status === 'AWAITING_PAYMENT') && (
                            <div className="pt-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setCancellingOrder(order)}
                                className="flex h-8 items-center gap-2 rounded-xl px-3 text-[9px] font-medium uppercase tracking-wider text-red-600 hover:bg-red-500/5"
                              >
                                <AlertCircle className="h-3 w-3" /> Cancel order
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 flex items-center justify-between border-t border-border/30 pt-6 gap-2 flex-wrap">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-muted text-[10px] font-medium uppercase tracking-wider">
                            Total Amount
                          </p>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-foreground/10 text-foreground font-semibold">
                            Incl. 4% Escrow Fee
                          </span>
                        </div>
                        <p className="text-primary text-lg font-medium leading-none">
                          GH₵{parseFloat(order.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {(order.status === 'PAID' || order.payment_info?.status === 'SUCCESS') && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setReceiptOrder(order)}
                            className="h-9 px-3.5 rounded-xl text-[10px] font-medium uppercase tracking-wider gap-1.5"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                            Receipt
                          </Button>
                        )}
                        <Link href={`/orders/${order.id}`}>
                          <Button variant="secondary" size="sm" className="h-9 px-5 rounded-xl text-[10px] font-medium uppercase tracking-wider gap-2">
                            View Details
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))
            ) : (
              <div className="bg-surface/20 space-y-4 rounded-3xl py-20 text-center border-0 shadow-none">
                <Package className="text-muted mx-auto h-12 w-12 opacity-10" />
                <div className="space-y-1">
                  <p className="text-muted text-[11px] font-medium uppercase tracking-wider">
                    No orders yet
                  </p>
                  <p className="text-muted/60 text-[9px] font-medium uppercase italic tracking-wider">
                    Your shopping journey with verified entrepreneurs starts here
                  </p>
                </div>
                <Link href="/" className="mt-4 inline-block">
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

      {paymentModalState && (
        <PaymentProcessingModal
          isOpen={!!paymentModalState}
          onClose={() => setPaymentModalState(null)}
          status={paymentModalState}
          errorMessage={paymentErrorMessage}
          onViewReceipt={() => {
            const paid = orders.find((o) => o.id === isRetrying);
            setPaymentModalState(null);
            if (paid) setReceiptOrder(paid);
          }}
        />
      )}

      {cancellingOrder && (
        <CancelOrderModal
          isOpen={!!cancellingOrder}
          onClose={() => setCancellingOrder(null)}
          orderId={cancellingOrder.id}
          orderNumber={cancellingOrder.id.slice(-8).toUpperCase()}
          token={token!}
          onOrderCancelled={fetchOrders}
        />
      )}

      {receiptOrder && (
        <OrderReceiptModal
          isOpen={!!receiptOrder}
          onClose={() => setReceiptOrder(null)}
          order={receiptOrder}
        />
      )}
    </div>
  );
}
