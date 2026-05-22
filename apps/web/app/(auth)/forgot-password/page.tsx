'use client';

import React, { useState } from 'react';
import { useForgotPasswordForm } from '@/hooks/useAuth';
import { authApi } from '@/lib/api/auth';
import { Container } from '@/components';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import ProgressBar from '@/components/ui/ProgressBar';
import PageTransition from '@/components/common/PageTransition';
import { StaggerContainer, StaggerItem } from '@/components/common/FormFieldAnimation';
import { Mail, ArrowLeft, Send } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ForgotPasswordPage() {
  const { form } = useForgotPasswordForm();
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = form;

  const onSubmit = handleSubmit(async (data) => {
    setIsLoading(true);
    setError(null);
    try {
      await authApi.forgotPassword(data.email);
      setSent(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  });

  return (
    <Container className="flex min-h-screen items-center justify-center py-8">
      <PageTransition>
        <div className="mx-auto w-full max-w-md">
          <a
            href="/register"
            className="mb-6 inline-flex items-center gap-1 text-sm text-foreground/50 hover:text-foreground transition"
          >
            <ArrowLeft size={16} /> Back to sign in
          </a>

          {sent ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-4 py-8 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
              >
                <Send size={28} />
              </motion.div>
              <h2 className="text-xl font-normal">Check your email</h2>
              <p className="max-w-sm text-sm text-foreground/60">
                If an account exists with that email address, we&apos;ve sent a password reset link. Please check your
                inbox and spam folder.
              </p>
              <a href="/register" className="mt-2 text-sm font-medium text-accent hover:underline">
                Back to sign in
              </a>
            </motion.div>
          ) : (
            <>
              <div className="mb-6">
                <h1 className="text-2xl font-normal">Forgot your password?</h1>
                <p className="mt-2 text-sm text-foreground/60">
                  Enter your email address and we&apos;ll send you a link to reset your password.
                </p>
              </div>

              {isLoading && <ProgressBar className="mb-4" />}

              <form onSubmit={onSubmit} className="space-y-5">
                {error && <Alert variant="error" message={error} onDismiss={() => setError(null)} />}

                <StaggerContainer className="space-y-5">
                  <StaggerItem>
                    <Input
                      label="Email address"
                      type="email"
                      placeholder="you@example.com"
                      icon={<Mail size={18} />}
                      error={errors.email?.message}
                      registration={register('email')}
                    />
                  </StaggerItem>
                </StaggerContainer>

                <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
                  Send reset link
                </Button>
              </form>
            </>
          )}
        </div>
      </PageTransition>
    </Container>
  );
}
