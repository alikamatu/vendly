"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ShoppingBag, 
  Package, 
  Loader2, 
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  User,
  Mail,
  ExternalLink,
  Search,
  Filter,
  ChevronRight,
  CreditCard
} from "lucide-react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useAuth } from "@/lib/contexts/auth-context";
import { orderApi } from "@/lib/api/order";

export default function StoreOrdersPage() {
  const { token } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      fetchOrders();
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const interval = setInterval(() => {
      fetchOrders();
    }, 15000);
    return () => clearInterval(interval);
  }, [token]);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const data = await orderApi.getSellerOrders(token!);
      setOrders(data);
    } catch (err: any) {
      setError(err.message || "Failed to load store orders");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      setUpdatingId(orderId);
      await orderApi.updateOrderStatus(token!, orderId, newStatus);
      // Update local state
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    } catch (err: any) {
      alert(err.message || "Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredOrders = orders.filter(order => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      order.id.toLowerCase().includes(searchLower) ||
      order.buyer.full_name.toLowerCase().includes(searchLower) ||
      (order.customer_name && order.customer_name.toLowerCase().includes(searchLower));
    
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <Link href="/dashboard" className="text-muted hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <span className="text-[9px] font-medium text-muted uppercase tracking-wider">Dashboard</span>
            <span className="text-muted/30">/</span>
            <span className="text-[9px] font-medium text-foreground uppercase tracking-wider">Store Orders</span>
          </div>
          <h2 className="text-xl font-medium tracking-tight uppercase">Incoming Orders</h2>
          <p className="text-[10px] text-muted font-normal uppercase tracking-wider italic">
            Manage your store sales • {filteredOrders.length} showing
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-64 group">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted group-focus-within:text-primary transition-colors" />
             <input 
               type="text" 
               placeholder="Search ID or Customer..."
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="w-full bg-surface border border-border/50 rounded-2xl pl-10 pr-4 py-2.5 text-[10px] font-normal uppercase tracking-wider focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
             />
          </div>
          <div className="relative w-full sm:w-auto">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted pointer-events-none" />
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-auto bg-surface border border-border/50 rounded-2xl pl-10 pr-10 py-2.5 text-[10px] font-normal uppercase tracking-wider focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all appearance-none cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-500/10 text-red-500 rounded-2xl mx-2 border border-red-500/20">
          <AlertCircle className="w-4 h-4" />
          <p className="text-[10px] font-medium uppercase tracking-wider">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 px-2">
        <AnimatePresence mode="popLayout">
          {filteredOrders.length > 0 ? (
            filteredOrders.map((order, idx) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card 
                  className={`p-6 border rounded-3xl overflow-hidden hover:bg-surface/30 transition-all ${
                    order.status === 'PENDING' ? 'border-orange-500/20' : 
                    order.status === 'COMPLETED' ? 'border-emerald-500/20' : 
                    'border-red-500/20'
                  }`} 
                  hoverEffect={false}
                >
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Order Info */}
                    <div className="lg:border-r border-border/50 lg:pr-8">
                       <div className="flex items-center justify-between mb-4">
                         <div className={`px-3 py-1 rounded-xl text-[9px] font-medium uppercase tracking-wider border border-border/50 ${
                           order.status === 'PENDING' ? 'bg-orange-500/10 text-orange-500' : 
                           order.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-500' : 
                           'bg-red-500/10 text-red-500'
                         }`}>
                           {order.status}
                         </div>
                         <span className="text-[10px] text-muted font-normal">{new Date(order.created_at).toLocaleDateString()}</span>
                       </div>
                       
                       <div className="flex items-center justify-between mb-4">
                         <h3 className="text-sm font-medium uppercase tracking-tight">Order #{order.id.slice(-8).toUpperCase()}</h3>
                         <Link href={`/dashboard/orders/${order.id}`}>
                            <div className="p-2 rounded-xl bg-surface border border-border/50 text-muted hover:text-primary hover:border-primary/30 transition-all group">
                              <ExternalLink className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                            </div>
                         </Link>
                       </div>
                       
                       <div className="space-y-4">
                         <div className="flex items-start gap-3">
                           <div className="p-2 rounded-xl bg-surface border border-border/50">
                             <User className="w-3.5 h-3.5 text-muted" />
                           </div>
                           <div>
                             <p className="text-[9px] font-medium text-muted uppercase tracking-wider leading-none mb-1">Customer</p>
                             <p className="text-xs font-normal">{order.buyer.full_name}</p>
                           </div>
                         </div>
                         <div className="flex items-start gap-3">
                           <div className="p-2 rounded-xl bg-surface border border-border/50">
                             <Mail className="w-3.5 h-3.5 text-muted" />
                           </div>
                           <div className="min-w-0">
                             <p className="text-[9px] font-medium text-muted uppercase tracking-wider leading-none mb-1">Contact Details</p>
                             <p className="text-xs font-normal truncate">{order.customer_phone || order.buyer.email}</p>
                           </div>
                         </div>
                         
                         <div className="flex items-start gap-3">
                           <div className="p-2 rounded-xl bg-surface border border-border/50">
                             <Package className="w-3.5 h-3.5 text-muted" />
                           </div>
                           <div className="min-w-0">
                             <p className="text-[9px] font-medium text-muted uppercase tracking-wider leading-none mb-1">Logistics: {order.delivery_method || "N/A"}</p>
                             <p className="text-xs font-normal">{order.delivery_location || "No location specified"}</p>
                             {order.delivery_notes && (
                               <p className="text-[10px] text-muted italic mt-0.5 max-w-[200px] truncate">"{order.delivery_notes}"</p>
                             )}
                           </div>
                         </div>

                         <div className="flex items-start gap-3">
                           <div className={`p-2 rounded-xl border ${order.payment_info?.status === 'SUCCESS' ? 'bg-emerald-500/10 border-emerald-500/20' : order.payment_info?.status === 'FAILED' ? 'bg-red-500/10 border-red-500/20' : 'bg-orange-500/10 border-orange-500/20'}`}>
                             <CreditCard className={`w-3.5 h-3.5 ${order.payment_info?.status === 'SUCCESS' ? 'text-emerald-500' : order.payment_info?.status === 'FAILED' ? 'text-red-500' : 'text-orange-500'}`} />
                           </div>
                           <div className="min-w-0">
                             <p className="text-[9px] font-medium text-muted uppercase tracking-wider leading-none mb-1">Payment: {order.payment_info?.provider || 'N/A'}</p>
                             <p className="text-xs font-normal uppercase">{order.payment_info?.status}</p>
                           </div>
                         </div>
                       </div>
                    </div>

                    {/* Items */}
                    <div className="lg:col-span-2 flex flex-col justify-between">
                      <div className="space-y-4">
                        {order.items.map((item: any) => (
                          <div key={item.id} className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-xl border border-border/50 overflow-hidden shrink-0 bg-surface relative group">
                              {item.product.video_url ? (
                                <video 
                                  src={item.product.video_url} 
                                  className="w-full h-full object-cover"
                                  autoPlay
                                  muted
                                  loop
                                  playsInline
                                />
                              ) : (
                                <img src={item.product.image_urls[0]} alt="" className="w-full h-full object-cover" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-[11px] font-medium uppercase tracking-tight truncate">{item.product.title}</h4>
                              <p className="text-[10px] text-muted font-normal">Qty: {item.quantity} • GH₵{parseFloat(item.price).toLocaleString()}</p>
                            </div>
                            <div className="text-right">
                               <p className="text-xs font-medium">GH₵{(parseFloat(item.price) * item.quantity).toLocaleString()}</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-8 pt-6 border-t border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                        <div className="flex items-center gap-2">
                           <select 
                             disabled={updatingId === order.id}
                             value={order.status}
                             onChange={(e) => handleUpdateStatus(order.id, e.target.value)}
                             className="h-10 rounded-xl px-4 text-[9px] font-medium uppercase tracking-wider bg-surface border border-border/50 focus:outline-none transition-all cursor-pointer disabled:opacity-50"
                           >
                             <option value="PENDING">Set Pending</option>
                             <option value="COMPLETED">Set Completed</option>
                             <option value="CANCELLED">Set Cancelled</option>
                           </select>
                           {updatingId === order.id && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-medium text-muted uppercase tracking-wider leading-none mb-1">Total Payout</p>
                          <p className="text-lg font-medium text-primary">GH₵{order.items.reduce((sum: number, i: any) => sum + parseFloat(i.price) * i.quantity, 0).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))
          ) : (
            <div className="py-24 text-center space-y-4 border border-dashed border-border/50 rounded-[3rem] bg-surface/10">
              <Package className="w-12 h-12 text-muted mx-auto opacity-10" />
              <div className="space-y-1">
                <p className="text-[11px] text-muted font-medium uppercase tracking-wider">{searchTerm ? "No orders found" : "No store orders"}</p>
                <p className="text-[9px] text-muted/60 font-medium uppercase tracking-wider italic">{searchTerm ? "Try adjusting your search" : "Wait for customers to find your products"}</p>
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
