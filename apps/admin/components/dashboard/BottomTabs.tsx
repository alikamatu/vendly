"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { clsx } from "@/utils/clsx";
import ThemeToggle from "../ui/ThemeToggle";

interface Tab {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface BottomTabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (id: string) => void;
}

export default function BottomTabs({ tabs, activeTab, onTabChange }: BottomTabsProps) {
  return (
    <div className="flex justify-center pb-4">
      <nav className="flex items-center gap-1 p-1 bg-[--color-surface] rounded-full shadow-md">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={clsx(
                "relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200",
                "focus:outline-none focus:ring-2 focus:ring-[--color-primary]/30",
                isActive ? "text-[--color-primary]" : "text-[--color-foreground]/60 hover:text-[--color-foreground]/80"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="activePill"
                  className="absolute inset-0 bg-[--color-primary]/10 rounded-full"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                />
              )}
              <Icon size={16} className="relative" />
              <span className="relative">{tab.label}</span>
            </button>
          );
        })}
        <ThemeToggle />
      </nav>
    </div>
  );
}