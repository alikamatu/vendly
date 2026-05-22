"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ShoppingBag, 
  Package, 
  Users, 
  Plus,
  Clock,
  TrendingUp,
  Loader2,
  AlertCircle
} from "lucide-react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { useAuth } from "@/lib/contexts/auth-context";
import { storeApi } from "@/lib/api/store";
import { adminApi } from "@/lib/api/admin";
import ProFeaturesSection from "@/components/dashboard/ProFeaturesSection";

const IconMap: Record<string, any> = {
  ShoppingBag,
  Package,
  Users,
  TrendingUp,
};

export default function DashboardPage() {
  const { user, token } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{ stats: any[], recentOrders: any[] } | null>(null);
  const [hotSalesStats, setHotSalesStats] = useState<{
    totalSubscriptions: number;
    successfulSubscriptions: number;
    activeHotSalesProducts: number;
    totalRevenueGhs: number;
  } | null>(null);
  const [hotSalesRows, setHotSalesRows] = useState<any[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      if (!token) return;
      try {
        if (user?.role === "ADMIN") {
          const [stats, rows] = await Promise.all([
            adminApi.getHotSalesStats(token),
            adminApi.getHotSalesSubscriptions(token, 1, 8),
          ]);
          setHotSalesStats(stats);
          setHotSalesRows(rows.data || []);
        } else {
          const statsData = await storeApi.getStoreStats(token);
          setData(statsData);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load dashboard metrics");
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [token]);

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-xs font-normal text-muted uppercase tracking-wider">Compiling Analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[60vh] items-center justify-center p-6 text-center">
        <div className="max-w-xs space-y-4">
          <div className="p-3 bg-red-500/10 rounded-2xl inline-block">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <div>
            <h3 className="text-sm font-normal uppercase tracking-tight">Sync Failed</h3>
            <p className="text-[11px] text-muted mt-2 font-medium leading-relaxed">{error}</p>
          </div>
          <Button onClick={() => window.location.reload()} variant="primary" size="sm" className="rounded-xl w-full">
            Retry Connection
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8 max-w-7xl mx-auto">
      {/* Welcome & Action */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 md:p-6 rounded-[2rem] bg-surface/30 border border-border/50 backdrop-blur-sm shadow-xl shadow-black/5"
      >
        <div>
          <h2 className="text-sm font-medium tracking-tight uppercase">Welcome back, {user?.full_name?.split(' ')[0]} ⚡️</h2>
          <p className="text-[10px] text-muted mt-1 font-normal uppercase tracking-wider italic">Real-time performance metrics</p>
        </div>
        <Link href="/dashboard/products/add">
          <Button size="sm" className="h-10 px-6 rounded-xl flex items-center gap-2 group shadow-lg shadow-primary/20">
            <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" />
            <span className="text-[10px] font-medium uppercase tracking-wider">Post Product</span>
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/transactions">
            <Button variant="secondary" size="sm" className="h-10 px-4 rounded-xl text-[10px] font-medium uppercase tracking-wider">
              Transactions
            </Button>
          </Link>
          <Link href="/dashboard/payouts">
            <Button variant="secondary" size="sm" className="h-10 px-4 rounded-xl text-[10px] font-medium uppercase tracking-wider">
              Payouts
            </Button>
          </Link>
        </div>
      </motion.div>

      {user?.role === "ADMIN" && hotSalesStats ? (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Total Subscriptions", value: hotSalesStats.totalSubscriptions },
              { label: "Successful Payments", value: hotSalesStats.successfulSubscriptions },
              { label: "Active Hot Sales", value: hotSalesStats.activeHotSalesProducts },
              { label: "Revenue (GHS)", value: `GH₵${hotSalesStats.totalRevenueGhs.toFixed(2)}` },
            ].map((stat) => (
              <Card key={stat.label} className="p-5 bg-surface/50 border-none shadow-xl shadow-black/5" hoverEffect={false}>
                <p className="text-[10px] font-medium text-muted uppercase tracking-wide">{stat.label}</p>
                <p className="text-lg font-medium mt-1 text-foreground leading-none">{stat.value}</p>
              </Card>
            ))}
          </div>

          <Card className="p-5 bg-surface/40 border-none shadow-xl shadow-black/5" hoverEffect={false}>
            <h3 className="text-xs font-medium uppercase tracking-wider mb-4">Hot Sales Subscriptions</h3>
            <div className="space-y-3">
              {hotSalesRows.length > 0 ? (
                hotSalesRows.map((row) => (
                  <div key={row.id} className="p-3 rounded-2xl bg-background/50 border border-border/30 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium truncate">{row.product.title}</p>
                      <p className="text-[9px] text-muted font-normal uppercase tracking-wider truncate">
                        {row.seller.store_name} • {row.reference}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] font-medium">GH₵{row.amount}</p>
                      <p className="text-[9px] text-muted font-normal uppercase">{row.status}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-[10px] text-muted font-normal uppercase tracking-wider">
                  No hot sales subscriptions yet.
                </p>
              )}
            </div>
          </Card>
        </div>
      ) : (
      /* Stats Grid */
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {data?.stats.map((stat, idx) => {
          const Icon = IconMap[stat.icon] || Package;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Card className="p-5 overflow-visible bg-surface/50 border-none shadow-xl shadow-black/5" hoverEffect={true}>
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-2 rounded-xl ${stat.color} shadow-lg shadow-current/10`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className={`flex items-center gap-0.5 text-[9px] font-medium px-2 py-0.5 rounded-full ${
                    stat.isPositive ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                  }`}>
                    {stat.change}
                  </div>
                </div>
                <p className="text-[10px] font-medium text-muted uppercase tracking-wide">{stat.label}</p>
                <p className="text-lg font-medium mt-1 text-foreground leading-none">{stat.value}</p>
              </Card>
            </motion.div>
          );
        })}
      </div>
      )}

      {user?.role === "SELLER" && <ProFeaturesSection />}

      {user?.role !== "ADMIN" && (
      /* Analytics & Orders */
      <div className="grid lg:grid-cols-3 gap-6 md:gap-8">
        <div className="lg:col-span-2 space-y-4">
           <div className="flex items-center gap-2 px-2">
             <TrendingUp className="w-4 h-4 text-primary" />
             <h3 className="text-xs font-medium uppercase tracking-wider">Growth Engine</h3>
           </div>
           <Card className="p-10 md:p-14 border-dashed border-2 bg-surface/20 flex flex-col items-center text-center gap-5 rounded-[2.5rem]">
              <div className="w-16 h-16 bg-primary/5 rounded-[1.5rem] flex items-center justify-center rotate-3 transition-transform hover:rotate-0">
                 <TrendingUp className="w-8 h-8 text-primary/40" />
              </div>
              <div className="space-y-2 max-w-xs mx-auto">
                <h3 className="text-sm font-medium uppercase tracking-tight">Analytics Coming Soon</h3>
                <p className="text-[10px] text-muted font-normal leading-relaxed uppercase tracking-wider">
                  Detailed growth trends will be unlocked once you fulfill more orders.
                </p>
              </div>
              <Button variant="secondary" size="sm" className="rounded-xl px-8 text-[9px] font-medium uppercase tracking-wider border-border/50">
                How to Scale?
              </Button>
           </Card>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xs font-medium uppercase tracking-wider">Recent Flows</h3>
            <Link href="/dashboard/orders">
              <button className="text-[10px] font-medium text-primary hover:underline uppercase tracking-wider transition-all hover:tracking-wider">See All</button>
            </Link>
          </div>
          
          <div className="space-y-3">
            {data?.recentOrders && data.recentOrders.length > 0 ? (
              data.recentOrders.map((order, idx) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + idx * 0.1 }}
                >
                  <Card className="p-4 border-none bg-surface/40 hover:bg-surface/60 transition-colors" hoverEffect={false}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 shrink-0 rounded-[1.2rem] bg-surface-dark border border-border/10 flex items-center justify-center shadow-lg shadow-black/5">
                          <Clock className="w-4 h-4 text-muted" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-medium text-foreground truncate">{order.customer}</p>
                          <p className="text-[9px] text-muted font-normal mt-0.5 truncate italic">{order.product}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[11px] font-medium text-foreground">{order.amount}</p>
                        <p className="text-[8px] font-medium text-primary uppercase tracking-wider mt-1">
                          {new Date(order.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))
            ) : (
              <div className="py-12 text-center space-y-3 border border-dashed border-border/50 rounded-[2rem] bg-surface/10">
                <ShoppingBag className="w-8 h-8 text-muted mx-auto opacity-20" />
                <p className="text-[10px] text-muted font-medium uppercase tracking-wider">Waiting for first order</p>
              </div>
            )}
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
