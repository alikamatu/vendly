"use client";

import React from "react";
import { clsx } from "@/utils/clsx";

interface SkeletonProps {
  className?: string;
  variant?: "text" | "circular" | "rectangular";
  width?: string | number;
  height?: string | number;
}

export function Skeleton({
  className,
  variant = "text",
  width,
  height,
}: SkeletonProps) {
  const base = "animate-pulse bg-[--color-foreground]/8 dark:bg-[--color-foreground]/12";

  const variants: Record<string, string> = {
    text: "rounded h-3",
    circular: "rounded-full",
    rectangular: "rounded-xl",
  };

  return (
    <div
      className={clsx(base, variants[variant], className)}
      style={{ width, height }}
    />
  );
}

/** Pre-built skeleton for a verification card row */
export function VerificationCardSkeleton() {
  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton variant="circular" width={36} height={36} />
        <div className="flex-1 space-y-1.5">
          <Skeleton width="40%" height={12} />
          <Skeleton width="60%" height={10} />
        </div>
        <Skeleton variant="rectangular" width={70} height={22} />
      </div>
      <div className="flex gap-2">
        <Skeleton variant="rectangular" width={60} height={10} />
        <Skeleton variant="rectangular" width={80} height={10} />
      </div>
    </div>
  );
}
