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
import ProgressBar from '@/components/ui/ProgressBar';
import PageTransition from '@/components/common/PageTransition';
import { StaggerContainer, StaggerItem } from '@/components/common/FormFieldAnimation';
import { Link2, Clock, CheckCircle, XCircle, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SellerVerificationPage() {
  const { user, token, isLoading: authLoading, refreshUser } = useAuth();
  const router = useRouter();
  const { form } = useVerificationForm();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = form;

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !token) {
      router.replace('/login');
    }
  }, [authLoading, token, router]);

  const onSubmit = handleSubmit(async (data) => {
    if (!token) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await authApi.submitVerification(token, data.verification_doc);
      setSuccessMessage(res.message);
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

  return (
    <Container className="flex min-h-screen items-center justify-center py-8">
      <PageTransition>
        <div className="mx-auto w-full max-w-lg">
          {/* Header */}
          <div className="mb-8 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
              className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 text-accent"
            >
              <ShieldCheck size={32} />
            </motion.div>
            <h1 className="text-2xl font-bold">Seller Verification</h1>
            <p className="mt-2 text-sm text-foreground/60">
              To start selling on Vendly, please provide proof of your sales activity for verification.
            </p>
          </div>

          {/* Status display */}
          {approvalStatus === 'APPROVED' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 flex flex-col items-center gap-3 rounded-xl bg-emerald-50 p-6 text-center dark:bg-emerald-900/20"
            >
              <CheckCircle size={40} className="text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-lg font-semibold text-emerald-700 dark:text-emerald-400">Verified!</h3>
              <p className="text-sm text-emerald-600 dark:text-emerald-400/80">
                Your seller verification has been approved. You can now access the full marketplace.
              </p>
              <Button variant="primary" onClick={() => router.push('/')} className="mt-2">
                Go to Dashboard
              </Button>
            </motion.div>
          )}

          {approvalStatus === 'PENDING' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 flex flex-col items-center gap-3 rounded-xl bg-amber-50 p-6 text-center dark:bg-amber-900/20"
            >
              <Clock size={40} className="text-amber-600 dark:text-amber-400" />
              <h3 className="text-lg font-semibold text-amber-700 dark:text-amber-400">Under Review</h3>
              <p className="text-sm text-amber-600 dark:text-amber-400/80">
                Your verification request is being reviewed by our team. You&apos;ll be notified once a decision is
                made.
              </p>
            </motion.div>
          )}

          {approvalStatus === 'REJECTED' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 flex flex-col items-center gap-3 rounded-xl bg-red-50 p-6 text-center dark:bg-red-900/20"
            >
              <XCircle size={40} className="text-red-600 dark:text-red-400" />
              <h3 className="text-lg font-semibold text-red-700 dark:text-red-400">Verification Rejected</h3>
              <p className="text-sm text-red-600 dark:text-red-400/80">
                Your previous submission was not approved. Please submit new proof of sales below.
              </p>
            </motion.div>
          )}

          {/* Form — show when no pending/approved status */}
          {approvalStatus !== 'PENDING' && approvalStatus !== 'APPROVED' && (
            <>
              {isSubmitting && <ProgressBar className="mb-4" />}

              {successMessage && (
                <Alert variant="success" message={successMessage} className="mb-4" />
              )}

              <form onSubmit={onSubmit} className="space-y-5">
                {error && <Alert variant="error" message={error} onDismiss={() => setError(null)} />}

                <StaggerContainer className="space-y-5">
                  <StaggerItem>
                    <Input
                      label="Proof of sales (URL)"
                      placeholder="https://drive.google.com/..."
                      icon={<Link2 size={18} />}
                      error={errors.verification_doc?.message}
                      registration={register('verification_doc')}
                    />
                    <p className="mt-1.5 text-xs text-foreground/40">
                      Provide a link to documents proving your sales activity (e.g., Google Drive, Dropbox).
                    </p>
                  </StaggerItem>
                </StaggerContainer>

                <Button type="submit" variant="primary" className="w-full" isLoading={isSubmitting}>
                  Submit for verification
                </Button>
              </form>
            </>
          )}

          {/* Logged in user info */}
          {user && (
            <div className="mt-8 rounded-lg bg-foreground/5 p-4">
              <p className="text-xs text-foreground/40">Signed in as</p>
              <p className="text-sm font-medium">{user.full_name}</p>
              <p className="text-xs text-foreground/50">{user.email}</p>
            </div>
          )}
        </div>
      </PageTransition>
    </Container>
  );
}
