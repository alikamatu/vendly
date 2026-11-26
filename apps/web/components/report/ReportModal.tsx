'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flag, X, CheckCircle2, ShieldAlert, LogIn, Loader2 } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from '@/lib/contexts/auth-context';
import {
  PRODUCT_REPORT_REASONS,
  SELLER_REPORT_REASONS,
  reportApi,
  type ReportReason,
  type ReportTargetType,
} from '@/lib/api/report';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: ReportTargetType;
  targetId: string;
  targetName: string;
}

export default function ReportModal({
  isOpen,
  onClose,
  targetType,
  targetId,
  targetName,
}: ReportModalProps) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const reasons = targetType === 'PRODUCT' ? PRODUCT_REPORT_REASONS : SELLER_REPORT_REASONS;

  const [selectedReason, setSelectedReason] = useState<ReportReason | ''>('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedReason('');
    setDetails('');
    setSubmitted(false);
  }, [isOpen, targetId, targetType]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      router.push(`/auth/login?redirect=${encodeURIComponent(pathname || '/')}`);
      return;
    }
    if (!selectedReason) {
      toast.error('Please choose a reason for your report.');
      return;
    }

    setSubmitting(true);
    try {
      await reportApi.submitReport({
        target_type: targetType,
        ...(targetType === 'PRODUCT' ? { product_id: targetId } : { seller_id: targetId }),
        reason: selectedReason,
        details: details.trim() || undefined,
      });
      setSubmitted(true);
      toast.success('Report sent to Verndly Trust & Safety.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit report';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="report-modal-title"
        >
          {/* Backdrop */}
          <div onClick={onClose} className="fixed inset-0">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="h-full w-full bg-black/60 backdrop-blur-[2px]"
            />
          </div>

          {/* Centered Modal Surface */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: 'spring', stiffness: 360, damping: 30 }}
            className="bg-background relative z-10 flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-[28px]"
          >
            {/* Header */}
            <div className="bg-surface/60 flex items-start justify-between gap-3 px-6 py-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500">
                  <Flag className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0">
                  <h2
                    id="report-modal-title"
                    className="text-foreground text-base font-semibold tracking-tight"
                  >
                    Report {targetType === 'PRODUCT' ? 'Product' : 'Seller'}
                  </h2>
                  <p className="text-muted mt-0.5 truncate text-xs">{targetName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close report modal"
                className="text-muted hover:bg-surface hover:text-foreground flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {!user ? (
                <div className="space-y-4 py-4 text-center">
                  <div className="bg-surface mx-auto flex h-14 w-14 items-center justify-center rounded-2xl">
                    <ShieldAlert className="text-foreground h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-foreground text-sm font-semibold">
                      Sign in to submit a report
                    </p>
                    <p className="text-muted mx-auto max-w-xs text-xs leading-relaxed">
                      We link reports to verified buyer accounts so our Trust &amp; Safety team can
                      follow up and prevent abuse.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      router.push(`/auth/login?redirect=${encodeURIComponent(pathname || '/')}`)
                    }
                    className="bg-foreground text-background inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-6 text-xs font-semibold transition-opacity hover:opacity-90"
                  >
                    <LogIn className="h-4 w-4" />
                    Sign in to continue
                  </button>
                </div>
              ) : submitted ? (
                <div className="space-y-4 py-6 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
                    <CheckCircle2 className="h-7 w-7" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-foreground text-base font-semibold">Report received</h3>
                    <p className="text-muted mx-auto max-w-sm text-xs leading-relaxed">
                      Thanks for looking out for the Verndly community. Our Trust &amp; Safety team
                      has been notified and will review{' '}
                      <span className="text-foreground font-medium">{targetName}</span>. Your
                      identity is never shared with the seller.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="bg-foreground text-background mt-2 inline-flex h-11 items-center justify-center rounded-2xl px-6 text-xs font-semibold transition-opacity hover:opacity-90"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <form id="report-form" onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-muted block text-[11px] font-semibold uppercase tracking-wider">
                      What&apos;s wrong?
                    </label>
                    <div className="space-y-2">
                      {reasons.map((item) => {
                        const active = selectedReason === item.value;
                        return (
                          <button
                            key={item.value}
                            type="button"
                            onClick={() => setSelectedReason(item.value)}
                            className={`flex w-full items-start gap-3 rounded-2xl px-4 py-3 text-left transition-colors ${
                              active
                                ? 'bg-foreground text-background'
                                : 'bg-surface/70 text-foreground hover:bg-surface'
                            }`}
                          >
                            <span
                              className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                                active
                                  ? 'border-background bg-background/20'
                                  : 'border-muted-foreground/40'
                              }`}
                            >
                              {active && <span className="bg-background h-2 w-2 rounded-full" />}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold">{item.label}</p>
                              <p
                                className={`mt-0.5 text-[11px] leading-snug ${
                                  active ? 'text-background/75' : 'text-muted'
                                }`}
                              >
                                {item.hint}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="report-details"
                      className="text-muted block text-[11px] font-semibold uppercase tracking-wider"
                    >
                      Additional details (optional)
                    </label>
                    <textarea
                      id="report-details"
                      rows={3}
                      maxLength={2000}
                      value={details}
                      onChange={(e) => setDetails(e.target.value)}
                      placeholder="Share anything that helps our team verify this issue (e.g. discrepancies, chat claims, order ID)..."
                      className="bg-surface text-foreground placeholder:text-muted focus:ring-foreground/20 w-full resize-none rounded-2xl px-4 py-3 text-xs leading-relaxed focus:outline-none focus:ring-2"
                    />
                  </div>

                  <p className="text-muted text-[11px] leading-relaxed">
                    Reports are confidential. False or abusive reports may result in account
                    restrictions.
                  </p>
                </form>
              )}
            </div>

            {/* Footer actions when form active */}
            {user && !submitted && (
              <div className="bg-surface/40 flex items-center justify-end gap-2.5 px-6 py-4">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  className="bg-surface text-foreground hover:bg-surface/80 h-11 rounded-2xl px-5 text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="report-form"
                  disabled={!selectedReason || submitting}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-rose-600 px-5 text-xs font-semibold text-white transition-opacity hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Submit Report
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
