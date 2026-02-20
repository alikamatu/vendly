"use client";

import React from "react";
import { motion } from "framer-motion";
import { Eye, CheckCircle, XCircle, Calendar, GraduationCap } from "lucide-react";
import Card from "@/components/ui/Card";
import { Badge, statusToVariant } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import type { ApprovalItem } from "@/types/verification";

interface VerificationCardProps {
  item: ApprovalItem;
  index: number;
  onView: (item: ApprovalItem) => void;
  onApprove: (item: ApprovalItem) => void;
  onReject: (item: ApprovalItem) => void;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));

  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function VerificationCard({
  item,
  index,
  onView,
  onApprove,
  onReject,
}: VerificationCardProps) {
  const isPending = item.status === "PENDING";

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.25 }}
    >
      <Card className="p-5">
        <div className="flex items-start justify-between gap-3">
          {/* User info */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Avatar name={item.user.full_name} size="md" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate text-[--color-foreground]">
                {item.user.full_name}
              </p>
              <p className="text-[10px] text-[--color-foreground]/50 truncate">
                {item.user.email}
              </p>
            </div>
          </div>

          {/* Status badge */}
          <Badge variant={statusToVariant(item.status)}>
            {item.status.charAt(0) + item.status.slice(1).toLowerCase()}
          </Badge>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-3 mt-4 flex-wrap">
          <span className="inline-flex items-center gap-1.5 text-[10px] text-[--color-foreground]/45">
            <GraduationCap size={12} />
            {item.user.school}
          </span>
          <span className="inline-flex items-center gap-1.5 text-[10px] text-[--color-foreground]/45">
            <Calendar size={12} />
            {formatDate(item.created_at)}
          </span>
          {item.user.verification_doc && (
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-violet-100 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400 font-medium">
              Document attached
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 mt-5 pt-4">
          <Button
            variant="ghost"
            size="sm"
            className="!py-1.5 !px-3 text-[11px] bg-[--color-foreground]/5"
            onClick={() => onView(item)}
          >
            <Eye size={13} />
            View
          </Button>

          {isPending && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="!py-1.5 !px-3 text-[11px] !text-emerald-600 hover:!bg-emerald-50 dark:hover:!bg-emerald-950/30"
                onClick={() => onApprove(item)}
              >
                <CheckCircle size={13} />
                Approve
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="!py-1.5 !px-3 text-[11px] !text-red-600 hover:!bg-red-50 dark:hover:!bg-red-950/30"
                onClick={() => onReject(item)}
              >
                <XCircle size={13} />
                Reject
              </Button>
            </>
          )}

          {!isPending && item.reviewed_by && (
            <span className="text-[10px] text-[--color-foreground]/40 ml-auto">
              by {item.reviewed_by.full_name}
            </span>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
