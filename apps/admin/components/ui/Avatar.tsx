"use client";

import React from "react";
import { clsx } from "@/utils/clsx";

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeStyles: Record<string, string> = {
  sm: "w-7 h-7 text-[10px]",
  md: "w-9 h-9 text-xs",
  lg: "w-12 h-12 text-sm",
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function stringToColor(str: string): string {
  const colors = [
    "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400",
    "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400",
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
    "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400",
    "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
    "bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400",
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function Avatar({ name, src, size = "md", className }: AvatarProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={clsx(
          "rounded-full object-cover shrink-0",
          sizeStyles[size],
          className
        )}
      />
    );
  }

  return (
    <div
      className={clsx(
        "rounded-full flex items-center justify-center font-semibold shrink-0",
        sizeStyles[size],
        stringToColor(name),
        className
      )}
      title={name}
    >
      {getInitials(name)}
    </div>
  );
}
