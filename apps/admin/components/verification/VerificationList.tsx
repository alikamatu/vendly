"use client";

import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import { VerificationCard } from "./VerificationCard";
import { VerificationCardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import Card from "@/components/ui/Card";
import type { ApprovalItem } from "@/types/verification";

interface VerificationListProps {
  items: ApprovalItem[];
  loading: boolean;
  onView: (item: ApprovalItem) => void;
  onApprove: (item: ApprovalItem) => void;
  onReject: (item: ApprovalItem) => void;
}

export function VerificationList({
  items,
  loading,
  onView,
  onApprove,
  onReject,
}: VerificationListProps) {
  if (loading) {
    return (
      <Card className="divide-y divide-[--color-foreground]/5">
        {Array.from({ length: 5 }).map((_, i) => (
          <VerificationCardSkeleton key={i} />
        ))}
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="No verification requests"
        description="No requests match your current filters. Try adjusting the search or filter criteria."
      />
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="list"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-3"
      >
        {items.map((item, i) => (
          <VerificationCard
            key={item.id}
            item={item}
            index={i}
            onView={onView}
            onApprove={onApprove}
            onReject={onReject}
          />
        ))}
      </motion.div>
    </AnimatePresence>
  );
}
