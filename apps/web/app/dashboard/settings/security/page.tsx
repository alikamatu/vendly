"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ShieldCheck, Key, Smartphone, Eye, EyeOff, Loader2, Check, Info } from "lucide-react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useAuth } from "@/lib/contexts/auth-context";
import { authApi } from "@/lib/api/auth";

export default function SecuritySettingsPage() {
  const { token } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [passwordData, setPasswordData] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (passwordData.new_password !== passwordData.confirm_password) {
      setMessage({ type: "error", text: "New passwords do not match" });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      await authApi.updateProfile(token, {
        current_password: passwordData.current_password,
        new_password: passwordData.new_password
      });
      setPasswordData({ current_password: "", new_password: "", confirm_password: "" });
      setMessage({ type: "success", text: "Password updated successfully!" });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to update password" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link 
        href="/dashboard/settings"
        className="inline-flex items-center gap-2 text-xs font-normal text-muted hover:text-foreground transition-colors group mb-2"
      >
        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
        Back to Settings
      </Link>

      <div className="px-2">
        <h2 className="text-md font-medium tracking-tight uppercase">Security & Privacy</h2>
        <p className="text-xs text-muted font-medium mt-1">Protect your account and manage authentication</p>
      </div>

      <div className="space-y-8 pb-10">
        {/* Password Change Form */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 px-2">
             <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Key className="w-4 h-4" />
             </div>
             <h3 className="text-sm font-medium uppercase">Change Password</h3>
          </div>

          <form onSubmit={handlePasswordSubmit}>
            <Card className="p-6 md:p-8 space-y-4 border-none shadow-sm" hoverEffect={false}>
              <div className="space-y-2">
                <label className="text-[10px] font-normal text-muted uppercase tracking-wider px-1">Current Password</label>
                <div className="relative">
                  <Input 
                    type={showCurrent ? "text" : "password"}
                    value={passwordData.current_password}
                    onChange={(e) => setPasswordData({...passwordData, current_password: e.target.value})}
                    placeholder="••••••••"
                    required
                    className="h-12 bg-background/50 text-xs font-normal pr-12"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"
                  >
                    {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-normal text-muted uppercase tracking-wider px-1">New Password</label>
                  <div className="relative">
                    <Input 
                      type={showNew ? "text" : "password"}
                      value={passwordData.new_password}
                      onChange={(e) => setPasswordData({...passwordData, new_password: e.target.value})}
                      placeholder="••••••••"
                      required
                      className="h-12 bg-background/50 text-xs font-normal"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-normal text-muted uppercase tracking-wider px-1">Confirm New Password</label>
                  <Input 
                    type="password"
                    value={passwordData.confirm_password}
                    onChange={(e) => setPasswordData({...passwordData, confirm_password: e.target.value})}
                    placeholder="••••••••"
                    required
                    className="h-12 bg-background/50 text-xs font-normal"
                  />
                </div>
              </div>

              {message && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`p-4 rounded-xl flex items-center gap-3 ${
                    message.type === "success" ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                  }`}
                >
                  <p className="text-[10px] font-normal">{message.text}</p>
                </motion.div>
              )}

              <Button 
                type="submit" 
                disabled={isLoading}
                className="w-full h-12 rounded-xl mt-4 text-[10px] font-medium uppercase tracking-wider"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update Password"}
              </Button>
            </Card>
          </form>
        </section>

        {/* 2FA Mock Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 px-2">
             <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500">
                <Smartphone className="w-4 h-4" />
             </div>
             <h3 className="text-sm font-medium uppercase">Two-Factor Auth</h3>
          </div>

          <Card className="p-6 md:p-8 flex items-center justify-between border-none shadow-sm" hoverEffect={false}>
             <div className="space-y-1">
                <p className="text-xs font-normal">Authenticator App</p>
                <p className="text-[10px] text-muted font-medium">Add an extra layer of security to your account.</p>
             </div>
             <div className="opacity-40 grayscale">
                <div className="w-10 h-6 bg-border/50 rounded-full relative cursor-not-allowed">
                  <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                </div>
             </div>
          </Card>
        </section>
      </div>
    </div>
  );
}
