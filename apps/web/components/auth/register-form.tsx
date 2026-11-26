'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRegisterForm } from '@/hooks/useAuth';
import { authApi } from '@/lib/api/auth';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import PasswordStrength from '@/components/auth/PasswordStrength';
import GoogleSignInButton from '@/components/auth/GoogleSignInButton';
import { AuthDivider } from '@/components/auth/AuthPageShell';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { guardPhoneKeyDown, PHONE_DIGIT_LIMIT, sanitizeSubscriberNumber } from '@/lib/utils/phone';
import { AnimatePresence, motion } from 'framer-motion';

interface RegisterFormProps {
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
}

export default function RegisterForm({ onSuccess, onSwitchToLogin }: RegisterFormProps) {
  const { form, onSubmit, isLoading, error, clearError } = useRegisterForm();
  const [step, setStep] = useState<'details' | 'password'>('details');
  const [success, setSuccess] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendFeedback, setResendFeedback] = useState<string | null>(null);
  const {
    register,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = form;

  const accountType = watch('account_type');
  const emailValue = watch('email');
  const isSeller = accountType === 'SELLER';

  const handleNextStep = async () => {
    clearError();
    const fields: Array<'account_type' | 'full_name' | 'email' | 'phone' | 'school'> = [
      'account_type',
      'full_name',
      'email',
      'phone',
    ];
    if (isSeller) fields.push('school');

    const valid = await trigger(fields);
    if (valid) {
      setStep('password');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 'details') {
      await handleNextStep();
      return;
    }
    try {
      const ok = await onSubmit(e);
      if (ok) setSuccess(true);
    } catch {
      // API error handled by context
    }
  };

  const handleResend = async () => {
    if (!emailValue || resending) return;
    setResending(true);
    setResendFeedback(null);
    try {
      await authApi.resendVerification(emailValue);
      setResendFeedback(
        'A fresh verification link has been sent. Please check your inbox and spam folder.',
      );
    } catch (err: any) {
      setResendFeedback(err?.message || 'Could not resend right now. Please try again shortly.');
    } finally {
      setResending(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center gap-5 py-6 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 220, delay: 0.1 }}
          className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
        >
          <CheckCircle size={32} />
        </motion.div>
        <div>
          <h3 className="text-foreground text-xl font-semibold tracking-tight">Check your email</h3>
          <p className="text-foreground/60 mx-auto mt-1.5 max-w-sm text-xs leading-relaxed">
            We&apos;ve sent a verification link to{' '}
            <span className="text-foreground font-medium">
              {emailValue || 'your email address'}
            </span>
            . Tap the link in your inbox (or spam folder) to activate your account.
          </p>
          {resendFeedback && (
            <p className="mt-2.5 text-xs text-emerald-600 dark:text-emerald-400">
              {resendFeedback}
            </p>
          )}
        </div>
        <div className="w-full space-y-3 pt-2">
          <Button
            onClick={() => (onSuccess ? onSuccess() : (window.location.href = '/login'))}
            variant="primary"
            size="md"
            className="h-11 w-full"
          >
            Got it, sign in
          </Button>
          {emailValue && (
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="text-foreground/75 hover:text-foreground block w-full py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
            >
              {resending ? 'Sending another link…' : "Didn't receive it? Resend verification email"}
            </button>
          )}
          <button
            type="button"
            onClick={() =>
              onSwitchToLogin ? onSwitchToLogin() : (window.location.href = '/login')
            }
            className="text-foreground/60 hover:text-foreground block w-full text-xs font-medium transition-colors hover:underline"
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {step === 'details' && (
        <>
          <GoogleSignInButton label="Continue with Google" />
          <AuthDivider />
        </>
      )}

      <form onSubmit={handleSubmit} className="w-full space-y-4">
        {error && <Alert variant="error" message={error} className="mb-4" onDismiss={clearError} />}

        <AnimatePresence mode="wait" initial={false}>
          {step === 'details' ? (
            <motion.div
              key="step-details"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="space-y-4"
            >
              {/* Account type — quiet segmented control */}
              <input type="hidden" {...register('account_type')} />
              <div
                role="radiogroup"
                aria-label="Account type"
                className="bg-foreground/[0.04] grid grid-cols-2 gap-1 rounded-xl p-1"
              >
                {[
                  { value: 'BUYER', label: 'I want to shop' },
                  { value: 'SELLER', label: 'I want to sell' },
                ].map((opt) => {
                  const active = accountType === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() =>
                        setValue('account_type', opt.value as 'BUYER' | 'SELLER', {
                          shouldValidate: true,
                        })
                      }
                      className={`h-9 rounded-lg text-[13px] transition-all ${
                        active
                          ? 'bg-background text-foreground font-medium shadow-[0_1px_2px_rgba(0,0,0,0.06),0_0_0_1px_rgba(0,0,0,0.04)]'
                          : 'text-foreground/50 hover:text-foreground/80'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              <Input
                label="Full name"
                placeholder="Kwame Mensah"
                autoComplete="name"
                error={errors.full_name?.message}
                registration={register('full_name')}
              />

              <Input
                label="Email"
                type="email"
                placeholder="name@example.com"
                autoComplete="email"
                inputMode="email"
                error={errors.email?.message}
                registration={register('email')}
              />

              {/* Phone with +233 prefix */}
              <div className="w-full text-left">
                <label
                  htmlFor="register-phone"
                  className="text-foreground/80 mb-1.5 block text-xs font-medium tracking-tight"
                >
                  Phone
                </label>
                <div
                  className={`bg-input-bg group relative flex h-11 w-full items-center rounded-xl border transition-all duration-200 ${
                    errors.phone
                      ? 'border-red-500/80 focus-within:border-red-500'
                      : 'border-input-border hover:border-foreground/30 focus-within:border-secondary focus-within:bg-background'
                  }`}
                >
                  <span className="text-foreground/50 flex h-full shrink-0 select-none items-center pl-3.5 pr-2 text-sm">
                    +233
                  </span>
                  <input
                    id="register-phone"
                    {...register('phone', {
                      onChange: (e) => {
                        e.target.value = sanitizeSubscriberNumber(e.target.value);
                      },
                    })}
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    maxLength={PHONE_DIGIT_LIMIT - 1}
                    onKeyDown={(e) => guardPhoneKeyDown(e, PHONE_DIGIT_LIMIT - 1)}
                    placeholder="244 123 456"
                    aria-label="Phone number without leading zero"
                    className="text-foreground selection:bg-secondary/20 placeholder:text-foreground/40 h-full flex-1 bg-transparent pr-3.5 text-sm font-normal outline-none"
                  />
                </div>
                {errors.phone?.message && (
                  <p className="mt-1.5 text-xs font-medium text-red-500">
                    {String(errors.phone.message)}
                  </p>
                )}
              </div>

              {isSeller && (
                <Input
                  label="Store name"
                  placeholder="Accra Kicks & Threads"
                  autoComplete="organization"
                  error={errors.school?.message}
                  registration={register('school')}
                />
              )}

              <div className="pt-2">
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  className="h-11 w-full"
                  onClick={handleNextStep}
                >
                  Next
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="step-password"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="space-y-4"
            >
              {/* Back to Step 1 + email summary */}
              <div className="border-border/60 bg-surface/50 flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-xs">
                <button
                  type="button"
                  onClick={() => setStep('details')}
                  className="text-foreground/60 hover:text-foreground inline-flex items-center gap-1.5 font-medium transition-colors"
                >
                  <ArrowLeft size={13} />
                  <span>Back</span>
                </button>
                <span className="text-foreground/50 truncate pl-3">{emailValue}</span>
              </div>

              <Input
                label="Password"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                autoFocus
                error={errors.password?.message}
                registration={register('password')}
              />

              <PasswordStrength value={form.watch('password') || ''} />

              <Input
                label="Confirm password"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                error={errors.confirmPassword?.message}
                registration={register('confirmPassword')}
              />

              {/* Consent */}
              <div className="space-y-2.5 pt-1">
                <label className="text-foreground/55 flex cursor-pointer select-none items-start gap-2.5 text-xs">
                  <input
                    type="checkbox"
                    className="border-border accent-foreground mt-px h-4 w-4 shrink-0 cursor-pointer rounded"
                    {...register('accept_terms')}
                  />
                  <span className="leading-snug">
                    I agree to the{' '}
                    <Link
                      href="/terms"
                      target="_blank"
                      className="text-foreground underline-offset-4 hover:underline"
                    >
                      Terms
                    </Link>{' '}
                    and{' '}
                    <Link
                      href="/privacy"
                      target="_blank"
                      className="text-foreground underline-offset-4 hover:underline"
                    >
                      Privacy Policy
                    </Link>
                  </span>
                </label>
                {errors.accept_terms?.message && (
                  <p className="pl-6 text-xs font-medium text-red-500">
                    {String(errors.accept_terms.message)}
                  </p>
                )}

                <label className="text-foreground/55 flex cursor-pointer select-none items-start gap-2.5 text-xs">
                  <input
                    type="checkbox"
                    className="border-border accent-foreground mt-px h-4 w-4 shrink-0 cursor-pointer rounded"
                    {...register('marketing_opt_in')}
                  />
                  <span className="leading-snug">Send me occasional product updates</span>
                </label>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  className="h-11 w-full"
                  isLoading={isLoading}
                  loadingText="Creating account..."
                >
                  Create account
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-foreground/50 pt-4 text-center text-sm">
          Already have an account?{' '}
          {onSwitchToLogin ? (
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="text-foreground font-medium underline-offset-4 hover:underline"
            >
              Sign in
            </button>
          ) : (
            <Link
              href="/login"
              className="text-foreground font-medium underline-offset-4 hover:underline"
            >
              Sign in
            </Link>
          )}
        </p>
      </form>
    </div>
  );
}
