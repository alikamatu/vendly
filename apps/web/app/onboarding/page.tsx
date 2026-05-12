'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Store,
  MapPin,
  CreditCard,
  Check,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Sparkles,
  Clock,
  Truck,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '@/lib/contexts/auth-context';
import { onboardingApi, OnboardingStatus, LocationCity } from '@/lib/api/onboarding';
import Button from '@/components/ui/Button';
import { toast } from 'sonner';

// ───────── Constants ─────────
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
  { id: '001', name: 'GCB Bank', code: '040100' },
  { id: '002', name: 'Ecobank Ghana', code: '130100' },
  { id: '003', name: 'Fidelity Bank', code: '280100' },
  { id: '004', name: 'Stanbic Bank', code: '190100' },
  { id: '005', name: 'Zenith Bank', code: '120100' },
  { id: '006', name: 'CalBank', code: '140100' },
  { id: '007', name: 'Absa Bank', code: '030100' },
  { id: '008', name: 'GTBank', code: '110100' },
  { id: '009', name: 'Access Bank', code: '210100' },
  { id: '010', name: 'UBA Ghana', code: '080100' },
];

const MOMO_PROVIDERS = [
  { id: 'mtn', name: 'MTN Mobile Money', code: 'MTN' },
  { id: 'telecel', name: 'Telecel Cash', code: 'VOD' },
  { id: 'airteltigo', name: 'AirtelTigo Money', code: 'ATL' },
];

const STEPS = [
  { id: 'store-profile', label: 'Store Profile', icon: Store, field: 'store_profile_completed' as const },
  { id: 'location', label: 'Location', icon: MapPin, field: 'location_set' as const },
  { id: 'payment', label: 'Payment', icon: CreditCard, field: 'payment_setup_completed' as const },
];

// ───────── Step Progress Bar ─────────
function StepIndicator({ currentStep, completedSteps }: { currentStep: number; completedSteps: boolean[] }) {
  return (
    <div className="flex items-center justify-center gap-0 w-full max-w-md mx-auto">
      {STEPS.map((step, idx) => {
        const isCompleted = completedSteps[idx];
        const isCurrent = idx === currentStep;
        const Icon = step.icon;

        return (
          <React.Fragment key={step.id}>
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: idx * 0.1 }}
              className="flex flex-col items-center gap-2"
            >
              <div
                className={`
                  relative w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500
                  ${isCompleted
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                    : isCurrent
                      ? 'bg-primary text-background shadow-lg shadow-primary/30'
                      : 'bg-surface border-2 border-border text-muted'
                  }
                `}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5" strokeWidth={3} />
                ) : (
                  <Icon className="w-5 h-5" />
                )}
                {isCurrent && !isCompleted && (
                  <motion.div
                    className="absolute inset-0 rounded-2xl border-2 border-primary"
                    animate={{ scale: [1, 1.15, 1], opacity: [1, 0, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}
              </div>
              <span className={`text-[9px] font-bold uppercase tracking-widest
                ${isCurrent ? 'text-primary' : isCompleted ? 'text-emerald-500' : 'text-muted'}
              `}>
                {step.label}
              </span>
            </motion.div>
            {idx < STEPS.length - 1 && (
              <div className="flex-1 h-[2px] mx-3 mb-6 relative">
                <div className="absolute inset-0 bg-border rounded-full" />
                <motion.div
                  className="absolute inset-y-0 left-0 bg-emerald-500 rounded-full"
                  initial={{ width: '0%' }}
                  animate={{ width: completedSteps[idx] ? '100%' : '0%' }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ───────── Step 1: Store Profile ─────────
function StoreProfileStep({
  data,
  onComplete,
  isLoading,
}: {
  data: OnboardingStatus['current_data'];
  onComplete: (formData: any) => void;
  isLoading: boolean;
}) {
  const [bio, setBio] = useState(data.bio || '');
  const [whatsapp, setWhatsapp] = useState(data.whatsapp_number || '');
  const [hours, setHours] = useState(data.business_hours || '');
  const [delivery, setDelivery] = useState(data.delivery_policies || '');

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="text-center space-y-2 mb-8">
        <div className="inline-flex items-center justify-center p-3 bg-primary/5 rounded-2xl">
          <Store className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-extrabold tracking-tight">Complete Your Store Profile</h2>
        <p className="text-xs text-muted font-medium max-w-sm mx-auto leading-relaxed">
          Tell customers more about your store. This builds trust and helps them find you.
        </p>
      </div>

      <div className="space-y-5">
        <div className="space-y-2">
          <label className="text-[11px] font-bold text-muted uppercase tracking-widest pl-1">Store Description</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell customers what you sell, your story, why they should buy from you..."
            rows={4}
            className="w-full bg-surface/50 border border-border rounded-2xl p-4 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary/30 outline-none transition-all resize-none placeholder:text-muted/40"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[11px] font-bold text-muted uppercase tracking-widest pl-1">WhatsApp Number</label>
          <input
            type="text"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="+233 XX XXX XXXX"
            className="w-full bg-surface/50 border border-border rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary/30 outline-none transition-all placeholder:text-muted/40"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-muted uppercase tracking-widest pl-1">Business Hours</label>
            <input
              type="text"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder="e.g. Mon–Fri 9am–6pm"
              className="w-full bg-surface/50 border border-border rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary/30 outline-none transition-all placeholder:text-muted/40"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-muted uppercase tracking-widest pl-1">Delivery Policy</label>
            <input
              type="text"
              value={delivery}
              onChange={(e) => setDelivery(e.target.value)}
              placeholder="e.g. Free delivery in Accra"
              className="w-full bg-surface/50 border border-border rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary/30 outline-none transition-all placeholder:text-muted/40"
            />
          </div>
        </div>
      </div>

      <Button
        onClick={() => onComplete({ bio, whatsapp_number: whatsapp, business_hours: hours, delivery_policies: delivery })}
        isLoading={isLoading}
        className="w-full h-13 text-sm font-bold rounded-2xl mt-4"
      >
        Continue <ChevronRight className="w-4 h-4 ml-1" />
      </Button>
    </motion.div>
  );
}

// ───────── Step 2: Location ─────────
function LocationStep({
  data,
  onComplete,
  isLoading,
  onBack,
}: {
  data: OnboardingStatus['current_data'];
  onComplete: (formData: any) => void;
  isLoading: boolean;
  onBack: () => void;
}) {
  const [regions, setRegions] = useState<string[]>([]);
  const [cities, setCities] = useState<LocationCity[]>([]);
  const [selectedRegion, setSelectedRegion] = useState(data.location?.region || '');
  const [selectedCityId, setSelectedCityId] = useState(data.location_id || '');
  const [area, setArea] = useState(data.area || '');
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
    setSelectedCityId('');
    onboardingApi.getCitiesByRegion(selectedRegion)
      .then(setCities)
      .catch(() => toast.error('Failed to load cities'))
      .finally(() => setLoadingCities(false));
  }, [selectedRegion]);

  // Pre-select city when editing
  useEffect(() => {
    if (data.location_id && cities.length > 0) {
      const match = cities.find(c => c.id === data.location_id);
      if (match) setSelectedCityId(match.id);
    }
  }, [cities, data.location_id]);

  const canProceed = selectedRegion && selectedCityId;

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="text-center space-y-2 mb-8">
        <div className="inline-flex items-center justify-center p-3 bg-primary/5 rounded-2xl">
          <MapPin className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-extrabold tracking-tight">Set Your Location</h2>
        <p className="text-xs text-muted font-medium max-w-sm mx-auto leading-relaxed">
          Help customers near you find your store. Select your region and city.
        </p>
      </div>

      <div className="space-y-5">
        {/* Region Select */}
        <div className="space-y-2">
          <label className="text-[11px] font-bold text-muted uppercase tracking-widest pl-1">Region</label>
          {loadingRegions ? (
            <div className="flex items-center gap-2 py-3 px-4 bg-surface/50 rounded-2xl border border-border">
              <Loader2 className="w-4 h-4 animate-spin text-muted" />
              <span className="text-xs text-muted">Loading regions...</span>
            </div>
          ) : (
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="w-full bg-surface/50 border border-border rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary/30 outline-none transition-all appearance-none cursor-pointer"
            >
              <option value="">Select your region</option>
              {regions.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          )}
        </div>

        {/* City Select */}
        <div className="space-y-2">
          <label className="text-[11px] font-bold text-muted uppercase tracking-widest pl-1">City / Town</label>
          {loadingCities ? (
            <div className="flex items-center gap-2 py-3 px-4 bg-surface/50 rounded-2xl border border-border">
              <Loader2 className="w-4 h-4 animate-spin text-muted" />
              <span className="text-xs text-muted">Loading cities...</span>
            </div>
          ) : (
            <select
              value={selectedCityId}
              onChange={(e) => setSelectedCityId(e.target.value)}
              disabled={!selectedRegion}
              className="w-full bg-surface/50 border border-border rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary/30 outline-none transition-all appearance-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <option value="">{selectedRegion ? 'Select your city' : 'Select a region first'}</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>{c.city}</option>
              ))}
            </select>
          )}
        </div>

        {/* Area (optional) */}
        <div className="space-y-2">
          <label className="text-[11px] font-bold text-muted uppercase tracking-widest pl-1">
            Area / Neighborhood <span className="text-muted/50">(optional)</span>
          </label>
          <input
            type="text"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            placeholder="e.g. East Legon, Osu Oxford Street"
            className="w-full bg-surface/50 border border-border rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary/30 outline-none transition-all placeholder:text-muted/40"
          />
        </div>
      </div>

      <div className="flex gap-3 mt-4">
        <Button
          onClick={onBack}
          variant="secondary"
          className="flex-1 h-13 text-sm font-bold rounded-2xl"
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <Button
          onClick={() => onComplete({ location_id: Number(selectedCityId), area: area || undefined })}
          isLoading={isLoading}
          disabled={!canProceed}
          className="flex-[2] h-13 text-sm font-bold rounded-2xl disabled:opacity-40"
        >
          Continue <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </motion.div>
  );
}

// ───────── Step 3: Payment ─────────
function PaymentStep({
  data,
  onComplete,
  isLoading,
  onBack,
}: {
  data: OnboardingStatus['current_data'];
  onComplete: (formData: any) => void;
  isLoading: boolean;
  onBack: () => void;
}) {
  const [methods, setMethods] = useState<string[]>(data.accepted_payment_methods || []);
  const [timing, setTiming] = useState(data.payment_timing || '');
  const [bankName, setBankName] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');

  const toggleMethod = (id: string) => {
    setMethods((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const selectedMainMethod = methods.includes('bank_transfer') ? 'bank_transfer' : methods.includes('mobile_money') ? 'mobile_money' : '';

  const canProceed = methods.length > 0 && timing && (selectedMainMethod ? (bankCode && accountNumber) : true);

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="text-center space-y-2 mb-8">
        <div className="inline-flex items-center justify-center p-3 bg-primary/5 rounded-2xl">
          <CreditCard className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-extrabold tracking-tight">Payment Preferences</h2>
        <p className="text-xs text-muted font-medium max-w-sm mx-auto leading-relaxed">
          Choose how you want to accept payments from customers.
        </p>
      </div>

      {/* Payment Methods */}
      <div className="space-y-3">
        <label className="text-[11px] font-bold text-muted uppercase tracking-widest pl-1">
          Accepted Methods <span className="text-red-400">*</span>
        </label>
        <div className="grid gap-3">
          {PAYMENT_METHODS.map((method) => {
            const isSelected = methods.includes(method.id);
            return (
              <button
                key={method.id}
                type="button"
                onClick={() => toggleMethod(method.id)}
                className={`
                  relative flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all duration-200 active:scale-[0.98]
                  ${isSelected
                    ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
                    : 'border-border bg-surface/30 hover:border-border hover:bg-surface/50'
                  }
                `}
              >
                <span className="text-2xl">{method.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold">{method.label}</p>
                  <p className="text-[10px] text-muted font-medium mt-0.5">{method.description}</p>
                </div>
                <div className={`
                  w-6 h-6 rounded-lg flex items-center justify-center border-2 transition-all shrink-0
                  ${isSelected
                    ? 'bg-primary border-primary'
                    : 'border-border bg-surface'
                  }
                `}>
                  {isSelected && <Check className="w-3.5 h-3.5 text-background" strokeWidth={3} />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Payment Details (Conditional) */}
      <AnimatePresence>
        {methods.some(m => ['bank_transfer', 'mobile_money'].includes(m)) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4 overflow-hidden"
          >
            <div className="p-5 rounded-[1.5rem] bg-primary/5 border border-primary/10 space-y-4">
              <p className="text-[10px] font-black text-primary uppercase tracking-widest">
                Settlement Details (Where you receive money)
              </p>

              {methods.includes('mobile_money') && !methods.includes('bank_transfer') ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted uppercase tracking-widest pl-1">MoMo Provider</label>
                    <select
                      value={bankCode}
                      onChange={(e) => {
                        setBankCode(e.target.value);
                        setBankName(MOMO_PROVIDERS.find(p => p.code === e.target.value)?.name || '');
                      }}
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">Select Provider</option>
                      {MOMO_PROVIDERS.map(p => (
                        <option key={p.id} value={p.code}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted uppercase tracking-widest pl-1">Mobile Money Number</label>
                    <input
                      type="text"
                      placeholder="e.g. 024XXXXXXX"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted uppercase tracking-widest pl-1">Bank Name</label>
                    <select
                      value={bankCode}
                      onChange={(e) => {
                        setBankCode(e.target.value);
                        setBankName(GHANA_BANKS.find(b => b.code === e.target.value)?.name || '');
                      }}
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">Select Bank</option>
                      {GHANA_BANKS.map(b => (
                        <option key={b.id} value={b.code}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted uppercase tracking-widest pl-1">Account Number</label>
                    <input
                      type="text"
                      placeholder="Enter your account number"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payment Timing */}
      <div className="space-y-3">
        <label className="text-[11px] font-bold text-muted uppercase tracking-widest pl-1">
          When Should Customers Pay? <span className="text-red-400">*</span>
        </label>
        <div className="grid gap-3">
          {PAYMENT_TIMINGS.map((option) => {
            const isSelected = timing === option.id;
            const Icon = option.icon;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setTiming(option.id)}
                className={`
                  flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all duration-200 active:scale-[0.98]
                  ${isSelected
                    ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
                    : 'border-border bg-surface/30 hover:border-border hover:bg-surface/50'
                  }
                `}
              >
                <div className={`p-2 rounded-xl ${isSelected ? 'bg-primary/10' : 'bg-surface'}`}>
                  <Icon className={`w-5 h-5 ${isSelected ? 'text-primary' : 'text-muted'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold">{option.label}</p>
                  <p className="text-[10px] text-muted font-medium mt-0.5">{option.description}</p>
                </div>
                <div className={`
                  w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all shrink-0
                  ${isSelected
                    ? 'bg-primary border-primary'
                    : 'border-border bg-surface'
                  }
                `}>
                  {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-background" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex gap-3 mt-4">
        <Button
          onClick={onBack}
          variant="secondary"
          className="flex-1 h-13 text-sm font-bold rounded-2xl"
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <Button
          onClick={() => onComplete({
            accepted_payment_methods: methods,
            payment_timing: timing,
            bank_name: bankName,
            bank_code: bankCode,
            account_number: accountNumber
          })}
          isLoading={isLoading}
          disabled={!canProceed}
          className="flex-[2] h-13 text-sm font-bold rounded-2xl disabled:opacity-40"
        >
          <Sparkles className="w-4 h-4 mr-1" /> Complete Setup
        </Button>
      </div>
    </motion.div>
  );
}

// ───────── Success Screen ─────────
function SuccessScreen() {
  const router = useRouter();

  useEffect(() => {
    const timeout = setTimeout(() => router.push('/dashboard'), 3000);
    return () => clearTimeout(timeout);
  }, [router]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center text-center gap-6 py-16"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', damping: 10, delay: 0.2 }}
        className="w-24 h-24 bg-emerald-500 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-emerald-500/40"
      >
        <Check className="w-12 h-12 text-white" strokeWidth={3} />
      </motion.div>
      <div className="space-y-2">
        <h2 className="text-2xl font-extrabold tracking-tight">You&apos;re All Set! 🎉</h2>
        <p className="text-sm text-muted font-medium max-w-xs mx-auto leading-relaxed">
          Your store is fully set up. Start adding products and making sales!
        </p>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted font-bold">
        <Loader2 className="w-3 h-3 animate-spin" />
        <span>Redirecting to dashboard...</span>
      </div>
    </motion.div>
  );
}

// ───────── Main Page ─────────
export default function OnboardingPage() {
  const { user, token, refreshUser } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  // Fetch onboarding status on mount
  useEffect(() => {
    if (!token) return;
    onboardingApi.getOnboardingStatus(token)
      .then((data) => {
        setStatus(data);
        if (data.onboarding_completed) {
          router.push('/dashboard');
          return;
        }
        // Jump to first incomplete step
        if (!data.store_profile_completed) setCurrentStep(0);
        else if (!data.location_set) setCurrentStep(1);
        else if (!data.payment_setup_completed) setCurrentStep(2);
      })
      .catch((err) => setError(err.message))
      .finally(() => setIsFetching(false));
  }, [token, router]);

  const handleStepComplete = useCallback(async (stepIndex: number, formData: any) => {
    if (!token) return;
    setIsLoading(true);
    try {
      if (stepIndex === 0) {
        await onboardingApi.completeStoreProfile(token, formData);
        setStatus((prev) => prev ? { ...prev, store_profile_completed: true, current_data: { ...prev.current_data, ...formData } } : prev);
        setCurrentStep(1);
      } else if (stepIndex === 1) {
        await onboardingApi.completeLocation(token, formData);
        setStatus((prev) => prev ? { ...prev, location_set: true, current_data: { ...prev.current_data, ...formData } } : prev);
        setCurrentStep(2);
      } else if (stepIndex === 2) {
        await onboardingApi.completePayment(token, formData);
        setIsComplete(true);
        await refreshUser();
      }
      toast.success('Step completed!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save. Try again.');
    } finally {
      setIsLoading(false);
    }
  }, [token, refreshUser]);

  const handleBack = useCallback(() => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  }, []);

  // Loading
  if (isFetching) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-[10px] font-bold text-muted uppercase tracking-widest">Loading setup...</p>
        </div>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-xs text-center space-y-4">
          <div className="p-3 bg-red-500/10 rounded-2xl inline-block">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-sm font-bold">{error}</h3>
          <Button onClick={() => window.location.reload()} size="sm" className="rounded-xl w-full">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!status) return null;

  const completedSteps = [
    status.store_profile_completed,
    status.location_set,
    status.payment_setup_completed,
  ];

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/10">
      <div className="container mx-auto max-w-lg px-4 py-10 md:py-16">
        {isComplete ? (
          <SuccessScreen />
        ) : (
          <div className="space-y-10">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center space-y-1"
            >
              <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">
                Setup {currentStep + 1} of {STEPS.length}
              </p>
              <h1 className="text-3xl font-extrabold tracking-tight">Finish Your Store Setup</h1>
            </motion.div>

            {/* Progress */}
            <StepIndicator currentStep={currentStep} completedSteps={completedSteps} />

            {/* Step Content */}
            <div className="bg-surface/20 border border-border/50 rounded-[2rem] p-6 md:p-8 shadow-xl shadow-black/5">
              <AnimatePresence mode="wait">
                {currentStep === 0 && (
                  <StoreProfileStep
                    key="store-profile"
                    data={status.current_data}
                    onComplete={(d) => handleStepComplete(0, d)}
                    isLoading={isLoading}
                  />
                )}
                {currentStep === 1 && (
                  <LocationStep
                    key="location"
                    data={status.current_data}
                    onComplete={(d) => handleStepComplete(1, d)}
                    isLoading={isLoading}
                    onBack={handleBack}
                  />
                )}
                {currentStep === 2 && (
                  <PaymentStep
                    key="payment"
                    data={status.current_data}
                    onComplete={(d) => handleStepComplete(2, d)}
                    isLoading={isLoading}
                    onBack={handleBack}
                  />
                )}
              </AnimatePresence>
            </div>

            {/* Footer hint */}
            <p className="text-center text-[9px] text-muted/50 font-bold uppercase tracking-widest">
              <Clock className="w-3 h-3 inline mr-1 -mt-0.5" />
              Progress is saved automatically
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
