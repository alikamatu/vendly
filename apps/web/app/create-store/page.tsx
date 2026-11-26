'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
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
  Copy,
  Globe,
  MessageCircle,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '@/lib/contexts/auth-context';
import { storeApi } from '@/lib/api/store';
import { onboardingApi, ServiceArea, DeliveryTime } from '@/lib/api/onboarding';
import { aiApi, type AiOnboardingAssistantResult } from '@/lib/api/ai';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Select from '@/components/ui/Select';
import Spinner from '@/components/ui/Spinner';
import VerndlyAiIcon from '@/components/ai/VerndlyAiIcon';
import VerndlyAiOverlay from '@/components/ai/VerndlyAiOverlay';
import VerndlyAiOnboardingBar from '@/components/onboarding/VerndlyAiOnboardingBar';
import RegionCityPicker from '@/components/onboarding/RegionCityPicker';
import ServiceAreaSelect from '@/components/onboarding/ServiceAreaSelect';
import DeliveryTimeSelect from '@/components/onboarding/DeliveryTimeSelect';
import { toast } from 'sonner';
import { guardPhoneKeyDown, sanitizePhoneNumber } from '@/lib/utils/phone';

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
  {
    id: 'identity',
    title: 'Brand Identity',
    icon: Store,
    description: 'Store name, handle & logo',
  },
  {
    id: 'location',
    title: 'Location & Delivery',
    icon: MapPin,
    description: 'Pickup and shipping zones',
  },
  {
    id: 'settlement',
    title: 'Payouts & Settlement',
    icon: CreditCard,
    description: 'Where you receive customer payments',
  },
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
    <div className="mx-auto w-full max-w-xl px-2">
      <div className="relative flex items-center justify-between">
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
                className={`group relative z-10 flex flex-col items-center gap-2 text-left outline-none transition-all ${
                  canClick ? 'cursor-pointer' : 'cursor-default opacity-60'
                }`}
              >
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-2xl transition-all duration-300 ${
                    isDone
                      ? 'bg-emerald-500 text-white'
                      : isCurrent
                        ? 'bg-foreground text-background scale-105'
                        : 'bg-surface text-muted'
                  } `}
                >
                  {isDone ? (
                    <Check className="h-5 w-5" strokeWidth={2.8} />
                  ) : (
                    <Icon className="h-5 w-5" />
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
                <div className="bg-border/70 relative mx-2 -mt-5 h-[2px] flex-1 overflow-hidden rounded-full">
                  <motion.div
                    className="absolute inset-y-0 left-0 rounded-full bg-emerald-500"
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

// ───────── AI-Native Launchpad Celebration Screen ─────────

function CelebrationScreen({ storeName, storeSlug }: { storeName: string; storeSlug: string }) {
  const [copied, setCopied] = useState(false);
  const fullLink = `https://verndly.com/s/${storeSlug}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(fullLink);
      setCopied(true);
      toast.success('Storefront link copied!');
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      toast.info(fullLink);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="mx-auto max-w-xl space-y-8 py-8 text-center"
    >
      <div className="space-y-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-500 text-white">
          <Check className="h-8 w-8" strokeWidth={2.8} />
        </div>

        <div className="space-y-2">
          <h2 className="text-foreground text-2xl font-semibold tracking-tight sm:text-3xl">
            {storeName || 'Your store'} is live!
          </h2>
          <p className="text-muted mx-auto max-w-md text-xs leading-relaxed sm:text-sm">
            Your verified storefront and Paystack escrow payouts are ready. Stock your first
            products in seconds with Verndly AI below.
          </p>
        </div>
      </div>

      {/* Storefront URL Pill */}
      <div className="bg-surface flex items-center justify-between gap-3 rounded-2xl px-4 py-3.5 text-left">
        <div className="min-w-0">
          <p className="text-muted text-[10px] font-semibold uppercase tracking-wider">
            Your Public Storefront
          </p>
          <p className="text-foreground mt-0.5 truncate font-mono text-sm font-semibold">
            verndly.com/s/{storeSlug}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={handleCopyLink}
            className="bg-background text-foreground hover:bg-foreground hover:text-background inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold transition-colors"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
          <Link
            href={`/s/${storeSlug}`}
            target="_blank"
            aria-label="Open storefront"
            className="bg-background text-foreground hover:bg-foreground hover:text-background flex h-9 w-9 items-center justify-center rounded-xl transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Instant Verndly AI Stocking Launchpad */}
      <div className="bg-surface space-y-3 rounded-3xl p-5 text-left">
        <div className="flex items-center gap-2">
          <VerndlyAiIcon size={20} />
          <p className="text-foreground text-xs font-semibold sm:text-sm">
            Stock your store now with Verndly AI
          </p>
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          <Link
            href="/dashboard/products/add?source=upload"
            className="bg-background hover:bg-foreground hover:text-background group flex flex-col justify-between gap-3 rounded-2xl p-4 transition-colors"
          >
            <Camera className="h-5 w-5 text-red-600 transition-colors group-hover:text-current" />
            <div>
              <p className="text-xs font-semibold">Upload Photos</p>
              <p className="text-muted mt-0.5 text-[11px] group-hover:opacity-80">
                Drop up to 20 photos at once
              </p>
            </div>
          </Link>

          <Link
            href="/dashboard/products/add?source=website"
            className="bg-background hover:bg-foreground hover:text-background group flex flex-col justify-between gap-3 rounded-2xl p-4 transition-colors"
          >
            <Globe className="h-5 w-5 text-red-600 transition-colors group-hover:text-current" />
            <div>
              <p className="text-xs font-semibold">From Website</p>
              <p className="text-muted mt-0.5 text-[11px] group-hover:opacity-80">
                Pull your online store links
              </p>
            </div>
          </Link>

          <Link
            href="/dashboard/products/add?source=whatsapp"
            className="bg-background hover:bg-foreground hover:text-background group flex flex-col justify-between gap-3 rounded-2xl p-4 transition-colors"
          >
            <MessageCircle className="h-5 w-5 text-red-600 transition-colors group-hover:text-current" />
            <div>
              <p className="text-xs font-semibold">WhatsApp Catalog</p>
              <p className="text-muted mt-0.5 text-[11px] group-hover:opacity-80">
                Screenshots or wa.me links
              </p>
            </div>
          </Link>
        </div>
      </div>

      <Link
        href="/dashboard"
        className="bg-foreground text-background inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-semibold transition-opacity hover:opacity-90"
      >
        <span>Go to Seller Dashboard</span>
        <ArrowRight className="h-4 w-4" />
      </Link>
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

  // ───────── Verndly AI Onboarding State ─────────
  const [locationPickerKey, setLocationPickerKey] = useState(0);
  const [aiMatchedCityLabel, setAiMatchedCityLabel] = useState<string | null>(null);
  const [aiOnboardingTip, setAiOnboardingTip] = useState<string | null>(null);
  const [isDraftingBio, setIsDraftingBio] = useState(false);

  const handleApplyAiOnboarding = (draft: AiOnboardingAssistantResult) => {
    if (draft.store_name) {
      setStoreName(draft.store_name);
      if (!isCustomSlug) {
        setStoreSlug(draft.store_slug || slugify(draft.store_name));
      }
    }
    if (draft.bio) setBio(draft.bio);
    if (draft.business_hours) setBusinessHours(draft.business_hours);
    if (draft.delivery_policies) setDeliveryPolicies(draft.delivery_policies);
    if (draft.whatsapp_number && !whatsapp.trim()) {
      setWhatsapp(sanitizePhoneNumber(draft.whatsapp_number));
      if (!momoNumber.trim()) setMomoNumber(sanitizePhoneNumber(draft.whatsapp_number));
    }
    if (draft.matched_location) {
      setRegion(draft.matched_location.region);
      setLocationId(draft.matched_location.id);
      setAiMatchedCityLabel(`${draft.matched_location.city}, ${draft.matched_location.region}`);
      setLocationPickerKey((k) => k + 1);
    }
    if (draft.area) setArea(draft.area);
    if (draft.service_area) setServiceArea(draft.service_area);
    if (draft.avg_delivery_time) setDeliveryTime(draft.avg_delivery_time);
    if (draft.recommended_payment_timing) {
      setPaymentTiming(draft.recommended_payment_timing);
    }
    if (draft.onboarding_tip) {
      setAiOnboardingTip(draft.onboarding_tip);
    }
  };

  const handleQuickDraftBio = async () => {
    if (!token) return;
    if (!storeName.trim() && !bio.trim()) {
      toast.info('Enter your store name or a few words about what you sell first.');
      return;
    }
    setIsDraftingBio(true);
    try {
      const res = await aiApi.draftStorefront(token, {
        store_name: storeName.trim(),
        what_you_sell: bio.trim() || storeName.trim(),
        location: region || area || undefined,
        service_area: serviceArea || undefined,
        avg_delivery_time: deliveryTime || undefined,
        business_hours: businessHours || undefined,
      });
      if (res.bio) setBio(res.bio);
      if (res.business_hours) setBusinessHours(res.business_hours);
      if (res.delivery_policies) setDeliveryPolicies(res.delivery_policies);
      if (res.service_area) setServiceArea(res.service_area);
      if (res.avg_delivery_time) setDeliveryTime(res.avg_delivery_time);
      toast.success('Verndly AI drafted your bio, hours & delivery note!');
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : 'Verndly AI could not draft your bio right now.',
      );
    } finally {
      setIsDraftingBio(false);
    }
  };

  // Memoized select options for custom Select components
  const momoOptions = useMemo(
    () =>
      MOMO_PROVIDERS.map((p) => ({
        value: p.code,
        label: p.name,
      })),
    [],
  );

  const bankOptions = useMemo(
    () =>
      GHANA_BANKS.map((b) => ({
        value: b.code,
        label: b.name,
      })),
    [],
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
      user?.approval_status === 'APPROVED' || user?.role === 'SELLER' || user?.role === 'ADMIN';

    if (!isSellerVerified) {
      router.replace('/seller-verification?redirect=/create-store');
      return;
    }

    // Pick initial phone & brand name from Auth/User if available
    const authBrandName = user?.seller_profile?.store_name || user?.school || '';
    const authPhone =
      user?.seller_profile?.whatsapp_number || user?.phone_e164 || (user as any)?.phone || '';

    /* eslint-disable react-hooks/set-state-in-effect */
    if (authBrandName && !storeName) {
      setStoreName(authBrandName);
      if (!storeSlug) {
        setStoreSlug(slugify(authBrandName));
      }
    }

    if (authPhone && !whatsapp) {
      setWhatsapp(sanitizePhoneNumber(authPhone));
      if (!momoNumber) {
        setMomoNumber(sanitizePhoneNumber(authPhone));
      }
    }

    if (user?.seller_profile?.logo_url && !logoPreview) {
      setLogoPreview(user.seller_profile.logo_url);
    }
    /* eslint-enable react-hooks/set-state-in-effect */

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
            const phone = sanitizePhoneNumber(cd.whatsapp_number);
            setWhatsapp(phone);
            setMomoNumber((prev) => prev || phone);
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
      prev.includes(id) ? (prev.length > 1 ? prev.filter((m) => m !== id) : prev) : [...prev, id],
    );
  };

  // ───────── Verification & Loading State ─────────
  const isSellerVerified =
    user?.approval_status === 'APPROVED' || user?.role === 'SELLER' || user?.role === 'ADMIN';

  if (isInitializing || authLoading || !isSellerVerified) {
    return (
      <div className="bg-background text-foreground relative flex min-h-screen flex-col items-center justify-center">
        <div className="relative z-10 flex flex-col items-center gap-4 px-4 text-center">
          <Image
            src="/logos/verndly.png"
            alt="Verndly Logo"
            width={36}
            height={36}
            className="h-9 w-9 object-contain"
            priority
          />
          <div className="text-muted flex items-center gap-2 text-xs font-medium">
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
    <div className="bg-background text-foreground selection:bg-secondary/15 relative flex min-h-screen flex-col">
      <VerndlyAiOverlay
        isOpen={isDraftingBio}
        messages={[
          'Crafting your storefront bio & brand tone…',
          'Formatting your business hours & delivery note…',
        ]}
        subtitle="Verndly AI Storefront Writer"
      />

      {/* Top Header */}
      <header className="bg-background sticky top-0 z-30 w-full">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <Image
              src="/logos/verndly.png"
              alt="Verndly Logo"
              width={26}
              height={26}
              className="h-6.5 w-6.5 object-contain"
              priority
            />
            <span className="text-foreground text-lg font-bold tracking-tight">Verndly</span>
            <span className="bg-surface text-foreground ml-1 hidden items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold sm:inline-flex">
              <VerndlyAiIcon size={13} animated={false} />
              <span>AI Seller Setup</span>
            </span>
          </div>

          <div className="text-muted flex items-center gap-2 text-xs">
            <Clock className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">~30s with Verndly AI</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="container relative z-10 mx-auto flex max-w-2xl flex-1 flex-col justify-center px-4 py-8 md:py-12">
        {isComplete ? (
          <CelebrationScreen storeName={storeName} storeSlug={storeSlug} />
        ) : (
          <div className="space-y-8">
            {/* Header Title */}
            <div className="space-y-2 text-center">
              <motion.h1
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-foreground text-2xl font-semibold tracking-tight sm:text-3xl"
              >
                {currentStep === 0 && 'Set Up Your Store'}
                {currentStep === 1 && 'Where Do You Ship From?'}
                {currentStep === 2 && 'How Do You Get Paid?'}
              </motion.h1>
              <p className="text-foreground/60 mx-auto max-w-md text-xs leading-relaxed sm:text-sm">
                {currentStep === 0 &&
                  'Configure your brand identity and claim your unique Verndly store link.'}
                {currentStep === 1 &&
                  'Set your pickup location so customers nearby can find and order from you.'}
                {currentStep === 2 &&
                  'Connect your Mobile Money or bank account to receive customer payouts directly.'}
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
                  <div className="space-y-6">
                    {token && (
                      <VerndlyAiOnboardingBar
                        token={token}
                        currentStoreName={storeName}
                        onApply={handleApplyAiOnboarding}
                      />
                    )}

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
                            <div className="bg-surface flex h-24 w-24 items-center justify-center overflow-hidden rounded-3xl transition-transform duration-200 group-hover:scale-[1.02] sm:h-28 sm:w-28">
                              {logoPreview ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={logoPreview}
                                  alt="Store logo preview"
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="text-muted group-hover:text-foreground flex flex-col items-center gap-1.5 transition-colors">
                                  <Camera className="h-7 w-7" />
                                  <span className="text-[10px] font-medium uppercase tracking-wider">
                                    Logo
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="bg-foreground text-background absolute -bottom-1 -right-1 rounded-xl p-2 transition-transform group-hover:scale-105">
                              <Camera className="h-3.5 w-3.5" />
                            </div>
                            <input
                              id="logo-file-input"
                              type="file"
                              accept="image/png,image/jpeg,image/webp"
                              className="hidden"
                              onChange={handleLogoChange}
                            />
                          </div>
                          <p className="text-muted mt-2 text-[11px]">PNG or JPG • Max 5MB</p>
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
                            <label className="text-foreground/80 text-xs font-medium tracking-tight">
                              Store Handle (URL Slug)
                            </label>
                            {isCustomSlug ? (
                              <button
                                type="button"
                                onClick={handleResetSlug}
                                className="text-secondary inline-flex items-center gap-1 text-[11px] font-medium hover:underline"
                              >
                                <RotateCcw className="h-3 w-3" />
                                Sync with name
                              </button>
                            ) : (
                              <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-500">
                                <Sparkles className="h-3 w-3" />
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
                          <div className="bg-surface flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs">
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="text-muted">Store Link:</span>
                              <span className="text-foreground/80 font-mono font-medium">
                                verndly.com/s/
                              </span>
                              <span className="text-secondary truncate font-mono font-semibold">
                                {storeSlug || 'your-brand'}
                              </span>
                            </div>
                            <span className="hidden rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-emerald-500 sm:inline-block">
                              Live URL
                            </span>
                          </div>
                        </div>

                        {/* WhatsApp / Phone Number */}
                        <div className="space-y-1.5">
                          <Input
                            label="WhatsApp / Contact Number"
                            placeholder="0244123456"
                            value={whatsapp}
                            inputMode="numeric"
                            onKeyDown={(e) => guardPhoneKeyDown(e)}
                            onChange={(e) => setWhatsapp(sanitizePhoneNumber(e.target.value))}
                            icon={<Phone size={16} />}
                            hint={
                              whatsapp &&
                              (whatsapp === sanitizePhoneNumber(user?.phone_e164 || '') ||
                                whatsapp === sanitizePhoneNumber((user as any)?.phone || ''))
                                ? '✨ Automatically picked from your verified phone'
                                : 'Used for direct customer chats and instant payout notices.'
                            }
                          />
                        </div>

                        {/* Store Description with inline Verndly AI writer */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-foreground/80 text-xs font-medium tracking-tight">
                              Store Bio / Tagline (Optional)
                            </span>
                            <button
                              type="button"
                              onClick={() => void handleQuickDraftBio()}
                              disabled={isDraftingBio}
                              className="bg-surface text-foreground hover:bg-foreground/[0.08] inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold transition-colors disabled:opacity-40"
                            >
                              <VerndlyAiIcon size={14} animated={false} />
                              <span>{bio.trim() ? 'Polish with AI' : 'Write with AI'}</span>
                            </button>
                          </div>
                          <Textarea
                            placeholder="Tell buyers what you sell and why they should choose your products..."
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            rows={3}
                          />
                        </div>

                        {/* Policies & Hours Compact Section */}
                        <div className="grid grid-cols-1 gap-4 pt-1 sm:grid-cols-2">
                          <div className="space-y-1">
                            <label className="text-muted text-[11px] font-medium uppercase tracking-wider">
                              Business Hours
                            </label>
                            <input
                              type="text"
                              value={businessHours}
                              onChange={(e) => setBusinessHours(e.target.value)}
                              placeholder="e.g. Mon–Sat: 8am–6pm"
                              className="bg-surface text-foreground w-full rounded-xl px-3.5 py-2.5 text-xs outline-none transition-colors"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-muted text-[11px] font-medium uppercase tracking-wider">
                              Delivery Note
                            </label>
                            <input
                              type="text"
                              value={deliveryPolicies}
                              onChange={(e) => setDeliveryPolicies(e.target.value)}
                              placeholder="e.g. Dispatched in 24–48 hrs"
                              className="bg-surface text-foreground w-full rounded-xl px-3.5 py-2.5 text-xs outline-none transition-colors"
                            />
                          </div>
                        </div>

                        {/* Step 1 Actions */}
                        <div className="pt-3">
                          <Button
                            type="submit"
                            variant="primary"
                            size="lg"
                            className="h-12 w-full rounded-xl border-none text-sm font-medium shadow-none"
                            isLoading={isSaving}
                            loadingText="Saving brand identity..."
                          >
                            <span>Continue to Location</span>
                            <ChevronRight className="h-4 w-4 shrink-0" />
                          </Button>
                        </div>
                      </motion.div>
                    </form>
                  </div>
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
                      {aiMatchedCityLabel && (
                        <div className="bg-surface flex items-center gap-2.5 rounded-2xl px-4 py-3 text-xs">
                          <VerndlyAiIcon size={18} mood="happy" animated={false} />
                          <span className="text-foreground">
                            Verndly AI matched <strong>{aiMatchedCityLabel}</strong> and your
                            shipping speed — confirm or adjust below.
                          </span>
                        </div>
                      )}

                      <RegionCityPicker
                        key={locationPickerKey}
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
                          className="h-12 flex-1 rounded-xl text-sm font-medium"
                        >
                          <ChevronLeft className="h-4 w-4 shrink-0" />
                          <span>Back</span>
                        </Button>

                        <Button
                          type="submit"
                          variant="primary"
                          className="h-12 flex-[2] rounded-xl text-sm font-medium"
                          isLoading={isSaving}
                          loadingText="Saving location..."
                        >
                          <span>Continue to Payouts</span>
                          <ChevronRight className="h-4 w-4 shrink-0" />
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
                      {aiOnboardingTip && (
                        <div className="bg-surface flex items-start gap-2.5 rounded-2xl px-4 py-3 text-xs leading-relaxed">
                          <div className="mt-0.5 shrink-0">
                            <VerndlyAiIcon size={17} animated={false} />
                          </div>
                          <span className="text-muted">
                            <strong className="text-foreground font-semibold">
                              Verndly AI Tip:
                            </strong>{' '}
                            {aiOnboardingTip}
                          </span>
                        </div>
                      )}

                      {/* Accepted Payment Methods */}
                      <div className="space-y-3">
                        <label className="text-foreground/80 flex items-center justify-between text-xs font-medium tracking-tight">
                          <span>Accepted Payment Channels</span>
                          <span className="text-muted text-[11px] font-normal">
                            Select all that apply
                          </span>
                        </label>

                        <div className="grid gap-2.5">
                          {PAYMENT_METHODS.map((method) => {
                            const isSelected = paymentMethods.includes(method.id);
                            return (
                              <button
                                key={method.id}
                                type="button"
                                onClick={() => toggleMethod(method.id)}
                                className={`flex items-center gap-3.5 rounded-2xl p-4 text-left outline-none transition-colors ${
                                  isSelected
                                    ? 'bg-foreground text-background'
                                    : 'bg-surface hover:bg-foreground/[0.06] text-foreground'
                                } `}
                              >
                                <span className="text-2xl">{method.icon}</span>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-semibold">{method.label}</p>
                                  <p
                                    className={`mt-0.5 text-[11px] leading-tight ${
                                      isSelected ? 'opacity-80' : 'text-muted'
                                    }`}
                                  >
                                    {method.desc}
                                  </p>
                                </div>
                                <div
                                  className={`flex h-5 w-5 items-center justify-center rounded-lg transition-colors ${
                                    isSelected
                                      ? 'bg-background text-foreground'
                                      : 'bg-background text-transparent'
                                  }`}
                                >
                                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* MoMo Provider Details */}
                      {paymentMethods.includes('mobile_money') && (
                        <div className="bg-surface space-y-4 rounded-3xl p-5">
                          <div className="flex items-center justify-between">
                            <p className="text-foreground flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider">
                              <span>📱 Mobile Money Settlement</span>
                            </p>
                            <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-500">
                              Instant payout support
                            </span>
                          </div>

                          <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2">
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
                                inputMode="numeric"
                                onKeyDown={(e) => guardPhoneKeyDown(e)}
                                onChange={(e) => setMomoNumber(sanitizePhoneNumber(e.target.value))}
                                placeholder="e.g. 0244123456"
                              />
                            </div>
                          </div>

                          {whatsapp && momoNumber === whatsapp && (
                            <p className="text-muted text-[11px]">
                              ✨ Pre-filled with your contact number for convenience.
                            </p>
                          )}
                        </div>
                      )}

                      {/* Bank Transfer Details */}
                      {paymentMethods.includes('bank_transfer') && (
                        <div className="bg-surface space-y-4 rounded-3xl p-5">
                          <p className="text-foreground flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider">
                            <span>🏦 Commercial Bank Account</span>
                          </p>

                          <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2">
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
                        <label className="text-foreground/80 text-xs font-medium tracking-tight">
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
                                className={`flex items-center gap-3.5 rounded-2xl p-3.5 text-left outline-none transition-colors ${
                                  isSelected
                                    ? 'bg-foreground text-background'
                                    : 'bg-surface hover:bg-foreground/[0.06] text-foreground'
                                } `}
                              >
                                <div
                                  className={`rounded-xl p-2 ${
                                    isSelected
                                      ? 'bg-background/15 text-background'
                                      : 'bg-background text-muted'
                                  }`}
                                >
                                  <Icon className="h-4 w-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-semibold">{timing.label}</p>
                                  <p
                                    className={`text-[10px] ${
                                      isSelected ? 'opacity-80' : 'text-muted'
                                    }`}
                                  >
                                    {timing.desc}
                                  </p>
                                </div>
                                <div
                                  className={`flex h-4 w-4 items-center justify-center rounded-full ${
                                    isSelected ? 'bg-background' : 'bg-background/60'
                                  }`}
                                >
                                  {isSelected && (
                                    <div className="bg-foreground h-2 w-2 rounded-full" />
                                  )}
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
                          className="h-12 flex-1 rounded-xl border-none text-sm font-medium shadow-none"
                        >
                          <ChevronLeft className="h-4 w-4 shrink-0" />
                          <span>Back</span>
                        </Button>

                        <Button
                          type="submit"
                          variant="primary"
                          className="bg-secondary hover:bg-secondary/90 h-12 flex-[2] rounded-xl border-none text-sm font-medium text-white shadow-none"
                          isLoading={isSaving}
                          loadingText="Launching store..."
                        >
                          <Sparkles className="h-4 w-4 shrink-0" />
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
