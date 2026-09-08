"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
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
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { useAuth } from "@/lib/contexts/auth-context";
import { orderApi } from "@/lib/api/order";
import { toast } from "sonner";
import { useRealtimeOrders } from "@/hooks/useRealtimeOrders";
import OrderStatusModal from "@/components/orders/OrderStatusModal";
import OrderReceiptModal from "@/components/orders/OrderReceiptModal";

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
  }, [token, id]);

  const fetchOrderDetails = async () => {
    try {
      setIsLoading(true);
      const data = await orderApi.getOrderDetails(token!, id as string);
      setOrder(data);
    } catch (err: any) {
      setError(err.message || "Failed to load order details");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    try {
      setUpdating(true);
      await orderApi.updateOrderStatus(token!, id as string, newStatus);
      setOrder({ ...order, status: newStatus });
      toast.success(`Order status updated to ${newStatus.replace(/_/g, ' ')}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
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
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-2xl mx-auto px-4 mt-20 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4 opacity-20" />
        <h2 className="text-xl font-medium uppercase tracking-tight mb-2">Order Not Found</h2>
        <p className="text-[10px] text-muted font-normal uppercase tracking-wider mb-8">{error || "The order you are looking for does not exist or you don't have access to it."}</p>
        <Link href="/dashboard/orders">
          <Button variant="secondary" className="rounded-2xl px-8">Back to Orders</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 pb-20 space-y-8">
      {/* Header */}
      <div className="space-y-6">
        <Link
          href="/dashboard/orders"
          className="inline-flex items-center gap-2 text-[10px] font-medium text-muted hover:text-foreground uppercase tracking-wider transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to list
        </Link>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className={`px-3 py-1 rounded-xl text-[10px] font-medium uppercase tracking-wider ${['PENDING', 'PROCESSING', 'PROCESSED', 'CONFIRMED'].includes(order.status) ? 'bg-orange-500/10 text-orange-500' :
                  ['COMPLETED', 'DELIVERED', 'SHIPPED', 'ON THE WAY', 'AVAILABLE FOR PICKUP'].includes(order.status) ? 'bg-emerald-500/10 text-emerald-500' :
                    'bg-red-500/10 text-red-500'
                }`}>
                {order.status}
              </span>
              <span className="text-[11px] text-muted font-normal flex items-center gap-1.5 uppercase tracking-wider">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(order.created_at).toLocaleDateString(undefined, { dateStyle: 'long' })}
              </span>
            </div>
            <h1 className="text-2xl font-medium tracking-tighter uppercase">Order #{order.id.slice(-8).toUpperCase()}</h1>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsReceiptModalOpen(true)}
              className="h-10 px-3.5 text-xs rounded-xl"
            >
              <Receipt className="w-3.5 h-3.5 mr-1.5" />
              Receipt
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsStatusModalOpen(true)}
              className="h-10 px-4 text-xs rounded-xl"
            >
              Update Status
              <ChevronDown className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column: Items */}
        <div className="md:col-span-2 space-y-6">
          <Card
            className="p-8 rounded-3xl bg-surface/40 border-0 shadow-none"
            hoverEffect={false}
          >
            <div className="flex items-center gap-3 mb-8">
              <ShoppingBag className="w-5 h-5 text-primary" />
              <h2 className="text-sm font-medium uppercase tracking-wide">Ordered Items</h2>
            </div>

            <div className="space-y-6">
              {order.items.map((item: any) => (
                <div key={item.id} className="flex gap-6 pb-6 border-b border-border/30 last:border-0 last:pb-0">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden shrink-0 bg-surface relative">
                    {item.product.video_url ? (
                      <video
                        src={item.product.video_url}
                        className="w-full h-full object-cover"
                        autoPlay
                        muted
                        loop
                        playsInline
                      />
                    ) : (
                      <img src={item.product.image_urls[0]} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-[9px] font-medium text-primary uppercase tracking-wider">{item.product.category}</p>
                    <h3 className="text-sm font-medium uppercase tracking-tight">{item.product.title}</h3>
                    <div className="flex items-center gap-4 mt-2">
                      <p className="text-[10px] text-muted font-normal">Qty: {item.quantity}</p>
                      <p className="text-[10px] text-muted font-normal">Price: GH₵{parseFloat(item.price).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium uppercase">GH₵{(parseFloat(item.price) * item.quantity).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Financial Payout Breakdown with 4% Platform Fee */}
            <div className="mt-10 pt-8 border-t border-border/30 space-y-3">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Gross Order Value</span>
                <span className="font-mono text-foreground font-medium">
                  GH₵ {parseFloat(order.total_amount).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <span>Platform Commission (4%)</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-foreground/10 text-foreground font-semibold">
                    -4%
                  </span>
                </div>
                <span className="font-mono text-red-500 font-medium">
                  -GH₵ {(parseFloat(order.total_amount) * 0.04).toFixed(2)}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Verndly standard 4% platform commission covers payment processing, escrow protection, and buyer security.
              </p>
              <div className="mt-4 pt-4 border-t border-border/40 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-medium text-muted uppercase tracking-wider">Net Seller Payout (96%)</p>
                  <p className="text-[10px] text-emerald-600 font-medium">Automatic Subaccount Split</p>
                </div>
                <p className="text-2xl font-medium text-primary font-mono">
                  GH₵{(parseFloat(order.total_amount) * 0.96).toFixed(2)}
                </p>
              </div>
            </div>
          </Card>

          {order.delivery_notes && (
            <Card className="p-8 rounded-3xl bg-surface/30 border-0 shadow-none" hoverEffect={false}>
              <div className="flex items-center gap-3 mb-4 text-primary">
                <FileText className="w-5 h-5" />
                <h2 className="text-sm font-medium uppercase tracking-wide">Customer Notes</h2>
              </div>
              <p className="text-xs font-medium text-muted/80 leading-relaxed italic">
                "{order.delivery_notes}"
              </p>
            </Card>
          )}
        </div>

        {/* Right Column: Customer & Logistics */}
        <div className="space-y-6">
          <Card className="p-8 rounded-3xl bg-surface/40 border-0 shadow-none" hoverEffect={false}>
            <div className="flex items-center gap-3 mb-8">
              <User className="w-5 h-5 text-primary" />
              <h2 className="text-sm font-medium uppercase tracking-wide">Customer Profile</h2>
            </div>

            <div className="space-y-6">
              <div className="space-y-1">
                <p className="text-[9px] font-medium text-muted uppercase tracking-wider">Full Name</p>
                <p className="text-xs font-medium uppercase">{order.customer_name || order.buyer.full_name}</p>
              </div>

              <div className="space-y-1">
                <p className="text-[9px] font-medium text-muted uppercase tracking-wider flex items-center gap-2">
                  <Phone className="w-3 h-3 text-primary" /> Phone
                </p>
                <p className="text-xs font-medium">{order.customer_phone || "No phone provided"}</p>
              </div>

              <div className="space-y-1">
                <p className="text-[9px] font-medium text-muted uppercase tracking-wider flex items-center gap-2">
                  <Mail className="w-3 h-3 text-primary" /> Email
                </p>
                <p className="text-xs font-normal text-muted/80 truncate">{order.buyer.email}</p>
              </div>

              {order.buyer.school && (
                <div className="space-y-1">
                  <p className="text-[9px] font-medium text-muted uppercase tracking-wider flex items-center gap-2">
                    <Building className="w-3 h-3 text-primary" /> Business
                  </p>
                  <p className="text-xs font-medium uppercase">{order.buyer.school}</p>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-8 rounded-3xl bg-surface/40 border-0 shadow-none" hoverEffect={false}>
            <div className="flex items-center gap-3 mb-8">
              <MapPin className="w-5 h-5 text-primary" />
              <h2 className="text-sm font-medium uppercase tracking-wide">Logistics</h2>
            </div>

            <div className="space-y-6">
              <div className="space-y-1">
                <p className="text-[9px] font-medium text-muted uppercase tracking-wider">Delivery Method</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                  <p className="text-xs font-medium uppercase tracking-tighter">{order.delivery_method || "NOT SPECIFIED"}</p>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-[9px] font-medium text-muted uppercase tracking-wider">Address / Location</p>
                <p className="text-xs font-medium text-muted/80 leading-relaxed">
                  {order.delivery_location || "No address details provided for this order."}
                </p>
              </div>
            </div>
          </Card>

          {order.return_request && (
            <Card className="p-8 rounded-3xl bg-surface/40 border-0 shadow-none space-y-6" hoverEffect={false}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <RotateCcw className="w-5 h-5 text-amber-500" />
                  <h2 className="text-sm font-medium uppercase tracking-wide">
                    Return &amp; Refund Request
                  </h2>
                </div>
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

              {/* 48h SLA Notice */}
              {order.return_request.status === 'PENDING' && (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 space-y-1">
                  <div className="flex items-center gap-2 font-semibold">
                    <Clock className="w-4 h-4 shrink-0" />
                    <span>48-Hour Merchant Review SLA</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    Please evaluate the customer evidence below. If unresolved after 48 hours, the customer may escalate this dispute to Verndly Trust &amp; Safety for binding arbitration.
                  </p>
                </div>
              )}

              {/* Escalated Notice */}
              {order.return_request.status === 'ESCALATED' && (
                <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-700 dark:text-purple-300 space-y-1">
                  <div className="flex items-center gap-2 font-semibold">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>Dispute Escalated to Verndly Support</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    A Verndly compliance officer is reviewing this case. You may be contacted for additional verification before arbitration concludes.
                  </p>
                </div>
              )}

              {/* Refunded Notice */}
              {order.return_request.status === 'REFUNDED' && (
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-300 space-y-1">
                  <div className="flex items-center gap-2 font-semibold">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Refund Issued to Buyer</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    Net amount debited from vendor balance. Platform fee (4%) has been reversed.
                  </p>
                </div>
              )}
              
              <div className="space-y-4">
                <div className="space-y-1">
                  <p className="text-[9px] font-medium text-muted uppercase tracking-wider">Reason</p>
                  <p className="text-xs font-medium uppercase">{order.return_request.reason.replace(/_/g, ' ')}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-medium text-muted uppercase tracking-wider">Customer Description</p>
                  <p className="text-xs font-medium text-muted/80 leading-relaxed italic">"{order.return_request.description}"</p>
                </div>
                {order.return_request.seller_response && (
                  <div className="space-y-1">
                    <p className="text-[9px] font-medium text-muted uppercase tracking-wider">Your Response</p>
                    <p className="text-xs font-medium text-muted/80 leading-relaxed italic">"{order.return_request.seller_response}"</p>
                  </div>
                )}
                {order.return_request.photo_urls?.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[9px] font-medium text-muted uppercase tracking-wider">Uploaded Proof</p>
                    <div className="flex gap-2 flex-wrap">
                      {order.return_request.photo_urls.map((url: string, idx: number) => (
                        <a key={idx} href={url} target="_blank" rel="noreferrer" className="h-14 w-14 rounded-xl border border-border/40 overflow-hidden block">
                          <img src={url} alt="Proof" className="w-full h-full object-cover" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons for Seller */}
              {order.return_request.status === 'PENDING' && (
                <div className="space-y-2 border-t border-border/30 pt-6">
                  <Button 
                    disabled={updating}
                    onClick={() => setIsRefundModalOpen(true)}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-10"
                  >
                    Accept Return &amp; Issue Immediate Refund
                  </Button>
                  <div className="flex gap-2">
                    <Button 
                      disabled={updating}
                      onClick={handleApproveShipment}
                      variant="secondary"
                      className="flex-1 text-xs h-10"
                    >
                      Authorize Return (Await Shipment)
                    </Button>
                    <Button 
                      disabled={updating}
                      onClick={() => setIsRejectModalOpen(true)}
                      variant="ghost"
                      className="flex-1 text-red-500 hover:text-red-600 hover:bg-red-500/10 text-xs h-10"
                    >
                      Reject Claim
                    </Button>
                  </div>
                </div>
              )}

              {order.return_request.status === 'APPROVED' && (
                <div className="border-t border-border/30 pt-6">
                  <Button 
                    disabled={updating}
                    onClick={handleConfirmReceivedAndRefund}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-10"
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
          currentPaymentStatus={order.payment_info?.status || (order.status === 'PAID' ? 'PAID' : 'PENDING')}
          currentPaymentMethod={order.payment_info?.provider || order.transaction?.provider || 'PAYSTACK'}
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
            <div className="p-4 rounded-2xl bg-surface/60 border border-border/40 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted">Gross Order Value</span>
                <span className="font-mono font-medium">GH₵ {parseFloat(order.total_amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted">Platform Commission Reversal (4%)</span>
                <span className="font-mono text-emerald-600 font-medium">+GH₵ {(parseFloat(order.total_amount) * 0.04).toFixed(2)}</span>
              </div>
              <div className="pt-3 border-t border-border/30 flex justify-between items-center">
                <span className="text-xs font-semibold uppercase tracking-wider">Net Deducted from Balance</span>
                <span className="font-mono text-base font-bold text-red-500">
                  -GH₵ {(parseFloat(order.total_amount) * 0.96).toFixed(2)}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-muted leading-relaxed">
              Confirming this will immediately initiate an escrow refund back to the buyer via Paystack. Your store balance will be debited accordingly.
            </p>

            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wider text-muted">
                Note to Customer (Optional)
              </label>
              <textarea
                value={sellerNote}
                onChange={(e) => setSellerNote(e.target.value)}
                rows={2}
                placeholder="e.g. Apologies for the inconvenience, refund approved."
                className="w-full rounded-2xl bg-surface/50 border border-border/40 p-3 text-xs focus:outline-none focus:border-primary resize-none"
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
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
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
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 space-y-1">
              <p className="font-semibold">Important Notice</p>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Under Verndly Buyer Protection, unjustified or frivolous rejections can be escalated by the buyer to Trust &amp; Safety for arbitration. Please state your exact reason.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wider text-muted">
                Reason for Rejection *
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
                placeholder="Explain why the return cannot be accepted (e.g. item altered, tags removed, past 7-day window)..."
                className="w-full rounded-2xl bg-surface/50 border border-border/40 p-3 text-xs focus:outline-none focus:border-primary resize-none"
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
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
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
