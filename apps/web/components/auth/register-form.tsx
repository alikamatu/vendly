'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRegisterForm } from '@/hooks/useAuth';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import PasswordStrength from '@/components/auth/PasswordStrength';
import GoogleSignInButton from '@/components/auth/GoogleSignInButton';
import { Mail, Lock, User as UserIcon, CheckCircle, Building, ShoppingBag, Store, Phone } from 'lucide-react';
import { motion } from 'framer-motion';

interface RegisterFormProps {
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
}

export default function RegisterForm({ onSuccess, onSwitchToLogin }: RegisterFormProps) {
  const { form, onSubmit, isLoading, error, clearError } = useRegisterForm();
  const [success, setSuccess] = useState(false);
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = form;

  const accountType = watch('account_type');
  const isSeller = accountType === 'SELLER';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const ok = await onSubmit(e);
      if (ok) setSuccess(true);
    } catch {
      // API error handled by context
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center gap-5 py-6 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 220, delay: 0.1 }}
          className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-500 dark:bg-emerald-900/20 dark:text-emerald-400 border border-emerald-500/20 shadow-sm"
        >
          <CheckCircle size={32} />
        </motion.div>
        <div>
          <h3 className="text-xl font-semibold text-foreground tracking-tight">Check your email</h3>
          <p className="mt-1.5 text-xs text-foreground/60 leading-relaxed max-w-sm mx-auto">
            We&apos;ve sent a verification link to your email address. Tap the link in your inbox to activate your account and sign in.
          </p>
        </div>
        <div className="w-full space-y-3 pt-2">
          <Button 
            onClick={() => onSuccess ? onSuccess() : (window.location.href = '/login')} 
            variant="primary" 
            size="md"
            className="w-full h-11"
          >
            Got it, sign in
          </Button>
          <button
            type="button"
            onClick={() => onSwitchToLogin ? onSwitchToLogin() : (window.location.href = '/login')}
            className="block w-full text-xs font-medium text-foreground/60 hover:text-foreground transition-colors hover:underline"
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <GoogleSignInButton label="Sign up with Google" />

      <div className="my-5 flex items-center gap-3 text-[11px] font-medium uppercase tracking-wider text-foreground/40">
        <div className="h-px flex-1 bg-border/80" />
        <span>or sign up with email</span>
        <div className="h-px flex-1 bg-border/80" />
      </div>

      <form onSubmit={handleSubmit} className="w-full space-y-4">
        {error && <Alert variant="error" message={error} className="mb-4" onDismiss={clearError} />}

        {/* Account Type Segmented Toggle */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-foreground/80 tracking-tight">
            I want to use Verndly to
          </label>
          <input type="hidden" {...register('account_type')} />
          <div className="grid grid-cols-2 gap-2 rounded-xl border border-input-border bg-input-bg p-1">
            {[
              { value: 'BUYER', label: 'Shop & Discover', desc: 'Browse verified vendors', icon: ShoppingBag },
              { value: 'SELLER', label: 'Sell & Grow', desc: 'Open my own storefront', icon: Store },
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
                  className={`flex flex-col items-center justify-center text-center p-2.5 rounded-lg text-xs transition-all ${
                    active
                      ? 'bg-background text-foreground font-semibold border border-border'
                      : 'text-foreground/60 hover:text-foreground hover:bg-surface'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Icon size={14} className={active ? 'text-accent' : 'text-foreground/40'} />
                    <span>{opt.label}</span>
                  </div>
                  <span className="text-[10px] text-foreground/40 font-normal mt-0.5">{opt.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        <Input
          label="Full name"
          placeholder="e.g. Kwame Mensah"
          icon={<UserIcon size={16} />}
          autoComplete="name"
          error={errors.full_name?.message}
          registration={register('full_name')}
        />

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

        {/* All-bordered Phone Input with +233 prefix */}
        <div className="w-full text-left">
          <label className="mb-1.5 block text-xs font-medium text-foreground/80 tracking-tight">
            Phone number (Ghana)
          </label>
          <div
            className={`group relative flex items-center w-full h-11 rounded-xl transition-all duration-200 border bg-input-bg shadow-[0_1px_2px_rgba(0,0,0,0.04)] ${
              errors.phone
                ? 'border-red-500/80 focus-within:border-red-500'
                : 'border-input-border hover:border-foreground/30 focus-within:border-secondary focus-within:bg-background'
            }`}
          >
            {/* Country code prefix */}
            <div className="flex items-center gap-1.5 px-3 h-full border-r border-border text-xs font-semibold text-foreground/75 bg-foreground/[0.02] select-none shrink-0">
              <span className="text-base leading-none">🇬🇭</span>
              <span>+233</span>
            </div>

            <input
              {...register('phone', {
                onChange: (e) => {
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
              aria-label="Phone number without leading zero"
              className="h-full flex-1 bg-transparent px-3 text-sm text-foreground placeholder:text-foreground/40 outline-none font-normal selection:bg-secondary/20"
            />
          </div>
          {errors.phone?.message ? (
            <p className="mt-1.5 text-xs font-medium text-red-500">
              {String(errors.phone.message)}
            </p>
          ) : (
            <p className="mt-1.5 text-[11px] text-foreground/50">
              Used for secure order alerts, 2FA, and instant mobile payouts.
            </p>
          )}
        </div>

        {isSeller && (
          <Input
            label="Store / Brand name"
            placeholder="e.g. Accra Kicks & Threads"
            icon={<Building size={16} />}
            autoComplete="organization"
            hint="This will appear on your public store and product listings."
            error={errors.school?.message}
            registration={register('school')}
          />
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Password"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            icon={<Lock size={16} />}
            error={errors.password?.message}
            registration={register('password')}
          />

          <Input
            label="Confirm password"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            icon={<Lock size={16} />}
            error={errors.confirmPassword?.message}
            registration={register('confirmPassword')}
          />
        </div>

        <PasswordStrength value={form.watch('password') || ''} />

        {/* Terms of Service + Privacy Policy */}
        <div className="space-y-2 pt-1">
          <label className="flex items-start gap-2.5 text-xs text-foreground/70 cursor-pointer select-none">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-border text-secondary focus:ring-secondary/30 accent-secondary cursor-pointer"
              {...register('accept_terms')}
            />
            <span className="leading-snug">
              I agree to Verndly&apos;s{' '}
              <Link href="/terms" target="_blank" className="font-medium text-secondary hover:underline">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/privacy" target="_blank" className="font-medium text-secondary hover:underline">
                Privacy Policy
              </Link>
              .
            </span>
          </label>
          {errors.accept_terms?.message && (
            <p className="text-xs text-red-500 font-medium pl-6">
              {String(errors.accept_terms.message)}
            </p>
          )}

          <label className="group flex items-start gap-3 text-xs text-foreground/75 cursor-pointer select-none rounded-xl p-2.5 border border-border/60 hover:border-border transition-colors bg-surface/30 hover:bg-surface/60">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-border text-accent focus:ring-accent/30 accent-accent cursor-pointer shrink-0"
              {...register('marketing_opt_in')}
            />
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground text-xs">Newsletter & updates</span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-foreground/5 text-foreground/50 font-semibold tracking-wider">
                  Optional
                </span>
              </div>
              <p className="text-[11px] text-foreground/50 leading-relaxed">
                Receive product announcements, seller playbooks, and platform updates. Zero spam, unsubscribe anytime.
              </p>
            </div>
          </label>
        </div>

        <div className="pt-2">
          <Button
            type="submit"
            variant="primary"
            size="md"
            className="w-full h-11"
            isLoading={isLoading}
            loadingText="Creating account..."
          >
            Create account
          </Button>
        </div>

        <div className="pt-2 text-center text-xs text-foreground/60 flex items-center justify-between">
          <span>Already have an account?</span>
          {onSwitchToLogin ? (
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="font-medium text-accent hover:underline"
            >
              Sign in instead
            </button>
          ) : (
            <Link href="/login" className="font-medium text-accent hover:underline">
              Sign in instead
            </Link>
          )}
        </div>

        <p className="pt-2 text-center text-[11px] text-foreground/40">
          Trouble signing up?{' '}
          <a
            href="mailto:support@verndly.app?subject=Sign-up%20issue"
            className="text-foreground/60 hover:text-foreground underline transition-colors"
          >
            Contact support
          </a>
        </p>
      </form>
    </div>
  );
}