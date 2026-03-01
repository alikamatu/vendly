"use client";

import React, { useState, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Store, Globe, Info, Camera, Loader2, Check } from "lucide-react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import { useAuth } from "@/lib/auth-context";
import { storeApi } from "@/lib/api/store";

export default function StoreSettingsPage() {
  const { user, token, refreshUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  
  const [formData, setFormData] = useState({
    store_name: user?.seller_profile?.store_name || "",
    store_link: user?.seller_profile?.store_link || "",
    bio: user?.seller_profile?.bio || "",
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(user?.seller_profile?.logo_url || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setLogoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setIsLoading(true);
    setMessage(null);

    try {
      await storeApi.updateStore(token, formData, logoFile || undefined);
      await refreshUser();
      setMessage({ type: "success", text: "Store information updated successfully!" });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to update store" });
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
        <h2 className="text-md font-black tracking-tight uppercase">Store Information</h2>
        <p className="text-xs text-muted font-medium mt-1">Update your shop's branding and public details</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="p-6 md:p-8 space-y-8" hoverEffect={false}>
          {/* Logo Upload */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative group">
              <div className="w-24 h-24 rounded-[2rem] bg-surface border-2 border-dashed border-border flex items-center justify-center overflow-hidden relative transition-all group-hover:border-primary/50">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <Store className="w-8 h-8 text-muted" />
                )}
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity"
                >
                  <Camera className="w-6 h-6 text-white" />
                </div>
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept="image/*"
              />
            </div>
            <div className="text-center">
              <p className="text-xs font-bold">Store Logo</p>
              <p className="text-[10px] text-muted mt-1">PNG, JPG up to 5MB</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-muted uppercase tracking-widest px-1">Store Name</label>
              <Input 
                value={formData.store_name}
                onChange={(e) => setFormData({...formData, store_name: e.target.value})}
                placeholder="Ex: Gadget Haven"
                required
                className="h-12 bg-background/50 text-xs font-bold"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-muted uppercase tracking-widest px-1">Store Link (Unique handle)</label>
              <div className="relative">
                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <Input 
                  value={formData.store_link}
                  onChange={(e) => setFormData({...formData, store_link: e.target.value})}
                  placeholder="gadget-haven"
                  required
                  className="h-12 pl-12 bg-background/50 text-xs font-bold"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-muted uppercase tracking-widest px-1">Bio / Short Description</label>
              <Textarea 
                value={formData.bio}
                onChange={(e) => setFormData({...formData, bio: e.target.value})}
                placeholder="Tell customers about your store..."
                className="min-h-[100px] bg-background/50 text-xs font-medium py-4"
              />
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
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save Changes"}
        </Button>
      </form>
    </div>
  );
}
