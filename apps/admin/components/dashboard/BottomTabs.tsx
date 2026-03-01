"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LucideIcon, 
  LayoutGrid, 
  User, 
  Settings, 
  ExternalLink,
  ChevronUp,
  Store,
  Globe,
  ShieldHalf
} from "lucide-react";
import { clsx } from "@/utils/clsx";
import ThemeToggle from "../ui/ThemeToggle";

interface Tab {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface BottomTabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (id: string) => void;
}

const apps = [
  { name: "Vendly Marketplace", icon: Globe, url: "http://localhost:3000", color: "text-blue-500" },
  { name: "Seller Hub", icon: Store, url: "http://localhost:3000/dashboard", color: "text-emerald-500" },
  { name: "Admin Dashboard", icon: ShieldHalf, url: "#", color: "text-primary", current: true },
];

export default function BottomTabs({ tabs, activeTab, onTabChange }: BottomTabsProps) {
  const [showAppSwitcher, setShowAppSwitcher] = useState(false);
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);

  return (
    <div className="fixed bottom-6 inset-x-0 flex justify-center px-4 z-[100] pointer-events-none">
      <div className="relative flex items-center gap-2 p-2 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-white/20 dark:border-white/5 pointer-events-auto">
        
        {/* App Switcher Trigger */}
        <div className="relative">
          <button
            onClick={() => setShowAppSwitcher(!showAppSwitcher)}
            onMouseEnter={() => setHoveredTab("apps")}
            onMouseLeave={() => setHoveredTab(null)}
            className={clsx(
              "p-3 rounded-full transition-all duration-300 relative group",
              showAppSwitcher ? "bg-primary text-white scale-110" : "hover:bg-primary/10 text-zinc-500 hover:text-primary"
            )}
          >
            <LayoutGrid size={20} className="relative z-10" />
            <AnimatePresence>
               {hoveredTab === "apps" && !showAppSwitcher && (
                 <motion.div
                   initial={{ opacity: 0, y: 10, scale: 0.8 }}
                   animate={{ opacity: 1, y: -45, scale: 1 }}
                   exit={{ opacity: 0, y: 10, scale: 0.8 }}
                   className="absolute left-1/2 -translate-x-1/2 px-3 py-1 bg-zinc-900 text-white text-[10px] font-bold rounded-lg whitespace-nowrap"
                 >
                   Apps
                 </motion.div>
               )}
            </AnimatePresence>
          </button>

          {/* Dropup Menu */}
          <AnimatePresence>
            {showAppSwitcher && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: -12, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.9 }}
                className="absolute bottom-full left-0 mb-4 w-64 bg-white dark:bg-zinc-900 rounded-[2rem] shadow-2xl border border-black/5 dark:border-white/5 overflow-hidden p-2 origin-bottom-left"
              >
                <div className="px-4 py-3 border-b border-black/5 dark:border-white/5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Switch Application</span>
                </div>
                <div className="p-1 space-y-1">
                  {apps.map((app) => (
                    <a
                      key={app.name}
                      href={app.url}
                      className={clsx(
                        "flex items-center justify-between p-3 rounded-2xl transition-all group",
                        app.current ? "bg-primary/5 cursor-default" : "hover:bg-zinc-100 dark:hover:bg-white/5"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={clsx("p-2 rounded-xl bg-white dark:bg-zinc-800 shadow-sm transition-transform group-hover:scale-110", app.color)}>
                          <app.icon size={16} />
                        </div>
                        <span className={clsx("text-xs font-bold", app.current ? "text-primary" : "text-zinc-600 dark:text-zinc-400")}>
                          {app.name}
                        </span>
                      </div>
                      {!app.current && <ExternalLink size={12} className="text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity" />}
                    </a>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800 mx-1" />

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onMouseEnter={() => setHoveredTab(tab.id)}
                onMouseLeave={() => setHoveredTab(null)}
                onClick={() => onTabChange(tab.id)}
                className={clsx(
                  "relative flex flex-col items-center justify-center p-3 rounded-full transition-all duration-300 group",
                  isActive ? "text-primary" : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                )}
              >
                <AnimatePresence>
                  {(isActive || hoveredTab === tab.id) && (
                    <motion.div
                      layoutId="activeDockPill"
                      className="absolute inset-0 bg-primary/5 dark:bg-primary/10 rounded-full"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                    />
                  )}
                </AnimatePresence>
                
                <motion.div
                  animate={{ 
                    scale: hoveredTab === tab.id ? 1.2 : 1,
                    y: hoveredTab === tab.id ? -2 : 0
                  }}
                  className="relative z-10"
                >
                  <Icon size={20} />
                </motion.div>

                <AnimatePresence>
                  {hoveredTab === tab.id && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.8 }}
                      animate={{ opacity: 1, y: -45, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.8 }}
                      className="absolute left-1/2 -translate-x-1/2 px-3 py-1 bg-zinc-900 text-white text-[10px] font-bold rounded-lg whitespace-nowrap shadow-xl"
                    >
                      {tab.label}
                    </motion.div>
                  )}
                </AnimatePresence>

                {isActive && (
                  <motion.div 
                    layoutId="dot"
                    className="absolute -bottom-1.5 w-1 h-1 bg-primary rounded-full" 
                  />
                )}
              </button>
            );
          })}
        </nav>

        <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800 mx-1" />

        {/* Right Actions: Profile & Settings */}
        <div className="flex items-center gap-1">
           <button 
             onMouseEnter={() => setHoveredTab("profile")}
             onMouseLeave={() => setHoveredTab(null)}
             className="p-3 rounded-full text-zinc-500 hover:text-emerald-500 hover:bg-emerald-500/10 transition-all relative group"
            >
             <User size={20} />
             <AnimatePresence>
                {hoveredTab === "profile" && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.8 }}
                    animate={{ opacity: 1, y: -45, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.8 }}
                    className="absolute left-1/2 -translate-x-1/2 px-3 py-1 bg-zinc-900 text-white text-[10px] font-bold rounded-lg whitespace-nowrap shadow-xl"
                  >
                    Profile
                  </motion.div>
                )}
             </AnimatePresence>
           </button>
           <button 
             onMouseEnter={() => setHoveredTab("settings")}
             onMouseLeave={() => setHoveredTab(null)}
             className="p-3 rounded-full text-zinc-500 hover:text-blue-500 hover:bg-blue-500/10 transition-all relative group"
            >
             <Settings size={20} />
             <AnimatePresence>
                {hoveredTab === "settings" && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.8 }}
                    animate={{ opacity: 1, y: -45, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.8 }}
                    className="absolute left-1/2 -translate-x-1/2 px-3 py-1 bg-zinc-900 text-white text-[10px] font-bold rounded-lg whitespace-nowrap shadow-xl"
                  >
                    Settings
                  </motion.div>
                )}
             </AnimatePresence>
           </button>
           <ThemeToggle />
        </div>
      </div>
    </div>
  );
}