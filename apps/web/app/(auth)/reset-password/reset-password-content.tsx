'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useResetPasswordForm } from '@/hooks/useAuth';
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
      <AuthPageShell
        title="Link expired"
        subtitle="Request a new link to reset your password."
        topRight={<BackLink />}
      >
        <div className="space-y-4">
          <Link href="/forgot-password" className="block">
            <Button variant="primary" size="md" className="h-11 w-full">
              Request new link
            </Button>
          </Link>
        </div>
      </AuthPageShell>
    );
  }

  if (success) {
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
            Password updated
          </h1>
          <p className="text-foreground/55 mt-2 text-sm">
            You can now sign in with your new password.
          </p>
          <div className="mt-10 w-full">
            <Link href="/login" className="block w-full">
              <Button variant="primary" size="md" className="h-11 w-full">
                Sign in
              </Button>
            </Link>
          </div>
        </div>
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell
      title="New password"
      subtitle="Choose a strong password for your account."
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
          label="New password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          error={errors.newPassword?.message}
          registration={register('newPassword')}
        />

        <Input
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          error={errors.confirmPassword?.message}
          registration={register('confirmPassword')}
        />

        <div className="pt-2">
          <Button
            type="submit"
            variant="primary"
            size="md"
            className="h-11 w-full"
            isLoading={isLoading}
            loadingText="Updating..."
          >
            Update password
          </Button>
        </div>
      </form>
    </AuthPageShell>
  );
}
