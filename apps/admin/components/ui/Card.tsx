import React from "react";
import { clsx } from "@/utils/clsx";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export default function Card({ className, children, ...props }: CardProps) {
  return (
    <div
      className={clsx(
        "bg-[--color-background] rounded-3xl shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.12)]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}