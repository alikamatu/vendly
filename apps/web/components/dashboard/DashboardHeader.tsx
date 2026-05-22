"use client";

import React from "react";
import { useTheme } from "@/lib/contexts/theme";
import { useAuth } from "@/lib/contexts/auth-context";
import { useCart } from "@/lib/contexts/cart-context";
import {
  Moon,
  Sun,
  LayoutDashboard,
  ShoppingBag,
  Heart,
  Search,
} from "lucide-react";
import GlobalSearch from "../layout/GlobalSearch";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useAuthModal } from "@/lib/contexts/auth-modal-context";
import { usePathname } from "next/navigation";
import PrimaryNav from "../layout/PrimaryNav";

interface DashboardHeaderProps {
  title: string;
  onMenuToggle?: () => void;
  /** Hide the categories/brands mega-nav row (e.g. inside the seller dashboard). */
  hidePrimaryNav?: boolean;
}

import UserMenu from "../layout/UserMenu";

export default function DashboardHeader({
  title,
  onMenuToggle,
  hidePrimaryNav,
}: DashboardHeaderProps) {
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const { openRegister } = useAuthModal();
  const { itemCount } = useCart();
  const pathname = usePathname();
  const isDark = theme === "dark";

  const isSeller = user?.role === "SELLER";
  // Auto-hide mega nav inside the seller dashboard (it has its own sidebar)
  const showPrimaryNav = !hidePrimaryNav && !pathname?.startsWith("/dashboard");

  return (
    <>
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-border bg-background px-4 md:px-8">
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
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white text-xs shadow-lg shadow-primary/20 transition-transform group-hover:scale-105">
            <img
              src="/logos/vendly.png"
              alt="Ventry Logo"
              className="w-full h-full"
            />
          </div>
          <h1 className="text-md tracking-tight text-foreground truncate max-w-[100px] md:max-w-none">
            {title}
          </h1>
        </Link>
      </div>

      <div className="flex items-center gap-1 md:gap-3">
        {/* Cart — always visible (incl. mobile) */}
        <Link
          href="/cart"
          aria-label={`Cart${itemCount > 0 ? `, ${itemCount} item${itemCount === 1 ? "" : "s"}` : ""}`}
          className="p-2.5 text-muted hover:text-primary hover:bg-primary/5 rounded-2xl transition-all group relative"
          title="Cart"
        >
          <ShoppingBag className="w-5 h-5 group-active:scale-90 transition-transform" />
          {itemCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-0.5 -right-0.5 min-w-[1.25rem] h-5 px-1 flex items-center justify-center bg-red-500 text-white text-[10px] rounded-full border-2 border-background shadow-lg"
            >
              {itemCount > 99 ? "99+" : itemCount}
            </motion.span>
          )}
        </Link>

        {/* Favorites — small+ */}
        {user && (
          <Link
            href="/favorites"
            aria-label="Favorites"
            className="hidden sm:inline-flex p-2.5 text-muted hover:text-red-500 hover:bg-red-500/5 rounded-2xl transition-all group"
            title="Favorites"
          >
            <Heart className="w-5 h-5 group-active:scale-90 transition-transform" />
          </Link>
        )}

        {/* Start selling CTA for non-seller users */}
        {user &&
          !isSeller &&
          user.role !== "ADMIN" &&
          user?.approval_status !== "APPROVED" && (
            <Link href="/seller-verification" className="hidden sm:inline-flex">
              <button className="ml-1 px-3.5 h-9 bg-primary text-white text-xs rounded-lg shadow-sm hover:opacity-90 active:scale-[0.98] transition-all">
                Start selling
              </button>
            </Link>
          )}

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
              {isDark ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </motion.div>
          </AnimatePresence>
        </button>

        <div className="h-8 w-[1px] bg-border mx-1"></div>

        {/* User Profile or Login */}
        <div className="flex items-center gap-3 pl-1">
          {user ? (
            <UserMenu />
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login" className="hidden sm:inline-flex px-3 h-9 items-center text-foreground/80 hover:text-foreground text-xs transition-colors">
                Sign in
              </Link>
              <Link href="/register" className="px-3.5 h-9 inline-flex items-center bg-primary text-white text-xs rounded-lg shadow-sm hover:opacity-90 active:scale-[0.98] transition-all">
                Sign up
              </Link>
            </div>
          )}
        </div>
      </div>
      <GlobalSearch
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    </header>
    {showPrimaryNav && <PrimaryNav />}
    </>
  );
}
