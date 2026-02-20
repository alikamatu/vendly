"use client";

import React from "react";
import { motion } from "framer-motion";
import { Users, Clock, CheckCircle, XCircle } from "lucide-react";
import Card from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import type { ApprovalStats } from "@/types/verification";
import { clsx } from "@/utils/clsx";

interface VerificationStatsProps {
  stats: ApprovalStats | null;
  loading: boolean;
}

const statConfig = [
  { key: "total" as const, label: "Total", icon: Users, color: "text-[--color-primary]", bg: "bg-[--color-primary]/10" },
  { key: "pending" as const, label: "Pending", icon: Clock, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-950/40" },
  { key: "approved" as const, label: "Approved", icon: CheckCircle, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-950/40" },
  { key: "rejected" as const, label: "Rejected", icon: XCircle, color: "text-red-600 dark:text-red-400", bg: "bg-red-100 dark:bg-red-950/40" },
];

export function VerificationStats({ stats, loading }: VerificationStatsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {statConfig.map((cfg, i) => (
        <motion.div
          key={cfg.key}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          <Card className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] text-[--color-foreground]/50">
                  {cfg.label}
                </p>
                {loading ? (
                  <Skeleton width={48} height={24} className="mt-1" />
                ) : (
                  <p className="text-xl font-semibold mt-1 text-[--color-foreground]">
                    {stats?.[cfg.key] ?? 0}
                  </p>
                )}
              </div>
              <div className={clsx("p-2 rounded-lg", cfg.bg, cfg.color)}>
                <cfg.icon size={18} />
              </div>
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
