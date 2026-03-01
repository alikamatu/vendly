"use client";

import { motion } from "framer-motion";
import { 
  ShoppingBag, 
  Package, 
  Users, 
  Plus,
  Clock,
  TrendingUp
} from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

const stats = [
  {
    label: "Total Sales",
    value: "GH₵124,500",
    change: "+12.5%",
    isPositive: true,
    icon: ShoppingBag,
    color: "bg-emerald-500/10 text-emerald-500",
  },
  {
    label: "Total Orders",
    value: "45",
    change: "+5.2%",
    isPositive: true,
    icon: ShoppingBag,
    color: "bg-blue-500/10 text-blue-500",
  },
  {
    label: "Products",
    value: "12",
    change: "0%",
    isPositive: true,
    icon: Package,
    color: "bg-amber-500/10 text-amber-500",
  },
  {
    label: "Store Views",
    value: "1,240",
    change: "-2.4%",
    isPositive: false,
    icon: Users,
    color: "bg-purple-500/10 text-purple-500",
  },
];

const recentOrders = [
  { id: "#ORD-7234", customer: "John Doe", product: "iPhone 13 Case", status: "Delivered", amount: "GH₵5,000", date: "2 mins ago" },
  { id: "#ORD-7235", customer: "Sarah Smith", product: "Wireless Earbuds", status: "Processing", amount: "GH₵12,500", date: "15 mins ago" },
  { id: "#ORD-7236", customer: "Mike Johnson", product: "Phone Tripod", status: "Shipped", amount: "GH₵3,200", date: "1 hour ago" },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6 md:space-y-10">
      {/* Welcome & Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 md:p-8 rounded-3xl md:rounded-[2rem] bg-surface/30 border border-border/50">
        <div>
          <h2 className="text-md font-extrabold tracking-tight">Good evening, Seller! 👋</h2>
          <p className="text-xs text-muted mt-1 font-medium italic">Store metrics and quick actions</p>
        </div>
        <Button size="sm" className="h-10 px-6 rounded-xl flex items-center gap-2 group">
          <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" />
          Add Product
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        {stats.map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
          >
            <Card className="p-4 md:p-6" hoverEffect={false}>
              <div className="flex items-center justify-between mb-3 border-b border-border/50 pb-3">
                <div className={`p-2 rounded-lg ${stat.color}`}>
                  <stat.icon className="w-4 h-4" />
                </div>
                <div className={`flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                  stat.isPositive ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                }`}>
                  {stat.change}
                </div>
              </div>
              <p className="text-[10px] font-bold text-muted uppercase tracking-widest">{stat.label}</p>
              <p className="text-md font-black mt-1 text-foreground">{stat.value}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts & Recent Activity Placeholder */}
      <div className="grid lg:grid-cols-3 gap-6 md:gap-8">
        <div className="lg:col-span-2">
            <Card className="p-1 py-12 md:py-20 border-dashed bg-surface/20">
               <div className="flex flex-col items-center gap-3">
                  <div className="p-3 bg-primary/5 rounded-full">
                     <TrendingUp className="w-8 h-8 text-primary/40" />
                  </div>
                  <div className="text-center px-4">
                    <h3 className="text-sm font-bold">Sales Analytics</h3>
                    <p className="text-[10px] text-muted max-w-xs mx-auto mt-1">Metrics will appear here once you have more transactions.</p>
                  </div>
               </div>
            </Card>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-sm font-bold">Recent Orders</h3>
            <button className="text-[10px] font-bold text-primary hover:underline">See All</button>
          </div>
          <div className="space-y-3">
            {recentOrders.map((order, idx) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + idx * 0.1 }}
              >
                <Card className="p-4" hoverEffect={false}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-surface border border-border flex items-center justify-center">
                        <Clock className="w-4 h-4 text-muted" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground">{order.customer}</p>
                        <p className="text-[9px] text-muted font-medium mt-0.5">{order.product}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-foreground">{order.amount}</p>
                      <p className="text-[8px] font-bold text-muted uppercase tracking-wider mt-1">{order.date}</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
