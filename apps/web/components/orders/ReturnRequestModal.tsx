"use client";

import React, { useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { AlertCircle, CheckCircle2, RotateCcw } from "lucide-react";
import { orderApi } from "@/lib/api/order";
import { toast } from "sonner";

const RETURN_REASONS = [
  { value: "DAMAGED", label: "Damaged on Arrival" },
  { value: "WRONG_ITEM", label: "Wrong Item Sent" },
  { value: "NOT_AS_DESCRIBED", label: "Not as Described" },
  { value: "DEFECTIVE", label: "Defective / Not Working" },
  { value: "OTHER", label: "Other" },
] as const;

interface ReturnRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  token: string;
  onSuccess: () => void;
}

export default function ReturnRequestModal({
  isOpen,
  onClose,
  orderId,
  token,
  onSuccess,
}: ReturnRequestModalProps) {
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const canSubmit = reason && description.trim().length >= 20 && !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    try {
      await orderApi.createReturnRequest(token, orderId, {
        reason,
        description: description.trim(),
      });
      setIsSuccess(true);
      toast.success("Return request submitted successfully");
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit return request");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setReason("");
      setDescription("");
      setIsSuccess(false);
      onClose();
    }
  };

  if (isSuccess) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} title="Return Requested">
        <div className="py-8 text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-medium uppercase tracking-tight">
              Request Submitted
            </h3>
            <p className="text-xs text-muted font-normal leading-relaxed max-w-xs mx-auto">
              The seller has been notified and has 48 hours to respond. You can
              escalate to Vendly support if unresolved.
            </p>
          </div>
          <Button
            onClick={handleClose}
            className="rounded-xl px-8 text-[10px] font-medium uppercase tracking-wider h-10 mt-4"
          >
            Done
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Request a Return">
      <div className="space-y-6">
        {/* Info banner */}
        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
          <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
          <p className="text-[10px] text-amber-600 dark:text-amber-400 font-normal leading-relaxed">
            Returns must be requested within 7 days of order placement. The
            seller will review your request and respond within 48 hours.
          </p>
        </div>

        {/* Reason selector */}
        <div className="space-y-2.5">
          <label className="text-[10px] font-medium text-muted uppercase tracking-wider block">
            Reason for Return
          </label>
          <div className="flex flex-wrap gap-2">
            {RETURN_REASONS.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setReason(r.value)}
                className={`px-3.5 py-2 rounded-xl text-[10px] font-medium uppercase tracking-wider border transition-all ${reason === r.value
                    ? "bg-primary text-primary border-primary shadow-sm"
                    : "bg-surface border-border/50 text-muted hover:text-foreground hover:border-border"
                  }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2.5">
          <label className="text-[10px] font-medium text-muted uppercase tracking-wider block">
            Describe the Issue
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Please describe the issue in detail (minimum 20 characters)..."
            rows={4}
            maxLength={1000}
            className="w-full rounded-xl border border-border bg-background p-3.5 text-xs leading-relaxed text-foreground resize-none outline-none focus:border-primary/50 transition-colors"
          />
          <div className="flex justify-between">
            <p
              className={`text-[9px] font-normal uppercase tracking-wider ${description.trim().length >= 20
                  ? "text-emerald-500"
                  : "text-muted"
                }`}
            >
              {description.trim().length} / 20 min
            </p>
            <p className="text-[9px] font-normal text-muted uppercase tracking-wider">
              {description.length} / 1000
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={isSubmitting}
            className="flex-1 rounded-xl h-12 text-[10px] font-medium uppercase tracking-wider"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            isLoading={isSubmitting}
            className="flex-1 rounded-xl h-12 text-[10px] font-medium uppercase tracking-wider gap-2"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Submit Request
          </Button>
        </div>
      </div>
    </Modal>
  );
}
