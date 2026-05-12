"use client";

import React from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Palette, Moon, Sun, Monitor, Type, LayoutGrid } from "lucide-react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import { useTheme } from "@/lib/contexts/theme";

export default function PersonalizationPage() {
  const { theme, setTheme } = useTheme();

  const themes = [
    { id: "light", name: "Light Mode", icon: Sun, color: "text-amber-500", bg: "bg-amber-500/10" },
    { id: "dark", name: "Dark Mode", icon: Moon, color: "text-blue-500", bg: "bg-blue-500/10" },
    { id: "system", name: "System Sync", icon: Monitor, color: "text-slate-500", bg: "bg-slate-500/10" },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link 
        href="/dashboard/settings"
        className="inline-flex items-center gap-2 text-xs font-bold text-muted hover:text-foreground transition-colors group mb-2"
      >
        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
        Back to Settings
      </Link>

      <div className="px-2">
        <h2 className="text-md font-black tracking-tight uppercase">Personalization</h2>
        <p className="text-xs text-muted font-medium mt-1">Customize your Vendly experience and display</p>
      </div>

      <div className="space-y-6">
        {/* Theme Section */}
        <section className="space-y-3">
          <h3 className="px-4 text-[10px] font-bold text-muted uppercase tracking-widest flex items-center gap-2">
             <Palette className="w-3 h-3" /> Appearance theme
          </h3>
          <Card className="p-2 border-none shadow-sm" hoverEffect={false}>
             <div className="grid grid-cols-3 gap-2">
                {themes.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTheme(t.id as any)}
                    className={`flex flex-col items-center gap-3 p-4 rounded-2xl transition-all ${
                      theme === t.id 
                        ? "bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]" 
                        : "bg-surface hover:bg-border/30 text-muted"
                    }`}
                  >
                    <t.icon className={`w-5 h-5 ${theme === t.id ? "text-white" : t.color}`} />
                    <span className="text-[10px] font-bold">{t.name}</span>
                  </button>
                ))}
             </div>
          </Card>
        </section>

        {/* Mock Display Section */}
        <section className="space-y-3">
          <h3 className="px-4 text-[10px] font-bold text-muted uppercase tracking-widest flex items-center gap-2">
             <Type className="w-3 h-3" /> Accessibility & Text
          </h3>
          <Card className="p-0 overflow-hidden border-none shadow-sm" hoverEffect={false}>
             <div className="divide-y divide-border/50 opacity-60">
                <div className="flex items-center justify-between p-4 bg-surface/30">
                   <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500">
                         <Type className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold">Large Text Mode</span>
                   </div>
                   <div className="w-10 h-6 bg-border/50 rounded-full relative cursor-not-allowed">
                      <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                   </div>
                </div>
                <div className="flex items-center justify-between p-4 bg-surface/30">
                   <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                         <LayoutGrid className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold">Compact Dashboard</span>
                   </div>
                   <div className="w-10 h-6 bg-primary rounded-full relative cursor-not-allowed">
                      <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                   </div>
                </div>
             </div>
          </Card>
          <p className="px-4 text-[9px] text-muted italic font-medium">Advanced display controls coming in future update.</p>
        </section>
      </div>
    </div>
  );
}
