'use client';

import React, { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useResetPasswordForm } from '@/hooks/useAuth';
import { authApi } from '@/lib/api/auth';
import { Container } from '@/components';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import ProgressBar from '@/components/ui/ProgressBar';
import PageTransition from '@/components/common/PageTransition';
import { StaggerContainer, StaggerItem } from '@/components/common/FormFieldAnimation';
import { Lock, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const { form } = useResetPasswordForm();
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = form;

  const onSubmit = handleSubmit(async (data) => {
    if (!token) {
      setError('Missing reset token. Please use the link from your email.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await authApi.resetPassword(token, data.newPassword);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  });

  if (!token) {
    return (
      <Container className="flex min-h-screen items-center justify-center py-8">
        <PageTransition>
          <div className="mx-auto max-w-md text-center">
            <Alert variant="error" message="No reset token provided. Please use the link from your email." />
            <a href="/forgot-password">
              <Button variant="secondary" className="mt-4">
                Request new reset link
              </Button>
            </a>
          </div>
        </PageTransition>
      </Container>
    );
  }

  return (
    <Container className="flex min-h-screen items-center justify-center py-8">
      <PageTransition>
        <div className="mx-auto w-full max-w-md">
          {success ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-4 py-8 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
              >
                <CheckCircle size={32} />
              </motion.div>
              <h2 className="text-xl font-normal">Password Reset!</h2>
              <p className="max-w-sm text-sm text-foreground/60">
                Your password has been reset successfully. You can now sign in with your new password.
              </p>
              <a href="/register">
                <Button variant="primary" size="lg" className="mt-2">
                  Sign in
                </Button>
              </a>
            </motion.div>
          ) : (
            <>
              <div className="mb-6">
                <h1 className="text-2xl font-normal">Reset your password</h1>
                <p className="mt-2 text-sm text-foreground/60">
                  Enter your new password below.
                </p>
              </div>

              {isLoading && <ProgressBar className="mb-4" />}

              <form onSubmit={onSubmit} className="space-y-5">
                {error && <Alert variant="error" message={error} onDismiss={() => setError(null)} />}

                <StaggerContainer className="space-y-5">
                  <StaggerItem>
                    <Input
                      label="New password"
                      type="password"
                      autoComplete="new-password"
                      placeholder="••••••••"
                      icon={<Lock size={18} />}
                      error={errors.newPassword?.message}
                      registration={register('newPassword')}
                    />
                  </StaggerItem>

                  <StaggerItem>
                    <Input
                      label="Confirm new password"
                      type="password"
                      autoComplete="new-password"
                      placeholder="••••••••"
                      icon={<Lock size={18} />}
                      error={errors.confirmPassword?.message}
                      registration={register('confirmPassword')}
                    />
                  </StaggerItem>
                </StaggerContainer>

                <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
                  Reset password
                </Button>
              </form>
            </>
          )}
        </div>
      </PageTransition>
    </Container>
  );
}
