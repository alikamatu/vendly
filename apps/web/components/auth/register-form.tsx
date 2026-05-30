'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRegisterForm } from '@/hooks/useAuth';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import ProgressBar from '@/components/ui/ProgressBar';
import PasswordStrength from '@/components/auth/PasswordStrength';
import GoogleSignInButton from '@/components/auth/GoogleSignInButton';
import { Mail, Lock, User as UserIcon, CheckCircle, Building, ShoppingBag, Store, Phone } from 'lucide-react';
import { motion } from 'framer-motion';

interface RegisterFormProps {
  onSuccess?: () => void;
}

export default function RegisterForm({ onSuccess }: RegisterFormProps) {
  const { form, onSubmit, isLoading, error, clearError } = useRegisterForm();
  const [success, setSuccess] = useState(false);
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = form;
  // Watching the field so the Business-name input shows/hides reactively.
  // `account_type` is on the form schema; default is BUYER (set in
  // useRegisterForm).
  const accountType = watch('account_type');
  const isSeller = accountType === 'SELLER';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const ok = await onSubmit(e);
      // Only show the "check your email" screen when the API call really
      // completed. `onSubmit` returns false when react-hook-form's resolver
      // rejected the input — those errors are shown inline beside each field.
      if (ok) setSuccess(true);
    } catch {
      // API error already surfaced via the auth-context error state.
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center gap-6 py-8 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
          className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-500 dark:bg-emerald-900/10 dark:text-emerald-400"
        >
          <CheckCircle size={40} />
        </motion.div>
        <div>
          <h3 className="text-xl font-normal">Check your email</h3>
          <p className="mt-2 text-sm text-foreground/60 leading-relaxed">
            We&apos;ve sent a verification link to your email address. Please verify your account before signing in.
          </p>
        </div>
        <div className="w-full space-y-4">
          <Button 
            onClick={() => onSuccess ? onSuccess() : (window.location.href = '/register')} 
            variant="primary" 
            className="w-full"
          >
            Got it, continue
          </Button>
          <a href="/register" className="block text-sm font-medium text-accent hover:underline">
            Back to sign in
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {isLoading && <ProgressBar className="mb-4" />}

      <GoogleSignInButton label="Sign up with Google" />
      <div className="my-6 flex items-center gap-3 text-[10px] uppercase tracking-wider text-foreground/40">
        <div className="h-px flex-1 bg-border" />
        or use your email
        <div className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handleSubmit} className="w-full space-y-8">
        {error && <Alert variant="error" message={error} onDismiss={clearError} />}

        <div className="space-y-6">
          {/* Account-type toggle — drives whether the business name field
              is required. Buyers shop; sellers also pre-fill their store
              name so verification can pre-populate later. Backend assigns
              role=USER either way; SELLER role only comes after admin
              approval of the verification submission. */}
          <div>
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-foreground/60">
              I&apos;m signing up to
            </p>
            <input type="hidden" {...register('account_type')} />
            <div className="grid grid-cols-2 gap-2 rounded-2xl border border-border bg-surface/40 p-1">
              {[
                { value: 'BUYER', label: 'Shop on Verndly', icon: ShoppingBag },
                { value: 'SELLER', label: 'Sell on Verndly', icon: Store },
              ].map((opt) => {
                const Icon = opt.icon;
                const active = accountType === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() =>
                      setValue('account_type', opt.value as 'BUYER' | 'SELLER', {
                        shouldValidate: true,
                      })
                    }
                    className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-medium transition-all ${
                      active
                        ? 'bg-red-500 text-white shadow-sm'
                        : 'text-foreground/60 hover:text-foreground'
                    }`}
                  >
                    <Icon size={14} />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <Input
            label="Full name"
            icon={<UserIcon size={18} />}
            autoComplete="name"
            error={errors.full_name?.message}
            registration={register('full_name')}
          />

          <Input
            label="Email"
            type="email"
            autoComplete="email"
            inputMode="email"
            icon={<Mail size={18} />}
            error={errors.email?.message}
            registration={register('email')}
          />

          {/* Phone — Ghana +233 enforced. We render +233 as a static
              prefix and bind react-hook-form to a parallel hidden input
              so the value the schema sees never includes the prefix or
              a leading "0" (we strip it as the user types). Backend
              re-normalises via libphonenumber regardless. */}
          <div className="space-y-1.5">
            <div className="flex items-end gap-2">
              <div className="flex items-center gap-2 pb-2 text-sm text-foreground/70 border-b border-foreground/15 select-none">
                <Phone size={16} className="text-foreground/40" />
                <span className="font-medium">+233</span>
              </div>
              <input
                {...register('phone', {
                  onChange: (e) => {
                    // Live-strip non-digits + a leading "0" so the user
                    // never sees the invalid prefix in their own input.
                    const v = e.target.value.replace(/\D/g, '').replace(/^0+/, '');
                    if (v !== e.target.value) {
                      e.target.value = v;
                    }
                  },
                })}
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder="244 123 456"
                aria-label="Phone number"
                className="flex-1 bg-transparent px-0 py-2 text-foreground border-b border-foreground/15 focus:border-accent focus:outline-none transition-colors"
              />
            </div>
            {errors.phone?.message ? (
              <p className="text-xs text-red-500">
                {String(errors.phone.message)}
              </p>
            ) : (
              <p className="text-[11px] text-foreground/40">
                We&apos;ll text you order alerts (Pro sellers) and security codes.
              </p>
            )}
          </div>

          {isSeller && (
            <Input
              label="Business name"
              icon={<Building size={18} />}
              autoComplete="organization"
              error={errors.school?.message}
              registration={register('school')}
            />
          )}

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Input
              label="Password"
              type="password"
              autoComplete="new-password"
              icon={<Lock size={18} />}
              error={errors.password?.message}
              registration={register('password')}
            />

            <Input
              label="Confirm"
              type="password"
              autoComplete="new-password"
              icon={<Lock size={18} />}
              error={errors.confirmPassword?.message}
              registration={register('confirmPassword')}
            />
          </div>

          <PasswordStrength value={form.watch('password') || ''} />

          {/* Terms of Service + Privacy Policy */}
          <div className="space-y-2">
            <label className="flex items-start gap-2 text-xs text-foreground/70 cursor-pointer select-none">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-border accent-accent"
                {...register('accept_terms')}
              />
              <span>
                I agree to Verndly&apos;s{' '}
                <Link href="/terms" target="_blank" className="text-accent hover:underline">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy" target="_blank" className="text-accent hover:underline">
                  Privacy Policy
                </Link>
                .
              </span>
            </label>
            {errors.accept_terms?.message && (
              <p className="text-xs text-red-500 pl-6">
                {String(errors.accept_terms.message)}
              </p>
            )}

            <label className="flex items-start gap-2 text-xs text-foreground/60 cursor-pointer select-none">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-border accent-accent"
                {...register('marketing_opt_in')}
              />
              <span>Send me occasional product news and seller tips. (Optional)</span>
            </label>
          </div>
        </div>

        <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
          {isLoading ? 'Creating account...' : 'Create account'}
        </Button>

        <p className="text-center text-[11px] text-foreground/50">
          Trouble signing up?{' '}
          <a
            href="mailto:support@verndly.com?subject=Sign-up%20issue"
            className="text-accent hover:underline"
          >
            Contact support
          </a>
          .
        </p>
      </form>
    </div>
  );
}