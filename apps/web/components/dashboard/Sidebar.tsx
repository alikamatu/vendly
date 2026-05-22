"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Package, 
  Settings, 
  LogOut,
  Store,
} from "lucide-react";
import clsx from "@/utils/clsx";
import { useAuth } from "@/lib/contexts/auth-context";
import { motion, AnimatePresence } from "framer-motion";

const navItems = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "My Products", href: "/dashboard/products", icon: Package },
  { name: "Orders", href: "/dashboard/orders", icon: ShoppingBag },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { logout, user } = useAuth();

  return (
    <>
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm lg:hidden"
            {...({} as any)}
          />
        )}
      </AnimatePresence>

      <aside className={clsx(
        "fixed left-0 top-0 z-50 h-screen w-72 border-r border-border bg-background transition-transform lg:translate-x-0 shadow-2xl lg:shadow-none",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex h-full flex-col px-6 py-8">
          {/* Brand */}
          <div className="flex items-center gap-3 px-2 mb-10">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500 text-white shadow-lg shadow-red-500/10 overflow-hidden">
               {user?.seller_profile?.logo_url ? (
                  <img src={user.seller_profile.logo_url} alt="Store logo" className="w-full h-full object-cover" />
               ) : (
                  <Store className="w-5 h-5" />
               )}
            </div>
            <div>
              <span className="text-md font-medium tracking-tight text-foreground block leading-none">Vendly</span>
              <span className="text-[9px] font-normal uppercase tracking-wider text-muted">Seller Hub</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1.5">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={clsx(
                    "group relative flex items-center gap-3 rounded-2xl px-4 py-3 text-xs font-normal transition-all duration-300",
                    isActive 
                      ? "bg-primary/5 text-primary" 
                      : "text-muted hover:bg-surface hover:text-foreground"
                  )}
                >
                  <item.icon className={clsx(
                    "w-4 h-4 transition-transform duration-300 group-hover:scale-110",
                    isActive ? "text-primary" : "text-muted group-hover:text-foreground"
                  )} />
                  <span className="flex-1">{item.name}</span>
                  {isActive && (
                    <motion.div 
                      layoutId="sidebar-active"
                      className="absolute inset-y-0 -left-6 w-1 bg-red-500 rounded-r-full"
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Footer info/Logout */}
          <div className="mt-auto space-y-4">
            {user?.seller_profile && (
               <div className="p-3 rounded-2xl bg-surface border border-border/50">
                  <p className="text-[10px] font-normal text-muted uppercase tracking-wider mb-2">My Store</p>
                  <div className="flex items-center gap-3">
                     <div className="h-8 w-8 rounded-xl border border-border overflow-hidden bg-background flex items-center justify-center text-primary font-normal text-[10px] uppercase">
                        {user.seller_profile.logo_url ? (
                           <img src={user.seller_profile.logo_url} alt="Store Logo" className="w-full h-full object-cover" />
                        ) : (
                           user.seller_profile.store_name.charAt(0)
                        )}
                     </div>
                     <p className="text-xs font-normal truncate text-foreground">{user.seller_profile.store_name}</p>
                  </div>
               </div>
            )}
            
            <button
              onClick={logout}
              className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-xs font-normal text-red-500 transition-all hover:bg-red-500/5"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
