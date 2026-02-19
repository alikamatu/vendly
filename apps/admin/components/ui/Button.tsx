"use client";
import React from "react";
import clsx from "../../utils/clsx";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost";
  size?: "sm" | "md";
};

export default function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  const base = "inline-flex items-center justify-center rounded px-3 py-1.5 font-medium";
  const variants: Record<string, string> = {
    primary: "bg-black text-white dark:bg-white dark:text-black",
    ghost: "bg-transparent text-inherit",
  };
  const sizes: Record<string, string> = { sm: "text-sm", md: "text-base" };

  return (
    <button className={clsx(base, variants[variant], sizes[size], className)} {...props}>
      {children}
    </button>
  );
}
