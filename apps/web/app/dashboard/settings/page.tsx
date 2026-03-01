"use client";

import React from "react";
import Link from "next/link";
import { 
  Store, 
  User, 
  Palette, 
  ShieldCheck, 
  FileText, 
  ChevronRight,
  LogOut
} from "lucide-react";
import Card from "@/components/ui/Card";
import { useAuth } from "@/lib/auth-context";

const settingsGroups = [
  {
    title: "Account",
    items: [
      { id: "store", name: "Store Information", icon: Store, href: "/dashboard/settings/store", color: "text-blue-500", bg: "bg-blue-500/10" },
      { id: "profile", name: "Personal Profile", icon: User, href: "/dashboard/settings/profile", color: "text-purple-500", bg: "bg-purple-500/10" },
    ]
  },
  {
    title: "Preferences",
    items: [
      { id: "personalization", name: "Personalization", icon: Palette, href: "/dashboard/settings/personalization", color: "text-pink-500", bg: "bg-pink-500/10" },
      { id: "security", name: "Security & Privacy", icon: ShieldCheck, href: "/dashboard/settings/security", color: "text-emerald-500", bg: "bg-emerald-500/10" },
    ]
  },
  {
    title: "Support",
    items: [
      { id: "terms", name: "Terms & Conditions", icon: FileText, href: "/dashboard/settings/terms", color: "text-amber-500", bg: "bg-amber-500/10" },
    ]
  }
];

export default function SettingsPage() {
  const { logout } = useAuth();

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="px-2">
        <h2 className="text-md font-black tracking-tight uppercase">Settings</h2>
        <p className="text-xs text-muted font-medium mt-1">Manage your store and account preferences</p>
      </div>

      <div className="space-y-6">
        {settingsGroups.map((group) => (
          <div key={group.title} className="space-y-3">
            <h3 className="px-4 text-[10px] font-bold text-muted uppercase tracking-widest">{group.title}</h3>
            <Card className="overflow-hidden p-0 border-none shadow-sm" hoverEffect={false}>
              <div className="divide-y divide-border/50">
                {group.items.map((item) => (
                  <Link 
                    key={item.id} 
                    href={item.href}
                    className="flex items-center justify-between p-4 hover:bg-surface/50 active:bg-surface transition-colors group"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-xl ${item.bg} ${item.color}`}>
                        <item.icon className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-foreground">{item.name}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted group-hover:text-foreground transition-colors" />
                  </Link>
                ))}
              </div>
            </Card>
          </div>
        ))}

        <button 
          onClick={logout}
          className="w-full flex items-center gap-4 p-4 text-red-500 font-bold hover:bg-red-500/5 active:bg-red-500/10 rounded-2xl transition-all"
        >
          <div className="p-2 rounded-xl bg-red-500/10">
            <LogOut className="w-4 h-4" />
          </div>
          <span className="text-xs">Sign Out</span>
        </button>
      </div>
    </div>
  );
}
