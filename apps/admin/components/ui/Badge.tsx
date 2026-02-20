"use client";

import React from "react";
import { clsx } from "@/utils/clsx";
import type { ApprovalStatus } from "@/types/verification";

type BadgeVariant = "pending" | "approved" | "rejected" | "info";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
  pending:
    "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
  approved:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
  rejected:
    "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400",
  info:
    "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
};

const dotColors: Record<BadgeVariant, string> = {
  pending: "bg-amber-500",
  approved: "bg-emerald-500",
  rejected: "bg-red-500",
  info: "bg-blue-500",
};

export function statusToVariant(status: ApprovalStatus): BadgeVariant {
  const map: Record<ApprovalStatus, BadgeVariant> = {
    PENDING: "pending",
    APPROVED: "approved",
    REJECTED: "rejected",
  };
  return map[status] ?? "info";
}

export function Badge({
  variant = "info",
  children,
  className,
  dot = true,
}: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 text-[10px] font-medium px-2.5 py-1 rounded-full whitespace-nowrap",
        variantStyles[variant],
        className
      )}
    >
      {dot && (
        <span
          className={clsx("w-1.5 h-1.5 rounded-full shrink-0", dotColors[variant])}
        />
      )}
      {children}
    </span>
  );
}
