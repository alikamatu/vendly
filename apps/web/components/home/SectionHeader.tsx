"use client";

import React from "react";

interface SectionHeaderProps {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
}

export default function SectionHeader({ eyebrow, title, description, action }: SectionHeaderProps) {
  return (
    <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div className="space-y-2">
        {eyebrow && (
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.4em] text-primary font-black">
            {eyebrow}
          </div>
        )}
        <h2 className="text-2xl md:text-4xl uppercase tracking-tight font-extrabold text-foreground">
          {title}
        </h2>
        {description && (
          <p className="text-xs text-muted-foreground max-w-md">{description}</p>
        )}
      </div>
      {action && <div className="self-start md:self-auto">{action}</div>}
    </header>
  );
}
