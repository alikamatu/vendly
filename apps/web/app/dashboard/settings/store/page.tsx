"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, Store, Globe, Info, Camera, Loader2, Check, 
  MapPin, Truck, Clock, Share2, Instagram, Twitter, Facebook, ExternalLink
} from "lucide-react";
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
    location: user?.seller_profile?.location || "",
    delivery_policies: user?.seller_profile?.delivery_policies || "",
    business_hours: user?.seller_profile?.business_hours || "",
    whatsapp_number: user?.seller_profile?.whatsapp_number || "",
    social_links: user?.seller_profile?.social_links || { instagram: "", twitter: "", facebook: "" },
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

  const updateSocialLink = (platform: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      social_links: {
        ...prev.social_links,
        [platform]: value
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setIsLoading(true);
    setMessage(null);

    try {
      await storeApi.updateStore(token, formData, logoFile || undefined);
      await refreshUser();
      setMessage({ type: "success", text: "Store updated successfully!" });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to update store" });
    } finally {
      setIsLoading(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="max-w-2xl mx-auto pb-12 px-4 md:px-0">
      <Link 
        href="/dashboard/settings"
        className="inline-flex items-center gap-2 text-[10px] font-bold text-muted hover:text-foreground transition-colors group mb-6"
      >
        <ArrowLeft className="w-3 h-3 transition-transform group-hover:-translate-x-1" />
        BACK TO SETTINGS
      </Link>

      <div className="mb-8">
        <h1 className="text-md font-black tracking-tight uppercase">Store Optimization</h1>
        <p className="text-[10px] text-muted font-bold mt-1 uppercase tracking-wider">Refine your brand & logistics</p>
      </div>

      <AnimatePresence>
        {message && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`mb-6 p-4 rounded-2xl flex items-center gap-3 border ${
              message.type === "success" 
                ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-500" 
                : "bg-red-500/5 border-red-500/20 text-red-500"
            }`}
          >
            <div className={`p-1.5 rounded-xl ${message.type === "success" ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
               {message.type === "success" ? <Check className="w-3.5 h-3.5" /> : <Info className="w-3.5 h-3.5" />}
            </div>
            <p className="text-[11px] font-bold uppercase tracking-tight">{message.text}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Branding Section */}
        <Card className="p-6 md:p-8 space-y-8 overflow-visible" hoverEffect={false}>
          <div className="space-y-6">
            <div className="flex items-center gap-3 border-b border-border/50 pb-4">
              <div className="p-2 bg-primary/10 rounded-xl">
                <Store className="w-4 h-4 text-primary" />
              </div>
              <h3 className="text-xs font-black uppercase tracking-widest">Branding</h3>
            </div>

            <div className="flex flex-col items-center gap-6">
              <div className="relative group">
                <div className="w-24 h-24 rounded-[2.5rem] bg-surface border-2 border-dashed border-border flex items-center justify-center overflow-hidden relative transition-all group-hover:border-primary/50 group-hover:rotate-3 shadow-xl shadow-black/5">
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
                <p className="text-[10px] font-black uppercase tracking-widest">Store Identity</p>
                <p className="text-[9px] text-muted font-bold mt-1 tracking-wider italic">Optimized to SVG for maximum clarity</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-muted uppercase tracking-[0.2em] px-1">Shop Name</label>
                <Input 
                  value={formData.store_name}
                  onChange={(e) => setFormData({...formData, store_name: e.target.value})}
                  placeholder="The Premium Collective"
                  required
                  className="h-11 bg-background/50 text-[11px] font-bold rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-muted uppercase tracking-[0.2em] px-1">Unique Alias</label>
                <div className="relative">
                  <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-3 h-3 text-muted" />
                  <Input 
                    value={formData.store_link}
                    onChange={(e) => setFormData({...formData, store_link: e.target.value})}
                    placeholder="premium-shop"
                    required
                    className="h-11 pl-12 bg-background/50 text-[11px] font-bold rounded-xl"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black text-muted uppercase tracking-[0.2em] px-1">Brand Narrative</label>
              <Textarea 
                value={formData.bio}
                onChange={(e) => setFormData({...formData, bio: e.target.value})}
                placeholder="Briefly describe your store's mission..."
                className="min-h-[80px] bg-background/50 text-[11px] font-medium py-3 rounded-xl resize-none"
              />
            </div>
          </div>
        </Card>

        {/* Logistics Section */}
        <Card className="p-6 md:p-8 space-y-6" hoverEffect={false}>
          <div className="flex items-center gap-3 border-b border-border/50 pb-4">
            <div className="p-2 bg-emerald-500/10 rounded-xl">
              <Truck className="w-4 h-4 text-emerald-500" />
            </div>
            <h3 className="text-xs font-black uppercase tracking-widest">Logistics & Location</h3>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-muted uppercase tracking-[0.2em] px-1">Pickup / Physical Location</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-3 h-3 text-muted" />
                <Input 
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  placeholder="Ex: No. 24, Silicon Avenue, Lagos"
                  className="h-11 pl-12 bg-background/50 text-[11px] font-bold rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-muted uppercase tracking-[0.2em] px-1">Shipping Policies</label>
                <Textarea 
                  value={formData.delivery_policies}
                  onChange={(e) => setFormData({...formData, delivery_policies: e.target.value})}
                  placeholder="Ex: Same day delivery within Lagos, 3 days outside."
                  className="min-h-[80px] bg-background/50 text-[11px] font-medium py-3 rounded-xl resize-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-muted uppercase tracking-[0.2em] px-1">Service Hours</label>
                <Textarea 
                  value={formData.business_hours}
                  onChange={(e) => setFormData({...formData, business_hours: e.target.value})}
                  placeholder="Ex: Mon-Fri: 9am - 6pm"
                  className="min-h-[80px] bg-background/50 text-[11px] font-medium py-3 rounded-xl resize-none"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Social Proof */}
        <Card className="p-6 md:p-8 space-y-6" hoverEffect={false}>
          <div className="flex items-center gap-3 border-b border-border/50 pb-4">
            <div className="p-2 bg-blue-500/10 rounded-xl">
              <Share2 className="w-4 h-4 text-blue-500" />
            </div>
            <h3 className="text-xs font-black uppercase tracking-widest">Social Channels</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-muted uppercase tracking-[0.2em] px-1">WhatsApp Number</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[11px] font-bold text-muted">+</div>
                <Input 
                  value={formData.whatsapp_number}
                  onChange={(e) => setFormData({...formData, whatsapp_number: e.target.value})}
                  placeholder="2348000000000"
                  className="h-11 pl-8 bg-background/50 text-[11px] font-bold rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <Instagram className="absolute left-4 top-1/2 -translate-y-1/2 w-3 h-3 text-muted" />
                <Input 
                  value={(formData.social_links as any).instagram}
                  onChange={(e) => updateSocialLink('instagram', e.target.value)}
                  placeholder="Instagram Username"
                  className="h-11 pl-12 bg-background/50 text-[11px] font-bold rounded-xl"
                />
              </div>
              <div className="relative">
                <Twitter className="absolute left-4 top-1/2 -translate-y-1/2 w-3 h-3 text-muted" />
                <Input 
                  value={(formData.social_links as any).twitter}
                  onChange={(e) => updateSocialLink('twitter', e.target.value)}
                  placeholder="Twitter Handle"
                  className="h-11 pl-12 bg-background/50 text-[11px] font-bold rounded-xl"
                />
              </div>
            </div>
          </div>
        </Card>

        <div className="sticky bottom-6 pt-4 bg-gradient-to-t from-background via-background to-transparent pb-4">
          <Button 
            type="submit" 
            disabled={isLoading}
            className="w-full h-14 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl shadow-primary/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
              <span className="flex items-center gap-2">
                Deploy Changes
                <ExternalLink className="w-3 h-3" />
              </span>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
