"use client";

import React from "react";
import { motion } from "framer-motion";
import { clsx } from "@/utils/clsx";

export interface FilterTab {
  id: string;
  label: string;
  count?: number;
}

interface FilterTabsProps {
  tabs: FilterTab[];
  activeTab: string;
  onTabChange: (id: string) => void;
  className?: string;
}

export function FilterTabs({
  tabs,
  activeTab,
  onTabChange,
  className,
}: FilterTabsProps) {
  return (
    <div
      className={clsx(
        "flex items-center gap-1 p-1 bg-[--color-foreground]/5 rounded-xl overflow-x-auto scrollbar-none",
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={clsx(
              "relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors duration-200",
              isActive
                ? "text-[--color-foreground]"
                : "text-[--color-foreground]/50 hover:text-[--color-foreground]/70"
            )}
          >
            {isActive && (
              <motion.div
                layoutId="filterPill"
                className="absolute inset-0 bg-[--color-background] rounded-lg shadow-sm"
                transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
              />
            )}
            <span className="relative">{tab.label}</span>
            {typeof tab.count === "number" && (
              <span
                className={clsx(
                  "relative text-[9px] px-1.5 py-0.5 rounded-full font-medium",
                  isActive
                    ? "bg-[--color-primary]/10 text-[--color-primary]"
                    : "bg-[--color-foreground]/8 text-[--color-foreground]/50"
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
