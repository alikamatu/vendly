'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useResetPasswordForm } from '@/hooks/useAuth';
import { authApi } from '@/lib/api/auth';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import AuthShowcase from '@/components/auth/AuthShowcase';
import { Lock, CheckCircle, ArrowLeft, ShieldCheck } from 'lucide-react';
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

  return (
    <div className="flex flex-col lg:flex-row min-h-screen w-full">
      {/* Left Column: Form Section (~30%) */}
      <div className="w-full lg:w-[32%] xl:w-[30%] min-h-screen lg:h-screen flex flex-col justify-between p-6 sm:p-10 xl:p-12 overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden bg-background z-10">
        <div>
          {/* Top Brand & Back Nav */}
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
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground/50 hover:text-foreground transition-colors group"
            >
              <ArrowLeft size={13} className="transition-transform group-hover:-translate-x-0.5" />
              <span>Back to sign in</span>
            </Link>
          </div>

          {!token ? (
            <div className="space-y-4 py-8">
              <Alert
                variant="error"
                message="No reset token provided or the link has expired. Please request a new link."
              />
              <Link href="/forgot-password" className="block pt-2">
                <Button variant="secondary" size="md" className="w-full h-11">
                  Request new reset link
                </Button>
              </Link>
            </div>
          ) : success ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-4 py-8 text-center"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500 shadow-xs">
                <CheckCircle size={32} />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-xl font-semibold tracking-tight text-foreground">
                  Password updated
                </h2>
                <p className="text-xs text-foreground/60 leading-relaxed max-w-xs mx-auto">
                  Your password has been changed successfully. You can now sign in with your new credentials.
                </p>
              </div>
              <div className="w-full pt-6">
                <Link href="/login" className="block w-full">
                  <Button variant="primary" size="md" className="w-full h-11">
                    Sign in to Verndly
                  </Button>
                </Link>
              </div>
            </motion.div>
          ) : (
            <>
              {/* Heading */}
              <div className="space-y-1.5 mb-6">
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
                  Set new password
                </h1>
                <p className="text-xs sm:text-sm text-foreground/60 leading-relaxed">
                  Create a strong password with at least 8 characters.
                </p>
              </div>

              {/* Form */}
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
                  icon={<Lock size={16} />}
                  error={errors.newPassword?.message}
                  registration={register('newPassword')}
                />

                <Input
                  label="Confirm new password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  icon={<Lock size={16} />}
                  error={errors.confirmPassword?.message}
                  registration={register('confirmPassword')}
                />

                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    className="w-full h-11"
                    isLoading={isLoading}
                    loadingText="Updating..."
                  >
                    Update password
                  </Button>
                </div>
              </form>
            </>
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
        headline="Protected access for your"
        highlightWords="store and earnings."
        description="Multi-factor authentication, end-to-end credential protection, and automated session invalidation keep your business safe."
        testimonial={{
          quote:
            "Setting up and protecting our store was seamless. Verndly gives us the confidence that our payouts and customer data are secure.",
          author: "Nana Yaa Osei",
          role: "Founder, Glow Cosmetics • Independent Brand",
          avatarText: "NY",
          metric: "Enterprise security",
        }}
      />
    </div>
  );
}
