import React from "react";
import clsx from "../../utils/clsx";
import Spinner from "./Spinner";
import { motion, HTMLMotionProps } from "framer-motion";

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
    primary: "bg-red-600 text-white hover:opacity-90 shadow-accent/20 hover:shadow-lg",
    secondary: "bg-foreground/5 text-foreground hover:bg-foreground/10",
    ghost: "bg-transparent text-foreground hover:bg-foreground/5",
    danger: "bg-red-500 text-white hover:bg-red-600 shadow-red-500/20 hover:shadow-lg",
  };
  const sizes: Record<string, string> = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-sm",
    lg: "px-8 py-4 text-base",
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
