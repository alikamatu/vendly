"use client";

import React from "react";
import { clsx } from "@/utils/clsx";
import { LucideIcon, Inbox } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={clsx(
        "flex flex-col items-center justify-center py-12 px-4 text-center",
        className
      )}
    >
      <div className="w-12 h-12 rounded-2xl bg-[--color-foreground]/5 flex items-center justify-center mb-4">
        <Icon size={22} className="text-[--color-foreground]/30" />
      </div>
      <p className="text-sm font-medium text-[--color-foreground]/70">{title}</p>
      {description && (
        <p className="text-xs text-[--color-foreground]/40 mt-1 max-w-xs">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
