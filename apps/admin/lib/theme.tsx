"use client";
import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (t: Theme) => void;
} | null>(null);

export default function ThemeProvider({ children }: React.PropsWithChildren) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const stored = typeof window !== "undefined" ? (localStorage.getItem("admin-theme") as Theme | null) : null;
    if (stored) setTheme(stored);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("admin-theme", theme);
  }, [theme]);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
