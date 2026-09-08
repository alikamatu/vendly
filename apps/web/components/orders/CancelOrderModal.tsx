'use client';

import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { orderApi } from '@/lib/api/order';
import { toast } from 'sonner';
import { AlertTriangle } from 'lucide-react';
import clsx from '@/utils/clsx';

const CANCEL_REASONS = [
  'Changed my mind',
  'Ordered by mistake',
  'Found better price elsewhere',
  'Delivery timeline too long',
  'Duplicate order placed',
  'Other reason',
];

export interface CancelOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  orderNumber: string;
  token: string;
  onOrderCancelled: () => void;
}

export default function CancelOrderModal({
  isOpen,
  onClose,
  orderId,
  orderNumber,
  token,
  onOrderCancelled,
}: CancelOrderModalProps) {
  const [selectedReason, setSelectedReason] = useState(CANCEL_REASONS[0]);
  const [customReason, setCustomReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCancel = async () => {
    setIsSubmitting(true);
    const finalReason =
      selectedReason === 'Other reason' && customReason.trim()
        ? customReason.trim()
        : selectedReason;

    try {
      await orderApi.cancelOrder(token, orderId, finalReason);
      toast.success(`Order #${orderNumber} was cancelled`);
      onOrderCancelled();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel order');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={isSubmitting ? () => {} : onClose}
      title="Cancel Order"
      description={`Are you sure you want to cancel order #${orderNumber}?`}
      className="max-w-md"
    >
      <div className="space-y-4 pt-1">
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Cancellation is permanent. If you have already made payment, any eligible refund will follow the store policy.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-foreground tracking-tight block">
            Reason for cancellation
          </label>
          <div className="space-y-1.5">
            {CANCEL_REASONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setSelectedReason(r)}
                className={clsx(
                  'w-full flex items-center justify-between px-3 py-2 rounded-lg border text-left text-xs transition-all',
                  selectedReason === r
                    ? 'border-foreground bg-foreground/[0.04] font-medium'
                    : 'border-border hover:border-foreground/20 text-muted-foreground',
                )}
              >
                <span>{r}</span>
                <div
                  className={clsx(
                    'w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0',
                    selectedReason === r
                      ? 'border-foreground bg-foreground'
                      : 'border-border',
                  )}
                >
                  {selectedReason === r && (
                    <div className="w-1 h-1 rounded-full bg-background" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {selectedReason === 'Other reason' && (
          <div>
            <textarea
              rows={2}
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="Tell us why you are cancelling..."
              className="w-full text-xs p-2.5 rounded-xl border border-border bg-surface focus:outline-none focus:border-foreground transition"
            />
          </div>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-xs h-9 px-4"
          >
            Keep Order
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={handleCancel}
            isLoading={isSubmitting}
            disabled={isSubmitting}
            className="text-xs h-9 px-5"
          >
            Confirm Cancellation
          </Button>
        </div>
      </div>
    </Modal>
  );
}
