'use client';

import React, { useState } from 'react';
import { useRegisterForm } from '@/hooks/useAuth';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import ProgressBar from '@/components/ui/ProgressBar';
import { Mail, Lock, User as UserIcon, CheckCircle, Building } from 'lucide-react';
import { motion } from 'framer-motion';

export default function RegisterForm() {
  const { form, onSubmit, isLoading, error, clearError } = useRegisterForm();
  const [success, setSuccess] = useState(false);
  const {
    register,
    formState: { errors },
  } = form;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onSubmit(e);
      setSuccess(true);
    } catch {
      // error handled by context
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
          <h3 className="text-xl font-semibold">Check your email</h3>
          <p className="mt-2 text-sm text-foreground/60 leading-relaxed">
            We&apos;ve sent a verification link to your email address. Please verify your account before signing in.
          </p>
        </div>
        <a href="/login" className="text-sm font-medium text-accent hover:underline">
          Back to sign in
        </a>
      </div>
    );
  }

  return (
    <div className="w-full">
      {isLoading && <ProgressBar className="mb-4" />}

      <form onSubmit={handleSubmit} className="w-full space-y-8">
        {error && <Alert variant="error" message={error} onDismiss={clearError} />}

        <div className="space-y-6">
          <Input
            label="Full name"
            icon={<UserIcon size={18} />}
            error={errors.full_name?.message}
            registration={register('full_name')}
          />

          <Input
            label="Email"
            type="email"
            icon={<Mail size={18} />}
            error={errors.email?.message}
            registration={register('email')}
          />

          <Input
            label="Business name"
            icon={<Building size={18} />}
            error={errors.school?.message}
            registration={register('school')}
          />

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Input
              label="Password"
              type="password"
              icon={<Lock size={18} />}
              error={errors.password?.message}
              registration={register('password')}
            />

            <Input
              label="Confirm"
              type="password"
              icon={<Lock size={18} />}
              error={errors.confirmPassword?.message}
              registration={register('confirmPassword')}
            />
          </div>
        </div>

        <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
          {isLoading ? 'Creating account...' : 'Create account'}
        </Button>
      </form>
    </div>
  );
}