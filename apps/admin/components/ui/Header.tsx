"use client";

import React from "react";
import { Container } from "./Container";
import ThemeToggle from "./ThemeToggle";

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[--color-background] shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
      <Container>
        <div className="flex items-center justify-between h-12">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-[--color-primary] flex items-center justify-center">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--color-background)" strokeWidth="2.5">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-[--color-foreground] tracking-tight">
              Admin
            </span>
          </div>
          <ThemeToggle />
        </div>
      </Container>
    </header>
  );
}
