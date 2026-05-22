"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, Store, Globe, Info, Camera, Loader2, Check, 
  MapPin, Truck, Clock, Share2, Instagram, Twitter, Facebook, ExternalLink,
  CreditCard, Sparkles
} from "lucide-react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import { useAuth } from "@/lib/contexts/auth-context";
import { storeApi } from "@/lib/api/store";
import { onboardingApi, LocationCity } from "@/lib/api/onboarding";
import { toast } from "sonner";

const PAYMENT_METHODS = [
  { id: 'mobile_money', label: 'Mobile Money', icon: '📱', description: 'MTN MoMo, Vodafone Cash, AirtelTigo Money' },
  { id: 'bank_transfer', label: 'Bank Transfer', icon: '🏦', description: 'Direct bank transfer' },
  { id: 'cash_on_delivery', label: 'Cash on Delivery', icon: '💵', description: 'Pay when you receive' },
];

const PAYMENT_TIMINGS = [
  { id: 'UPFRONT_ONLY', label: 'Upfront Only', icon: CreditCard, description: 'Customer pays before you ship' },
  { id: 'DELIVERY_ONLY', label: 'On Delivery Only', icon: Truck, description: 'Customer pays on receipt' },
  { id: 'BOTH', label: 'Both Options', icon: Sparkles, description: 'Let customers choose' },
];

const GHANA_BANKS = [
  { id: '1', name: 'GCB Bank', code: '040100' },
  { id: '2', name: 'Ecobank Ghana', code: '130100' },
  { id: '3', name: 'Fidelity Bank', code: '280100' },
  { id: '4', name: 'Stanbic Bank', code: '190100' },
  { id: '5', name: 'Zenith Bank', code: '120100' },
  { id: '6', name: 'CalBank', code: '140100' },
  { id: '7', name: 'Absa Bank', code: '030100' },
  { id: '8', name: 'GTBank', code: '110100' },
  { id: '9', name: 'Access Bank', code: '210100' },
  { id: '10', name: 'UBA Ghana', code: '080100' },
];

const MOMO_PROVIDERS = [
  { id: 'mtn', name: 'MTN Mobile Money', code: 'MTN' },
  { id: 'telecel', name: 'Telecel Cash', code: 'VOD' },
  { id: 'airteltigo', name: 'AirtelTigo Money', code: 'ATL' },
];

export default function StoreSettingsPage() {
  const { user, token, refreshUser } = useAuth();
  const seller = (user as any)?.seller_profile;
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  
  const [formData, setFormData] = useState({
    store_name: seller?.store_name || "",
    store_link: seller?.store_link || "",
    bio: seller?.bio || "",
    location: seller?.location || "",
    location_id: seller?.location_id ? Number(seller.location_id) : "",
    area: seller?.area || "",
    delivery_policies: seller?.delivery_policies || "",
    business_hours: seller?.business_hours || "",
    whatsapp_number: seller?.whatsapp_number || "",
    social_links: seller?.social_links || { instagram: "", twitter: "", facebook: "" },
    accepted_payment_methods: seller?.accepted_payment_methods || [],
    payment_timing: seller?.payment_timing || "",
    bank_name: seller?.bank_name || "",
    bank_code: seller?.bank_code || "",
    account_number: seller?.account_number || "",
  });

  const [regions, setRegions] = useState<string[]>([]);
  const [cities, setCities] = useState<LocationCity[]>([]);
  const [selectedRegion, setSelectedRegion] = useState("");
  const [loadingRegions, setLoadingRegions] = useState(true);
  const [loadingCities, setLoadingCities] = useState(false);

  useEffect(() => {
    onboardingApi.getRegions()
      .then(setRegions)
      .catch(() => toast.error('Failed to load regions'))
      .finally(() => setLoadingRegions(false));
  }, []);

  useEffect(() => {
    if (!selectedRegion) {
      setCities([]);
      return;
    }
    setLoadingCities(true);
    onboardingApi.getCitiesByRegion(selectedRegion)
      .then(setCities)
      .catch(() => toast.error('Failed to load cities'))
      .finally(() => setLoadingCities(false));
  }, [selectedRegion]);

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(seller?.logo_url || null);
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
        className="inline-flex items-center gap-2 text-[10px] font-normal text-muted hover:text-foreground transition-colors group mb-6"
      >
        <ArrowLeft className="w-3 h-3 transition-transform group-hover:-translate-x-1" />
        BACK TO SETTINGS
      </Link>

      <div className="mb-8">
        <h1 className="text-md font-medium tracking-tight uppercase">Store Optimization</h1>
        <p className="text-[10px] text-muted font-normal mt-1 uppercase tracking-wider">Refine your brand & logistics</p>
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
            <p className="text-[11px] font-normal uppercase tracking-tight">{message.text}</p>
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
              <h3 className="text-xs font-medium uppercase tracking-wider">Branding</h3>
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
                <p className="text-[10px] font-medium uppercase tracking-wider">Store Identity</p>
                <p className="text-[9px] text-muted font-normal mt-1 tracking-wider italic">Optimized to SVG for maximum clarity</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[9px] font-medium text-muted uppercase tracking-wider px-1">Shop Name</label>
                <Input 
                  value={formData.store_name}
                  onChange={(e) => setFormData({...formData, store_name: e.target.value})}
                  placeholder="The Premium Collective"
                  required
                  className="h-11 bg-background/50 text-[11px] font-normal rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-medium text-muted uppercase tracking-wider px-1">Unique Alias</label>
                <div className="relative">
                  <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-3 h-3 text-muted" />
                  <Input 
                    value={formData.store_link}
                    onChange={(e) => setFormData({...formData, store_link: e.target.value})}
                    placeholder="premium-shop"
                    required
                    className="h-11 pl-12 bg-background/50 text-[11px] font-normal rounded-xl"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-medium text-muted uppercase tracking-wider px-1">Brand Narrative</label>
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
            <h3 className="text-xs font-medium uppercase tracking-wider">Logistics & Location</h3>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[9px] font-medium text-muted uppercase tracking-wider px-1">Region</label>
                {loadingRegions ? (
                  <div className="h-11 flex items-center gap-2 px-4 bg-background/50 rounded-xl border border-border/10">
                    <Loader2 className="w-3 h-3 animate-spin text-muted" />
                    <span className="text-[10px] text-muted font-normal">Loading...</span>
                  </div>
                ) : (
                  <select
                    value={selectedRegion}
                    onChange={(e) => setSelectedRegion(e.target.value)}
                    className="w-full h-11 bg-background/50 border border-border/10 rounded-xl px-4 text-[11px] font-normal outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer"
                  >
                    <option value="">Select Region</option>
                    {regions.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-medium text-muted uppercase tracking-wider px-1">City / Town</label>
                {loadingCities ? (
                  <div className="h-11 flex items-center gap-2 px-4 bg-background/50 rounded-xl border border-border/10">
                    <Loader2 className="w-3 h-3 animate-spin text-muted" />
                    <span className="text-[10px] text-muted font-normal">Loading...</span>
                  </div>
                ) : (
                  <select
                    value={formData.location_id}
                    onChange={(e) => setFormData({...formData, location_id: Number(e.target.value)})}
                    disabled={!selectedRegion}
                    className="w-full h-11 bg-background/50 border border-border/10 rounded-xl px-4 text-[11px] font-normal outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer disabled:opacity-40"
                  >
                    <option value="">{selectedRegion ? 'Select City' : 'Select Region First'}</option>
                    {cities.map((c) => (
                      <option key={c.id} value={c.id}>{c.city}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-medium text-muted uppercase tracking-wider px-1">Area / Neighborhood</label>
              <Input 
                value={formData.area}
                onChange={(e) => setFormData({...formData, area: e.target.value})}
                placeholder="e.g. East Legon, Osu"
                className="h-11 bg-background/50 text-[11px] font-normal rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-medium text-muted uppercase tracking-wider px-1">Physical / Pickup Address <span className="opacity-40">(Legacy)</span></label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-3 h-3 text-muted" />
                <Input 
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  placeholder="Ex: No. 24, Silicon Avenue, Accra"
                  className="h-11 pl-12 bg-background/50 text-[11px] font-normal rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[9px] font-medium text-muted uppercase tracking-wider px-1">Shipping Policies</label>
                <Textarea 
                  value={formData.delivery_policies}
                  onChange={(e) => setFormData({...formData, delivery_policies: e.target.value})}
                  placeholder="Ex: Same day delivery within Lagos, 3 days outside."
                  className="min-h-[80px] bg-background/50 text-[11px] font-medium py-3 rounded-xl resize-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-medium text-muted uppercase tracking-wider px-1">Service Hours</label>
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

        {/* Payment Configuration */}
        <Card className="p-6 md:p-8 space-y-6" hoverEffect={false}>
          <div className="flex items-center gap-3 border-b border-border/50 pb-4">
            <div className="p-2 bg-amber-500/10 rounded-xl">
              <CreditCard className="w-4 h-4 text-amber-500" />
            </div>
            <h3 className="text-xs font-medium uppercase tracking-wider">Payment & Settlement</h3>
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-[9px] font-medium text-muted uppercase tracking-wider px-1">Accepted Methods</label>
              <div className="grid grid-cols-1 gap-3">
                {PAYMENT_METHODS.map((method) => {
                  const isSelected = formData.accepted_payment_methods.includes(method.id);
                  return (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => {
                        const methods = isSelected 
                          ? formData.accepted_payment_methods.filter((m: string) => m !== method.id)
                          : [...formData.accepted_payment_methods, method.id];
                        setFormData({...formData, accepted_payment_methods: methods});
                      }}
                      className={`flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all ${
                        isSelected ? "border-primary bg-primary/5" : "border-border/40 bg-background/50 hover:bg-background"
                      }`}
                    >
                      <span className="text-xl">{method.icon}</span>
                      <div className="flex-1">
                        <p className="text-[11px] font-normal">{method.label}</p>
                        <p className="text-[9px] text-muted font-medium">{method.description}</p>
                      </div>
                      <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center ${
                        isSelected ? "bg-primary border-primary" : "border-border"
                      }`}>
                        {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={4} />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[9px] font-medium text-muted uppercase tracking-wider px-1">Payout Destination</label>
              <div className="p-5 rounded-2xl bg-muted/20 border border-border/10 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-normal text-muted uppercase tracking-wider">Bank / Provider</label>
                    <select
                      value={formData.bank_code}
                      onChange={(e) => setFormData({
                        ...formData, 
                        bank_code: e.target.value,
                        bank_name: GHANA_BANKS.find(b => b.code === e.target.value)?.name || MOMO_PROVIDERS.find(p => p.code === e.target.value)?.name || ""
                      })}
                      className="w-full h-11 bg-background border border-border/10 rounded-xl px-4 text-[11px] font-normal outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer"
                    >
                      <option value="">Select Provider</option>
                      <optgroup label="Banks">
                        {GHANA_BANKS.map(b => <option key={b.id} value={b.code}>{b.name}</option>)}
                      </optgroup>
                      <optgroup label="Mobile Money">
                        {MOMO_PROVIDERS.map(p => <option key={p.id} value={p.code}>{p.name}</option>)}
                      </optgroup>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-normal text-muted uppercase tracking-wider">Account / Phone Number</label>
                    <Input 
                      value={formData.account_number}
                      onChange={(e) => setFormData({...formData, account_number: e.target.value})}
                      placeholder="Enter details"
                      className="h-11 bg-background text-[11px] font-normal rounded-xl"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[9px] font-medium text-muted uppercase tracking-wider px-1">Payment Timing</label>
              <div className="grid grid-cols-1 gap-3">
                {PAYMENT_TIMINGS.map((timing) => {
                  const isSelected = formData.payment_timing === timing.id;
                  const Icon = timing.icon;
                  return (
                    <button
                      key={timing.id}
                      type="button"
                      onClick={() => setFormData({...formData, payment_timing: timing.id})}
                      className={`flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all ${
                        isSelected ? "border-primary bg-primary/5" : "border-border/40 bg-background/50 hover:bg-background"
                      }`}
                    >
                      <div className={`p-2 rounded-xl ${isSelected ? "bg-primary/20 text-primary" : "bg-muted text-muted"}`}>
                        <Icon size={16} />
                      </div>
                      <div className="flex-1">
                        <p className="text-[11px] font-normal">{timing.label}</p>
                        <p className="text-[9px] text-muted font-medium">{timing.description}</p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        isSelected ? "border-primary" : "border-border"
                      }`}>
                        {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                      </div>
                    </button>
                  );
                })}
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
            <h3 className="text-xs font-medium uppercase tracking-wider">Social Channels</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[9px] font-medium text-muted uppercase tracking-wider px-1">WhatsApp Number</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[11px] font-normal text-muted">+</div>
                <Input 
                  value={formData.whatsapp_number}
                  onChange={(e) => setFormData({...formData, whatsapp_number: e.target.value})}
                  placeholder="2348000000000"
                  className="h-11 pl-8 bg-background/50 text-[11px] font-normal rounded-xl"
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
                  className="h-11 pl-12 bg-background/50 text-[11px] font-normal rounded-xl"
                />
              </div>
              <div className="relative">
                <Twitter className="absolute left-4 top-1/2 -translate-y-1/2 w-3 h-3 text-muted" />
                <Input 
                  value={(formData.social_links as any).twitter}
                  onChange={(e) => updateSocialLink('twitter', e.target.value)}
                  placeholder="Twitter Handle"
                  className="h-11 pl-12 bg-background/50 text-[11px] font-normal rounded-xl"
                />
              </div>
            </div>
          </div>
        </Card>

        <div className="sticky bottom-6 pt-4 bg-gradient-to-t from-background via-background to-transparent pb-4">
          <Button 
            type="submit" 
            disabled={isLoading}
            className="w-full h-14 rounded-2xl font-medium uppercase tracking-wider text-[10px] shadow-2xl shadow-primary/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
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
