"use client";

import React from "react";
import Container from "../common/Container";
import Button from "../ui/Button";
import { Sun, Moon, Search } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import GlobalSearch from "./GlobalSearch";
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
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-50 border-b bg-white/70 backdrop-blur-xl dark:bg-black/40">
      <Container className="py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-xl font-black uppercase tracking-tighter hover:text-primary transition-colors">
            Ventry
          </Link>
          
          <div className="flex items-center gap-3">
            <nav className="hidden md:flex gap-6 mr-4">
              <Link href="/products" className="text-[10px] font-black uppercase tracking-widest text-muted hover:text-foreground transition-colors">Products</Link>
              <Link href="/stores" className="text-[10px] font-black uppercase tracking-widest text-muted hover:text-foreground transition-colors">Stores</Link>
            </nav>

            <div className="flex items-center gap-2 pr-4 border-r border-border/50">
              <button 
                onClick={() => setIsSearchOpen(true)}
                className="p-2.5 rounded-xl hover:bg-surface border border-transparent hover:border-border/50 transition-all active:scale-90 group"
              >
                <Search size={18} className="text-muted group-hover:text-primary transition-colors" />
              </button>
              <ThemeToggle />
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" className="hidden sm:flex text-[10px] font-black uppercase tracking-widest">Sign in</Button>
              <Button variant="primary" className="rounded-xl px-6 text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-primary/20">Get started</Button>
            </div>
          </div>
        </div>
      </Container>

      <GlobalSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </header>
  );
}
