'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
} from 'lucide-react';
import Link from 'next/link';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useAuth } from '@/lib/contexts/auth-context';
import { orderApi } from '@/lib/api/order';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

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
  const [isCancelling, setIsCancelling] = useState<string | null>(null);

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

  const handleRetryPayment = async (orderId: string) => {
    if (!token) return;
    try {
      setIsRetrying(orderId);
      const result = await orderApi.retryPayment(token, orderId);
      if (result.authorization_url) {
        window.location.assign(result.authorization_url);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to re-initialize payment');
      setIsRetrying(null);
    }
  };

  const handleCancel = async (orderId: string) => {
    if (!token) return;
    const reason = window.prompt(
      'Cancel this order? Optionally provide a reason for the seller:',
      '',
    );
    if (reason === null) return; // user dismissed
    try {
      setIsCancelling(orderId);
      await orderApi.cancelOrder(token, orderId, reason || undefined);
      await fetchOrders();
    } catch (err: any) {
      setError(err.message || 'Failed to cancel order');
    } finally {
      setIsCancelling(null);
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
        <Loader2 className="text-primary h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen">
      <DashboardHeader title="My Orders" />

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
            <Loader2 className="h-4 w-4 animate-spin" />
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
                    className="border-border/50 hover:bg-surface/30 overflow-hidden rounded-3xl border p-5 transition-all sm:p-6"
                    hoverEffect={false}
                  >
                    <div className="border-border/50 mb-6 flex flex-col justify-between gap-4 border-b pb-6 sm:flex-row sm:items-center">
                      <div className="flex items-center gap-3">
                        <div className="bg-surface border-border/50 rounded-2xl border p-3">
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
                          className={`border-border/50 bg-surface/50 flex items-center gap-2 rounded-xl border px-3 py-1.5`}
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
                      <div className="bg-surface/50 border-border/30 mb-6 flex items-center justify-between rounded-2xl border px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="bg-background border-border/50 flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg border">
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

                    <div className="space-y-4">
                      {order.items.map((item: any) => (
                        <div key={item.id} className="flex items-center gap-4">
                          <div className="border-border/50 bg-surface group relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border">
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
                                  <span className="inline-flex h-6 cursor-pointer items-center rounded-md border border-amber-500/20 bg-amber-500/5 px-2 text-[9px] font-medium uppercase tracking-wider text-amber-600 transition-colors hover:bg-amber-500/10 dark:text-amber-400">
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
                    <div className="border-border/50 mt-6 grid grid-cols-1 gap-4 border-t pt-6 sm:grid-cols-2">
                      <div className="space-y-3">
                        <p className="text-muted border-border/50 border-b pb-2 text-[10px] font-medium uppercase tracking-wider">
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
                            <span className="bg-surface border-border/50 rounded-md border px-2 py-0.5 text-[10px] font-normal uppercase">
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
                        <p className="text-muted border-border/50 border-b pb-2 text-[10px] font-medium uppercase tracking-wider">
                          Payment Details
                        </p>
                        <div className="space-y-2">
                          <p className="text-xs">
                            <span className="text-muted font-normal">Provider:</span>{' '}
                            <span
                              className={`rounded-md border px-2 py-0.5 text-[10px] font-normal uppercase ${order.payment_info?.provider === 'PAYSTACK' ? 'bg-primary/10 text-primary border-primary/20' : 'bg-surface border-border/50'}`}
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
                                onClick={() => handleRetryPayment(order.id)}
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
                                onClick={() => handleCancel(order.id)}
                                isLoading={isCancelling === order.id}
                                className="flex h-8 items-center gap-2 rounded-xl px-3 text-[9px] font-medium uppercase tracking-wider text-red-600 hover:bg-red-500/5"
                              >
                                <AlertCircle className="h-3 w-3" /> Cancel order
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="border-border/50 mt-6 flex items-center justify-between border-t pt-6">
                      <div>
                        <p className="text-muted text-[10px] font-medium uppercase tracking-wider mb-1">
                          Total Amount
                        </p>
                        <p className="text-primary text-lg font-medium leading-none">
                          GH₵{parseFloat(order.total_amount).toLocaleString()}
                        </p>
                      </div>
                      <Link href={`/orders/${order.id}`}>
                        <Button variant="secondary" size="sm" className="h-9 px-5 rounded-xl text-[10px] font-medium uppercase tracking-wider gap-2">
                          View Details
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </Card>
                </motion.div>
              ))
            ) : (
              <div className="border-border/50 bg-surface/10 space-y-4 rounded-[2.5rem] border border-dashed py-20 text-center">
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
    </div>
  );
}
