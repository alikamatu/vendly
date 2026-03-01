"use client";

import React from "react";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/auth-context";
import { Moon, Sun, Bell, User, LayoutDashboard } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface DashboardHeaderProps {
  title: string;
  onMenuToggle?: () => void;
}

export default function DashboardHeader({ title, onMenuToggle }: DashboardHeaderProps) {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const isDark = theme === "dark";

  return (
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-border bg-background/80 px-4 md:px-8 backdrop-blur-md">
      <div className="flex items-center gap-4">
        <button 
          onClick={onMenuToggle}
          className="lg:hidden p-2.5 bg-surface border border-border rounded-xl text-muted hover:text-foreground transition-all"
        >
           <LayoutDashboard className="w-5 h-5" />
        </button>
        <h1 className="text-md font-bold tracking-tight text-foreground truncate max-w-[150px] md:max-w-none">{title}</h1>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        {/* Theme Toggle */}
        <button
          onClick={() => setTheme(isDark ? "light" : "dark")}
          className="p-2.5 text-muted hover:text-foreground hover:bg-surface rounded-2xl transition-all"
          aria-label="Toggle theme"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={theme}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </motion.div>
          </AnimatePresence>
        </button>

        <div className="h-8 w-[1px] bg-border mx-1"></div>

        {/* User Profile */}
        <div className="flex items-center gap-3">
          <div className="hidden text-right md:block">
            <p className="text-xs font-bold text-foreground leading-none">{user?.full_name}</p>
            <p className="text-[10px] font-bold text-muted mt-1 uppercase tracking-widest">SELLER</p>
          </div>
          <div className="h-10 w-10 overflow-hidden rounded-2xl bg-surface border border-border flex items-center justify-center text-primary shadow-sm">
            {user?.seller_profile?.logo_url ? (
               <img src={user.seller_profile.logo_url} alt="Profile" className="w-full h-full object-cover" />
            ) : (
               <span className="text-xs font-bold uppercase">{user?.full_name?.charAt(0) || <User className="w-4 h-4" />}</span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
