'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Package,
  User,
  Phone,
  MapPin,
  Calendar,
  ShoppingBag,
  Loader2,
  AlertCircle,
  Mail,
  Building,
  FileText,
  Receipt,
  ChevronDown,
  Clock,
  ShieldAlert,
  CheckCircle2,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { useAuth } from '@/lib/contexts/auth-context';
import { orderApi } from '@/lib/api/order';
import { toast } from 'sonner';
import { useRealtimeOrders } from '@/hooks/useRealtimeOrders';
import OrderStatusModal from '@/components/orders/OrderStatusModal';
import OrderReceiptModal from '@/components/orders/OrderReceiptModal';

export default function OrderDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const { token } = useAuth();
  const [order, setOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Return & Refund states
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [sellerNote, setSellerNote] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  const fetchOrderDetails = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await orderApi.getOrderDetails(token!, id as string);
      setOrder(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load order details');
    } finally {
      setIsLoading(false);
    }
  }, [token, id]);

  // Real-time updates across system
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
  }, [token, id, fetchOrderDetails]);

  const handleStatusUpdate = async (newStatus: string) => {
    try {
      setUpdating(true);
      await orderApi.updateOrderStatus(token!, id as string, newStatus);
      setOrder({ ...order, status: newStatus });
      toast.success(`Order status updated to ${newStatus.replace(/_/g, ' ')}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const handleApproveWithRefund = async () => {
    try {
      setUpdating(true);
      await orderApi.updateReturnRequestStatus(token!, id as string, {
        status: 'REFUNDED',
        refundNow: true,
        sellerResponse: sellerNote.trim() || undefined,
      });
      setOrder({
        ...order,
        status: 'REFUNDED',
        return_request: { ...order.return_request, status: 'REFUNDED' },
      });
      setIsRefundModalOpen(false);
      toast.success('Return approved and refund processed');
    } catch (err: any) {
      toast.error(err.message || 'Failed to process refund');
    } finally {
      setUpdating(false);
    }
  };

  const handleApproveShipment = async () => {
    try {
      setUpdating(true);
      await orderApi.updateReturnRequestStatus(token!, id as string, {
        status: 'APPROVED',
      });
      setOrder({
        ...order,
        return_request: { ...order.return_request, status: 'APPROVED' },
      });
      toast.success('Return authorized. Awaiting customer package delivery.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to authorize return');
    } finally {
      setUpdating(false);
    }
  };

  const handleConfirmReceivedAndRefund = async () => {
    try {
      setUpdating(true);
      await orderApi.confirmReturnReceivedAndRefund(token!, id as string);
      setOrder({
        ...order,
        status: 'REFUNDED',
        return_request: { ...order.return_request, status: 'REFUNDED' },
      });
      toast.success('Returned package verified & refund issued');
    } catch (err: any) {
      toast.error(err.message || 'Failed to confirm return');
    } finally {
      setUpdating(false);
    }
  };

  const handleRejectReturn = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Please specify the reason for rejection');
      return;
    }
    try {
      setUpdating(true);
      await orderApi.updateReturnRequestStatus(token!, id as string, {
        status: 'REJECTED',
        sellerResponse: rejectionReason.trim(),
      });
      setOrder({
        ...order,
        return_request: {
          ...order.return_request,
          status: 'REJECTED',
          seller_response: rejectionReason.trim(),
        },
      });
      setIsRejectModalOpen(false);
      toast.success('Return request rejected');
    } catch (err: any) {
      toast.error(err.message || 'Failed to reject return');
    } finally {
      setUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="text-primary h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="mx-auto mt-20 max-w-2xl px-4 text-center">
        <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500 opacity-20" />
        <h2 className="mb-2 text-xl font-medium uppercase tracking-tight">Order Not Found</h2>
        <p className="text-muted mb-8 text-[10px] font-normal uppercase tracking-wider">
          {error || "The order you are looking for does not exist or you don't have access to it."}
        </p>
        <Link href="/dashboard/orders">
          <Button variant="secondary" className="rounded-2xl px-8">
            Back to Orders
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 pb-20">
      {/* Header */}
      <div className="space-y-6">
        <Link
          href="/dashboard/orders"
          className="text-muted hover:text-foreground mb-4 inline-flex items-center gap-2 text-[10px] font-medium uppercase tracking-wider transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to list
        </Link>

        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <span
                className={`rounded-xl px-3 py-1 text-[10px] font-medium uppercase tracking-wider ${
                  ['PENDING', 'PROCESSING', 'PROCESSED', 'CONFIRMED'].includes(order.status)
                    ? 'bg-orange-500/10 text-orange-500'
                    : [
                          'COMPLETED',
                          'DELIVERED',
                          'SHIPPED',
                          'ON THE WAY',
                          'AVAILABLE FOR PICKUP',
                        ].includes(order.status)
                      ? 'bg-emerald-500/10 text-emerald-500'
                      : 'bg-red-500/10 text-red-500'
                }`}
              >
                {order.status}
              </span>
              <span className="text-muted flex items-center gap-1.5 text-[11px] font-normal uppercase tracking-wider">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(order.created_at).toLocaleDateString(undefined, { dateStyle: 'long' })}
              </span>
            </div>
            <h1 className="text-2xl font-medium uppercase tracking-tighter">
              Order #{order.id.slice(-8).toUpperCase()}
            </h1>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsReceiptModalOpen(true)}
              className="h-10 rounded-xl px-3.5 text-xs"
            >
              <Receipt className="mr-1.5 h-3.5 w-3.5" />
              Receipt
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsStatusModalOpen(true)}
              className="h-10 rounded-xl px-4 text-xs"
            >
              Update Status
              <ChevronDown className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        {/* Left Column: Items */}
        <div className="space-y-6 md:col-span-2">
          <Card className="bg-surface/40 rounded-3xl border-0 p-8 shadow-none" hoverEffect={false}>
            <div className="mb-8 flex items-center gap-3">
              <ShoppingBag className="text-primary h-5 w-5" />
              <h2 className="text-sm font-medium uppercase tracking-wide">Ordered Items</h2>
            </div>

            <div className="space-y-6">
              {order.items.map((item: any) => (
                <div
                  key={item.id}
                  className="border-border/30 flex gap-6 border-b pb-6 last:border-0 last:pb-0"
                >
                  <div className="bg-surface relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl">
                    {item.product?.video_url ? (
                      <video
                        src={item.product.video_url}
                        className="h-full w-full object-cover"
                        autoPlay
                        muted
                        loop
                        playsInline
                      />
                    ) : item.product?.image_urls?.[0] ? (
                      <img
                        src={item.product.image_urls[0]}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <ShoppingBag className="text-muted h-6 w-6" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-primary text-[9px] font-medium uppercase tracking-wider">
                      {item.product?.category || 'Archived'}
                    </p>
                    <h3 className="text-sm font-medium uppercase tracking-tight">
                      {item.product?.title || item.product_title || 'Removed product'}
                    </h3>
                    <div className="mt-2 flex items-center gap-4">
                      <p className="text-muted text-[10px] font-normal">Qty: {item.quantity}</p>
                      <p className="text-muted text-[10px] font-normal">
                        Price: GH₵{parseFloat(item.price).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium uppercase">
                      GH₵{(parseFloat(item.price) * item.quantity).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Financial Payout Breakdown with 4% Platform Fee */}
            <div className="border-border/30 mt-10 space-y-3 border-t pt-8">
              <div className="text-muted-foreground flex justify-between text-xs">
                <span>Gross Order Value</span>
                <span className="text-foreground font-mono font-medium">
                  GH₵ {parseFloat(order.total_amount).toFixed(2)}
                </span>
              </div>
              <div className="text-muted-foreground flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <span>Platform Commission (4%)</span>
                  <span className="bg-foreground/10 text-foreground rounded-md px-1.5 py-0.5 text-[9px] font-semibold">
                    -4%
                  </span>
                </div>
                <span className="font-mono font-medium text-red-500">
                  -GH₵ {(parseFloat(order.total_amount) * 0.04).toFixed(2)}
                </span>
              </div>
              <p className="text-muted-foreground text-[10px] leading-relaxed">
                Verndly standard 4% platform commission covers payment processing, escrow
                protection, and buyer security.
              </p>
              <div className="border-border/40 mt-4 flex items-center justify-between border-t pt-4">
                <div>
                  <p className="text-muted text-[10px] font-medium uppercase tracking-wider">
                    Net Seller Payout (96%)
                  </p>
                  <p className="text-[10px] font-medium text-emerald-600">
                    Automatic Subaccount Split
                  </p>
                </div>
                <p className="text-primary font-mono text-2xl font-medium">
                  GH₵{(parseFloat(order.total_amount) * 0.96).toFixed(2)}
                </p>
              </div>
            </div>
          </Card>

          {order.delivery_notes && (
            <Card
              className="bg-surface/30 rounded-3xl border-0 p-8 shadow-none"
              hoverEffect={false}
            >
              <div className="text-primary mb-4 flex items-center gap-3">
                <FileText className="h-5 w-5" />
                <h2 className="text-sm font-medium uppercase tracking-wide">Customer Notes</h2>
              </div>
              <p className="text-muted/80 text-xs font-medium italic leading-relaxed">
                "{order.delivery_notes}"
              </p>
            </Card>
          )}
        </div>

        {/* Right Column: Customer & Logistics */}
        <div className="space-y-6">
          <Card className="bg-surface/40 rounded-3xl border-0 p-8 shadow-none" hoverEffect={false}>
            <div className="mb-8 flex items-center gap-3">
              <User className="text-primary h-5 w-5" />
              <h2 className="text-sm font-medium uppercase tracking-wide">Customer Profile</h2>
            </div>

            <div className="space-y-6">
              <div className="space-y-1">
                <p className="text-muted text-[9px] font-medium uppercase tracking-wider">
                  Full Name
                </p>
                <p className="text-xs font-medium uppercase">
                  {order.customer_name || order.buyer.full_name}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-muted flex items-center gap-2 text-[9px] font-medium uppercase tracking-wider">
                  <Phone className="text-primary h-3 w-3" /> Phone
                </p>
                <p className="text-xs font-medium">{order.customer_phone || 'No phone provided'}</p>
              </div>

              <div className="space-y-1">
                <p className="text-muted flex items-center gap-2 text-[9px] font-medium uppercase tracking-wider">
                  <Mail className="text-primary h-3 w-3" /> Email
                </p>
                <p className="text-muted/80 truncate text-xs font-normal">{order.buyer.email}</p>
              </div>

              {order.buyer.school && (
                <div className="space-y-1">
                  <p className="text-muted flex items-center gap-2 text-[9px] font-medium uppercase tracking-wider">
                    <Building className="text-primary h-3 w-3" /> Business
                  </p>
                  <p className="text-xs font-medium uppercase">{order.buyer.school}</p>
                </div>
              )}
            </div>
          </Card>

          <Card className="bg-surface/40 rounded-3xl border-0 p-8 shadow-none" hoverEffect={false}>
            <div className="mb-8 flex items-center gap-3">
              <MapPin className="text-primary h-5 w-5" />
              <h2 className="text-sm font-medium uppercase tracking-wide">Logistics</h2>
            </div>

            <div className="space-y-6">
              <div className="space-y-1">
                <p className="text-muted text-[9px] font-medium uppercase tracking-wider">
                  Delivery Method
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <div className="bg-primary h-2 w-2 animate-pulse rounded-full" />
                  <p className="text-xs font-medium uppercase tracking-tighter">
                    {order.delivery_method || 'NOT SPECIFIED'}
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-muted text-[9px] font-medium uppercase tracking-wider">
                  Address / Location
                </p>
                <p className="text-muted/80 text-xs font-medium leading-relaxed">
                  {order.delivery_location || 'No address details provided for this order.'}
                </p>
              </div>
            </div>
          </Card>

          {order.return_request && (
            <Card
              className="bg-surface/40 space-y-6 rounded-3xl border-0 p-8 shadow-none"
              hoverEffect={false}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <RotateCcw className="h-5 w-5 text-amber-500" />
                  <h2 className="text-sm font-medium uppercase tracking-wide">
                    Return &amp; Refund Request
                  </h2>
                </div>
                <span
                  className={`rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                    order.return_request.status === 'APPROVED'
                      ? 'bg-blue-500/10 text-blue-500'
                      : order.return_request.status === 'REJECTED'
                        ? 'bg-red-500/10 text-red-500'
                        : order.return_request.status === 'ESCALATED'
                          ? 'bg-purple-500/10 text-purple-500'
                          : order.return_request.status === 'REFUNDED'
                            ? 'bg-emerald-500/10 text-emerald-500'
                            : 'bg-amber-500/10 text-amber-500'
                  }`}
                >
                  {order.return_request.status}
                </span>
              </div>

              {/* 48h SLA Notice */}
              {order.return_request.status === 'PENDING' && (
                <div className="space-y-1 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3.5 text-xs text-amber-700 dark:text-amber-300">
                  <div className="flex items-center gap-2 font-semibold">
                    <Clock className="h-4 w-4 shrink-0" />
                    <span>48-Hour Merchant Review SLA</span>
                  </div>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    Please evaluate the customer evidence below. If unresolved after 48 hours, the
                    customer may escalate this dispute to Verndly Trust &amp; Safety for binding
                    arbitration.
                  </p>
                </div>
              )}

              {/* Escalated Notice */}
              {order.return_request.status === 'ESCALATED' && (
                <div className="space-y-1 rounded-2xl border border-purple-500/20 bg-purple-500/10 p-3.5 text-xs text-purple-700 dark:text-purple-300">
                  <div className="flex items-center gap-2 font-semibold">
                    <ShieldAlert className="h-4 w-4 shrink-0" />
                    <span>Dispute Escalated to Verndly Support</span>
                  </div>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    A Verndly compliance officer is reviewing this case. You may be contacted for
                    additional verification before arbitration concludes.
                  </p>
                </div>
              )}

              {/* Refunded Notice */}
              {order.return_request.status === 'REFUNDED' && (
                <div className="space-y-1 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-xs text-emerald-700 dark:text-emerald-300">
                  <div className="flex items-center gap-2 font-semibold">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>Refund Issued to Buyer</span>
                  </div>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    Net amount debited from vendor balance. Platform fee (4%) has been reversed.
                  </p>
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-1">
                  <p className="text-muted text-[9px] font-medium uppercase tracking-wider">
                    Reason
                  </p>
                  <p className="text-xs font-medium uppercase">
                    {order.return_request.reason.replace(/_/g, ' ')}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted text-[9px] font-medium uppercase tracking-wider">
                    Customer Description
                  </p>
                  <p className="text-muted/80 text-xs font-medium italic leading-relaxed">
                    "{order.return_request.description}"
                  </p>
                </div>
                {order.return_request.seller_response && (
                  <div className="space-y-1">
                    <p className="text-muted text-[9px] font-medium uppercase tracking-wider">
                      Your Response
                    </p>
                    <p className="text-muted/80 text-xs font-medium italic leading-relaxed">
                      "{order.return_request.seller_response}"
                    </p>
                  </div>
                )}
                {order.return_request.photo_urls?.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-muted text-[9px] font-medium uppercase tracking-wider">
                      Uploaded Proof
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {order.return_request.photo_urls.map((url: string, idx: number) => (
                        <a
                          key={idx}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="border-border/40 block h-14 w-14 overflow-hidden rounded-xl border"
                        >
                          <img src={url} alt="Proof" className="h-full w-full object-cover" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons for Seller */}
              {order.return_request.status === 'PENDING' && (
                <div className="border-border/30 space-y-2 border-t pt-6">
                  <Button
                    disabled={updating}
                    onClick={() => setIsRefundModalOpen(true)}
                    className="h-10 w-full bg-emerald-600 text-xs text-white hover:bg-emerald-700"
                  >
                    Accept Return &amp; Issue Immediate Refund
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      disabled={updating}
                      onClick={handleApproveShipment}
                      variant="secondary"
                      className="h-10 flex-1 text-xs"
                    >
                      Authorize Return (Await Shipment)
                    </Button>
                    <Button
                      disabled={updating}
                      onClick={() => setIsRejectModalOpen(true)}
                      variant="ghost"
                      className="h-10 flex-1 text-xs text-red-500 hover:bg-red-500/10 hover:text-red-600"
                    >
                      Reject Claim
                    </Button>
                  </div>
                </div>
              )}

              {order.return_request.status === 'APPROVED' && (
                <div className="border-border/30 border-t pt-6">
                  <Button
                    disabled={updating}
                    onClick={handleConfirmReceivedAndRefund}
                    className="h-10 w-full bg-emerald-600 text-xs text-white hover:bg-emerald-700"
                  >
                    Confirm Package Received &amp; Issue Refund
                  </Button>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>

      {isStatusModalOpen && order && token && (
        <OrderStatusModal
          isOpen={isStatusModalOpen}
          onClose={() => setIsStatusModalOpen(false)}
          orderId={order.id}
          orderNumber={order.id.slice(-8).toUpperCase()}
          currentStatus={order.status}
          currentPaymentStatus={
            order.payment_info?.status || (order.status === 'PAID' ? 'PAID' : 'PENDING')
          }
          currentPaymentMethod={
            order.payment_info?.provider || order.transaction?.provider || 'PAYSTACK'
          }
          currentReference={order.payment_info?.reference || order.transaction?.reference || ''}
          currentProviderRef={order.payment_info?.provider_ref || order.transaction?.provider_ref}
          token={token}
          onStatusUpdated={(newStatus) => {
            setOrder((prev: any) => ({ ...prev, status: newStatus }));
          }}
          onPaymentUpdated={(paymentInfo, newOrderStatus) => {
            setOrder((prev: any) => ({
              ...prev,
              ...(newOrderStatus ? { status: newOrderStatus } : {}),
              payment_info: paymentInfo,
              transaction: paymentInfo,
            }));
          }}
        />
      )}

      {isReceiptModalOpen && order && (
        <OrderReceiptModal
          isOpen={isReceiptModalOpen}
          onClose={() => setIsReceiptModalOpen(false)}
          order={order}
        />
      )}

      {/* Refund Confirmation Modal */}
      {isRefundModalOpen && order && (
        <Modal
          isOpen={isRefundModalOpen}
          onClose={() => setIsRefundModalOpen(false)}
          title="Confirm Customer Refund"
        >
          <div className="space-y-6 pt-2">
            <div className="bg-surface/60 border-border/40 space-y-3 rounded-2xl border p-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted">Gross Order Value</span>
                <span className="font-mono font-medium">
                  GH₵ {parseFloat(order.total_amount).toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted">Platform Commission Reversal (4%)</span>
                <span className="font-mono font-medium text-emerald-600">
                  +GH₵ {(parseFloat(order.total_amount) * 0.04).toFixed(2)}
                </span>
              </div>
              <div className="border-border/30 flex items-center justify-between border-t pt-3">
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Net Deducted from Balance
                </span>
                <span className="font-mono text-base font-bold text-red-500">
                  -GH₵ {(parseFloat(order.total_amount) * 0.96).toFixed(2)}
                </span>
              </div>
            </div>

            <p className="text-muted text-[11px] leading-relaxed">
              Confirming this will immediately initiate an escrow refund back to the buyer via
              Paystack. Your store balance will be debited accordingly.
            </p>

            <div className="space-y-2">
              <label className="text-muted text-xs font-medium uppercase tracking-wider">
                Note to Customer (Optional)
              </label>
              <textarea
                value={sellerNote}
                onChange={(e) => setSellerNote(e.target.value)}
                rows={2}
                placeholder="e.g. Apologies for the inconvenience, refund approved."
                className="bg-surface/50 border-border/40 focus:border-primary w-full resize-none rounded-2xl border p-3 text-xs focus:outline-none"
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="ghost"
                onClick={() => setIsRefundModalOpen(false)}
                disabled={updating}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleApproveWithRefund}
                disabled={updating}
                className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700"
              >
                {updating ? 'Processing...' : 'Authorize Refund'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Rejection Modal */}
      {isRejectModalOpen && order && (
        <Modal
          isOpen={isRejectModalOpen}
          onClose={() => setIsRejectModalOpen(false)}
          title="Reject Return Request"
        >
          <div className="space-y-6 pt-2">
            <div className="space-y-1 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-xs text-amber-700 dark:text-amber-300">
              <p className="font-semibold">Important Notice</p>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                Under Verndly Buyer Protection, unjustified or frivolous rejections can be escalated
                by the buyer to Trust &amp; Safety for arbitration. Please state your exact reason.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-muted text-xs font-medium uppercase tracking-wider">
                Reason for Rejection *
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
                placeholder="Explain why the return cannot be accepted (e.g. item altered, tags removed, past 3-day window)..."
                className="bg-surface/50 border-border/40 focus:border-primary w-full resize-none rounded-2xl border p-3 text-xs focus:outline-none"
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="ghost"
                onClick={() => setIsRejectModalOpen(false)}
                disabled={updating}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleRejectReturn}
                disabled={updating || !rejectionReason.trim()}
                className="flex-1 bg-red-600 text-white hover:bg-red-700"
              >
                {updating ? 'Rejecting...' : 'Confirm Rejection'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
