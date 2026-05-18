"use client";

import React from "react";

interface BrandLogoProps {
  name: string;
  src?: string | null;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: "w-10 h-10 text-[10px]",
  md: "w-12 h-12 md:w-14 md:h-14 text-xs",
  lg: "w-16 h-16 md:w-20 md:h-20 text-sm",
};

export default function BrandLogo({ name, src, size = "md" }: BrandLogoProps) {
  return (
    <div
      className={`relative ${sizeMap[size]} rounded-2xl overflow-hidden border border-border/80 bg-background flex-shrink-0 flex items-center justify-center shadow-md shadow-primary/5`}
    >
      {src ? (
        <img src={src} alt={name} loading="lazy" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center font-black uppercase text-primary italic">
          {name.slice(0, 2)}
        </div>
      )}
    </div>
  );
}
