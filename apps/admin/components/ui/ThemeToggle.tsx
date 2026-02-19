"use client";
import React from "react";
import { useTheme } from "../../lib/theme";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      aria-label="Toggle theme"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
    >
      {isDark ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-300">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-500">
          <circle cx="12" cy="12" r="5"></circle>
          <path d="M12 1v2"></path>
          <path d="M12 21v2"></path>
          <path d="M4.22 4.22l1.42 1.42"></path>
          <path d="M18.36 18.36l1.42 1.42"></path>
          <path d="M1 12h2"></path>
          <path d="M21 12h2"></path>
          <path d="M4.22 19.78l1.42-1.42"></path>
          <path d="M18.36 5.64l1.42-1.42"></path>
        </svg>
      )}
    </button>
  );
}
