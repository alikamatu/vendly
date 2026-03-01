"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Home, Users, ShieldCheck, BarChart3, ReceiptIcon } from "lucide-react";
import BottomTabs from "@/components/dashboard/BottomTabs";
import DashboardTab from "@/components/dashboard/DashboardTab";
import UsersTab from "@/components/dashboard/UsersTab";
import ApprovalsTab from "@/components/dashboard/ApprovalsTab";

const tabs = [
  { id: "dashboard", label: "Home", icon: Home, component: <DashboardTab /> },
  { id: "users", label: "Users", icon: Users, component: <UsersTab /> },
  { id: "approvals", label: "Approvals", icon: ShieldCheck, component: <ApprovalsTab /> },
  { id: "analytics", label: "Analytics", icon: BarChart3, component: <div className="p-8 font-black uppercase">Analytics Module (Coming Soon)</div> },
  { id: "logs", label: "Logs", icon: ReceiptIcon, component: <div className="p-8 font-black uppercase">Activity Logs (Coming Soon)</div> },
];

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState(tabs[0].id);

  return (
    <div className="flex flex-col h-screen bg-[--color-background] text-[--color-foreground]">
      <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {tabs.find((t) => t.id === activeTab)?.component}
          </motion.div>
        </AnimatePresence>
      </main>
      <BottomTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}