import React from "react";
import { clsx } from "@/utils/clsx";

interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg" | "xl";
}

const sizes = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-3xl",
  xl: "max-w-6xl",
};

export function Container({ size = "xl", className, children, ...props }: ContainerProps) {
  return (
    <div className={clsx("mx-auto w-full px-4", sizes[size], className)} {...props}>
      {children}
    </div>
  );
}