"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  ShoppingBag,
  Heart,
  Sun,
  Moon,
  Menu,
  X,
  Sparkles,
  LayoutGrid,
  Store,
  Tag,
  ArrowRight,
} from "lucide-react";
import Container from "../common/Container";
import Button from "../ui/Button";
import GlobalSearch from "./GlobalSearch";
import UserMenu from "./UserMenu";
import NotificationBell from "./NotificationBell";
import { useTheme } from "../../lib/contexts/theme";
import { useAuth } from "../../lib/contexts/auth-context";
import { useCart } from "@/lib/contexts/cart-context";
import { useFavorites } from "@/lib/contexts/favorite-context";
import clsx from "@/utils/clsx";

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      aria-label="Toggle theme"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="p-2 rounded-xl text-muted hover:text-foreground hover:bg-surface border border-transparent hover:border-border/60 transition-all active:scale-95"
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

export interface HeaderProps {
  title?: string;
  hidePrimaryNav?: boolean;
}

export default function Header({ title }: HeaderProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useAuth();
  const { itemCount } = useCart();
  const { favorites } = useFavorites();
  const favCount = favorites?.length || 0;

  // Global hotkey: ⌘K or Ctrl+K opens global search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const navLinks = [
    { label: "Products", href: "/products", icon: LayoutGrid },
    { label: "Stores", href: "/stores", icon: Store },
    { label: "Collections", href: "/categories", icon: Sparkles },
    { label: "Deals", href: "/products?has_discount=1", icon: Tag },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background transition-colors">
        <Container className="py-3 md:py-3.5">
          <div className="flex items-center justify-between gap-4">
            {/* Left: Brand Logo & Title */}
            <div className="flex items-center gap-4 min-w-0">
              <Link
                href="/"
                className="flex items-center gap-2.5 text-lg sm:text-xl font-bold tracking-tight text-foreground hover:opacity-90 transition-opacity shrink-0"
              >
                <img
                  src="/logos/verndly.png"
                  alt="Verndly"
                  className="w-7 h-7 object-contain transition-transform group-hover:scale-105"
                />
                <span>Verndly</span>
              </Link>

              {/* Desktop Nav Links */}
              <nav className="hidden lg:flex items-center gap-1 ml-2">
                {navLinks.map((item) => {
                  const isActive =
                    item.href === "/products"
                      ? pathname === "/products"
                      : pathname?.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={clsx(
                        "px-3 py-1.5 rounded-xl text-xs font-semibold tracking-tight transition-colors",
                        isActive
                          ? "text-foreground bg-surface"
                          : "text-muted hover:text-foreground hover:bg-surface/50",
                      )}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Center: Search pill (⌘K) */}
            <div className="hidden md:flex flex-1 max-w-sm lg:max-w-md mx-2">
              <button
                type="button"
                onClick={() => setIsSearchOpen(true)}
                className="group flex w-full items-center justify-between gap-2 rounded-2xl border border-border/70 bg-surface/50 px-3.5 py-2 text-xs text-muted hover:border-border hover:bg-surface hover:text-foreground transition-all"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Search className="h-4 w-4 shrink-0 text-muted group-hover:text-foreground transition-colors" />
                  <span className="truncate text-xs">
                    Search products, stores, brands…
                  </span>
                </div>
                <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded-md border border-border bg-background/80 px-1.5 py-0.5 text-[10px] font-mono text-muted">
                  ⌘K
                </kbd>
              </button>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Mobile Search Button */}
              <button
                type="button"
                onClick={() => setIsSearchOpen(true)}
                aria-label="Search marketplace"
                className="md:hidden p-2 rounded-xl text-muted hover:text-foreground hover:bg-surface transition-colors"
              >
                <Search size={18} />
              </button>

              {/* Favorites */}
              <Link
                href="/favorites"
                aria-label="My saved favorites"
                className="relative p-2 rounded-xl text-muted hover:text-foreground hover:bg-surface transition-colors"
              >
                <Heart size={18} />
                {favCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white shadow-sm">
                    {favCount > 99 ? "99+" : favCount}
                  </span>
                )}
              </Link>

              {/* Cart */}
              <Link
                href="/cart"
                aria-label="Shopping Cart"
                className="relative p-2 rounded-xl text-muted hover:text-foreground hover:bg-surface transition-colors"
              >
                <ShoppingBag size={18} />
                {itemCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-foreground text-background px-1 text-[9px] font-bold shadow-sm">
                    {itemCount > 99 ? "99+" : itemCount}
                  </span>
                )}
              </Link>

              {/* Theme Toggle */}
              <div className="hidden sm:block">
                <ThemeToggle />
              </div>

              {/* User / Auth State */}
              <div className="flex items-center gap-2 pl-1 sm:pl-2 border-l border-border/60">
                {!isLoading &&
                  (isAuthenticated ? (
                    <>
                      <NotificationBell />
                      <UserMenu />
                    </>
                  ) : (
                    <>
                      <Link href="/login" className="hidden sm:inline-block">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-9 px-3 font-semibold"
                        >
                          Sign in
                        </Button>
                      </Link>
                      <Link href="/register">
                        <Button
                          variant="primary"
                          size="sm"
                          className="rounded-xl px-3.5 sm:px-4 text-xs h-9 font-semibold shadow-sm"
                        >
                          Get started
                        </Button>
                      </Link>
                    </>
                  ))}
              </div>

              {/* Mobile Drawer Menu Button */}
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label="Toggle navigation menu"
                className="lg:hidden p-2 rounded-xl text-muted hover:text-foreground hover:bg-surface transition-colors ml-1"
              >
                {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </Container>

        {/* Mobile Nav Drawer */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="lg:hidden border-t border-border bg-background px-4 py-4 space-y-3"
            >
              <nav className="grid grid-cols-2 gap-2">
                {navLinks.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname?.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={clsx(
                        "flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-colors",
                        isActive
                          ? "border-foreground bg-foreground/5 text-foreground"
                          : "border-border/60 bg-surface/40 text-muted hover:text-foreground",
                      )}
                    >
                      <Icon className="w-4 h-4 text-muted shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>

              <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs text-muted">
                <span>Dark / Light Mode</span>
                <ThemeToggle />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <GlobalSearch
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
        />
      </header>
    </>
  );
}
