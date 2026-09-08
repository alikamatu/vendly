"use client";

import React, { useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { ShieldAlert, CheckCircle2, AlertTriangle } from "lucide-react";
import { orderApi } from "@/lib/api/order";
import { toast } from "sonner";

interface EscalateDisputeModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  orderNumber: string;
  token: string;
  onSuccess: () => void;
}

export default function EscalateDisputeModal({
  isOpen,
  onClose,
  orderId,
  orderNumber,
  token,
  onSuccess,
}: EscalateDisputeModalProps) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const canSubmit = reason.trim().length >= 15 && !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    try {
      await orderApi.escalateReturnRequest(token, orderId, reason.trim());
      setIsSuccess(true);
      toast.success("Dispute escalated to Verndly Trust & Safety");
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to escalate dispute");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setReason("");
      setIsSuccess(false);
      onClose();
    }
  };

  if (isSuccess) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} title="Dispute Escalated">
        <div className="py-8 text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-blue-500" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-medium uppercase tracking-tight">
              Case Under Admin Review
            </h3>
            <p className="text-xs text-muted font-normal leading-relaxed max-w-xs mx-auto">
              Your dispute for Order #{orderNumber} has been referred to Verndly
              Trust &amp; Safety. A compliance officer will review all evidence
              and issue a binding determination within 24 to 48 hours.
            </p>
          </div>
          <Button onClick={handleClose} className="w-full mt-4">
            Done
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Escalate Dispute to Verndly"
    >
      <div className="space-y-6 pt-2">
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-2">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              Verndly Escrow Arbitration
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            If you and the merchant could not resolve your return request amicably,
            Verndly compliance officers will impartially arbitrate this dispute
            under our official 7-Day Buyer Protection policy.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-wider text-muted flex items-center justify-between">
            <span>Reason for Escalation</span>
            <span className="text-[10px] text-muted font-normal">
              Min 15 chars
            </span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            placeholder="Explain why you disagree with the seller's response or what issue remains unresolved..."
            className="w-full rounded-2xl bg-surface/50 border border-border/40 p-4 text-xs font-normal text-foreground placeholder:text-muted focus:outline-none focus:border-primary transition-colors resize-none"
          />
          <p className="text-[10px] text-muted">
            {reason.length}/15 characters minimum
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            variant="ghost"
            onClick={handleClose}
            disabled={isSubmitting}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
          >
            {isSubmitting ? "Escalating..." : "Submit to Support"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
