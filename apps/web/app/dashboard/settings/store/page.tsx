'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Store,
  Globe,
  Info,
  Camera,
  Check,
  MapPin,
  Truck,
  Clock,
  Share2,
  Instagram,
  Twitter,
  ExternalLink,
  CreditCard,
  Sparkles,
  Package,
  Zap,
  Smartphone,
  Landmark,
  Banknote,
  MessageCircle,
  Youtube,
} from 'lucide-react';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Spinner from '@/components/ui/Spinner';
import Select from '@/components/ui/Select';
import { useAuth } from '@/lib/contexts/auth-context';
import { storeApi } from '@/lib/api/store';
import { onboardingApi, LocationCity } from '@/lib/api/onboarding';
import { toast } from 'sonner';

/* ─── iOS-style toggle ──────────────────────────────────────────────── */
function IOSToggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={() => onChange(!enabled)}
      className="relative inline-flex h-[26px] w-[46px] flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none"
      style={{ backgroundColor: enabled ? 'var(--color-accent)' : 'var(--color-border)' }}
    >
      <motion.span
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="pointer-events-none inline-block h-[22px] w-[22px] rounded-full shadow-lg"
        style={{
          backgroundColor: 'var(--color-background)',
          x: enabled ? 20 : 0,
        }}
        animate={{ x: enabled ? 20 : 0 }}
      />
    </button>
  );
}

/* ─── Constants ──────────────────────────────────────────────────────── */
const PAYMENT_METHODS = [
  {
    id: 'mobile_money',
    label: 'Mobile Money',
    icon: Smartphone,
    description: 'MTN MoMo, Vodafone Cash, AirtelTigo Money',
  },
  {
    id: 'bank_transfer',
    label: 'Bank Transfer',
    icon: Landmark,
    description: 'Direct bank transfer',
  },
  {
    id: 'cash_on_delivery',
    label: 'Cash on Delivery',
    icon: Banknote,
    description: 'Pay when you receive',
  },
];

const PAYMENT_TIMINGS = [
  {
    id: 'UPFRONT_ONLY',
    label: 'Upfront Only',
    icon: CreditCard,
    description: 'Customer pays before you ship',
  },
  {
    id: 'DELIVERY_ONLY',
    label: 'On Delivery Only',
    icon: Truck,
    description: 'Customer pays on receipt',
  },
  { id: 'BOTH', label: 'Both Options', icon: Sparkles, description: 'Let customers choose' },
];

const SERVICE_AREAS = [
  {
    id: 'SAME_CITY',
    label: 'Same City',
    icon: MapPin,
    description: 'Deliver only within your city',
  },
  {
    id: 'NEARBY_STATES',
    label: 'Nearby Regions',
    icon: Package,
    description: 'Deliver to neighbouring regions',
  },
  {
    id: 'NATIONWIDE',
    label: 'Nationwide',
    icon: Globe,
    description: 'Ship anywhere in the country',
  },
];

const DELIVERY_TIMES = [
  { id: 'SAME_DAY', label: 'Same Day', icon: Zap },
  { id: 'NEXT_DAY', label: 'Next Day', icon: Clock },
  { id: 'TWO_TO_THREE_DAYS', label: '2–3 Days', icon: Truck },
  { id: 'FOUR_TO_SEVEN_DAYS', label: '4–7 Days', icon: Package },
  { id: 'MORE_THAN_ONE_WEEK', label: '1 Week+', icon: Globe },
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

/* ─── Page ───────────────────────────────────────────────────────────── */
export default function StoreSettingsPage() {
  const { user, token, refreshUser } = useAuth();
  const seller = user?.seller_profile;
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [formData, setFormData] = useState({
    store_name: seller?.store_name || '',
    store_link: seller?.store_link || '',
    bio: seller?.bio || '',
    location: seller?.location || '',
    location_id: seller?.location_id ? seller.location_id : '',
    area: seller?.area || '',
    delivery_policies: seller?.delivery_policies || '',
    business_hours: seller?.business_hours || '',
    whatsapp_number: seller?.whatsapp_number || '',
    social_links: seller?.social_links || { instagram: '', twitter: '', facebook: '', tiktok: '', youtube: '', website: '' },
    accepted_payment_methods: seller?.accepted_payment_methods || [],
    payment_timing: seller?.payment_timing || '',
    service_area: seller?.service_area || '',
    avg_delivery_time: seller?.avg_delivery_time || '',
    bank_name: seller?.bank_name || '',
    bank_code: seller?.bank_code || '',
    account_number: seller?.account_number || '',
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(seller?.logo_url || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [regions, setRegions] = useState<string[]>([]);
  const [cities, setCities] = useState<LocationCity[]>([]);
  const [selectedRegion, setSelectedRegion] = useState(seller?.structured_location?.region || '');
  const [loadingRegions, setLoadingRegions] = useState(true);
  const [loadingCities, setLoadingCities] = useState(false);

  // Sync form when seller_profile data loads asynchronously
  useEffect(() => {
    if (!seller) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFormData({
      store_name: seller.store_name || '',
      store_link: seller.store_link || '',
      bio: seller.bio || '',
      location: seller.location || '',
      location_id: seller.location_id ? seller.location_id : '',
      area: seller.area || '',
      delivery_policies: seller.delivery_policies || '',
      business_hours: seller.business_hours || '',
      whatsapp_number: seller.whatsapp_number || '',
      social_links: seller.social_links || { instagram: '', twitter: '', facebook: '', tiktok: '', youtube: '', website: '' },
      accepted_payment_methods: seller.accepted_payment_methods || [],
      payment_timing: seller.payment_timing || '',
      service_area: seller.service_area || '',
      avg_delivery_time: seller.avg_delivery_time || '',
      bank_name: seller.bank_name || '',
      bank_code: seller.bank_code || '',
      account_number: seller.account_number || '',
    });
    if (seller.structured_location?.region) {
      setSelectedRegion(seller.structured_location.region);
    }
    if (seller.logo_url) {
      setLogoPreview(seller.logo_url);
    }
  }, [seller]);

  useEffect(() => {
    onboardingApi
      .getRegions()
      .then(setRegions)
      .catch(() => toast.error('Failed to load regions'))
      .finally(() => setLoadingRegions(false));
  }, []);

  useEffect(() => {
    if (!selectedRegion) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCities([]);
      return;
    }
    setLoadingCities(true);
    onboardingApi
      .getCitiesByRegion(selectedRegion)
      .then(setCities)
      .catch(() => toast.error('Failed to load cities'))
      .finally(() => setLoadingCities(false));
  }, [selectedRegion]);

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
    setFormData((prev) => ({
      ...prev,
      social_links: {
        ...prev.social_links,
        [platform]: value,
      },
    }));
  };

  const togglePaymentMethod = (methodId: string) => {
    setFormData((prev) => {
      const methods = prev.accepted_payment_methods.includes(methodId)
        ? prev.accepted_payment_methods.filter((m: string) => m !== methodId)
        : [...prev.accepted_payment_methods, methodId];
      return { ...prev, accepted_payment_methods: methods };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setIsLoading(true);
    setMessage(null);

    try {
      await storeApi.updateStore(token, formData, logoFile || undefined);
      await refreshUser();
      setMessage({ type: 'success', text: 'Store updated successfully!' });
      toast.success('Store settings saved');
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update store' });
      toast.error(err.message || 'Failed to update store');
    } finally {
      setIsLoading(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  /* ─── Shared styles ─────────────────────────────────────────────── */
  const sectionHeaderCls = 'flex items-center gap-3 border-b pb-4 mb-6';
  const labelCls = 'text-[9px] font-medium uppercase tracking-wider px-1';
  const selectCls =
    'w-full h-11 border rounded-xl px-4 text-[11px] font-normal outline-none appearance-none cursor-pointer transition-colors duration-200';

  return (
    <div className="mx-auto max-w-2xl px-4 pb-12 md:px-0">
      <Link
        href="/dashboard/settings"
        className="group mb-6 inline-flex items-center gap-2 text-[10px] font-normal transition-colors"
        style={{ color: 'var(--color-muted)' }}
      >
        <ArrowLeft className="h-3 w-3 transition-transform group-hover:-translate-x-1" />
        BACK TO SETTINGS
      </Link>

      <div className="mb-8">
        <h1
          className="text-md font-medium uppercase tracking-tight"
          style={{ color: 'var(--color-foreground)' }}
        >
          Store Optimization
        </h1>
        <p
          className="mt-1 text-[10px] font-normal uppercase tracking-wider"
          style={{ color: 'var(--color-muted)' }}
        >
          Refine your brand &amp; logistics
        </p>
      </div>

      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="mb-6 flex items-center gap-3 rounded-2xl border p-4"
            style={{
              backgroundColor:
                message.type === 'success'
                  ? 'color-mix(in srgb, var(--color-accent) 5%, transparent)'
                  : 'color-mix(in srgb, #ef4444 5%, transparent)',
              borderColor:
                message.type === 'success'
                  ? 'color-mix(in srgb, var(--color-accent) 20%, transparent)'
                  : 'color-mix(in srgb, #ef4444 20%, transparent)',
              color: message.type === 'success' ? 'var(--color-accent)' : '#ef4444',
            }}
          >
            <div
              className="rounded-xl p-1.5"
              style={{
                backgroundColor:
                  message.type === 'success'
                    ? 'color-mix(in srgb, var(--color-accent) 10%, transparent)'
                    : 'color-mix(in srgb, #ef4444 10%, transparent)',
              }}
            >
              {message.type === 'success' ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Info className="h-3.5 w-3.5" />
              )}
            </div>
            <p className="text-[11px] font-normal uppercase tracking-tight">{message.text}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ────────────────── Branding ────────────────── */}
        <Card className="space-y-8 overflow-visible p-6 md:p-8" hoverEffect={false}>
          <div className="space-y-6">
            <div
              className={sectionHeaderCls}
              style={{ borderColor: 'color-mix(in srgb, var(--color-border) 50%, transparent)' }}
            >
              <div
                className="rounded-xl p-2"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--color-accent) 10%, transparent)',
                }}
              >
                <Store className="h-4 w-4" style={{ color: 'var(--color-accent)' }} />
              </div>
              <h3
                className="text-xs font-medium uppercase tracking-wider"
                style={{ color: 'var(--color-foreground)' }}
              >
                Branding
              </h3>
            </div>

            <div className="flex flex-col items-center gap-6">
              <div className="group relative">
                <div
                  className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-[2.5rem] border-2 border-dashed shadow-xl transition-all duration-300 group-hover:rotate-3"
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    borderColor: 'var(--color-border)',
                    boxShadow:
                      '0 4px 20px color-mix(in srgb, var(--color-foreground) 5%, transparent)',
                  }}
                >
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo" className="h-full w-full object-cover" />
                  ) : (
                    <Store className="h-8 w-8" style={{ color: 'var(--color-muted)' }} />
                  )}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/40 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                  >
                    <Camera className="h-6 w-6 text-white" />
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
                <p
                  className="text-[10px] font-medium uppercase tracking-wider"
                  style={{ color: 'var(--color-foreground)' }}
                >
                  Store Identity
                </p>
                <p
                  className="mt-1 text-[9px] font-normal italic tracking-wider"
                  style={{ color: 'var(--color-muted)' }}
                >
                  High-quality images recommended
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className={labelCls} style={{ color: 'var(--color-muted)' }}>
                  Shop Name
                </label>
                <Input
                  value={formData.store_name}
                  onChange={(e) => setFormData({ ...formData, store_name: e.target.value })}
                  placeholder="The Premium Collective"
                  required
                  className="h-11 rounded-xl text-[11px] font-normal"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--color-background) 50%, transparent)',
                  }}
                />
              </div>
              <div className="space-y-2">
                <label className={labelCls} style={{ color: 'var(--color-muted)' }}>
                  Unique Alias
                </label>
                <div className="relative">
                  <Globe
                    className="absolute left-4 top-1/2 h-3 w-3 -translate-y-1/2"
                    style={{ color: 'var(--color-muted)' }}
                  />
                  <Input
                    value={formData.store_link}
                    onChange={(e) => setFormData({ ...formData, store_link: e.target.value })}
                    placeholder="premium-shop"
                    required
                    className="h-11 rounded-xl pl-12 text-[11px] font-normal"
                    style={{
                      backgroundColor:
                        'color-mix(in srgb, var(--color-background) 50%, transparent)',
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className={labelCls} style={{ color: 'var(--color-muted)' }}>
                Brand Narrative
              </label>
              <Textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Briefly describe your store's mission..."
                className="min-h-[80px] resize-none rounded-xl py-3 text-[11px] font-medium"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--color-background) 50%, transparent)',
                }}
              />
            </div>
          </div>
        </Card>

        {/* ────────────────── Logistics & Location ────────────────── */}
        <Card className="space-y-6 p-6 md:p-8" hoverEffect={false}>
          <div
            className={sectionHeaderCls}
            style={{ borderColor: 'color-mix(in srgb, var(--color-border) 50%, transparent)' }}
          >
            <div
              className="rounded-xl p-2"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--color-accent) 10%, transparent)',
              }}
            >
              <Truck className="h-4 w-4" style={{ color: 'var(--color-accent)' }} />
            </div>
            <h3
              className="text-xs font-medium uppercase tracking-wider"
              style={{ color: 'var(--color-foreground)' }}
            >
              Logistics &amp; Location
            </h3>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className={labelCls} style={{ color: 'var(--color-muted)' }}>
                  Region
                </label>
                {loadingRegions ? (
                  <div
                    className="flex h-11 items-center gap-2 rounded-xl border px-4"
                    style={{
                      backgroundColor:
                        'color-mix(in srgb, var(--color-background) 50%, transparent)',
                      borderColor: 'color-mix(in srgb, var(--color-border) 10%, transparent)',
                    }}
                  >
                    <Spinner size="xs" />
                    <span
                      className="text-[10px] font-normal"
                      style={{ color: 'var(--color-muted)' }}
                    >
                      Loading…
                    </span>
                  </div>
                ) : (
                  <Select
                    value={selectedRegion}
                    onChange={(val) => setSelectedRegion(val)}
                    options={[
                      { value: '', label: 'Select Region' },
                      ...regions.map((r) => ({ value: r, label: r })),
                    ]}
                    size="sm"
                  />
                )}
              </div>

              <div className="space-y-2">
                <label className={labelCls} style={{ color: 'var(--color-muted)' }}>
                  City / Town
                </label>
                {loadingCities ? (
                  <div
                    className="flex h-11 items-center gap-2 rounded-xl border px-4"
                    style={{
                      backgroundColor:
                        'color-mix(in srgb, var(--color-background) 50%, transparent)',
                      borderColor: 'color-mix(in srgb, var(--color-border) 10%, transparent)',
                    }}
                  >
                    <Spinner size="xs" />
                    <span
                      className="text-[10px] font-normal"
                      style={{ color: 'var(--color-muted)' }}
                    >
                      Loading…
                    </span>
                  </div>
                ) : (
                  <Select
                    value={formData.location_id}
                    onChange={(val) => setFormData({ ...formData, location_id: val })}
                    options={[
                      {
                        value: '',
                        label: selectedRegion ? 'Select City' : 'Select Region First',
                      },
                      ...cities.map((c) => ({ value: c.id, label: c.city })),
                    ]}
                    disabled={!selectedRegion}
                    size="sm"
                  />
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className={labelCls} style={{ color: 'var(--color-muted)' }}>
                Area / Neighborhood
              </label>
              <Input
                value={formData.area}
                onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                placeholder="e.g. East Legon, Osu"
                className="h-11 rounded-xl text-[11px] font-normal"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--color-background) 50%, transparent)',
                }}
              />
            </div>

            <div className="space-y-2">
              <label className={labelCls} style={{ color: 'var(--color-muted)' }}>
                Physical / Pickup Address
              </label>
              <div className="relative">
                <MapPin
                  className="absolute left-4 top-1/2 h-3 w-3 -translate-y-1/2"
                  style={{ color: 'var(--color-muted)' }}
                />
                <Input
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Ex: No. 24, Silicon Avenue, Accra"
                  className="h-11 rounded-xl pl-12 text-[11px] font-normal"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--color-background) 50%, transparent)',
                  }}
                />
              </div>
            </div>

            {/* Service Area */}
            <div className="space-y-3">
              <label className={labelCls} style={{ color: 'var(--color-muted)' }}>
                Service Area
              </label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {SERVICE_AREAS.map((sa) => {
                  const isSelected = formData.service_area === sa.id;
                  const Icon = sa.icon;
                  return (
                    <button
                      key={sa.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, service_area: sa.id })}
                      className="flex flex-col items-center gap-2 rounded-2xl border-2 p-4 text-center transition-all duration-200"
                      style={{
                        borderColor: isSelected
                          ? 'var(--color-accent)'
                          : 'color-mix(in srgb, var(--color-border) 40%, transparent)',
                        backgroundColor: isSelected
                          ? 'color-mix(in srgb, var(--color-accent) 5%, transparent)'
                          : 'color-mix(in srgb, var(--color-background) 50%, transparent)',
                      }}
                    >
                      <div
                        className="rounded-xl p-2 transition-colors duration-200"
                        style={{
                          backgroundColor: isSelected
                            ? 'color-mix(in srgb, var(--color-accent) 15%, transparent)'
                            : 'color-mix(in srgb, var(--color-muted) 10%, transparent)',
                          color: isSelected ? 'var(--color-accent)' : 'var(--color-muted)',
                        }}
                      >
                        <Icon size={16} />
                      </div>
                      <p
                        className="text-[11px] font-normal"
                        style={{ color: 'var(--color-foreground)' }}
                      >
                        {sa.label}
                      </p>
                      <p
                        className="text-[9px] font-medium leading-tight"
                        style={{ color: 'var(--color-muted)' }}
                      >
                        {sa.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Average Delivery Time */}
            <div className="space-y-3">
              <label className={labelCls} style={{ color: 'var(--color-muted)' }}>
                Average Delivery Time
              </label>
              <div className="flex flex-wrap gap-2">
                {DELIVERY_TIMES.map((dt) => {
                  const isSelected = formData.avg_delivery_time === dt.id;
                  const Icon = dt.icon;
                  return (
                    <button
                      key={dt.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, avg_delivery_time: dt.id })}
                      className="inline-flex items-center gap-2 rounded-xl border-2 px-4 py-2.5 text-left transition-all duration-200"
                      style={{
                        borderColor: isSelected
                          ? 'var(--color-accent)'
                          : 'color-mix(in srgb, var(--color-border) 40%, transparent)',
                        backgroundColor: isSelected
                          ? 'color-mix(in srgb, var(--color-accent) 5%, transparent)'
                          : 'color-mix(in srgb, var(--color-background) 50%, transparent)',
                      }}
                    >
                      <Icon
                        size={14}
                        style={{ color: isSelected ? 'var(--color-accent)' : 'var(--color-muted)' }}
                      />
                      <span
                        className="text-[11px] font-normal"
                        style={{ color: 'var(--color-foreground)' }}
                      >
                        {dt.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className={labelCls} style={{ color: 'var(--color-muted)' }}>
                  Shipping Policies
                </label>
                <Textarea
                  value={formData.delivery_policies}
                  onChange={(e) => setFormData({ ...formData, delivery_policies: e.target.value })}
                  placeholder="Ex: Same day delivery within Accra, 3 days outside."
                  className="min-h-[80px] resize-none rounded-xl py-3 text-[11px] font-medium"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--color-background) 50%, transparent)',
                  }}
                />
              </div>
              <div className="space-y-2">
                <label className={labelCls} style={{ color: 'var(--color-muted)' }}>
                  Service Hours
                </label>
                <Textarea
                  value={formData.business_hours}
                  onChange={(e) => setFormData({ ...formData, business_hours: e.target.value })}
                  placeholder="Ex: Mon-Fri: 9am - 6pm"
                  className="min-h-[80px] resize-none rounded-xl py-3 text-[11px] font-medium"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--color-background) 50%, transparent)',
                  }}
                />
              </div>
            </div>
          </div>
        </Card>

        {/* ────────────────── Payment & Settlement ────────────────── */}
        <Card className="space-y-6 p-6 md:p-8" hoverEffect={false}>
          <div
            className={sectionHeaderCls}
            style={{ borderColor: 'color-mix(in srgb, var(--color-border) 50%, transparent)' }}
          >
            <div
              className="rounded-xl p-2"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--color-accent) 10%, transparent)',
              }}
            >
              <CreditCard className="h-4 w-4" style={{ color: 'var(--color-accent)' }} />
            </div>
            <h3
              className="text-xs font-medium uppercase tracking-wider"
              style={{ color: 'var(--color-foreground)' }}
            >
              Payment &amp; Settlement
            </h3>
          </div>

          <div className="space-y-6">
            {/* Accepted Methods — iOS Toggle List */}
            <div className="space-y-3">
              <label className={labelCls} style={{ color: 'var(--color-muted)' }}>
                Accepted Methods
              </label>
              <div
                className="divide-y overflow-hidden rounded-2xl border"
                style={{
                  borderColor: 'color-mix(in srgb, var(--color-border) 30%, transparent)',
                  backgroundColor: 'color-mix(in srgb, var(--color-background) 50%, transparent)',
                }}
              >
                {PAYMENT_METHODS.map((method) => {
                  const isSelected = formData.accepted_payment_methods.includes(method.id);
                  const Icon = method.icon;
                  return (
                    <div
                      key={method.id}
                      className="flex items-center gap-4 p-4 transition-colors duration-200"
                      style={{
                        borderColor: 'color-mix(in srgb, var(--color-border) 20%, transparent)',
                      }}
                    >
                      <div
                        className="rounded-xl p-2 transition-colors duration-200"
                        style={{
                          backgroundColor: isSelected
                            ? 'color-mix(in srgb, var(--color-accent) 10%, transparent)'
                            : 'color-mix(in srgb, var(--color-muted) 8%, transparent)',
                          color: isSelected ? 'var(--color-accent)' : 'var(--color-muted)',
                        }}
                      >
                        <Icon size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p
                          className="text-[11px] font-normal"
                          style={{ color: 'var(--color-foreground)' }}
                        >
                          {method.label}
                        </p>
                        <p
                          className="text-[9px] font-medium"
                          style={{ color: 'var(--color-muted)' }}
                        >
                          {method.description}
                        </p>
                      </div>
                      <IOSToggle
                        enabled={isSelected}
                        onChange={() => togglePaymentMethod(method.id)}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Payout Destination */}
            <div className="space-y-3">
              <label className={labelCls} style={{ color: 'var(--color-muted)' }}>
                Payout Destination
              </label>
              <div
                className="space-y-4 rounded-2xl border p-5"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--color-surface) 60%, transparent)',
                  borderColor: 'color-mix(in srgb, var(--color-border) 10%, transparent)',
                }}
              >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label
                      className="text-[9px] font-normal uppercase tracking-wider"
                      style={{ color: 'var(--color-muted)' }}
                    >
                      Bank / Provider
                    </label>
                    <Select
                      value={formData.bank_code}
                      onChange={(val) =>
                        setFormData({
                          ...formData,
                          bank_code: val,
                          bank_name:
                            GHANA_BANKS.find((b) => b.code === val)?.name ||
                            MOMO_PROVIDERS.find((p) => p.code === val)?.name ||
                            '',
                        })
                      }
                      options={[
                        { value: '', label: 'Select Provider' },
                        ...GHANA_BANKS.map((b) => ({ value: b.code, label: b.name, badge: 'Bank' })),
                        ...MOMO_PROVIDERS.map((p) => ({ value: p.code, label: p.name, badge: 'MoMo' })),
                      ]}
                      size="sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label
                      className="text-[9px] font-normal uppercase tracking-wider"
                      style={{ color: 'var(--color-muted)' }}
                    >
                      Account / Phone Number
                    </label>
                    <Input
                      value={formData.account_number}
                      onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                      placeholder="Enter details"
                      className="h-11 rounded-xl text-[11px] font-normal"
                      style={{ backgroundColor: 'var(--color-background)' }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Timing — radio-style cards */}
            <div className="space-y-3">
              <label className={labelCls} style={{ color: 'var(--color-muted)' }}>
                Payment Timing
              </label>
              <div
                className="divide-y overflow-hidden rounded-2xl border"
                style={{
                  borderColor: 'color-mix(in srgb, var(--color-border) 30%, transparent)',
                  backgroundColor: 'color-mix(in srgb, var(--color-background) 50%, transparent)',
                }}
              >
                {PAYMENT_TIMINGS.map((timing) => {
                  const isSelected = formData.payment_timing === timing.id;
                  const Icon = timing.icon;
                  return (
                    <button
                      key={timing.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, payment_timing: timing.id })}
                      className="flex w-full items-center gap-4 p-4 text-left transition-colors duration-200"
                      style={{
                        borderColor: 'color-mix(in srgb, var(--color-border) 20%, transparent)',
                        backgroundColor: isSelected
                          ? 'color-mix(in srgb, var(--color-accent) 4%, transparent)'
                          : 'transparent',
                      }}
                    >
                      <div
                        className="rounded-xl p-2 transition-colors duration-200"
                        style={{
                          backgroundColor: isSelected
                            ? 'color-mix(in srgb, var(--color-accent) 15%, transparent)'
                            : 'color-mix(in srgb, var(--color-muted) 8%, transparent)',
                          color: isSelected ? 'var(--color-accent)' : 'var(--color-muted)',
                        }}
                      >
                        <Icon size={16} />
                      </div>
                      <div className="flex-1">
                        <p
                          className="text-[11px] font-normal"
                          style={{ color: 'var(--color-foreground)' }}
                        >
                          {timing.label}
                        </p>
                        <p
                          className="text-[9px] font-medium"
                          style={{ color: 'var(--color-muted)' }}
                        >
                          {timing.description}
                        </p>
                      </div>
                      {/* iOS radio dot */}
                      <div
                        className="flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 transition-colors duration-200"
                        style={{
                          borderColor: isSelected ? 'var(--color-accent)' : 'var(--color-border)',
                        }}
                      >
                        <AnimatePresence>
                          {isSelected && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              exit={{ scale: 0 }}
                              transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                              className="h-[12px] w-[12px] rounded-full"
                              style={{ backgroundColor: 'var(--color-accent)' }}
                            />
                          )}
                        </AnimatePresence>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>

        {/* ────────────────── Social Channels & Direct Messaging ────────────────── */}
        <Card className="space-y-6 p-6 md:p-8" hoverEffect={false}>
          <div
            className={sectionHeaderCls}
            style={{ borderColor: 'color-mix(in srgb, var(--color-border) 50%, transparent)' }}
          >
            <div
              className="rounded-xl p-2"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--color-accent) 10%, transparent)',
              }}
            >
              <Share2 className="h-4 w-4" style={{ color: 'var(--color-accent)' }} />
            </div>
            <div>
              <h3
                className="text-xs font-medium uppercase tracking-wider"
                style={{ color: 'var(--color-foreground)' }}
              >
                Social Channels & Customer DM
              </h3>
              <p className="text-[11px] text-[var(--color-muted)] mt-0.5">
                Connect your direct WhatsApp number and public profiles. Storefront &quot;Message&quot; clicks route directly to your WhatsApp DM.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {/* WhatsApp Direct DM Box */}
            <div
              className="rounded-2xl border p-4 space-y-3"
              style={{
                borderColor: 'color-mix(in srgb, var(--color-border) 60%, transparent)',
                backgroundColor: 'color-mix(in srgb, var(--color-background) 60%, transparent)',
              }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                    <MessageCircle className="h-4 w-4" />
                  </div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-[var(--color-foreground)]">
                    WhatsApp DM Number
                  </label>
                </div>

                {formData.whatsapp_number && (
                  <button
                    type="button"
                    onClick={() => {
                      let clean = formData.whatsapp_number.replace(/[^\d]/g, '');
                      if (clean.startsWith('0') && clean.length === 10) clean = '233' + clean.slice(1);
                      window.open(
                        `https://wa.me/${clean}?text=${encodeURIComponent(
                          `Test inquiry to ${formData.store_name || 'store'} on Verndly`
                        )}`,
                        '_blank',
                        'noopener,noreferrer'
                      );
                    }}
                    className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 hover:text-emerald-500 transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" /> Test WhatsApp DM Link
                  </button>
                )}
              </div>

              <p className="text-[11px] text-[var(--color-muted)] leading-relaxed">
                When buyers tap &quot;Message&quot; or &quot;Contact&quot; on your public storefront or products, it immediately opens a direct WhatsApp chat with your store.
              </p>

              <div className="relative">
                <div
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-[11px] font-medium"
                  style={{ color: 'var(--color-muted)' }}
                >
                  +
                </div>
                <Input
                  value={formData.whatsapp_number}
                  onChange={(e) => setFormData({ ...formData, whatsapp_number: e.target.value })}
                  placeholder="233540000000 or 0540000000"
                  className="h-11 rounded-xl pl-8 text-[11px] font-normal"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--color-background) 50%, transparent)',
                  }}
                />
              </div>
            </div>

            {/* Social Media Profiles */}
            <div className="space-y-3">
              <label className={labelCls} style={{ color: 'var(--color-muted)' }}>
                Social Profiles & Online Presence
              </label>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* Instagram */}
                <div className="relative">
                  <Instagram
                    className="absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-pink-500"
                  />
                  <Input
                    value={(formData.social_links as any)?.instagram || ''}
                    onChange={(e) => updateSocialLink('instagram', e.target.value)}
                    placeholder="Instagram username or URL"
                    className="h-11 rounded-xl pl-12 text-[11px] font-normal"
                    style={{
                      backgroundColor: 'color-mix(in srgb, var(--color-background) 50%, transparent)',
                    }}
                  />
                </div>

                {/* TikTok */}
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-foreground)]">
                    <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 2.89 3.5 2.75 1.44-.07 2.67-.97 3.09-2.31.25-.72.31-1.5.29-2.26.03-5.27.01-10.54.02-15.81z" />
                    </svg>
                  </div>
                  <Input
                    value={(formData.social_links as any)?.tiktok || ''}
                    onChange={(e) => updateSocialLink('tiktok', e.target.value)}
                    placeholder="TikTok username or URL"
                    className="h-11 rounded-xl pl-12 text-[11px] font-normal"
                    style={{
                      backgroundColor: 'color-mix(in srgb, var(--color-background) 50%, transparent)',
                    }}
                  />
                </div>

                {/* Twitter / X */}
                <div className="relative">
                  <Twitter
                    className="absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2"
                    style={{ color: 'var(--color-muted)' }}
                  />
                  <Input
                    value={(formData.social_links as any)?.twitter || ''}
                    onChange={(e) => updateSocialLink('twitter', e.target.value)}
                    placeholder="X / Twitter handle or URL"
                    className="h-11 rounded-xl pl-12 text-[11px] font-normal"
                    style={{
                      backgroundColor: 'color-mix(in srgb, var(--color-background) 50%, transparent)',
                    }}
                  />
                </div>

                {/* Facebook */}
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-600">
                    <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                  </div>
                  <Input
                    value={(formData.social_links as any)?.facebook || ''}
                    onChange={(e) => updateSocialLink('facebook', e.target.value)}
                    placeholder="Facebook page name or URL"
                    className="h-11 rounded-xl pl-12 text-[11px] font-normal"
                    style={{
                      backgroundColor: 'color-mix(in srgb, var(--color-background) 50%, transparent)',
                    }}
                  />
                </div>

                {/* YouTube */}
                <div className="relative">
                  <Youtube
                    className="absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-red-500"
                  />
                  <Input
                    value={(formData.social_links as any)?.youtube || ''}
                    onChange={(e) => updateSocialLink('youtube', e.target.value)}
                    placeholder="YouTube channel or handle"
                    className="h-11 rounded-xl pl-12 text-[11px] font-normal"
                    style={{
                      backgroundColor: 'color-mix(in srgb, var(--color-background) 50%, transparent)',
                    }}
                  />
                </div>

                {/* External Website */}
                <div className="relative">
                  <Globe
                    className="absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-emerald-500"
                  />
                  <Input
                    value={(formData.social_links as any)?.website || ''}
                    onChange={(e) => updateSocialLink('website', e.target.value)}
                    placeholder="Website or portfolio URL"
                    className="h-11 rounded-xl pl-12 text-[11px] font-normal"
                    style={{
                      backgroundColor: 'color-mix(in srgb, var(--color-background) 50%, transparent)',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* ────────────────── Submit ────────────────── */}
        <div
          className="sticky bottom-6 pb-4 pt-4"
          style={{
            background: `linear-gradient(to top, var(--color-background), var(--color-background), transparent)`,
          }}
        >
          <Button
            type="submit"
            isLoading={isLoading}
            loadingText="Deploying Changes…"
            className="h-14 w-full rounded-2xl text-xs font-medium transition-all"
            style={{
              boxShadow: '0 8px 32px color-mix(in srgb, var(--color-accent) 20%, transparent)',
            }}
          >
            <span className="flex items-center gap-2">
              Deploy Changes
              <ExternalLink className="h-3 w-3" />
            </span>
          </Button>
        </div>
      </form>
    </div>
  );
}
