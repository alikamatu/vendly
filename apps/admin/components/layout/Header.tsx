"use client";
import React from "react";
import Container from "../common/Container";
import ThemeToggle from "../ui/ThemeToggle";

export default function Header() {
  return (
    <header className="border-b bg-white/50 dark:bg-black/40">
      <Container className="py-3">
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold">Admin</div>
          <nav className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
            <a href="#" className="hover:underline">
              Dashboard
            </a>
            <a href="#" className="hover:underline">
              Users
            </a>
            <ThemeToggle />
          </nav>
        </div>
      </Container>
    </header>
  );
}
