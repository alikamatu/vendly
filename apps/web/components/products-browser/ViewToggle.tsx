'use client';

import React from 'react';
import { LayoutGrid, List } from 'lucide-react';

export type ViewMode = 'grid' | 'list';

interface ViewToggleProps {
  value: ViewMode;
  onChange: (v: ViewMode) => void;
}

export default function ViewToggle({ value, onChange }: ViewToggleProps) {
  return (
    <div
      role="radiogroup"
      aria-label="View mode"
      className="bg-surface inline-flex items-center rounded-xl p-1"
    >
      {(['grid', 'list'] as ViewMode[]).map((mode) => {
        const Icon = mode === 'grid' ? LayoutGrid : List;
        const active = value === mode;
        return (
          <button
            key={mode}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(mode)}
            className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
              active ? 'bg-background text-foreground' : 'text-muted hover:text-foreground'
            }`}
            aria-label={`${mode} view`}
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        );
      })}
    </div>
  );
}
