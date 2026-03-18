'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useVerificationForm } from '@/hooks/useAuth';
import { authApi } from '@/lib/api/auth';
import { Container } from '@/components';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import Spinner from '@/components/ui/Spinner';
import PageTransition from '@/components/common/PageTransition';
import { StaggerContainer, StaggerItem } from '@/components/common/FormFieldAnimation';
import {
  Link2,
  Clock,
  CheckCircle,
  ShieldCheck,
  Globe,
  FileText,
  MessageSquare,
  ArrowLeft,
  ExternalLink,
  Phone,
  Mail,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type VerificationOption = 'URL' | 'FILES' | 'CONTACT' | null;

export default function SellerVerificationPage() {
  const { user, token, isLoading: authLoading, refreshUser } = useAuth();
  const router = useRouter();
  const { form } = useVerificationForm();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<VerificationOption>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = form;

  const currentType = watch('type');

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !token) {
      router.replace('/register');
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
      setSuccessMessage('Verification request submitted successfully!');
      await refreshUser();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  });

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!token) return null;

  const approvalStatus = user?.approval_status;

  const options = [
    {
      id: 'URL' as const,
      title: 'Submit Store URL',
      description: 'Provide a link to your store (Instagram, Shopify, etc.)',
      icon: Globe,
      color: 'bg-blue-500',
    },
    {
      id: 'FILES' as const,
      title: 'Upload ID & Evidence',
      description: 'Upload National ID and sales proof directly',
      icon: FileText,
      color: 'bg-purple-500',
    },
    {
      id: 'CONTACT' as const,
      title: 'Contact Vendly',
      description: 'Request manual verification via WhatsApp or Email',
      icon: MessageSquare,
      color: 'bg-emerald-500',
    },
  ];

  const handleSelectOption = (option: VerificationOption) => {
    setSelectedOption(option);
    if (option) setValue('type', option as any);
  };

  return (
    <Container className="flex min-h-screen items-center justify-center px-4 py-8 md:py-16">
      <PageTransition>
        <div className="mx-auto w-full max-w-lg">
          {/* Header */}
          <div className="mb-10 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
              className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner"
            >
              <ShieldCheck size={40} />
            </motion.div>
            <h1 className="text-3xl font-extrabold tracking-tight">Seller Verification</h1>
            <p className="mt-3 text-base text-foreground/60 leading-relaxed">
              Verify your business to start selling. Choose the most convenient method for you.
            </p>
          </div>

          {/* Status display */}
          {approvalStatus === 'APPROVED' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 flex flex-col items-center gap-4 rounded-2xl bg-emerald-50 p-8 text-center border border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-900/20"
            >
              <div className="rounded-full bg-emerald-100 p-3 dark:bg-emerald-800/30">
                <CheckCircle size={48} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-emerald-800 dark:text-emerald-400">Verified Successfully!</h3>
                <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-400/80">
                  Your seller account is now active. You can start listing products and growing your business.
                </p>
              </div>
              <Button variant="primary" onClick={() => router.push('/')} className="mt-4 w-full">
                Go to Dashboard
              </Button>
            </motion.div>
          )}

          {approvalStatus === 'PENDING' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 flex flex-col items-center gap-4 rounded-2xl bg-amber-50 p-8 text-center border border-amber-100 dark:bg-amber-900/10 dark:border-amber-900/20"
            >
              <div className="rounded-full bg-amber-100 p-3 dark:bg-amber-800/30">
                <Clock size={48} className="text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-amber-800 dark:text-amber-400">Verification Pending</h3>
                <p className="mt-2 text-sm text-amber-700 dark:text-amber-400/80">
                  We're currently reviewing your submission. This usually takes 24-48 hours.
                </p>
              </div>
              <Button variant="secondary" onClick={() => router.push('/')} className="mt-4 w-full">
                Back to Dashboard
              </Button>
            </motion.div>
          )}

          {/* Verification Process */}
          {approvalStatus !== 'APPROVED' && approvalStatus !== 'PENDING' && (
            <div className="space-y-6">
              <AnimatePresence mode="wait">
                {!selectedOption ? (
                  <motion.div
                    key="selection"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="grid gap-4"
                  >
                    {options.map((option) => (
                      <button
                        key={option.id}
                        onClick={() => handleSelectOption(option.id)}
                        className="group relative flex items-center gap-4 rounded-2xl border border-foreground/5 p-5 text-left transition-all hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5 dark:bg-foreground/5 dark:hover:bg-foreground/10"
                      >
                        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${option.color} shadow-lg shadow-${option.color}/20`}>
                          <option.icon size={24} />
                        </div>
                        <div className="grow">
                          <h4 className="font-bold text-foreground">{option.title}</h4>
                          <p className="text-sm text-foreground/50">{option.description}</p>
                        </div>
                        <ExternalLink size={20} className="text-foreground/20 transition-colors group-hover:text-primary" />
                      </button>
                    ))}
                  </motion.div>
                ) : (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-6"
                  >
                    <button
                      onClick={() => handleSelectOption(null)}
                      className="flex items-center gap-2 text-sm font-semibold text-foreground/40 transition-colors hover:text-primary"
                    >
                      <ArrowLeft size={16} />
                      Choose different method
                    </button>

                    <div className="rounded-2xl border border-foreground/5 p-6 shadow-sm dark:bg-foreground/5">
                      <form onSubmit={onSubmit} className="space-y-6">
                        {error && <Alert variant="error" message={error} onDismiss={() => setError(null)} />}
                        {successMessage && <Alert variant="success" message={successMessage} className="mb-4" />}

                        <StaggerContainer className="space-y-6">
                          {selectedOption === 'URL' && (
                            <StaggerItem>
                              <Input
                                label="Proof of sales Link"
                                placeholder="https://instagram.com/yourstore"
                                icon={<Link2 size={18} />}
                                error={(errors as any).verification_doc?.message}
                                registration={register('verification_doc' as any)}
                              />
                              <p className="mt-2 text-xs text-foreground/40 leading-relaxed">
                                Provide a link to your existing storefront, social media shop, or a Google Drive folder with evidence.
                              </p>
                            </StaggerItem>
                          )}

                          {selectedOption === 'FILES' && (
                            <StaggerItem className="space-y-6">
                              <div className="space-y-4">
                                <label className="block text-sm font-bold text-foreground">National ID Card</label>
                                <input
                                  type="file"
                                  id="idImage"
                                  className="hidden"
                                  accept="image/*,.pdf"
                                  onChange={(e) => setIdFile(e.target.files?.[0] || null)}
                                />
                                <label
                                  htmlFor="idImage"
                                  className={`flex aspect-video w-full flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all cursor-pointer ${
                                    idFile ? 'border-primary bg-primary/5' : 'border-foreground/10 bg-foreground/5 hover:border-primary/50'
                                  }`}
                                >
                                  <FileText size={32} className={idFile ? 'text-primary' : 'text-foreground/20'} />
                                  <span className={`mt-2 text-xs font-medium text-center px-4 ${idFile ? 'text-primary' : 'text-foreground/40'}`}>
                                    {idFile ? idFile.name : 'Tap to upload your ID card\n(Front & Back)'}
                                  </span>
                                </label>
                              </div>
                              <div className="space-y-4">
                                <label className="block text-sm font-bold text-foreground">Proof of Sales</label>
                                <input
                                  type="file"
                                  id="salesProof"
                                  className="hidden"
                                  accept="image/*,.pdf"
                                  onChange={(e) => setSalesFile(e.target.files?.[0] || null)}
                                />
                                <label
                                  htmlFor="salesProof"
                                  className={`flex aspect-video w-full flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all cursor-pointer ${
                                    salesFile ? 'border-primary bg-primary/5' : 'border-foreground/10 bg-foreground/5 hover:border-primary/50'
                                  }`}
                                >
                                  <FileText size={32} className={salesFile ? 'text-primary' : 'text-foreground/20'} />
                                  <span className={`mt-2 text-xs font-medium text-center px-4 ${salesFile ? 'text-primary' : 'text-foreground/40'}`}>
                                    {salesFile ? salesFile.name : 'Upload screenshots of previous sales or inventory'}
                                  </span>
                                </label>
                              </div>
                              <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                                * Filing fake documents will lead to permanent account suspension.
                              </p>
                            </StaggerItem>
                          )}

                          {selectedOption === 'CONTACT' && (
                            <StaggerItem className="space-y-6">
                              <div className="grid gap-3">
                                <button
                                  type="button"
                                  onClick={() => window.open('https://wa.me/233534065652', '_blank')}
                                  className="flex items-center gap-4 rounded-xl bg-emerald-500 p-4 shadow-lg shadow-emerald-500/20 transition-transform active:scale-95"
                                >
                                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                                    <MessageSquare size={20} />
                                  </div>
                                  <div className="text-left font-bold">WhatsApp Support</div>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => window.open('tel:+233534065652', '_blank')}
                                  className="flex items-center gap-4 rounded-xl bg-blue-500 p-4 shadow-lg shadow-blue-500/20 transition-transform active:scale-95"
                                >
                                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                                    <Phone size={20} />
                                  </div>
                                  <div className="text-left font-bold">Call Us Directly</div>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => window.open('mailto:support@vendly-omega.vercel.app', '_blank')}
                                  className="flex items-center gap-4 rounded-xl bg-slate-800 p-4 shadow-lg shadow-slate-800/20 transition-transform active:scale-95"
                                >
                                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                                    <Mail size={20} />
                                  </div>
                                  <div className="text-left font-bold">Email Support</div>
                                </button>
                              </div>
                              <div className="text-center p-4 rounded-xl bg-foreground/5">
                                <p className="text-xs font-medium text-foreground/50">
                                  Our team will guide you through the manual verification process once you reach out.
                                </p>
                              </div>
                            </StaggerItem>
                          )}
                        </StaggerContainer>

                        {selectedOption !== 'CONTACT' && (
                          <Button
                            type="submit"
                            variant="primary"
                            className="w-full py-4 text-base font-bold shadow-lg shadow-primary/20"
                            isLoading={isSubmitting}
                          >
                            Submit Application
                          </Button>
                        )}
                      </form>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* User info footer */}
          {user && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-12 flex items-center gap-3 rounded-2xl border border-foreground/5 bg-foreground/5 p-4 text-left"
            >
              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                {user.full_name.charAt(0)}
              </div>
              <div className="grow">
                <p className="text-sm font-bold text-foreground">{user.full_name}</p>
                <p className="text-xs text-foreground/40">{user.email}</p>
              </div>
              <div className="px-2 py-1 rounded-md bg-foreground/5 text-[10px] font-black uppercase text-foreground/40 tracking-wider">
                {user.role}
              </div>
            </motion.div>
          )}
        </div>
      </PageTransition>
    </Container>
  );
}
