'use client';

import React, { useState } from 'react';
import { useRegisterForm } from '@/hooks/useAuth';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import ProgressBar from '@/components/ui/ProgressBar';
import { StaggerContainer, StaggerItem } from '@/components/common/FormFieldAnimation';
import { Mail, Lock, User, School } from 'lucide-react';
import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';

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
        <h3 className="text-xl font-semibold">Check your email!</h3>
        <p className="max-w-sm text-sm text-foreground/60">
          We&apos;ve sent a verification link to your email address. Please click the link to verify your account before
          signing in.
        </p>
        <a href="/login" className="mt-2 text-sm font-medium text-accent hover:underline">
          Back to sign in
        </a>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {isLoading && <ProgressBar className="mb-4" />}

      <form onSubmit={handleSubmit} className="w-full space-y-5">
        {error && <Alert variant="error" message={error} onDismiss={clearError} />}

        <StaggerContainer className="space-y-5">
          <StaggerItem>
            <Input
              label="Full name"
              placeholder="John Doe"
              icon={<User size={18} />}
              error={errors.full_name?.message}
              registration={register('full_name')}
            />
          </StaggerItem>

          <StaggerItem>
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              icon={<Mail size={18} />}
              error={errors.email?.message}
              registration={register('email')}
            />
          </StaggerItem>

          <StaggerItem>
            <Input
              label="School"
              placeholder="University of Example"
              icon={<School size={18} />}
              error={errors.school?.message}
              registration={register('school')}
            />
          </StaggerItem>

          <StaggerItem>
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              icon={<Lock size={18} />}
              error={errors.password?.message}
              registration={register('password')}
            />
          </StaggerItem>

          <StaggerItem>
            <Input
              label="Confirm password"
              type="password"
              placeholder="••••••••"
              icon={<Lock size={18} />}
              error={errors.confirmPassword?.message}
              registration={register('confirmPassword')}
            />
          </StaggerItem>
        </StaggerContainer>

        <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
          {isLoading ? 'Creating account...' : 'Create account'}
        </Button>
      </form>
    </motion.div>
  );
}