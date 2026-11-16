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
import AuthPageShell from '@/components/auth/AuthPageShell';
import {
  Link2,
  Clock,
  Check,
  Globe,
  FileText,
  MessageSquare,
  ArrowLeft,
  Mail,
  ChevronRight,
  RefreshCw,
  Store,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type VerificationOption = 'URL' | 'FILES' | 'CONTACT' | null;

function DashboardLink() {
  return (
    <Link
      href="/dashboard"
      className="text-foreground/50 hover:text-foreground group inline-flex items-center gap-1.5 text-sm transition-colors"
    >
      <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-0.5" />
      Dashboard
    </Link>
  );
}

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
      setSuccessMessage('Verification submitted. Once approved, you can set up your store.');
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
      <div className="flex min-h-screen w-full items-center justify-center">
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
      title: 'Store link',
      description: 'Instagram, TikTok, Shopify, or Drive',
      icon: Globe,
    },
    {
      id: 'FILES' as const,
      title: 'ID & sales proof',
      description: 'Ghana Card and recent receipts',
      icon: FileText,
    },
    {
      id: 'CONTACT' as const,
      title: 'Contact support',
      description: 'Manual review via WhatsApp or email',
      icon: MessageSquare,
    },
  ];

  const handleSelectOption = (option: VerificationOption) => {
    setSelectedOption(option);
    if (option) setValue('type', option as any);
  };

  return (
    <AuthPageShell topRight={<DashboardLink />}>
      {approvalStatus === 'APPROVED' && (
        <div className="flex flex-col items-center text-center">
          <div className="bg-foreground text-background mb-8 grid h-14 w-14 place-items-center rounded-full">
            <Check size={26} strokeWidth={2.5} />
          </div>
          <h1 className="text-foreground text-[28px] font-semibold leading-tight tracking-[-0.02em] sm:text-[32px]">
            Seller verified
          </h1>
          <p className="text-foreground/55 mt-2 text-sm">
            Your storefront and Mobile Money payouts are unlocked.
          </p>

          <div className="mt-10 w-full space-y-2.5">
            {!hasStore ? (
              <Button
                variant="primary"
                size="md"
                onClick={() => router.push('/create-store')}
                className="flex h-11 w-full items-center justify-center gap-2"
              >
                <Store size={16} />
                <span>Continue to store setup</span>
              </Button>
            ) : (
              <Button
                variant="primary"
                size="md"
                onClick={() => router.push('/dashboard')}
                className="h-11 w-full"
              >
                Go to dashboard
              </Button>
            )}
          </div>
        </div>
      )}

      {approvalStatus === 'PENDING' && (
        <div className="flex flex-col items-center text-center">
          <div className="mb-8 grid h-14 w-14 place-items-center rounded-full bg-amber-500/10 text-amber-500">
            <Clock size={26} />
          </div>
          <h1 className="text-foreground text-[28px] font-semibold leading-tight tracking-[-0.02em] sm:text-[32px]">
            Under review
          </h1>
          <p className="text-foreground/55 mt-2 text-sm">
            We&apos;re reviewing your details. Store creation unlocks automatically once approved.
          </p>

          <div className="mt-10 w-full space-y-2.5">
            <Button
              variant="secondary"
              size="md"
              onClick={handleRefreshStatus}
              disabled={isRefreshing}
              className="flex h-11 w-full items-center justify-center gap-2"
            >
              <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
              <span>{isRefreshing ? 'Checking…' : 'Refresh status'}</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/dashboard')}
              className="text-foreground/55 hover:text-foreground w-full text-sm"
            >
              Back to dashboard
            </Button>
          </div>
        </div>
      )}

      {approvalStatus !== 'APPROVED' && approvalStatus !== 'PENDING' && (
        <div className="space-y-6">
          <div className="space-y-2 text-center">
            <h1 className="text-foreground text-[28px] font-semibold leading-tight tracking-[-0.02em] sm:text-[32px]">
              Verify your seller account
            </h1>
            <p className="text-foreground/55 text-sm">
              {fromCreateStore
                ? 'Quick verification before opening your storefront.'
                : 'Choose how you want to verify your business.'}
            </p>
          </div>

          <AnimatePresence mode="wait">
            {!selectedOption ? (
              <motion.div
                key="selection"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="space-y-2.5"
              >
                {options.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleSelectOption(option.id)}
                    className="border-border/70 bg-surface/60 hover:border-foreground/30 hover:bg-surface group flex w-full items-center gap-3.5 rounded-2xl border p-4 text-left outline-none transition-colors"
                  >
                    <div className="bg-foreground/5 text-foreground grid h-10 w-10 shrink-0 place-items-center rounded-xl">
                      <option.icon size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-foreground text-sm font-medium">{option.title}</h4>
                      <p className="text-foreground/50 truncate text-xs">{option.description}</p>
                    </div>
                    <ChevronRight
                      size={16}
                      className="text-foreground/30 group-hover:text-foreground shrink-0 transition-colors"
                    />
                  </button>
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="space-y-4"
              >
                <button
                  type="button"
                  onClick={() => handleSelectOption(null)}
                  className="text-foreground/50 hover:text-foreground inline-flex items-center gap-1.5 text-xs transition-colors"
                >
                  <ArrowLeft size={13} />
                  <span>All methods</span>
                </button>

                <form onSubmit={onSubmit} className="space-y-4">
                  {error && (
                    <Alert variant="error" message={error} onDismiss={() => setError(null)} />
                  )}
                  {successMessage && <Alert variant="success" message={successMessage} />}

                  {selectedOption === 'URL' && (
                    <Input
                      label="Store or sales proof link"
                      placeholder="https://instagram.com/yourstore"
                      icon={<Link2 size={16} />}
                      error={(errors as any).verification_doc?.message}
                      registration={register('verification_doc' as any)}
                    />
                  )}

                  {selectedOption === 'FILES' && (
                    <div className="space-y-3">
                      <div>
                        <label className="text-foreground/80 mb-1.5 block text-xs font-medium">
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
                          className="border-input-border bg-input-bg hover:border-foreground/30 flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 transition-colors"
                        >
                          <FileText size={18} className="text-foreground/50" />
                          <span className="text-foreground/80 truncate text-sm">
                            {idFile ? idFile.name : 'Choose ID photo or PDF'}
                          </span>
                        </label>
                      </div>

                      <div>
                        <label className="text-foreground/80 mb-1.5 block text-xs font-medium">
                          Proof of sales or inventory
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
                          className="border-input-border bg-input-bg hover:border-foreground/30 flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 transition-colors"
                        >
                          <FileText size={18} className="text-foreground/50" />
                          <span className="text-foreground/80 truncate text-sm">
                            {salesFile ? salesFile.name : 'Choose screenshot or PDF'}
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
                        className="border-border/70 bg-surface/60 text-foreground hover:border-foreground/30 flex w-full items-center gap-3 rounded-xl border p-3.5 text-left text-sm font-medium transition-colors"
                      >
                        <MessageSquare size={18} />
                        <span>WhatsApp (+233 53 406 5652)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => window.open('mailto:support@verndly.market', '_blank')}
                        className="border-border/70 bg-surface/60 text-foreground hover:border-foreground/30 flex w-full items-center gap-3 rounded-xl border p-3.5 text-left text-sm font-medium transition-colors"
                      >
                        <Mail size={18} />
                        <span>support@verndly.market</span>
                      </button>
                    </div>
                  )}

                  {selectedOption !== 'CONTACT' && (
                    <div className="pt-2">
                      <Button
                        type="submit"
                        variant="primary"
                        size="md"
                        className="h-11 w-full"
                        isLoading={isSubmitting}
                        loadingText="Submitting..."
                      >
                        Submit
                      </Button>
                    </div>
                  )}
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </AuthPageShell>
  );
}

export default function SellerVerificationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen w-full items-center justify-center">
          <Spinner size="lg" />
        </div>
      }
    >
      <SellerVerificationContent />
    </Suspense>
  );
}
