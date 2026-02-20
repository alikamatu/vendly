"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Badge, statusToVariant } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import {
  Mail,
  GraduationCap,
  Calendar,
  FileText,
  ExternalLink,
} from "lucide-react";
import type { ApprovalItem } from "@/types/verification";

interface VerificationDetailProps {
  item: ApprovalItem | null;
  open: boolean;
  onClose: () => void;
  onApprove: (item: ApprovalItem) => void;
  onReject: (item: ApprovalItem, reason?: string) => void;
  loading?: boolean;
}

function formatFullDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function VerificationDetail({
  item,
  open,
  onClose,
  onApprove,
  onReject,
  loading = false,
}: VerificationDetailProps) {
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  if (!item) return null;

  const isPending = item.status === "PENDING";

  const handleReject = () => {
    if (showRejectForm) {
      onReject(item, rejectReason || undefined);
      setRejectReason("");
      setShowRejectForm(false);
    } else {
      setShowRejectForm(true);
    }
  };

  const handleClose = () => {
    setShowRejectForm(false);
    setRejectReason("");
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Verification Details" size="md">
      <div className="space-y-5">
        {/* User header */}
        <div className="flex items-center gap-3">
          <Avatar name={item.user.full_name} size="lg" />
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-semibold text-[--color-foreground]">
              {item.user.full_name}
            </h4>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={statusToVariant(item.status)}>
                {item.status.charAt(0) + item.status.slice(1).toLowerCase()}
              </Badge>
            </div>
          </div>
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <InfoRow icon={Mail} label="Email" value={item.user.email} />
          <InfoRow icon={GraduationCap} label="School" value={item.user.school} />
          <InfoRow
            icon={Calendar}
            label="Requested"
            value={formatFullDate(item.created_at)}
          />
          {item.reviewed_at && (
            <InfoRow
              icon={Calendar}
              label="Reviewed"
              value={formatFullDate(item.reviewed_at)}
            />
          )}
        </div>

        {/* Verification document */}
        {item.user.verification_doc && (
          <div className="p-4 rounded-2xl bg-[--color-foreground]/5">
            <div className="flex items-center gap-2 text-xs font-semibold text-[--color-foreground]/70">
              <FileText size={14} />
              Verification Document
            </div>
            <a
              href={item.user.verification_doc}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-2 text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline"
            >
              View document
              <ExternalLink size={12} />
            </a>
          </div>
        )}

        {/* Reviewer info */}
        {item.reviewed_by && (
          <p className="text-xs text-[--color-foreground]/45">
            Reviewed by <span className="font-semibold">{item.reviewed_by.full_name}</span>
          </p>
        )}

        {/* Reject reason form */}
        {showRejectForm && (
          <div className="space-y-3">
            <label className="text-xs font-semibold text-[--color-foreground]/70">
              Rejection reason (optional)
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Explain why this request is being rejected..."
              rows={3}
              className="w-full text-sm rounded-2xl bg-[--color-foreground]/5 p-4 focus:outline-none focus:ring-1 focus:ring-[--color-primary]/20 resize-none placeholder:text-[--color-foreground]/30"
            />
          </div>
        )}

        {/* Actions */}
        {isPending && (
          <div className="flex items-center gap-3 pt-1">
            <Button
              size="md"
              className="!bg-emerald-600 !text-white hover:!bg-emerald-700 flex-1 border-none shadow-sm"
              onClick={() => onApprove(item)}
              loading={loading}
            >
              Approve User
            </Button>
            <Button
              variant="danger"
              size="md"
              className="flex-1 shadow-sm"
              onClick={handleReject}
              loading={loading}
            >
              {showRejectForm ? "Confirm Reject" : "Reject User"}
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}

/** Small helper for info rows */
function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon
        size={14}
        className="text-[--color-foreground]/35 mt-0.5 shrink-0"
      />
      <div>
        <p className="text-[10px] text-[--color-foreground]/45">{label}</p>
        <p className="text-xs text-[--color-foreground] break-all">{value}</p>
      </div>
    </div>
  );
}
