'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useForgotPasswordForm } from '@/hooks/useAuth';
import { authApi } from '@/lib/api/auth';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import AuthPageShell from '@/components/auth/AuthPageShell';
import { ArrowLeft, Check } from 'lucide-react';
import { motion } from 'framer-motion';

function BackLink() {
  return (
    <Link
      href="/login"
      className="text-foreground/50 hover:text-foreground group inline-flex items-center gap-1.5 text-sm transition-colors"
    >
      <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-0.5" />
      Back
    </Link>
  );
}

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
      setError(err.message || 'Unable to process request. Please try again.');
    } finally {
      setIsLoading(false);
    }
  });

  if (sent) {
    return (
      <AuthPageShell topRight={<BackLink />}>
        <div className="flex flex-col items-center text-center">
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            className="bg-foreground text-background mb-8 grid h-14 w-14 place-items-center rounded-full"
          >
            <Check size={26} strokeWidth={2.5} />
          </motion.div>
          <h1 className="text-foreground text-[28px] font-semibold leading-tight tracking-[-0.02em] sm:text-[32px]">
            Check your inbox
          </h1>
          <p className="text-foreground/55 mt-2 text-sm">We&apos;ve sent you a reset link.</p>

          <div className="mt-10 w-full space-y-3">
            <Link href="/login" className="block w-full">
              <Button variant="primary" size="md" className="h-11 w-full">
                Back to sign in
              </Button>
            </Link>
            <button
              type="button"
              onClick={() => setSent(false)}
              className="text-foreground/50 hover:text-foreground w-full py-2 text-sm transition-colors"
            >
              Use a different email
            </button>
          </div>
        </div>
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell
      title="Reset password"
      subtitle="We'll email you a link to reset it."
      topRight={<BackLink />}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {error && (
          <Alert
            variant="error"
            message={error}
            className="mb-2"
            onDismiss={() => setError(null)}
          />
        )}

        <Input
          label="Email"
          type="email"
          placeholder="name@example.com"
          autoComplete="email"
          inputMode="email"
          error={errors.email?.message}
          registration={register('email')}
        />

        <div className="pt-2">
          <Button
            type="submit"
            variant="primary"
            size="md"
            className="h-11 w-full"
            isLoading={isLoading}
            loadingText="Sending..."
          >
            Send reset link
          </Button>
        </div>
      </form>
    </AuthPageShell>
  );
}
