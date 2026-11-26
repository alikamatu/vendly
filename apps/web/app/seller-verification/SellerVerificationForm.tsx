'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/contexts/auth-context';
import { useVerificationForm } from '@/hooks/useAuth';
import { authApi } from '@/lib/api/auth';
import { SUPPORT_CONTACT } from '@/lib/contact';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import Spinner from '@/components/ui/Spinner';
import VerndlyAiIcon from '@/components/ai/VerndlyAiIcon';
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
  ArrowRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type VerificationOption = 'URL' | 'FILES' | 'CONTACT' | null;

export default function SellerVerificationForm() {
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
  const [aiCoachHint, setAiCoachHint] = useState<string | null>(null);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [salesFile, setSalesFile] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = form;

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
      <div className="bg-surface flex flex-col items-center justify-center gap-3 rounded-3xl p-10 text-center">
        <Spinner size="md" />
        <p className="text-muted text-xs">Loading your verification status…</p>
      </div>
    );
  }

  // Gate ONLY the upload/submission form behind auth (TX-02): public readers see
  // a clear sign-in CTA instead of a blank redirect or spinner.
  if (!token) {
    return (
      <div className="bg-surface space-y-5 rounded-3xl p-6 text-center sm:p-8">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-accent)]">
            Ready to apply?
          </p>
          <h2 className="text-foreground text-xl font-semibold tracking-tight sm:text-2xl">
            Sign in to submit your verification
          </h2>
          <p className="text-muted mx-auto max-w-md text-xs leading-relaxed sm:text-sm">
            Create a free Verndly account or sign in to submit your store link, upload your Ghana
            Card and sales proof, or start a manual review with our Accra team.
          </p>
        </div>

        <div className="flex flex-col justify-center gap-2.5 sm:flex-row">
          <Link
            href="/register?redirect=/seller-verification"
            className="bg-foreground text-background inline-flex h-11 items-center justify-center gap-2 rounded-full px-6 text-xs font-semibold transition-opacity hover:opacity-90"
          >
            <span>Create seller account</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <Link
            href="/login?redirect=/seller-verification"
            className="bg-background text-foreground inline-flex h-11 items-center justify-center gap-2 rounded-full px-6 text-xs font-semibold transition-opacity hover:opacity-80"
          >
            <span>Sign in to continue</span>
          </Link>
        </div>
      </div>
    );
  }

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
    <div className="bg-surface rounded-3xl p-5 sm:p-8">
      {approvalStatus === 'APPROVED' && (
        <div className="mx-auto flex max-w-md flex-col items-center text-center">
          <div className="bg-foreground text-background mb-6 grid h-14 w-14 place-items-center rounded-full">
            <Check size={26} strokeWidth={2.5} />
          </div>
          <h2 className="text-foreground text-2xl font-medium tracking-tight">Seller verified</h2>
          <p className="text-muted mt-2 text-sm">
            Your storefront and Mobile Money payouts are unlocked.
          </p>

          <div className="mt-8 w-full space-y-2.5">
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
        <div className="mx-auto flex max-w-md flex-col items-center text-center">
          <div className="mb-6 grid h-14 w-14 place-items-center rounded-full bg-amber-500/10 text-amber-500">
            <Clock size={26} />
          </div>
          <h2 className="text-foreground text-2xl font-medium tracking-tight">Under review</h2>
          <p className="text-muted mt-2 text-sm">
            We&apos;re reviewing your details. Store creation unlocks automatically once approved
            (typically within 24–48 hours).
          </p>

          <div className="mt-8 w-full space-y-2.5">
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
              className="text-muted hover:text-foreground w-full text-sm"
            >
              Back to dashboard
            </Button>
          </div>
        </div>
      )}

      {approvalStatus !== 'APPROVED' && approvalStatus !== 'PENDING' && (
        <div className="mx-auto max-w-lg space-y-6">
          <div className="space-y-1.5 text-center">
            <h2 className="text-foreground text-xl font-semibold tracking-tight sm:text-2xl">
              Submit your verification
            </h2>
            <p className="text-muted text-xs sm:text-sm">
              {fromCreateStore
                ? 'Choose a verification track below before opening your storefront.'
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
                className="space-y-4"
              >
                {/* Verndly AI Fastest-Track Recommender */}
                <div className="bg-background space-y-2.5 rounded-2xl p-4">
                  <div className="flex items-center gap-2">
                    <VerndlyAiIcon size={18} animated={false} />
                    <span className="text-foreground text-xs font-semibold">
                      Verndly AI · Fastest way to get verified
                    </span>
                  </div>
                  <p className="text-muted text-xs leading-relaxed">
                    Tap what you already have — Verndly AI will open your fastest approval path:
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setAiCoachHint(
                          'Fastest track: paste your active Instagram, TikTok, Shopify, or catalog URL so reviewers can verify your live listings in minutes.',
                        );
                        handleSelectOption('URL');
                      }}
                      className="bg-surface text-foreground hover:bg-foreground hover:text-background rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors"
                    >
                      I have an IG / TikTok / Website
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAiCoachHint(
                          'No social storefront needed: upload a clear photo of your Ghana Card alongside a recent MoMo receipt or stock photo.',
                        );
                        handleSelectOption('FILES');
                      }}
                      className="bg-surface text-foreground hover:bg-foreground hover:text-background rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors"
                    >
                      I have Ghana Card + receipts
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAiCoachHint(
                          'Starting fresh? Message our Accra onboarding team directly on WhatsApp for a quick 1-on-1 verification check.',
                        );
                        handleSelectOption('CONTACT');
                      }}
                      className="bg-surface text-foreground hover:bg-foreground hover:text-background rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors"
                    >
                      I’m launching a new brand
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {options.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => {
                        setAiCoachHint(null);
                        handleSelectOption(option.id);
                      }}
                      className="bg-background hover:bg-foreground/[0.04] group flex w-full items-center gap-3.5 rounded-2xl p-4 text-left outline-none transition-colors"
                    >
                      <div className="bg-surface text-foreground grid h-10 w-10 shrink-0 place-items-center rounded-xl">
                        <option.icon size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-foreground text-sm font-medium">{option.title}</h3>
                        <p className="text-muted truncate text-xs">{option.description}</p>
                      </div>
                      <ChevronRight
                        size={16}
                        className="text-muted group-hover:text-foreground shrink-0 transition-colors"
                      />
                    </button>
                  ))}
                </div>
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
                  onClick={() => {
                    setAiCoachHint(null);
                    handleSelectOption(null);
                  }}
                  className="text-muted hover:text-foreground inline-flex items-center gap-1.5 text-xs transition-colors"
                >
                  <ArrowLeft size={13} />
                  <span>All methods</span>
                </button>

                {aiCoachHint && (
                  <Alert
                    variant="info"
                    message={aiCoachHint}
                    onDismiss={() => setAiCoachHint(null)}
                  />
                )}

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
                          className="bg-background hover:bg-foreground/[0.04] flex cursor-pointer items-center gap-3 rounded-xl p-3.5 transition-colors"
                        >
                          <FileText size={18} className="text-muted" />
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
                          className="bg-background hover:bg-foreground/[0.04] flex cursor-pointer items-center gap-3 rounded-xl p-3.5 transition-colors"
                        >
                          <FileText size={18} className="text-muted" />
                          <span className="text-foreground/80 truncate text-sm">
                            {salesFile ? salesFile.name : 'Choose screenshot or PDF'}
                          </span>
                        </label>
                      </div>
                    </div>
                  )}

                  {selectedOption === 'CONTACT' && (
                    <div className="space-y-2.5">
                      <a
                        href={SUPPORT_CONTACT.whatsappHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-background text-foreground hover:bg-foreground/[0.04] flex w-full items-center gap-3 rounded-xl p-3.5 text-left text-sm font-medium transition-colors"
                      >
                        <MessageSquare size={18} />
                        <span>WhatsApp ({SUPPORT_CONTACT.phoneDisplay})</span>
                      </a>
                      <a
                        href={SUPPORT_CONTACT.emailHref}
                        className="bg-background text-foreground hover:bg-foreground/[0.04] flex w-full items-center gap-3 rounded-xl p-3.5 text-left text-sm font-medium transition-colors"
                      >
                        <Mail size={18} />
                        <span>{SUPPORT_CONTACT.email}</span>
                      </a>
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
  );
}
