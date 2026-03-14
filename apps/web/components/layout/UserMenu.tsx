"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  User,
  LayoutDashboard,
  ShoppingBag,
  Heart,
  LogOut,
  Settings,
  Package,
  ChevronDown,
  ExternalLink,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import clsx from "@/utils/clsx";
import Portal from "../common/Portal";
import useMediaQuery from "@/hooks/useMediaQuery";
 
 // Alias for motion components to avoid strict prop typing issues
 const MotionDiv: any = motion.div;

export default function UserMenu() {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const isMobile = useMediaQuery("(max-width: 768px)");

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        // This is handled by the backdrop normally, but keeping as safeguard
      }
    }
    if (isOpen && !isMobile) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, isMobile]);

  if (!user) return null;

  const isSeller = user.role === "SELLER";
  const isAdmin = user.role === "ADMIN";

  const desktopVariants = {
    hidden: { opacity: 0, y: 10, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1 },
  };

  const mobileVariants = {
    hidden: { y: "100%", opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };

  const navLinks = [
    {
      label: "My Profile",
      href: "/dashboard/settings/profile",
      icon: User,
      show: true,
    },
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      show: isSeller || isAdmin,
    },
    {
      label: "Manage Products",
      href: "/dashboard/products",
      icon: Package,
      show: isSeller,
    },
    {
      label: "Orders",
      href: isSeller ? "/dashboard/orders" : "/orders",
      icon: ShoppingBag,
      show: true,
    },
    { label: "Favorites", href: "/favorites", icon: Heart, show: true },
    {
      label: "Settings",
      href: "/dashboard/settings",
      icon: Settings,
      show: true,
    },
  ];

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1 rounded-2xl hover:bg-surface border border-transparent hover:border-border transition-all active:scale-95 group"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <div className="h-9 w-9 md:h-10 md:w-10 overflow-hidden rounded-xl md:rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-sm group-hover:border-primary/40 transition-colors">
          {user.seller_profile?.logo_url ? (
            <img
              src={user.seller_profile.logo_url}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-xs md:text-sm font-black uppercase tracking-tighter group-hover:scale-110 transition-transform">
              {user.full_name
                ?.split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2) || <User className="w-4 h-4" />}
            </span>
          )}
        </div>
        <div className="hidden sm:flex flex-col items-start pr-1">
          <span className="text-[10px] md:text-[11px] font-black uppercase tracking-widest text-foreground truncate max-w-[100px]">
            {user.full_name.split(" ")[0]}
          </span>
          <span
            className={clsx(
              "text-[8px] md:text-[9px] font-bold uppercase tracking-[0.15em] leading-none mt-0.5",
              isSeller ? "text-primary" : "text-muted",
            )}
          >
            {user.role}
          </span>
        </div>
        <ChevronDown
          size={14}
          className={clsx(
            "text-muted transition-transform duration-300",
            isOpen && "rotate-180",
          )}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <Portal>
            {/* Backdrop */}
            <MotionDiv
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[100]"
            />
 
            {/* Menu Container */}
            <MotionDiv
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={isMobile ? mobileVariants : desktopVariants}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className={clsx(
                "fixed z-[101] overflow-hidden",
                isMobile
                  ? "inset-x-0 bottom-0 rounded-t-[2.5rem] bg-background border-t border-border shadow-2xl-up"
                  : "w-72 mt-2 rounded-3xl bg-background border border-border/60 shadow-2xl backdrop-blur-xl",
              )}
              style={
                !isMobile
                  ? {
                      top:
                        (triggerRef.current?.getBoundingClientRect().bottom ||
                          0) + 8,
                      right:
                        window.innerWidth -
                        (triggerRef.current?.getBoundingClientRect().right ||
                          0),
                    }
                  : {}
              }
            >
              <div className={clsx("p-2", isMobile ? "pb-10 px-4" : "p-2")}>
                {/* Header Section */}
                <div
                  className={clsx(
                    "flex items-center justify-between mb-2",
                    isMobile
                      ? "py-6 border-b border-border/50"
                      : "p-4 bg-surface/50 rounded-2xl border border-border/20",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary text-lg font-black font-mono">
                      {user.full_name[0]}
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-foreground">
                        {user.full_name}
                      </p>
                      <p className="text-[10px] text-muted mt-0.5">
                        {user.email}
                      </p>
                    </div>
                  </div>
                  {isMobile && (
                    <button
                      onClick={() => setIsOpen(false)}
                      className="p-2 bg-surface rounded-full text-muted active:scale-90 transition-transform"
                    >
                      <X size={20} />
                    </button>
                  )}
                </div>

                {/* Seller Stats / Quick Info */}
                {isSeller && !isMobile && (
                  <div className="px-4 py-2 mb-4 flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-primary bg-primary/5 rounded-xl border border-primary/10">
                    <span>Seller Profile Active</span>
                    <Link
                      href={`/s/${user.seller_profile?.store_link}`}
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-1 hover:underline"
                    >
                      Store <ExternalLink size={10} />
                    </Link>
                  </div>
                )}

                {/* Nav Links */}
                <div
                  className={clsx(
                    "space-y-1",
                    isMobile ? "mt-4 space-y-2" : "",
                  )}
                >
                  {navLinks
                    .filter((link) => link.show)
                    .map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setIsOpen(false)}
                        className={clsx(
                          "flex items-center gap-4 rounded-2xl transition-all group",
                          isMobile
                            ? "px-5 py-4 text-sm font-bold text-foreground border border-transparent active:bg-surface active:border-border/50"
                            : "px-4 py-3 text-[10px] font-black uppercase tracking-widest text-muted hover:text-primary hover:bg-primary/5",
                        )}
                      >
                        <link.icon
                          size={isMobile ? 22 : 18}
                          className={clsx(
                            "transition-transform group-hover:scale-110 group-active:scale-95",
                            isMobile
                              ? "text-primary/70"
                              : "text-muted group-hover:text-primary",
                          )}
                        />
                        <span>{link.label}</span>
                      </Link>
                    ))}
                </div>

                {/* Footer Section */}
                <div
                  className={clsx(
                    "mt-2 pt-2",
                    isMobile
                      ? "mt-6 pt-4 border-t border-border/50"
                      : "border-t border-border/20",
                  )}
                >
                  <button
                    onClick={() => {
                      logout();
                      setIsOpen(false);
                    }}
                    className={clsx(
                      "w-full flex items-center gap-4 rounded-2xl text-red-500 transition-all group",
                      isMobile
                        ? "px-5 py-5 text-sm font-bold active:bg-red-50"
                        : "px-4 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-red-500/5",
                    )}
                  >
                    <LogOut
                      size={isMobile ? 22 : 18}
                      className="group-hover:translate-x-1 transition-transform"
                    />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </MotionDiv>
          </Portal>
        )}
      </AnimatePresence>
    </div>
  );
}
