"use client";

import { useTheme } from "@/lib/theme";
import { motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";

export default function Home () {

  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className="flex min-h-screen flex-col items-center justify-between p-24">
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
      <h1 className="text-4xl font-bold">Welcome to Vendly!</h1>
      <p className="mt-4 text-lg text-gray-600">Your all-in-one e-commerce solution.</p>
    </div>
  );
}