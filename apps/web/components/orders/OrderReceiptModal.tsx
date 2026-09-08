'use client';

import React, { useRef } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { Download, Printer, CheckCircle2, ShieldCheck } from 'lucide-react';

export interface OrderReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: any;
}

export default function OrderReceiptModal({
  isOpen,
  onClose,
  order,
}: OrderReceiptModalProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!order) return null;

  const orderNumber = `ORD-${order.id?.slice(-6)?.toUpperCase() || 'RECEIPT'}`;
  const storeName =
    order.items?.[0]?.product?.seller?.store_name ||
    order.seller?.store_name ||
    'Verndly Store';
  const createdDate = order.created_at ? new Date(order.created_at) : new Date();

  const handlePrint = () => {
    if (typeof window === 'undefined') return;
    window.print();
  };

  const handleDownloadPdf = () => {
    // Standard trigger for print-to-PDF
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const isPaid =
    order.status === 'PAID' ||
    order.payment_info?.status === 'SUCCESS' ||
    order.transaction?.status === 'SUCCESS';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Official Payment Receipt"
      className="max-w-xl"
    >
      <div className="space-y-4 pt-1">
        {/* Printable Receipt Container */}
        <div
          ref={receiptRef}
          id="official-order-receipt"
          className="p-6 bg-surface/80 rounded-2xl space-y-6 text-foreground border-0 shadow-none print:p-8 print:border-none print:bg-white print:text-black"
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-border/30 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight uppercase">
                  Verndly
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 uppercase tracking-wider">
                  Verified Payment
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Official Marketplace Invoice & Receipt
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs font-mono font-medium block">
                #{orderNumber}
              </span>
              <span className="text-[11px] text-muted-foreground block">
                {createdDate.toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>
          </div>

          {/* Details 2-Column Grid */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block mb-1">
                Merchant / Store
              </span>
              <p className="font-semibold text-foreground">{storeName}</p>
              <p className="text-muted-foreground text-[11px]">
                Verified Verndly Merchant
              </p>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block mb-1">
                Customer Details
              </span>
              <p className="font-semibold text-foreground">
                {order.customer_name || order.buyer?.full_name || 'Customer'}
              </p>
              {order.customer_phone && (
                <p className="text-muted-foreground text-[11px]">
                  {order.customer_phone}
                </p>
              )}
              {order.delivery_location && (
                <p className="text-muted-foreground text-[11px] truncate">
                  {order.delivery_location}
                </p>
              )}
            </div>
          </div>

          {/* Payment metadata */}
          <div className="bg-surface/50 rounded-xl p-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs border-0 shadow-none">
            <div>
              <span className="text-[10px] text-muted-foreground block uppercase tracking-wider font-semibold">
                Payment Channel
              </span>
              <span className="font-medium text-foreground">
                {(() => {
                  const prov = (
                    order.transaction?.provider ||
                    order.payment_info?.provider ||
                    'PAYSTACK'
                  ).toUpperCase();
                  if (prov.includes('CASH')) return 'Cash on Delivery';
                  if (prov.includes('PAYSTACK') || prov.includes('ONLINE'))
                    return 'Online (Paystack)';
                  return prov;
                })()}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground block uppercase tracking-wider font-semibold">
                Payment Status
              </span>
              <span
                className={`font-semibold ${
                  isPaid
                    ? 'text-emerald-600'
                    : order.status === 'CANCELLED'
                    ? 'text-neutral-500'
                    : 'text-amber-600'
                }`}
              >
                {isPaid ? 'Paid / Settled' : order.payment_info?.status || order.status}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground block uppercase tracking-wider font-semibold">
                Paystack Tx ID
              </span>
              <span className="font-mono text-[11px] truncate block text-foreground">
                {order.transaction?.provider_ref ||
                  order.payment_info?.provider_ref ||
                  order.provider_ref ||
                  '—'}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground block uppercase tracking-wider font-semibold">
                Reference
              </span>
              <span className="font-mono text-[10px] truncate block text-muted-foreground">
                {order.transaction?.reference ||
                  order.payment_info?.reference ||
                  order.reference ||
                  'N/A'}
              </span>
            </div>
          </div>

          {/* Items Table */}
          <div>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block mb-2">
              Purchased Items
            </span>
            <div className="rounded-xl overflow-hidden divide-y divide-border/30 text-xs bg-surface/30 border-0 shadow-none">
              {order.items?.map((item: any, idx: number) => {
                const title = item.product?.title || 'Product Item';
                const qty = item.quantity || 1;
                const price = Number(item.price || 0);
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3"
                  >
                    <div className="min-w-0 pr-4">
                      <p className="font-medium text-foreground truncate">
                        {title}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Qty: {qty} × GH¢ {price.toFixed(2)}
                      </p>
                    </div>
                    <span className="font-semibold text-foreground shrink-0">
                      GH¢ {(price * qty).toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Financial Breakdown */}
          <div className="border-t border-border/30 pt-3 space-y-1.5 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>Items Subtotal</span>
              <span className="font-mono">
                GH¢ {Number(order.total_amount || 0).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Delivery &amp; Logistics</span>
              <span className="text-emerald-600 font-medium">Included / Free</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-foreground pt-2 border-t border-border/40">
              <span>Total Settled &amp; Paid</span>
              <span className="font-mono">
                GH¢ {Number(order.total_amount || 0).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Footer Security Badge */}
          <div className="flex items-center gap-2 pt-2 text-[10px] text-muted-foreground border-t border-border/30">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>
              This is an official transaction record authenticated by Verndly and Paystack.
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between gap-3 pt-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
            className="text-xs h-9"
          >
            Close
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handlePrint}
              className="text-xs h-9"
            >
              <Printer className="w-3.5 h-3.5 mr-1.5" />
              Print
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleDownloadPdf}
              className="text-xs h-9"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Download PDF Receipt
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
