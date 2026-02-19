'use client';

import React, { useState } from 'react';
import { useLoginForm } from '@/hooks/useAuth';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import ProgressBar from '@/components/ui/ProgressBar';
import { StaggerContainer, StaggerItem } from '@/components/common/FormFieldAnimation';
import { Mail, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function LoginForm() {
  const { form, onSubmit, isLoading, error, clearError } = useLoginForm();
  const { user } = useAuth();
  const router = useRouter();
  const {
    register,
    formState: { errors },
  } = form;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onSubmit(e);
    } catch {
      // error is handled by context
    }
  };

  // Redirect after successful login
  React.useEffect(() => {
    if (user && !isLoading) {
      if (user.approval_status === 'APPROVED') {
        router.push('/');
      } else {
        router.push('/seller-verification');
      }
    }
  }, [user, isLoading, router]);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {isLoading && <ProgressBar className="mb-4" />}

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && <Alert variant="error" message={error} onDismiss={clearError} />}

        <StaggerContainer className="space-y-5">
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
              label="Password"
              type="password"
              placeholder="••••••••"
              icon={<Lock size={18} />}
              error={errors.password?.message}
              registration={register('password')}
            />
          </StaggerItem>
        </StaggerContainer>

        <div className="text-right">
          <a href="/forgot-password" className="text-sm text-accent hover:underline transition">
            Forgot password?
          </a>
        </div>

        <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
          {isLoading ? 'Signing in...' : 'Sign in'}
        </Button>
      </form>
    </motion.div>
  );
}