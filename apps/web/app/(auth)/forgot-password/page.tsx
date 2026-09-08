'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useForgotPasswordForm } from '@/hooks/useAuth';
import { authApi } from '@/lib/api/auth';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import AuthShowcase from '@/components/auth/AuthShowcase';
import { Mail, ArrowLeft, CheckCircle2, ShieldCheck } from 'lucide-react';
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
      setError(err.message || 'Unable to process request. Please try again.');
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

          {sent ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-4 py-8 text-center"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500 shadow-xs">
                <CheckCircle2 size={32} />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-xl font-semibold tracking-tight text-foreground">
                  Check your email
                </h2>
                <p className="text-xs text-foreground/60 leading-relaxed max-w-xs mx-auto">
                  If an account exists with that email, we&apos;ve sent a password reset link. Check your inbox and spam folder.
                </p>
              </div>
              <div className="w-full space-y-3 pt-6">
                <Link href="/login" className="block w-full">
                  <Button variant="primary" size="md" className="w-full h-11">
                    Return to sign in
                  </Button>
                </Link>
                <button
                  type="button"
                  onClick={() => setSent(false)}
                  className="text-xs font-medium text-secondary hover:underline"
                >
                  Try another email address
                </button>
              </div>
            </motion.div>
          ) : (
            <>
              {/* Heading */}
              <div className="space-y-1.5 mb-6">
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
                  Reset password
                </h1>
                <p className="text-xs sm:text-sm text-foreground/60 leading-relaxed">
                  Enter your email address and we&apos;ll send you a recovery link.
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
                  label="Email address"
                  type="email"
                  placeholder="kwame@example.com"
                  autoComplete="email"
                  inputMode="email"
                  icon={<Mail size={16} />}
                  error={errors.email?.message}
                  registration={register('email')}
                />

                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    className="w-full h-11"
                    isLoading={isLoading}
                    loadingText="Sending link..."
                  >
                    Send reset link
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
        headline="Account security engineered"
        highlightWords="for modern commerce."
        description="Bank-grade encryption, instant email recovery, and multi-layered fraud protection for your store and payouts."
        testimonial={{
          quote:
            "Verndly keeps account security airtight without slowing down operations. Payouts and credentials are fully protected.",
          author: "Emmanuel Darko",
          role: "Store Manager, TechHaven • KNUST",
          avatarText: "ED",
          metric: "100% secure rails",
        }}
      />
    </div>
  );
}
