"use client";

import React from "react";
import { LayoutGrid, List } from "lucide-react";

export type ViewMode = "grid" | "list";

interface ViewToggleProps {
  value: ViewMode;
  onChange: (v: ViewMode) => void;
}

export default function ViewToggle({ value, onChange }: ViewToggleProps) {
  return (
    <div
      role="radiogroup"
      aria-label="View mode"
      className="inline-flex items-center p-0.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]"
    >
      {(["grid", "list"] as ViewMode[]).map((mode) => {
        const Icon = mode === "grid" ? LayoutGrid : List;
        const active = value === mode;
        return (
          <button
            key={mode}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(mode)}
            className={`inline-flex items-center justify-center w-9 h-9 rounded-lg transition-colors ${
              active
                ? "bg-[var(--color-background)] text-[var(--color-foreground)] shadow-sm"
                : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
            }`}
            aria-label={`${mode} view`}
          >
            <Icon className="w-3.5 h-3.5" />
          </button>
        );
      })}
    </div>
  );
}
