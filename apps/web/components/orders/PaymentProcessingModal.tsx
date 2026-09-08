'use client';

import React from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { CheckCircle2, AlertCircle, Receipt, ArrowRight, RotateCw } from 'lucide-react';

export interface PaymentProcessingModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: 'verifying' | 'success' | 'failed';
  errorMessage?: string;
  orderNumber?: string;
  orderId?: string;
  reference?: string;
  amount?: string | number;
  onViewOrder?: () => void;
  onViewReceipt?: () => void;
  onRetry?: () => void;
}

export default function PaymentProcessingModal({
  isOpen,
  onClose,
  status,
  errorMessage,
  orderNumber,
  reference,
  amount,
  onViewOrder,
  onViewReceipt,
  onRetry,
}: PaymentProcessingModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={status === 'verifying' ? () => {} : onClose}
      showClose={status !== 'verifying'}
      title={
        status === 'verifying'
          ? 'Verifying Payment'
          : status === 'success'
          ? 'Payment Successful'
          : 'Payment Incomplete'
      }
    >
      <div className="py-4 text-center">
        {status === 'verifying' && (
          <div className="space-y-5 py-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-foreground/[0.04] border border-border flex items-center justify-center">
              <Spinner size="md" className="text-foreground" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-semibold text-foreground tracking-tight">
                Confirming with Paystack
              </h3>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
                Please hold on while we verify your transaction in real-time. Do not close this window.
              </p>
            </div>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-5 py-2">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-semibold text-foreground tracking-tight">
                Payment Verified
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                Your order has been paid and confirmed. The store has been notified to fulfill your items.
              </p>
            </div>

            <div className="bg-surface/50 border border-border rounded-xl p-4 text-left space-y-2.5 text-xs">
              {orderNumber && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Order ID</span>
                  <span className="font-mono font-medium text-foreground">#{orderNumber}</span>
                </div>
              )}
              {amount != null && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Amount Paid</span>
                  <span className="font-semibold text-foreground">
                    GH¢ {Number(amount).toFixed(2)}
                  </span>
                </div>
              )}
              {reference && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Reference</span>
                  <span className="font-mono text-[11px] text-muted-foreground truncate max-w-[180px]">
                    {reference}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between pt-1 border-t border-border">
                <span className="text-muted-foreground">Status</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  Settled
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              {onViewReceipt && (
                <Button
                  variant="secondary"
                  size="md"
                  onClick={onViewReceipt}
                  className="flex-1 text-xs"
                >
                  <Receipt className="w-3.5 h-3.5 mr-1.5" />
                  View Receipt
                </Button>
              )}
              <Button
                variant="primary"
                size="md"
                onClick={onViewOrder || onClose}
                className="flex-1 text-xs"
              >
                Track Order
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </div>
          </div>
        )}

        {status === 'failed' && (
          <div className="space-y-5 py-2">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-amber-600 dark:text-amber-400" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-semibold text-foreground tracking-tight">
                Payment Not Completed
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                {errorMessage ||
                  'The transaction was cancelled or could not be verified. If your account was debited, your order will update automatically once Paystack confirms.'}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <Button
                variant="secondary"
                size="md"
                onClick={onClose}
                className="flex-1 text-xs"
              >
                Close
              </Button>
              {onRetry && (
                <Button
                  variant="primary"
                  size="md"
                  onClick={onRetry}
                  className="flex-1 text-xs"
                >
                  <RotateCw className="w-3.5 h-3.5 mr-1.5" />
                  Try Again
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
