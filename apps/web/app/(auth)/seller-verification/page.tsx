'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/contexts/auth-context';
import { useVerificationForm } from '@/hooks/useAuth';
import { authApi } from '@/lib/api/auth';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import Spinner from '@/components/ui/Spinner';
import AuthShowcase from '@/components/auth/AuthShowcase';
import {
  Link2,
  Clock,
  CheckCircle,
  ShieldCheck,
  Globe,
  FileText,
  MessageSquare,
  ArrowLeft,
  Mail,
  ChevronRight,
  Sparkles,
  RefreshCw,
  Store,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type VerificationOption = 'URL' | 'FILES' | 'CONTACT' | null;

function SellerVerificationContent() {
  const { user, token, isLoading: authLoading, refreshUser } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/create-store';
  const fromCreateStore = redirectUrl === '/create-store';

  const { form } = useVerificationForm();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<VerificationOption>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = form;

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !token) {
      router.replace('/login?redirect=/seller-verification');
    }
  }, [authLoading, token, router]);

  const [idFile, setIdFile] = useState<File | null>(null);
  const [salesFile, setSalesFile] = useState<File | null>(null);

  const onSubmit = handleSubmit(async (data) => {
    if (!token) return;
    setIsSubmitting(true);
    setError(null);
    try {
      if (data.type === 'FILES') {
        const formData = new FormData();
        formData.append('type', data.type);
        if (idFile) formData.append('idImage', idFile);
        if (salesFile) formData.append('salesProof', salesFile);
        formData.append('verification_doc', 'FILES_UPLOAD');

        await authApi.submitVerification(token, formData);
      } else {
        await authApi.submitVerification(token, data);
      }
      setSuccessMessage(
        'Verification request submitted! Once approved by our team, you can immediately set up your store.'
      );
      await refreshUser();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  });

  const handleRefreshStatus = async () => {
    setIsRefreshing(true);
    try {
      await refreshUser();
    } finally {
      setIsRefreshing(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!token) return null;

  const approvalStatus = user?.approval_status;
  const hasStore = Boolean(user?.seller_profile);

  const options = [
    {
      id: 'URL' as const,
      title: 'Submit Store URL',
      description: 'Link to your active store (Instagram, TikTok, Shopify, Drive)',
      icon: Globe,
      color: 'bg-blue-500/10 text-blue-500',
    },
    {
      id: 'FILES' as const,
      title: 'Upload ID & Evidence',
      description: 'Upload Ghana Card and sales receipts directly',
      icon: FileText,
      color: 'bg-purple-500/10 text-purple-500',
    },
    {
      id: 'CONTACT' as const,
      title: 'Contact Support Directly',
      description: 'Manual verification review via WhatsApp or Phone',
      icon: MessageSquare,
      color: 'bg-emerald-500/10 text-emerald-500',
    },
  ];

  const handleSelectOption = (option: VerificationOption) => {
    setSelectedOption(option);
    if (option) setValue('type', option as any);
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen w-full">
      {/* Left Column: Form Section (~30%) */}
      <div className="w-full lg:w-[32%] xl:w-[30%] min-h-screen lg:h-screen flex flex-col justify-between p-6 sm:p-10 xl:p-12 overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden bg-background z-10">
        <div>
          {/* Top Brand Nav */}
          <div className="flex items-center justify-between mb-8">
            <Link href="/" className="inline-flex items-center gap-2.5 group">
              <img
                src="/logos/verndly.png"
                alt="Verndly"
                className="h-8 w-8 object-contain transition-transform group-hover:scale-105"
              />
              <span className="font-semibold text-lg tracking-tight text-foreground">
                Verndly
              </span>
            </Link>

            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground/50 hover:text-foreground transition-colors group"
            >
              <ArrowLeft size={13} className="transition-transform group-hover:-translate-x-0.5" />
              <span>Dashboard</span>
            </Link>
          </div>

          {/* Info Banner when redirected from /create-store */}
          {fromCreateStore && approvalStatus !== 'APPROVED' && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-3.5 rounded-2xl bg-secondary/10 border border-secondary/20 flex items-start gap-3"
            >
              <ShieldCheck className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
              <div className="text-xs space-y-0.5">
                <p className="font-semibold text-foreground">Seller Verification Required</p>
                <p className="text-foreground/70 leading-relaxed text-[11px]">
                  You must complete seller verification before setting up your store. Submit verification below to unlock your storefront.
                </p>
              </div>
            </motion.div>
          )}

          {/* Status Displays: APPROVED */}
          {approvalStatus === 'APPROVED' && (
            <div className="space-y-5 py-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shadow-xs">
                <CheckCircle size={26} />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold tracking-wider">
                    Verified Merchant
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
                  Seller Verified! 🎉
                </h2>
                <p className="text-xs text-foreground/60 leading-relaxed">
                  Your merchant credentials have been verified. Payouts and storefront rails are unlocked.
                </p>
              </div>

              <div className="space-y-2.5 pt-2">
                {!hasStore ? (
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => router.push('/create-store')}
                    className="w-full h-11 flex items-center justify-center gap-2"
                  >
                    <Store size={16} />
                    <span>Continue to Store Setup</span>
                    <ChevronRight size={15} />
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => router.push('/dashboard')}
                    className="w-full h-11"
                  >
                    Go to Seller Dashboard
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/dashboard')}
                  className="w-full text-foreground/60 hover:text-foreground text-xs"
                >
                  Back to Dashboard
                </Button>
              </div>
            </div>
          )}

          {/* Status Displays: PENDING */}
          {approvalStatus === 'PENDING' && (
            <div className="space-y-5 py-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shadow-xs">
                <Clock size={24} />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold tracking-wider">
                    Step 1 of 2 • In Review
                  </span>
                </div>
                <h2 className="text-xl font-semibold tracking-tight text-foreground">
                  Verification in Review
                </h2>
                <p className="text-xs text-foreground/60 leading-relaxed">
                  Our compliance team is reviewing your verification documents. Reviews are typically completed within a few hours.
                </p>
              </div>

              {/* Two-Step Visual Pipeline */}
              <div className="p-4 rounded-2xl bg-surface border border-border/80 space-y-3">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="text-foreground">Store Setup Progress</span>
                  <span className="text-amber-500 text-[11px] font-semibold">Step 1 in Review</span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2.5 text-foreground/80">
                    <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center text-[10px] font-bold">
                      1
                    </span>
                    <span className="font-medium">Seller Verification</span>
                    <span className="text-[10px] text-amber-500 ml-auto font-mono uppercase font-semibold">Pending</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-foreground/40">
                    <span className="w-4 h-4 rounded-full bg-border text-foreground/40 flex items-center justify-center text-[10px] font-bold">
                      2
                    </span>
                    <span>Storefront Setup (/create-store)</span>
                    <span className="text-[10px] text-foreground/30 ml-auto font-mono">Locked</span>
                  </div>
                </div>
                <p className="text-[11px] text-foreground/50 border-t border-border/50 pt-2.5 leading-relaxed">
                  Store creation will unlock automatically the moment your account is approved.
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <Button
                  variant="secondary"
                  size="md"
                  onClick={handleRefreshStatus}
                  disabled={isRefreshing}
                  className="w-full h-11 flex items-center justify-center gap-2 text-xs"
                >
                  <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
                  <span>{isRefreshing ? 'Checking status...' : 'Refresh verification status'}</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/dashboard')}
                  className="w-full text-foreground/60 hover:text-foreground text-xs"
                >
                  Back to Dashboard
                </Button>
              </div>
            </div>
          )}

          {/* Main Cardless Verification Process (Not Approved and Not Pending) */}
          {approvalStatus !== 'APPROVED' && approvalStatus !== 'PENDING' && (
            <div className="space-y-6">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-secondary/10 text-secondary font-semibold tracking-wider">
                    Step 1 of 2
                  </span>
                  <span className="text-xs text-foreground/40 font-medium">• Prior to Store Setup</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
                  Seller verification
                </h1>
                <p className="text-xs sm:text-sm text-foreground/60 leading-relaxed">
                  Verify your business credentials to unlock your storefront and automated Mobile Money payouts.
                </p>
              </div>

              <AnimatePresence mode="wait">
                {!selectedOption ? (
                  <motion.div
                    key="selection"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="space-y-2.5 pt-2"
                  >
                    {options.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => handleSelectOption(option.id)}
                        className="group w-full flex items-center gap-3.5 p-3.5 rounded-2xl bg-surface/70 hover:bg-surface border-0 shadow-xs text-left transition-all outline-none"
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${option.color}`}>
                          <option.icon size={20} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs sm:text-sm font-semibold text-foreground group-hover:text-secondary transition-colors">
                            {option.title}
                          </h4>
                          <p className="text-[11px] text-foreground/50 leading-relaxed truncate">
                            {option.description}
                          </p>
                        </div>
                        <ChevronRight size={16} className="text-foreground/30 group-hover:text-foreground transition-colors shrink-0" />
                      </button>
                    ))}
                  </motion.div>
                ) : (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="space-y-4 pt-2"
                  >
                    <button
                      type="button"
                      onClick={() => handleSelectOption(null)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground/50 hover:text-foreground transition-colors"
                    >
                      <ArrowLeft size={13} />
                      <span>Choose a different method</span>
                    </button>

                    <form onSubmit={onSubmit} className="space-y-4">
                      {error && <Alert variant="error" message={error} onDismiss={() => setError(null)} />}
                      {successMessage && <Alert variant="success" message={successMessage} className="mb-4" />}

                      {selectedOption === 'URL' && (
                        <div className="space-y-2">
                          <Input
                            label="Proof of sales Link"
                            placeholder="https://instagram.com/yourstore"
                            icon={<Link2 size={16} />}
                            error={(errors as any).verification_doc?.message}
                            registration={register('verification_doc' as any)}
                          />
                          <p className="text-[11px] text-foreground/45 leading-relaxed">
                            Provide a link to your Instagram store, TikTok shop, or a Google Drive folder with receipts.
                          </p>
                        </div>
                      )}

                      {selectedOption === 'FILES' && (
                        <div className="space-y-4">
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-foreground/80">
                              Ghana Card (ID)
                            </label>
                            <input
                              type="file"
                              id="idImage"
                              className="hidden"
                              accept="image/*,.pdf"
                              onChange={(e) => setIdFile(e.target.files?.[0] || null)}
                            />
                            <label
                              htmlFor="idImage"
                              className="flex items-center gap-3 p-3.5 rounded-xl bg-surface/80 hover:bg-surface border-0 shadow-xs cursor-pointer transition-all"
                            >
                              <FileText size={20} className={idFile ? 'text-secondary' : 'text-foreground/40'} />
                              <span className="text-xs text-foreground/80 truncate">
                                {idFile ? idFile.name : 'Choose ID photo or PDF'}
                              </span>
                            </label>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-foreground/80">
                              Proof of Sales / Inventory
                            </label>
                            <input
                              type="file"
                              id="salesProof"
                              className="hidden"
                              accept="image/*,.pdf"
                              onChange={(e) => setSalesFile(e.target.files?.[0] || null)}
                            />
                            <label
                              htmlFor="salesProof"
                              className="flex items-center gap-3 p-3.5 rounded-xl bg-surface/80 hover:bg-surface border-0 shadow-xs cursor-pointer transition-all"
                            >
                              <FileText size={20} className={salesFile ? 'text-secondary' : 'text-foreground/40'} />
                              <span className="text-xs text-foreground/80 truncate">
                                {salesFile ? salesFile.name : 'Choose sales screenshot or PDF'}
                              </span>
                            </label>
                          </div>
                        </div>
                      )}

                      {selectedOption === 'CONTACT' && (
                        <div className="space-y-2.5">
                          <button
                            type="button"
                            onClick={() => window.open('https://wa.me/233534065652', '_blank')}
                            className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-medium text-xs transition-all text-left"
                          >
                            <MessageSquare size={18} />
                            <span>Message us on WhatsApp (+233 53 406 5652)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => window.open('mailto:support@verndly.market', '_blank')}
                            className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-surface/80 hover:bg-surface text-foreground font-medium text-xs transition-all text-left"
                          >
                            <Mail size={18} />
                            <span>Email support@verndly.market</span>
                          </button>
                        </div>
                      )}

                      {selectedOption !== 'CONTACT' && (
                        <div className="pt-2">
                          <Button
                            type="submit"
                            variant="primary"
                            size="md"
                            className="w-full h-11"
                            isLoading={isSubmitting}
                            loadingText="Submitting..."
                          >
                            Submit verification
                          </Button>
                        </div>
                      )}
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Minimal Footer */}
        <div className="pt-8 mt-6 border-t border-border/40 flex items-center justify-between text-[11px] text-foreground/40">
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={13} className="text-emerald-500 shrink-0" />
            <span>256-bit SSL • Verified Platform</span>
          </div>
          <span className="font-mono text-foreground/30">v1.0</span>
        </div>
      </div>

      {/* Right Column: Full-Height Showcase Area (70%) */}
      <AuthShowcase
        headline="Verified sellers earn 3x more"
        highlightWords="buyer trust."
        description="Our verification seal protects your brand reputation, eliminates transaction fraud, and unlocks instant Mobile Money disbursements."
        testimonial={{
          quote:
            "Getting our verified seller badge transformed our sales. Buyers immediately trust our store because they know Verndly guarantees the rails.",
          author: "Abena Serwaa",
          role: "Founder, Serwaa Naturals",
          avatarText: "AS",
          metric: "Verified Merchant",
        }}
      />
    </div>
  );
}

export default function SellerVerificationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Spinner size="lg" />
        </div>
      }
    >
      <SellerVerificationContent />
    </Suspense>
  );
}
