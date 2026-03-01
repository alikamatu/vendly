"use client";

import React, { useState } from "react";
import Sidebar from "@/components/dashboard/Sidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { usePathname } from "next/navigation";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Map pathname to title
  const getTitle = (path: string) => {
    switch (path) {
      case "/dashboard": return "Overview";
      case "/dashboard/products": return "Products";
      case "/dashboard/orders": return "Orders";
      case "/dashboard/settings": return "Settings";
      default: return "Dashboard";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="lg:ml-72 min-h-screen flex flex-col transition-all duration-300">
        <DashboardHeader 
          title={getTitle(pathname)} 
          onMenuToggle={() => setIsSidebarOpen(true)} 
        />
        <main className="flex-1 p-4 md:p-8 container mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
