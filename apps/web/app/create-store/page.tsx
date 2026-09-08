'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Store,
  MapPin,
  CreditCard,
  Check,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Camera,
  Truck,
  RotateCcw,
  Building2,
  Phone,
  Clock,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '@/lib/contexts/auth-context';
import { storeApi } from '@/lib/api/store';
import {
  onboardingApi,
  OnboardingStatus,
  ServiceArea,
  DeliveryTime,
} from '@/lib/api/onboarding';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Select from '@/components/ui/Select';
import Spinner from '@/components/ui/Spinner';
import AmbientBackground from '@/components/ui/AmbientBackground';
import RegionCityPicker from '@/components/onboarding/RegionCityPicker';
import ServiceAreaSelect from '@/components/onboarding/ServiceAreaSelect';
import DeliveryTimeSelect from '@/components/onboarding/DeliveryTimeSelect';
import { toast } from 'sonner';

// ───────── Helpers ─────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accent diacritics
    .replace(/[^a-z0-9\s-]/g, '') // keep alphanumeric, spaces, hyphens
    .replace(/\s+/g, '-') // spaces to hyphen
    .replace(/-+/g, '-') // collapse consecutive hyphens
    .replace(/^-+|-+$/g, '') // trim leading/trailing hyphens
    .slice(0, 35);
}

// ───────── Constants ─────────

const STEPS = [
  { id: 'identity', title: 'Brand Identity', icon: Store, description: 'Store name, handle & logo' },
  { id: 'location', title: 'Location & Delivery', icon: MapPin, description: 'Pickup and shipping zones' },
  { id: 'settlement', title: 'Payouts & Settlement', icon: CreditCard, description: 'Where you receive customer payments' },
];

const GHANA_BANKS = [
  { id: '001', name: 'GCB Bank', code: '040100' },
  { id: '002', name: 'Ecobank Ghana', code: '130100' },
  { id: '003', name: 'Fidelity Bank', code: '280100' },
  { id: '004', name: 'Stanbic Bank', code: '190100' },
  { id: '005', name: 'Zenith Bank', code: '120100' },
  { id: '006', name: 'CalBank', code: '140100' },
  { id: '007', name: 'Absa Bank Ghana', code: '030100' },
  { id: '008', name: 'GTBank Ghana', code: '110100' },
  { id: '009', name: 'Access Bank Ghana', code: '210100' },
  { id: '010', name: 'UBA Ghana', code: '080100' },
];

const MOMO_PROVIDERS = [
  { id: 'mtn', name: 'MTN Mobile Money', code: 'MTN', badge: 'Most Popular' },
  { id: 'telecel', name: 'Telecel Cash', code: 'VOD', badge: null },
  { id: 'airteltigo', name: 'AirtelTigo Money', code: 'ATL', badge: null },
];

const PAYMENT_METHODS = [
  {
    id: 'mobile_money',
    label: 'Mobile Money',
    icon: '📱',
    desc: 'Instant settlement via MTN MoMo, Telecel Cash, or AirtelTigo',
  },
  {
    id: 'bank_transfer',
    label: 'Bank Account Transfer',
    icon: '🏦',
    desc: 'Direct settlement to your registered Ghanaian bank account',
  },
  {
    id: 'cash_on_delivery',
    label: 'Cash on Delivery',
    icon: '💵',
    desc: 'Customer pays in person when their order is handed over',
  },
];

const PAYMENT_TIMINGS = [
  {
    id: 'UPFRONT_ONLY',
    label: 'Upfront Only',
    desc: 'Customer pays before you dispatch the order (Recommended)',
    icon: ShieldCheck,
  },
  {
    id: 'DELIVERY_ONLY',
    label: 'On Delivery Only',
    desc: 'Customer pays after physically inspecting the item',
    icon: Truck,
  },
  {
    id: 'BOTH',
    label: 'Both Options',
    desc: 'Let customers choose their preferred payment time',
    icon: Sparkles,
  },
];



// ───────── Stepper Indicator ─────────

function Stepper({
  currentStep,
  completedSteps,
  onStepClick,
}: {
  currentStep: number;
  completedSteps: boolean[];
  onStepClick?: (index: number) => void;
}) {
  return (
    <div className="w-full max-w-xl mx-auto px-2">
      <div className="flex items-center justify-between relative">
        {STEPS.map((step, idx) => {
          const isDone = completedSteps[idx];
          const isCurrent = idx === currentStep;
          const Icon = step.icon;
          const canClick = isDone || idx <= currentStep;

          return (
            <React.Fragment key={step.id}>
              <button
                type="button"
                onClick={() => canClick && onStepClick?.(idx)}
                disabled={!canClick}
                className={`group flex flex-col items-center gap-2 relative z-10 transition-all text-left outline-none ${
                  canClick ? 'cursor-pointer' : 'cursor-default opacity-60'
                }`}
              >
                <div
                  className={`
                    w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-300
                    ${
                      isDone
                        ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25 ring-2 ring-emerald-500/20'
                        : isCurrent
                        ? 'bg-foreground text-background shadow-lg shadow-black/10 ring-4 ring-secondary/20 scale-105'
                        : 'bg-surface border border-border text-foreground/40'
                    }
                  `}
                >
                  {isDone ? (
                    <Check className="w-5 h-5" strokeWidth={2.8} />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </div>
                <div className="text-center">
                  <p
                    className={`text-[11px] font-medium tracking-tight ${
                      isCurrent
                        ? 'text-foreground font-semibold'
                        : isDone
                        ? 'text-emerald-500'
                        : 'text-foreground/40'
                    }`}
                  >
                    {step.title}
                  </p>
                </div>
              </button>

              {idx < STEPS.length - 1 && (
                <div className="flex-1 h-[2px] mx-2 -mt-5 relative overflow-hidden bg-border/70 rounded-full">
                  <motion.div
                    className="absolute inset-y-0 left-0 bg-emerald-500 rounded-full"
                    initial={{ width: '0%' }}
                    animate={{ width: completedSteps[idx] ? '100%' : '0%' }}
                    transition={{ duration: 0.4 }}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

// ───────── Success Screen ─────────

function CelebrationScreen({
  storeName,
  storeSlug,
}: {
  storeName: string;
  storeSlug: string;
}) {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/dashboard');
    }, 2800);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="max-w-md mx-auto py-12 text-center space-y-7"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.1 }}
        className="w-20 h-20 mx-auto rounded-3xl bg-emerald-500 text-white flex items-center justify-center shadow-xl shadow-emerald-500/30 ring-8 ring-emerald-500/10"
      >
        <Check className="w-10 h-10" strokeWidth={3} />
      </motion.div>

      <div className="space-y-2">
        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
          You&apos;re Ready to Sell! 🎉
        </h2>
        <p className="text-xs sm:text-sm text-foreground/60 leading-relaxed max-w-sm mx-auto">
          <strong className="text-foreground font-semibold">{storeName || 'Your store'}</strong> is live on Verndly. Start adding products and receiving orders!
        </p>
      </div>

      <div className="p-4 rounded-2xl bg-surface border border-border space-y-1 text-left">
        <p className="text-[10px] uppercase tracking-wider font-semibold text-foreground/40">
          Your Public Storefront
        </p>
        <p className="text-sm font-mono font-medium text-secondary truncate flex items-center gap-1.5">
          <span>verndly.com/s/{storeSlug}</span>
          <ExternalLink className="w-3.5 h-3.5 opacity-60" />
        </p>
      </div>

      <div className="pt-2 flex flex-col items-center gap-3">
        <Button
          onClick={() => router.push('/dashboard')}
          variant="primary"
          className="w-full h-12 rounded-xl text-sm font-medium"
        >
          Go to Dashboard Now
        </Button>
        <div className="flex items-center gap-2 text-xs text-foreground/50">
          <Spinner size="xs" />
          <span>Redirecting to your dashboard...</span>
        </div>
      </div>
    </motion.div>
  );
}

// ───────── Main Unified Component ─────────

export default function CreateStorePage() {
  const { user, token, isAuthenticated, isLoading: authLoading, refreshUser } = useAuth();
  const router = useRouter();

  // Screen State
  const [isInitializing, setIsInitializing] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  // Track completed steps [identity, location, settlement]
  const [completedSteps, setCompletedSteps] = useState([false, false, false]);

  // ───────── Step 1 Form State ─────────
  const [storeName, setStoreName] = useState('');
  const [storeSlug, setStoreSlug] = useState('');
  const [isCustomSlug, setIsCustomSlug] = useState(false);
  const [whatsapp, setWhatsapp] = useState('');
  const [bio, setBio] = useState('');
  const [businessHours, setBusinessHours] = useState('Mon – Sat: 8:00 AM – 6:00 PM');
  const [deliveryPolicies, setDeliveryPolicies] = useState('Dispatched within 24–48 hours');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // ───────── Step 2 Form State ─────────
  const [locationId, setLocationId] = useState('');
  const [region, setRegion] = useState('');
  const [area, setArea] = useState('');
  const [serviceArea, setServiceArea] = useState<ServiceArea | null>('SAME_CITY');
  const [deliveryTime, setDeliveryTime] = useState<DeliveryTime | null>('SAME_DAY');

  // ───────── Step 3 Form State ─────────
  const [paymentMethods, setPaymentMethods] = useState<string[]>(['mobile_money']);
  const [paymentTiming, setPaymentTiming] = useState<string>('BOTH');
  const [momoProvider, setMomoProvider] = useState<string>('MTN');
  const [momoNumber, setMomoNumber] = useState<string>('');
  const [bankCode, setBankCode] = useState<string>('');
  const [bankName, setBankName] = useState<string>('');
  const [bankAccountNumber, setBankAccountNumber] = useState<string>('');

  // Memoized select options for custom Select components
  const momoOptions = useMemo(
    () =>
      MOMO_PROVIDERS.map((p) => ({
        value: p.code,
        label: p.name,
      })),
    []
  );

  const bankOptions = useMemo(
    () =>
      GHANA_BANKS.map((b) => ({
        value: b.code,
        label: b.name,
      })),
    []
  );

  // ───────── Pre-fill & Status Synchronization ─────────
  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      router.replace('/login?redirect=/create-store');
      return;
    }

    if (!token) return;

    // User has to be seller verified before they can create a store
    const isSellerVerified =
      user?.approval_status === 'APPROVED' ||
      user?.role === 'SELLER' ||
      user?.role === 'ADMIN';

    if (!isSellerVerified) {
      router.replace('/seller-verification?redirect=/create-store');
      return;
    }

    // Pick initial phone & brand name from Auth/User if available
    const authBrandName = user?.seller_profile?.store_name || user?.school || '';
    const authPhone =
      user?.seller_profile?.whatsapp_number ||
      user?.phone_e164 ||
      (user as any)?.phone ||
      '';

    if (authBrandName && !storeName) {
      setStoreName(authBrandName);
      if (!storeSlug) {
        setStoreSlug(slugify(authBrandName));
      }
    }

    if (authPhone && !whatsapp) {
      setWhatsapp(authPhone);
      if (!momoNumber) {
        setMomoNumber(authPhone);
      }
    }

    if (user?.seller_profile?.logo_url && !logoPreview) {
      setLogoPreview(user.seller_profile.logo_url);
    }

    // Fetch onboarding status from backend
    onboardingApi
      .getOnboardingStatus(token)
      .then((status) => {
        if (status.onboarding_completed) {
          router.replace('/dashboard');
          return;
        }

        const cd = status.current_data;
        if (cd) {
          if (cd.bio) setBio(cd.bio);
          if (cd.whatsapp_number) {
            setWhatsapp(cd.whatsapp_number);
            setMomoNumber((prev) => prev || cd.whatsapp_number || '');
          }
          if (cd.business_hours) setBusinessHours(cd.business_hours);
          if (cd.delivery_policies) setDeliveryPolicies(cd.delivery_policies);
          if (cd.location_id) setLocationId(cd.location_id);
          if (cd.location?.region) setRegion(cd.location.region);
          if (cd.area) setArea(cd.area);
          if (cd.service_area) setServiceArea(cd.service_area);
          if (cd.avg_delivery_time) setDeliveryTime(cd.avg_delivery_time);
          if (cd.accepted_payment_methods?.length) {
            setPaymentMethods(cd.accepted_payment_methods);
          }
          if (cd.payment_timing) setPaymentTiming(cd.payment_timing);
        }

        // Determine step progression
        const hasStore = Boolean(user?.seller_profile);
        const profileDone = hasStore || status.store_profile_completed;
        const locationDone = status.location_set;
        const paymentDone = status.payment_setup_completed;

        setCompletedSteps([profileDone, locationDone, paymentDone]);

        if (!profileDone) {
          setCurrentStep(0);
        } else if (!locationDone) {
          setCurrentStep(1);
        } else if (!paymentDone) {
          setCurrentStep(2);
        }
      })
      .catch((err) => {
        // If 404 or unhandled, user starts clean at step 0
        console.warn('Initial status fetch:', err.message);
      })
      .finally(() => {
        setIsInitializing(false);
      });
  }, [token, authLoading, isAuthenticated, user, router]);

  // ───────── Auto-generate slug as brand name changes ─────────
  const handleBrandNameChange = (val: string) => {
    setStoreName(val);
    if (!isCustomSlug) {
      setStoreSlug(slugify(val));
    }
  };

  const handleCustomSlugChange = (val: string) => {
    setIsCustomSlug(true);
    setStoreSlug(slugify(val));
  };

  const handleResetSlug = () => {
    setIsCustomSlug(false);
    setStoreSlug(slugify(storeName));
    toast.info('Slug re-synced with brand name');
  };

  // ───────── Handle Logo Upload ─────────
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Logo file size must be less than 5MB');
        return;
      }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // ───────── Step 1 Submit: Create or Update Store ─────────
  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    const trimmedName = storeName.trim();
    const finalSlug = (storeSlug || slugify(trimmedName)).trim();

    if (!trimmedName || trimmedName.length < 2) {
      toast.error('Please enter a valid brand or store name (at least 2 characters)');
      return;
    }

    if (!finalSlug || finalSlug.length < 2) {
      toast.error('Store handle must be at least 2 characters');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        store_name: trimmedName,
        store_link: finalSlug,
        whatsapp_number: whatsapp.trim() || undefined,
        bio: bio.trim() || undefined,
        business_hours: businessHours.trim() || undefined,
        delivery_policies: deliveryPolicies.trim() || undefined,
      };

      if (!user?.seller_profile) {
        // Create new store
        await storeApi.createStoreWithFile(token, payload, logoFile || undefined);
        toast.success('Brand identity configured!');
      } else {
        // Update existing store
        await storeApi.updateStore(token, payload, logoFile || undefined);
        await onboardingApi.completeStoreProfile(token, {
          bio: payload.bio,
          whatsapp_number: payload.whatsapp_number,
          business_hours: payload.business_hours,
          delivery_policies: payload.delivery_policies,
        });
        toast.success('Store profile updated!');
      }

      // If MoMo number was empty, pre-fill with the verified contact number
      if (!momoNumber && whatsapp.trim()) {
        setMomoNumber(whatsapp.trim());
      }

      await refreshUser();
      setCompletedSteps((prev) => [true, prev[1], prev[2]]);
      setCurrentStep(1);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save brand profile');
    } finally {
      setIsSaving(false);
    }
  };

  // ───────── Step 2 Submit: Location & Delivery ─────────
  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (!locationId) {
      toast.error('Please select your city in Ghana');
      return;
    }
    if (!serviceArea) {
      toast.error('Please choose a delivery coverage radius');
      return;
    }
    if (!deliveryTime) {
      toast.error('Please select an average delivery speed');
      return;
    }

    setIsSaving(true);
    try {
      await onboardingApi.completeLocation(token, {
        location_id: locationId,
        area: area.trim() || undefined,
        service_area: serviceArea,
        avg_delivery_time: deliveryTime,
      });

      toast.success('Location & shipping reach saved!');
      setCompletedSteps((prev) => [prev[0], true, prev[2]]);
      setCurrentStep(2);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save location details');
    } finally {
      setIsSaving(false);
    }
  };

  // ───────── Step 3 Submit: Payouts & Launch ─────────
  const handleStep3Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (!paymentMethods.length) {
      toast.error('Please select at least one accepted payment method');
      return;
    }

    const needsMoMo = paymentMethods.includes('mobile_money');
    const needsBank = paymentMethods.includes('bank_transfer');

    if (needsMoMo && !momoNumber.trim()) {
      toast.error('Please provide your Mobile Money number for customer settlements');
      return;
    }

    if (needsBank && (!bankCode || !bankAccountNumber.trim())) {
      toast.error('Please select your bank and provide your account number');
      return;
    }

    setIsSaving(true);
    try {
      await onboardingApi.completePayment(token, {
        accepted_payment_methods: paymentMethods,
        payment_timing: paymentTiming,
        bank_name: needsMoMo && !needsBank ? momoProvider : bankName || 'Mobile Money',
        bank_code: needsMoMo && !needsBank ? momoProvider : bankCode || 'MOMO',
        account_number: needsMoMo && !needsBank ? momoNumber.trim() : bankAccountNumber.trim(),
      });

      await refreshUser();
      setCompletedSteps([true, true, true]);
      setIsComplete(true);
    } catch (err: any) {
      toast.error(err.message || 'Failed to complete payment setup');
    } finally {
      setIsSaving(false);
    }
  };

  // ───────── Toggle payment methods ─────────
  const toggleMethod = (id: string) => {
    setPaymentMethods((prev) =>
      prev.includes(id)
        ? prev.length > 1
          ? prev.filter((m) => m !== id)
          : prev
        : [...prev, id]
    );
  };

  // ───────── Verification & Loading State ─────────
  const isSellerVerified =
    user?.approval_status === 'APPROVED' ||
    user?.role === 'SELLER' ||
    user?.role === 'ADMIN';

  if (isInitializing || authLoading || !isSellerVerified) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center relative">
        <AmbientBackground />
        <div className="flex flex-col items-center gap-4 text-center px-4">
          <Image
            src="/logos/verndly.png"
            alt="Verndly Logo"
            width={36}
            height={36}
            className="h-9 w-9 object-contain"
            priority
          />
          <div className="flex items-center gap-2 text-xs font-medium text-foreground/60">
            <Spinner size="sm" />
            <span>
              {!isSellerVerified && !authLoading
                ? 'Seller verification required. Redirecting to verification portal...'
                : 'Preparing your seller workspace...'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-secondary/15 relative flex flex-col">
      <AmbientBackground />

      {/* Top Header */}
      <header className="w-full border-b border-border/40 bg-background sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Image
              src="/logos/verndly.png"
              alt="Verndly Logo"
              width={26}
              height={26}
              className="h-6.5 w-6.5 object-contain"
              priority
            />
            <span className="text-lg font-bold tracking-tight text-foreground">
              Verndly
            </span>
            <span className="hidden sm:inline-block text-[11px] font-medium tracking-wide uppercase px-2 py-0.5 rounded-full bg-secondary/10 text-secondary ml-1">
              Seller Setup
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-foreground/50">
            <Clock className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Takes ~2 minutes</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 container mx-auto max-w-2xl px-4 py-8 md:py-12 flex flex-col justify-center">
        {isComplete ? (
          <CelebrationScreen storeName={storeName} storeSlug={storeSlug} />
        ) : (
          <div className="space-y-8">
            {/* Header Title */}
            <div className="text-center space-y-2">
              <motion.h1
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground"
              >
                {currentStep === 0 && 'Set Up Your Store'}
                {currentStep === 1 && 'Where Do You Ship From?'}
                {currentStep === 2 && 'How Do You Get Paid?'}
              </motion.h1>
              <p className="text-xs sm:text-sm text-foreground/60 max-w-md mx-auto leading-relaxed">
                {currentStep === 0 && 'Configure your brand identity and claim your unique Verndly store link.'}
                {currentStep === 1 && 'Set your pickup location so customers nearby can find and order from you.'}
                {currentStep === 2 && 'Connect your Mobile Money or bank account to receive customer payouts directly.'}
              </p>
            </div>

            {/* Stepper */}
            <Stepper
              currentStep={currentStep}
              completedSteps={completedSteps}
              onStepClick={(idx) => {
                if (idx < currentStep || completedSteps[idx]) {
                  setCurrentStep(idx);
                }
              }}
            />

            {/* Cardless Form Container */}
            <div className="w-full">
              <AnimatePresence mode="wait">
                {/* ───────── STEP 1: BRAND IDENTITY ───────── */}
                {currentStep === 0 && (
                  <form onSubmit={handleStep1Submit}>
                    <motion.div
                      key="step-identity"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-6"
                    >
                    {/* Logo Picker */}
                    <div className="flex flex-col items-center">
                      <div
                        onClick={() => document.getElementById('logo-file-input')?.click()}
                        className="group relative cursor-pointer"
                        role="button"
                        tabIndex={0}
                        aria-label="Upload store logo"
                      >
                        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl border-2 border-dashed border-border group-hover:border-secondary/60 flex items-center justify-center bg-input-bg transition-all duration-200 overflow-hidden shadow-sm">
                          {logoPreview ? (
                            <img
                              src={logoPreview}
                              alt="Store logo preview"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="flex flex-col items-center gap-1.5 text-foreground/40 group-hover:text-secondary transition-colors">
                              <Camera className="w-7 h-7" />
                              <span className="text-[10px] font-medium uppercase tracking-wider">Logo</span>
                            </div>
                          )}
                        </div>
                        <div className="absolute -bottom-1 -right-1 p-2 bg-secondary text-white rounded-xl shadow-md group-hover:scale-105 transition-transform">
                          <Camera className="w-3.5 h-3.5" />
                        </div>
                        <input
                          id="logo-file-input"
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="hidden"
                          onChange={handleLogoChange}
                        />
                      </div>
                      <p className="mt-2 text-[11px] text-foreground/50">
                        PNG or JPG • Max 5MB
                      </p>
                    </div>

                    {/* Brand Name Input */}
                    <div className="space-y-1.5">
                      <Input
                        label="Store / Brand Name"
                        placeholder="e.g. Accra Kicks & Apparel"
                        value={storeName}
                        onChange={(e) => handleBrandNameChange(e.target.value)}
                        icon={<Building2 size={16} />}
                        required
                        hint={
                          user?.school && storeName === user.school
                            ? '✨ Automatically picked from your registration'
                            : 'This is the name your buyers will see.'
                        }
                      />
                    </div>

                    {/* Auto Slug Generator with Live Preview */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-foreground/80 tracking-tight">
                          Store Handle (URL Slug)
                        </label>
                        {isCustomSlug ? (
                          <button
                            type="button"
                            onClick={handleResetSlug}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-secondary hover:underline"
                          >
                            <RotateCcw className="w-3 h-3" />
                            Sync with name
                          </button>
                        ) : (
                          <span className="text-[11px] font-medium text-emerald-500 flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            Auto-generated
                          </span>
                        )}
                      </div>

                      <div className="relative">
                        <Input
                          placeholder="accra-kicks"
                          value={storeSlug}
                          onChange={(e) => handleCustomSlugChange(e.target.value)}
                          required
                        />
                      </div>

                      {/* Live Storefront Link Preview */}
                      <div className="rounded-xl px-3.5 py-2.5 bg-surface border border-border/70 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="text-foreground/50">Store Link:</span>
                          <span className="font-mono text-foreground/80 font-medium">verndly.com/s/</span>
                          <span className="font-mono text-secondary font-semibold truncate">
                            {storeSlug || 'your-brand'}
                          </span>
                        </div>
                        <span className="hidden sm:inline-block text-[10px] uppercase tracking-wider text-emerald-500 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-md">
                          Live URL
                        </span>
                      </div>
                    </div>

                    {/* WhatsApp / Phone Number */}
                    <div className="space-y-1.5">
                      <Input
                        label="WhatsApp / Contact Number"
                        placeholder="+233 24 123 4567"
                        value={whatsapp}
                        onChange={(e) => setWhatsapp(e.target.value)}
                        icon={<Phone size={16} />}
                        hint={
                          whatsapp && (whatsapp === user?.phone_e164 || whatsapp === (user as any)?.phone)
                            ? '✨ Automatically picked from your verified phone'
                            : 'Used for direct customer chats and instant payout notices.'
                        }
                      />
                    </div>

                    {/* Store Description */}
                    <div className="space-y-1.5">
                      <Textarea
                        label="Store Bio / Tagline (Optional)"
                        placeholder="Tell buyers what you sell and why they should choose your products..."
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        rows={3}
                      />
                    </div>

                    {/* Policies & Hours Compact Section */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-foreground/70 uppercase tracking-wider">
                          Business Hours
                        </label>
                        <input
                          type="text"
                          value={businessHours}
                          onChange={(e) => setBusinessHours(e.target.value)}
                          placeholder="e.g. Mon–Sat: 8am–6pm"
                          className="w-full rounded-xl border border-input-border bg-input-bg px-3.5 py-2.5 text-xs text-foreground outline-none focus:border-secondary transition-all"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-foreground/70 uppercase tracking-wider">
                          Delivery Note
                        </label>
                        <input
                          type="text"
                          value={deliveryPolicies}
                          onChange={(e) => setDeliveryPolicies(e.target.value)}
                          placeholder="e.g. Dispatched in 24–48 hrs"
                          className="w-full rounded-xl border border-input-border bg-input-bg px-3.5 py-2.5 text-xs text-foreground outline-none focus:border-secondary transition-all"
                        />
                      </div>
                    </div>

                    {/* Step 1 Actions */}
                    <div className="pt-3">
                      <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        className="w-full h-12 rounded-xl text-sm font-medium"
                        isLoading={isSaving}
                        loadingText="Saving brand identity..."
                      >
                        <span>Continue to Location</span>
                        <ChevronRight className="w-4 h-4 shrink-0" />
                      </Button>
                    </div>
                    </motion.div>
                  </form>
                )}

                {/* ───────── STEP 2: LOCATION & SHIPPING ───────── */}
                {currentStep === 1 && (
                  <form onSubmit={handleStep2Submit}>
                    <motion.div
                      key="step-location"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-6"
                    >
                    <RegionCityPicker
                      initialRegion={region}
                      initialCityId={locationId}
                      onChange={({ region: r, cityId: c }) => {
                        setRegion(r);
                        setLocationId(c);
                      }}
                      onError={(msg) => toast.error(msg)}
                    />

                    {/* Specific Neighborhood / Landmark */}
                    <div className="space-y-1.5">
                      <Input
                        label="Neighborhood / Area / Landmark (Optional)"
                        placeholder="e.g. East Legon, Osu, Adum, Airport Residential"
                        value={area}
                        onChange={(e) => setArea(e.target.value)}
                        hint="Helps nearby buyers easily recognize your base."
                      />
                    </div>

                    {/* Service Area */}
                    <ServiceAreaSelect
                      value={serviceArea}
                      onChange={(val) => setServiceArea(val)}
                    />

                    {/* Delivery Time */}
                    <DeliveryTimeSelect
                      value={deliveryTime}
                      onChange={(val) => setDeliveryTime(val)}
                    />

                    {/* Step 2 Actions */}
                    <div className="flex items-center gap-3 pt-3">
                      <Button
                        type="button"
                        onClick={() => setCurrentStep(0)}
                        variant="secondary"
                        className="flex-1 h-12 rounded-xl text-sm font-medium"
                      >
                        <ChevronLeft className="w-4 h-4 shrink-0" />
                        <span>Back</span>
                      </Button>

                      <Button
                        type="submit"
                        variant="primary"
                        className="flex-[2] h-12 rounded-xl text-sm font-medium"
                        isLoading={isSaving}
                        loadingText="Saving location..."
                      >
                        <span>Continue to Payouts</span>
                        <ChevronRight className="w-4 h-4 shrink-0" />
                      </Button>
                    </div>
                    </motion.div>
                  </form>
                )}

                {/* ───────── STEP 3: PAYOUTS & LAUNCH ───────── */}
                {currentStep === 2 && (
                  <form onSubmit={handleStep3Submit}>
                    <motion.div
                      key="step-payouts"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-6"
                    >
                    {/* Accepted Payment Methods */}
                    <div className="space-y-3">
                      <label className="text-xs font-medium text-foreground/80 tracking-tight flex items-center justify-between">
                        <span>Accepted Payment Channels</span>
                        <span className="text-[11px] text-foreground/40 font-normal">Select all that apply</span>
                      </label>

                      <div className="grid gap-2.5">
                        {PAYMENT_METHODS.map((method) => {
                          const isSelected = paymentMethods.includes(method.id);
                          return (
                            <button
                              key={method.id}
                              type="button"
                              onClick={() => toggleMethod(method.id)}
                              className={`
                                flex items-center gap-3.5 p-3.5 rounded-2xl border text-left transition-all duration-200 outline-none
                                ${
                                  isSelected
                                    ? 'border-secondary bg-secondary/[0.04] shadow-sm'
                                    : 'border-border bg-surface/40 hover:border-foreground/20 hover:bg-surface'
                                }
                              `}
                            >
                              <span className="text-2xl">{method.icon}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground">{method.label}</p>
                                <p className="text-[11px] text-foreground/55 leading-tight mt-0.5">
                                  {method.desc}
                                </p>
                              </div>
                              <div
                                className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-all ${
                                  isSelected
                                    ? 'bg-secondary border-secondary text-white'
                                    : 'border-input-border bg-input-bg'
                                }`}
                              >
                                {isSelected && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* MoMo Provider Details (Cardless Section) */}
                    {paymentMethods.includes('mobile_money') && (
                      <div className="py-4 border-t border-b border-border/80 space-y-4">
                        <div className="flex items-center justify-between">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-secondary flex items-center gap-1.5">
                            <span>📱 Mobile Money Settlement</span>
                          </p>
                          <span className="text-[10px] text-emerald-500 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-md">
                            Zero fees on payout
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                          <div>
                            <Select
                              label="MoMo Provider"
                              value={momoProvider}
                              onChange={setMomoProvider}
                              options={momoOptions}
                            />
                          </div>

                          <div>
                            <Input
                              label="MoMo Wallet Number"
                              type="tel"
                              value={momoNumber}
                              onChange={(e) => setMomoNumber(e.target.value)}
                              placeholder="e.g. 0244123456"
                            />
                          </div>
                        </div>

                        {whatsapp && momoNumber === whatsapp && (
                          <p className="text-[11px] text-foreground/50">
                            ✨ Pre-filled with your contact number for convenience.
                          </p>
                        )}
                      </div>
                    )}

                    {/* Bank Transfer Details (Cardless Section) */}
                    {paymentMethods.includes('bank_transfer') && (
                      <div className="py-4 space-y-4">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-secondary flex items-center gap-1.5">
                          <span>🏦 Commercial Bank Account</span>
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                          <div>
                            <Select
                              label="Bank Name"
                              placeholder="Select your bank"
                              value={bankCode}
                              onChange={(val) => {
                                setBankCode(val);
                                setBankName(GHANA_BANKS.find((b) => b.code === val)?.name || '');
                              }}
                              options={bankOptions}
                              searchable
                            />
                          </div>

                          <div>
                            <Input
                              label="Account Number"
                              type="text"
                              value={bankAccountNumber}
                              onChange={(e) => setBankAccountNumber(e.target.value)}
                              placeholder="e.g. 1029384756"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Payment Timing */}
                    <div className="space-y-2.5">
                      <label className="text-xs font-medium text-foreground/80 tracking-tight">
                        Customer Payment Timing
                      </label>
                      <div className="grid gap-2">
                        {PAYMENT_TIMINGS.map((timing) => {
                          const isSelected = paymentTiming === timing.id;
                          const Icon = timing.icon;
                          return (
                            <button
                              key={timing.id}
                              type="button"
                              onClick={() => setPaymentTiming(timing.id)}
                              className={`
                                flex items-center gap-3.5 p-3 rounded-2xl border text-left transition-all outline-none
                                ${
                                  isSelected
                                    ? 'border-secondary bg-secondary/[0.04]'
                                    : 'border-border bg-surface/30 hover:border-foreground/20 hover:bg-surface'
                                }
                              `}
                            >
                              <div
                                className={`p-2 rounded-xl ${
                                  isSelected ? 'bg-secondary/15 text-secondary' : 'bg-surface text-foreground/50'
                                }`}
                              >
                                <Icon className="w-4 h-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-foreground">{timing.label}</p>
                                <p className="text-[10px] text-foreground/50">{timing.desc}</p>
                              </div>
                              <div
                                className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                  isSelected ? 'border-secondary' : 'border-input-border'
                                }`}
                              >
                                {isSelected && <div className="w-2 h-2 rounded-full bg-secondary" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Step 3 Actions */}
                    <div className="flex items-center gap-3 pt-3">
                      <Button
                        type="button"
                        onClick={() => setCurrentStep(1)}
                        variant="secondary"
                        className="flex-1 h-12 rounded-xl text-sm font-medium"
                      >
                        <ChevronLeft className="w-4 h-4 shrink-0" />
                        <span>Back</span>
                      </Button>

                      <Button
                        type="submit"
                        variant="primary"
                        className="flex-[2] h-12 rounded-xl text-sm font-medium bg-secondary hover:bg-secondary/90 text-white shadow-lg shadow-secondary/20"
                        isLoading={isSaving}
                        loadingText="Launching store..."
                      >
                        <Sparkles className="w-4 h-4 shrink-0" />
                        <span>Launch Store & Sell</span>
                      </Button>
                    </div>
                    </motion.div>
                  </form>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
