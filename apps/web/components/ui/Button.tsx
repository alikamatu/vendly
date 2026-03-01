import React from "react";
import clsx from "../../utils/clsx";
import Spinner from "./Spinner";
import { motion } from "framer-motion";

export interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onDrag' | 'onDragStart' | 'onDragEnd' | 'onDragOver' | 'onDragEnter' | 'onDragLeave' | 'onDrop'> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export default function Button({
  variant = "primary",
  size = "md",
  isLoading = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent/50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm";
  const variants: Record<string, string> = {
    primary: "bg-red-500 text-white font-bold hover:bg-red-600 shadow-xl shadow-red-500/20 active:scale-95",
    secondary: "bg-surface text-foreground hover:bg-border/40 border border-border shadow-sm active:scale-95",
    ghost: "text-muted hover:text-foreground hover:bg-surface active:scale-95 shadow-none hover:shadow-none",
    danger: "bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white shadow-none active:scale-95",
  };
  const sizes: Record<string, string> = {
    sm: "px-4 py-2 text-xs",
    md: "px-6 py-3.5 text-sm",
    lg: "px-10 py-5 text-base",
  };

  return (
    <motion.button
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.98 }}
      className={clsx(base, variants[variant] || variants.primary, sizes[size] || sizes.md, className)}
      disabled={disabled || isLoading}
      {...(props as any)}
    >
      {isLoading && <Spinner size="sm" className="text-current" />}
      {children}
    </motion.button>
  );
}
