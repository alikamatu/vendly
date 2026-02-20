"use client";

import { motion } from "framer-motion";
import { Users, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { clsx } from "@/utils/clsx";
import Card from "@/components/ui/Card";

const stats = [
  { label: "Total Users", value: "2,543", icon: Users, change: "+12%" },
  { label: "Approved", value: "1,892", icon: CheckCircle, change: "+8%" },
  { label: "Pending", value: "342", icon: Clock, change: "-3%" },
  { label: "Rejected", value: "309", icon: AlertCircle, change: "+5%" },
];

export default function DashboardTab() {
  return (
    <div className="space-y-6">
      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-[--color-foreground]/50">{stat.label}</p>
                  <p className="text-xl font-semibold mt-1">{stat.value}</p>
                  <span
                    className={clsx(
                      "text-[10px] font-medium",
                      stat.change.startsWith("+") ? "text-green-600" : "text-red-600"
                    )}
                  >
                    {stat.change} vs last month
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-[--color-primary]/10 text-[--color-primary]">
                  <stat.icon size={18} />
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Recent activity placeholder */}
      <Card className="p-5">
        <h2 className="text-sm font-medium mb-3">Recent activity</h2>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 text-xs">
              <div className="w-8 h-8 rounded-full bg-[--color-primary]/10 flex items-center justify-center text-[--color-primary]">
                <Users size={14} />
              </div>
              <div className="flex-1">
                <p className="font-medium">New user registered</p>
                <p className="text-[--color-foreground]/50">2 minutes ago</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}