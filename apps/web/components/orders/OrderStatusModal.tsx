'use client';

import React, { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { orderApi } from '@/lib/api/order';
import { toast } from 'sonner';
import {
  CheckCircle2,
  Clock,
  Package,
  Truck,
  MapPin,
  CheckCheck,
  XCircle,
  CreditCard,
  Banknote,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import clsx from '@/utils/clsx';

const STATUSES = [
  {
    value: 'CONFIRMED',
    label: 'Confirmed',
    description: 'Order acknowledged and accepted by seller',
    icon: CheckCircle2,
    color: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
  },
  {
    value: 'PROCESSING',
    label: 'Processing',
    description: 'Items are being packed and prepared',
    icon: Clock,
    color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
  },
  {
    value: 'PROCESSED',
    label: 'Processed',
    description: 'Packaging complete and ready for dispatch',
    icon: Package,
    color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20',
  },
  {
    value: 'SHIPPED',
    label: 'Shipped',
    description: 'Dispatched with rider or delivery courier',
    icon: Truck,
    color: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
  },
  {
    value: 'ON THE WAY',
    label: 'On the Way',
    description: 'In transit to buyer destination',
    icon: Truck,
    color: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
  },
  {
    value: 'AVAILABLE FOR PICKUP',
    label: 'Ready for Pickup',
    description: 'Ready at pickup station or store premises',
    icon: MapPin,
    color: 'text-sky-500 bg-sky-500/10 border-sky-500/20',
  },
  {
    value: 'DELIVERED',
    label: 'Delivered',
    description: 'Handed over successfully to the customer',
    icon: CheckCheck,
    color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
  },
  {
    value: 'COMPLETED',
    label: 'Completed',
    description: 'Fulfilled and finalised',
    icon: CheckCheck,
    color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
  },
  {
    value: 'CANCELLED',
    label: 'Cancelled',
    description: 'Order voided or cancelled',
    icon: XCircle,
    color: 'text-neutral-500 bg-neutral-500/10 border-neutral-500/20',
  },
] as const;

export interface OrderStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  orderNumber: string;
  currentStatus: string;
  currentPaymentStatus?: string;
  currentPaymentMethod?: string;
  currentReference?: string;
  currentProviderRef?: string;
  token: string;
  onStatusUpdated?: (newStatus: string) => void;
  onPaymentUpdated?: (paymentInfo: any, newOrderStatus?: string) => void;
}

export default function OrderStatusModal({
  isOpen,
  onClose,
  orderId,
  orderNumber,
  currentStatus,
  currentPaymentStatus = 'PENDING',
  currentPaymentMethod = 'PAYSTACK',
  currentReference = '',
  currentProviderRef,
  token,
  onStatusUpdated,
  onPaymentUpdated,
}: OrderStatusModalProps) {
  const [tab, setTab] = useState<'fulfillment' | 'payment'>('fulfillment');
  const [selectedStatus, setSelectedStatus] = useState<string>(currentStatus);

  // Payment state
  const normalizePaymentStatus = (s?: string): 'PAID' | 'PENDING' | 'FAILED' => {
    const upper = (s || '').toUpperCase();
    if (upper === 'SUCCESS' || upper === 'PAID') return 'PAID';
    if (upper === 'FAILED') return 'FAILED';
    return 'PENDING';
  };

  const normalizePaymentMethod = (m?: string): 'PAYSTACK' | 'CASH' => {
    const upper = (m || '').toUpperCase();
    if (upper.includes('CASH')) return 'CASH';
    return 'PAYSTACK';
  };

  const [paymentStatus, setPaymentStatus] = useState<'PAID' | 'PENDING' | 'FAILED'>(
    normalizePaymentStatus(currentPaymentStatus),
  );
  const [paymentMethod, setPaymentMethod] = useState<'PAYSTACK' | 'CASH'>(
    normalizePaymentMethod(currentPaymentMethod),
  );
  const [reference, setReference] = useState<string>(currentReference || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedStatus(currentStatus);
      setPaymentStatus(normalizePaymentStatus(currentPaymentStatus));
      setPaymentMethod(normalizePaymentMethod(currentPaymentMethod));
      setReference(currentReference || '');
    }
  }, [isOpen, currentStatus, currentPaymentStatus, currentPaymentMethod, currentReference]);

  const handleUpdateFulfillment = async () => {
    if (selectedStatus === currentStatus) {
      onClose();
      return;
    }

    setIsSubmitting(true);
    try {
      await orderApi.updateOrderStatus(token, orderId, selectedStatus);
      toast.success(`Order #${orderNumber} updated to ${selectedStatus.replace(/_/g, ' ')}`);
      onStatusUpdated?.(selectedStatus);
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update order status');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdatePayment = async () => {
    setIsSubmitting(true);
    try {
      const res = await orderApi.updateOrderPaymentStatus(token, orderId, {
        payment_status: paymentStatus,
        payment_method: paymentMethod,
        reference: reference.trim() || undefined,
      });

      toast.success(
        `Payment marked as ${paymentStatus === 'PAID' ? 'Paid' : paymentStatus} (${
          paymentMethod === 'PAYSTACK' ? 'Online Paystack' : 'Cash on Delivery'
        })`,
      );

      if (res?.order) {
        onPaymentUpdated?.(res.order.payment_info, res.order.status);
        if (res.order.status && res.order.status !== currentStatus) {
          onStatusUpdated?.(res.order.status);
        }
      } else {
        onPaymentUpdated?.({
          status: paymentStatus === 'PAID' ? 'SUCCESS' : paymentStatus,
          provider: paymentMethod,
          reference: reference || currentReference,
        });
      }

      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update payment status');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={isSubmitting ? () => {} : onClose}
      title={`Order #${orderNumber}`}
      description="Manage order fulfillment and payment records."
      className="max-w-lg"
    >
      <div className="space-y-4 pt-1">
        {/* Segmented Control */}
        <div className="flex bg-surface p-1 rounded-xl border border-border">
          <button
            type="button"
            onClick={() => setTab('fulfillment')}
            className={clsx(
              'flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg transition-all',
              tab === 'fulfillment'
                ? 'bg-foreground text-background shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            Fulfillment Status
          </button>
          <button
            type="button"
            onClick={() => setTab('payment')}
            className={clsx(
              'flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg transition-all',
              tab === 'payment'
                ? 'bg-foreground text-background shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            Payment &amp; Channel
          </button>
        </div>

        {tab === 'fulfillment' && (
          <>
            <div className="space-y-2 max-h-[46vh] overflow-y-auto pr-1">
              {STATUSES.map((item) => {
                const Icon = item.icon;
                const isSelected = selectedStatus === item.value;
                const isCurrent = currentStatus === item.value;

                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setSelectedStatus(item.value)}
                    className={clsx(
                      'w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all',
                      isSelected
                        ? 'border-foreground bg-foreground/[0.04]'
                        : 'border-border hover:border-foreground/30 bg-surface/40',
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={clsx(
                          'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border',
                          item.color,
                        )}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-foreground tracking-tight">
                            {item.label}
                          </span>
                          {isCurrent && (
                            <span className="text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.2 rounded bg-foreground/10 text-foreground">
                              Current
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {item.description}
                        </p>
                      </div>
                    </div>

                    <div
                      className={clsx(
                        'w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ml-2 transition-colors',
                        isSelected
                          ? 'border-foreground bg-foreground text-background'
                          : 'border-border',
                      )}
                    >
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-background" />}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
              <Button
                variant="secondary"
                size="sm"
                onClick={onClose}
                disabled={isSubmitting}
                className="text-xs h-9 px-4"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleUpdateFulfillment}
                isLoading={isSubmitting}
                disabled={isSubmitting || selectedStatus === currentStatus}
                className="text-xs h-9 px-5"
              >
                Apply Fulfillment Status
              </Button>
            </div>
          </>
        )}

        {tab === 'payment' && (
          <div className="space-y-4">
            {/* Payment Method / Channel Selection */}
            <div>
              <label className="text-xs font-semibold text-foreground block mb-2">
                Payment Channel
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('PAYSTACK')}
                  className={clsx(
                    'p-3 rounded-xl border text-left flex items-start gap-3 transition-all',
                    paymentMethod === 'PAYSTACK'
                      ? 'border-foreground bg-foreground/[0.04]'
                      : 'border-border hover:border-foreground/30 bg-surface/30',
                  )}
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-500 flex items-center justify-center shrink-0">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-foreground">Online (Paystack)</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      Card, Momo, Bank transfer
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('CASH')}
                  className={clsx(
                    'p-3 rounded-xl border text-left flex items-start gap-3 transition-all',
                    paymentMethod === 'CASH'
                      ? 'border-foreground bg-foreground/[0.04]'
                      : 'border-border hover:border-foreground/30 bg-surface/30',
                  )}
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
                    <Banknote className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-foreground">Cash on Delivery</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      Physical cash handover
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Payment Status Selection */}
            <div>
              <label className="text-xs font-semibold text-foreground block mb-2">
                Payment Status
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentStatus('PAID')}
                  className={clsx(
                    'py-2 px-3 rounded-xl border text-center text-xs font-semibold transition-all',
                    paymentStatus === 'PAID'
                      ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                      : 'border-border text-muted-foreground hover:text-foreground bg-surface/30',
                  )}
                >
                  Paid / Settled
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentStatus('PENDING')}
                  className={clsx(
                    'py-2 px-3 rounded-xl border text-center text-xs font-semibold transition-all',
                    paymentStatus === 'PENDING'
                      ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                      : 'border-border text-muted-foreground hover:text-foreground bg-surface/30',
                  )}
                >
                  Pending
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentStatus('FAILED')}
                  className={clsx(
                    'py-2 px-3 rounded-xl border text-center text-xs font-semibold transition-all',
                    paymentStatus === 'FAILED'
                      ? 'bg-red-500/10 text-red-600 border-red-500/30'
                      : 'border-border text-muted-foreground hover:text-foreground bg-surface/30',
                  )}
                >
                  Failed
                </button>
              </div>
            </div>

            {/* Paystack Reference & Transaction ID */}
            {paymentMethod === 'PAYSTACK' ? (
              <div className="space-y-2">
                <Input
                  label="Paystack Reference / Transaction Code"
                  placeholder="e.g. ORD_... or Paystack Ref"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  hint="We verify this with Paystack to retrieve and link the official Paystack Transaction ID."
                />
                {currentProviderRef && (
                  <div className="flex items-center gap-1.5 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs">
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                    <span>
                      Verified Paystack Transaction ID:{' '}
                      <strong className="font-mono">{currentProviderRef}</strong>
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <Input
                label="Cash Receipt Note / Reference (Optional)"
                placeholder="e.g. Received at pickup / by rider"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                hint="Optional reference note for your accounting receipt."
              />
            )}

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
              <Button
                variant="secondary"
                size="sm"
                onClick={onClose}
                disabled={isSubmitting}
                className="text-xs h-9 px-4"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleUpdatePayment}
                isLoading={isSubmitting}
                disabled={isSubmitting}
                className="text-xs h-9 px-5"
              >
                Save Payment Status
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
