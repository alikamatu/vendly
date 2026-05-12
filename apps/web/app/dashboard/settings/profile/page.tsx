"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, User, Mail, Shield, Loader2, Check, Info } from "lucide-react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useAuth } from "@/lib/contexts/auth-context";
import { authApi } from "@/lib/api/auth";

export default function ProfileSettingsPage() {
  const { user, token, refreshUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  
  const [formData, setFormData] = useState({
    full_name: user?.full_name || "",
    email: user?.email || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setIsLoading(true);
    setMessage(null);

    try {
      await authApi.updateProfile(token, formData);
      await refreshUser();
      setMessage({ type: "success", text: "Personal profile updated successfully!" });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to update profile" });
    } finally {
      setIsLoading(false);
    }
  };

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
        <h2 className="text-md font-black tracking-tight uppercase">Personal Profile</h2>
        <p className="text-xs text-muted font-medium mt-1">Manage your identity and contact details</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="p-6 md:p-8 space-y-6" hoverEffect={false}>
          <div className="flex items-center gap-4 mb-4">
             <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <User className="w-6 h-6 text-purple-500" />
             </div>
             <div>
                <p className="text-xs font-black uppercase">Account Identity</p>
                <p className="text-[10px] text-muted font-medium italic">General profile information</p>
             </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-muted uppercase tracking-widest px-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <Input 
                  value={formData.full_name}
                  onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                  placeholder="John Doe"
                  required
                  className="h-12 pl-12 bg-background/50 text-xs font-bold"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-muted uppercase tracking-widest px-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <Input 
                  value={formData.email}
                  disabled // Email change usually requires verification flow
                  className="h-12 pl-12 bg-background/20 text-xs font-bold opacity-70 cursor-not-allowed"
                />
              </div>
              <p className="text-[9px] text-muted font-medium px-1 flex items-center gap-1">
                <Shield className="w-3 h-3" /> Email cannot be changed here for security.
              </p>
            </div>
          </div>
        </Card>

        {message && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-2xl flex items-center gap-3 ${
              message.type === "success" ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
            }`}
          >
            <div className={`p-1 rounded-full ${message.type === "success" ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
               {message.type === "success" ? <Check className="w-4 h-4" /> : <Info className="w-4 h-4" />}
            </div>
            <p className="text-xs font-bold">{message.text}</p>
          </motion.div>
        )}

        <Button 
          type="submit" 
          disabled={isLoading}
          className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-xs"
        >
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Update Profile"}
        </Button>
      </form>

      {user?.role === "USER" && (
        <Card className="p-6 md:p-8 space-y-6 border-accent/20 bg-accent/5" hoverEffect={true}>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-accent text-white flex items-center justify-center">
              <Shield className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-black uppercase">Sell on Vendly</p>
              <p className="text-[10px] text-muted font-medium italic">Start your business on campus</p>
            </div>
            {user.approval_status === "PENDING" && (
              <div className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 text-[10px] font-bold uppercase">
                Pending Approval
              </div>
            )}
            {user.approval_status === "REJECTED" && (
              <div className="px-3 py-1 rounded-full bg-red-500/10 text-red-500 text-[10px] font-bold uppercase">
                Verification Rejected
              </div>
            )}
          </div>

          <div className="space-y-4">
            <p className="text-xs font-medium text-foreground/80 leading-relaxed">
              {user.approval_status === "PENDING" 
                ? "Your verification request is currently being reviewed by our team. You will be notified once it's approved."
                : user.approval_status === "REJECTED"
                ? "Your previous verification request was rejected. Please review our policies and try again with correct documents."
                : "Become a seller and reach thousands of students. You'll need to provide a student ID or business registration for verification."}
            </p>
            
            {(user.approval_status === null || user.approval_status === "REJECTED") && (
              <Link href="/seller-verification">
                <Button variant="secondary" className="w-full h-12 border-accent text-accent hover:bg-accent hover:text-white font-black uppercase text-[10px] tracking-widest">
                  Start Verification
                </Button>
              </Link>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
