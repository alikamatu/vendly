"use client";

import React from "react";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { Moon, Sun, User, LayoutDashboard, ShoppingBag, Heart, LogOut, Search } from "lucide-react";
import GlobalSearch from "../layout/GlobalSearch";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import clsx from "@/utils/clsx";
import Image from "next/image";

interface DashboardHeaderProps {
  title: string;
  onMenuToggle?: () => void;
}

export default function DashboardHeader({ title, onMenuToggle }: DashboardHeaderProps) {
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();
  const { itemCount } = useCart();
  const isDark = theme === "dark";

  const isSeller = user?.role === "SELLER";

  return (
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-border bg-background/80 px-4 md:px-8 backdrop-blur-md">
      <div className="flex items-center gap-4">
        {isSeller && (
          <button 
            onClick={onMenuToggle}
            className="lg:hidden p-2.5 bg-surface border border-border rounded-xl text-muted hover:text-foreground transition-all"
          >
             <LayoutDashboard className="w-5 h-5" />
          </button>
        )}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-black text-xs shadow-lg shadow-primary/20 transition-transform group-hover:scale-105">
          <img src="/logos/vendly.png" alt="Ventry Logo" className="w-full h-full" />
          </div>
          <h1 className="text-md font-bold tracking-tight text-foreground truncate max-w-[100px] md:max-w-none">{title}</h1>
        </Link>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        {/* Common Nav Items (Favorites for Auth Users) */}
        <div className="hidden sm:flex items-center gap-1 md:gap-2 mr-2">
          {user && (
            <Link href="/favorites" className="p-2.5 text-muted hover:text-red-500 hover:bg-red-500/5 rounded-2xl transition-all group" title="Favorites">
              <Heart className="w-5 h-5 group-active:scale-90 transition-transform" />
            </Link>
          )}

          {/* Unified Cart Link */}
          <Link href="/cart" className="p-2.5 text-muted hover:text-primary hover:bg-primary/5 rounded-2xl transition-all group relative" title="Cart">
            <ShoppingBag className="w-5 h-5 group-active:scale-90 transition-transform" />
            {itemCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-0.5 -right-0.5 min-w-[1.25rem] h-5 px-1 flex items-center justify-center bg-red-500 text-white text-[10px] font-black rounded-full border-2 border-background shadow-lg"
              >
                {itemCount > 99 ? "99+" : itemCount}
              </motion.span>
            )}
          </Link>

          {/* Dashboard/Seller Links - Restricted to SELLER/ADMIN */}
          {(isSeller || user?.role === "ADMIN") && (
            <Link href="/dashboard" className="p-2.5 text-muted hover:text-primary hover:bg-primary/5 rounded-2xl transition-all group" title="Dashboard">
              <LayoutDashboard className="w-5 h-5 group-active:scale-90 transition-transform" />
            </Link>
          )}

          {/* Special "Become a Seller" for regular Users */}
          {user && !isSeller && user.role !== "ADMIN" && user?.approval_status !== "APPROVED" && (
            <Link href="/dashboard/settings/profile">
              <button className="ml-2 px-4 py-2 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
                Become a Seller
              </button>
            </Link>
          )}
        </div>

        <div className="h-8 w-[1px] bg-border mx-1 hidden sm:block"></div>

        {/* Search Toggle */}
        <button
          onClick={() => setIsSearchOpen(true)}
          className="p-2.5 text-muted hover:text-primary hover:bg-primary/5 rounded-2xl transition-all group"
          aria-label="Search"
        >
          <Search className="w-5 h-5 group-active:scale-90 transition-transform" />
        </button>

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

        {/* User Profile or Login */}
        <div className="flex items-center gap-3 pl-1">
          {user ? (
            <>
              <div className="hidden text-right md:block">
                <p className="text-[11px] font-bold text-foreground leading-none">{user.full_name}</p>
                <p className={clsx(
                  "text-[9px] font-black mt-1 uppercase tracking-widest",
                  isSeller ? "text-primary" : "text-muted"
                )}>
                  {user.role}
                </p>
              </div>
              <Link href="/dashboard/settings/profile">
                <div className="h-10 w-10 overflow-hidden rounded-2xl bg-surface border border-border flex items-center justify-center text-primary shadow-sm hover:border-primary/30 transition-colors">
                  {user.seller_profile?.logo_url ? (
                     <img src={user.seller_profile.logo_url} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                     <span className="text-xs font-black uppercase tracking-tighter">
                       {user.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || <User className="w-4 h-4" />}
                     </span>
                  )}
                </div>
              </Link>
              <button 
                onClick={logout}
                className="p-2.5 text-muted hover:text-red-500 hover:bg-red-500/5 rounded-2xl transition-all"
                title="Sign Out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/register">
                <button className="px-4 py-2 bg-primary  text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
                  Sign Up
                </button>
              </Link>
            </div>
          )}
        </div>
      </div>
      <GlobalSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </header>
  );
}
