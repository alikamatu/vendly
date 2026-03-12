"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  Package, 
  User, 
  Phone, 
  MapPin, 
  Calendar, 
  ShoppingBag,
  Loader2,
  AlertCircle,
  Mail,
  School,
  FileText
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useAuth } from "@/lib/auth-context";
import { orderApi } from "@/lib/api/order";

export default function OrderDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const { token } = useAuth();
  const [order, setOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (token && id) {
      fetchOrderDetails();
    }
  }, [token, id]);

  const fetchOrderDetails = async () => {
    try {
      setIsLoading(true);
      const data = await orderApi.getOrderDetails(token!, id as string);
      setOrder(data);
    } catch (err: any) {
      setError(err.message || "Failed to load order details");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    try {
      setUpdating(true);
      await orderApi.updateOrderStatus(token!, id as string, newStatus);
      setOrder({ ...order, status: newStatus });
    } catch (err: any) {
      alert(err.message || "Failed to update status");
    } finally {
      setUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-2xl mx-auto px-4 mt-20 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4 opacity-20" />
        <h2 className="text-xl font-black uppercase tracking-tight mb-2">Order Not Found</h2>
        <p className="text-[10px] text-muted font-bold uppercase tracking-widest mb-8">{error || "The order you are looking for does not exist or you don't have access to it."}</p>
        <Link href="/dashboard/orders">
           <Button variant="secondary" className="rounded-2xl px-8">Back to Orders</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 pb-20 space-y-8">
      {/* Header */}
      <div className="space-y-6">
        <Link 
          href="/dashboard/orders"
          className="inline-flex items-center gap-2 text-[10px] font-black text-muted hover:text-foreground uppercase tracking-widest transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to list
        </Link>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border border-border/50 ${
                order.status === 'PENDING' ? 'bg-orange-500/10 text-orange-500' : 
                order.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-500' : 
                'bg-red-500/10 text-red-500'
              }`}>
                {order.status}
              </span>
              <span className="text-[11px] text-muted font-bold flex items-center gap-1.5 uppercase tracking-wider">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(order.created_at).toLocaleDateString(undefined, { dateStyle: 'long' })}
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tighter uppercase">Order #{order.id.slice(-8).toUpperCase()}</h1>
          </div>

          <div className="flex items-center gap-3">
             <select 
               disabled={updating}
               value={order.status}
               onChange={(e) => handleStatusUpdate(e.target.value)}
               className="h-12 bg-surface border border-border/50 rounded-2xl px-6 text-[10px] font-black uppercase tracking-[0.2em] focus:outline-none focus:ring-1 focus:ring-primary/50 cursor-pointer disabled:opacity-50"
             >
               <option value="PENDING">PENDING</option>
               <option value="COMPLETED">COMPLETED</option>
               <option value="CANCELLED">CANCELLED</option>
             </select>
             {updating && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column: Items */}
        <div className="md:col-span-2 space-y-6">
          <Card 
            className={`p-8 border rounded-[2.5rem] ${
              order.status === 'PENDING' ? 'border-orange-500/20' : 
              order.status === 'COMPLETED' ? 'border-emerald-500/20' : 
              'border-red-500/20'
            }`} 
            hoverEffect={false}
          >
            <div className="flex items-center gap-3 mb-8">
               <ShoppingBag className="w-5 h-5 text-primary" />
               <h2 className="text-sm font-black uppercase tracking-[0.15em]">Ordered Items</h2>
            </div>

            <div className="space-y-6">
              {order.items.map((item: any) => (
                <div key={item.id} className="flex gap-6 pb-6 border-b border-border/50 last:border-0 last:pb-0">
                  <div className="w-20 h-20 rounded-[1.5rem] border border-border/50 overflow-hidden shrink-0 bg-surface relative">
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
                  <div className="flex-1 space-y-1">
                    <p className="text-[9px] font-black text-primary uppercase tracking-widest">{item.product.category}</p>
                    <h3 className="text-sm font-black uppercase tracking-tight">{item.product.title}</h3>
                    <div className="flex items-center gap-4 mt-2">
                       <p className="text-[10px] text-muted font-bold">Qty: {item.quantity}</p>
                       <p className="text-[10px] text-muted font-bold">Price: GH₵{parseFloat(item.price).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black uppercase">GH₵{(parseFloat(item.price) * item.quantity).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10 pt-8 border-t border-border/50 flex items-center justify-between">
               <p className="text-[10px] font-black text-muted uppercase tracking-widest">Grand Total Payout</p>
               <p className="text-2xl font-black text-primary">GH₵{parseFloat(order.total_amount).toLocaleString()}</p>
            </div>
          </Card>

          {order.delivery_notes && (
            <Card className="p-8 border border-border/50 rounded-[2.5rem] bg-primary/5" hoverEffect={false}>
               <div className="flex items-center gap-3 mb-4 text-primary">
                 <FileText className="w-5 h-5" />
                 <h2 className="text-sm font-black uppercase tracking-[0.15em]">Customer Notes</h2>
               </div>
               <p className="text-xs font-medium text-muted/80 leading-relaxed italic">
                 "{order.delivery_notes}"
               </p>
            </Card>
          )}
        </div>

        {/* Right Column: Customer & Logistics */}
        <div className="space-y-6">
          <Card className="p-8 border border-border/50 rounded-[2.5rem]" hoverEffect={false}>
             <div className="flex items-center gap-3 mb-8">
               <User className="w-5 h-5 text-primary" />
               <h2 className="text-sm font-black uppercase tracking-[0.15em]">Customer Profile</h2>
             </div>

             <div className="space-y-6">
               <div className="space-y-1">
                  <p className="text-[9px] font-black text-muted uppercase tracking-widest">Full Name</p>
                  <p className="text-xs font-black uppercase">{order.customer_name || order.buyer.full_name}</p>
               </div>

               <div className="space-y-1">
                  <p className="text-[9px] font-black text-muted uppercase tracking-widest flex items-center gap-2">
                    <Phone className="w-3 h-3 text-primary" /> Phone
                  </p>
                  <p className="text-xs font-black">{order.customer_phone || "No phone provided"}</p>
               </div>

               <div className="space-y-1">
                  <p className="text-[9px] font-black text-muted uppercase tracking-widest flex items-center gap-2">
                    <Mail className="w-3 h-3 text-primary" /> Email
                  </p>
                  <p className="text-xs font-bold text-muted/80 truncate">{order.buyer.email}</p>
               </div>

               <div className="space-y-1">
                  <p className="text-[9px] font-black text-muted uppercase tracking-widest flex items-center gap-2">
                    <School className="w-3 h-3 text-primary" /> Education
                  </p>
                  <p className="text-xs font-black uppercase">{order.buyer.school}</p>
               </div>
             </div>
          </Card>

          <Card className="p-8 border border-border/50 rounded-[2.5rem]" hoverEffect={false}>
             <div className="flex items-center gap-3 mb-8">
               <MapPin className="w-5 h-5 text-primary" />
               <h2 className="text-sm font-black uppercase tracking-[0.15em]">Logistics</h2>
             </div>

             <div className="space-y-6">
               <div className="space-y-1">
                  <p className="text-[9px] font-black text-muted uppercase tracking-widest">Delivery Method</p>
                  <div className="flex items-center gap-2 mt-1">
                     <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                     <p className="text-xs font-black uppercase tracking-tighter">{order.delivery_method || "NOT SPECIFIED"}</p>
                  </div>
               </div>

               <div className="space-y-1">
                  <p className="text-[9px] font-black text-muted uppercase tracking-widest">Address / Location</p>
                  <p className="text-xs font-medium text-muted/80 leading-relaxed">
                    {order.delivery_location || "No address details provided for this order."}
                  </p>
               </div>
             </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
