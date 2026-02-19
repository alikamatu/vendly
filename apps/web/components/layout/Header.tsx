"use client";

import React from "react";
import Container from "../common/Container";
import Button from "../ui/Button";
import { Sun, Moon } from "lucide-react";
import { motion } from "framer-motion";
import { useTheme } from "../../lib/theme";

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      aria-label="Toggle theme"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
    >
      <motion.div
        key={isDark ? "moon" : "sun"}
        initial={{ rotate: -20, opacity: 0 }}
        animate={{ rotate: 0, opacity: 1 }}
        exit={{ rotate: 20, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        {isDark ? <Moon size={18} /> : <Sun size={18} />}
      </motion.div>
    </button>
  );
}

export default function Header() {
  return (
    <header className="border-b bg-white/50 backdrop-blur-sm dark:bg-black/40">
      <Container className="py-4">
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold">Ventry</div>
          <div className="flex items-center gap-3">
            <nav className="hidden md:flex gap-3 text-sm text-gray-700 dark:text-gray-300">
              <a href="#" className="hover:underline">
                Docs
              </a>
              <a href="#" className="hover:underline">
                Pricing
              </a>
            </nav>
            <ThemeToggle />
            <Button variant="ghost">Sign in</Button>
            <Button variant="primary">Get started</Button>
          </div>
        </div>
      </Container>
    </header>
  );
}
