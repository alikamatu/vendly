'use client';

import React from "react";
import clsx from "@/utils/clsx";
import Spinner, { SpinnerSize } from "./Spinner";
import { motion } from "framer-motion";

export interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onDrag' | 'onDragStart' | 'onDragEnd' | 'onDragOver' | 'onDragEnter' | 'onDragLeave' | 'onDrop'> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  loadingText?: string;
}

export default function Button({
  variant = "primary",
  size = "md",
  isLoading = false,
  loadingText,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const base =
    "relative inline-flex items-center justify-center font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:opacity-50 disabled:cursor-not-allowed select-none";

  const variants: Record<string, string> = {
    primary:
      "bg-foreground text-background font-medium hover:bg-foreground/90 active:scale-[0.985] shadow-[0_1px_2px_rgba(0,0,0,0.08),0_4px_12px_rgba(0,0,0,0.05)] border border-foreground/10",
    secondary:
      "bg-surface/80 hover:bg-surface text-foreground border border-border hover:border-foreground/25 active:scale-[0.985] shadow-sm",
    ghost:
      "text-foreground/70 hover:text-foreground hover:bg-foreground/5 active:scale-[0.985] shadow-none",
    danger:
      "bg-red-500 text-white hover:bg-red-600 active:scale-[0.985] shadow-sm",
  };

  const sizes: Record<string, string> = {
    sm: "h-8 px-3 text-xs rounded-lg gap-1.5",
    md: "h-11 px-5 text-sm rounded-xl gap-2",
    lg: "h-12 px-6 text-base rounded-xl gap-2.5",
  };

  const spinnerSizes: Record<string, SpinnerSize> = {
    sm: "xs",
    md: "sm",
    lg: "md",
  };

  const isButtonDisabled = disabled || isLoading;

  return (
    <motion.button
      whileHover={isButtonDisabled ? undefined : { scale: 1.01 }}
      whileTap={isButtonDisabled ? undefined : { scale: 0.98 }}
      aria-busy={isLoading}
      aria-disabled={isButtonDisabled}
      className={clsx(
        base,
        variants[variant] || variants.primary,
        sizes[size] || sizes.md,
        isLoading && "pointer-events-none opacity-90",
        className
      )}
      disabled={isButtonDisabled}
      {...(props as any)}
    >
      <span className="inline-flex items-center justify-center gap-2 leading-none w-full">
        {isLoading ? (
          <>
            <Spinner
              size={spinnerSizes[size] || "sm"}
              className="text-current shrink-0"
            />
            {loadingText && <span>{loadingText}</span>}
          </>
        ) : (
          children
        )}
      </span>
    </motion.button>
  );
}
