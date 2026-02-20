'use client';

import React from 'react';
import { useLoginForm } from '@/hooks/useAuth';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import ProgressBar from '@/components/ui/ProgressBar';
import { Mail, Lock } from 'lucide-react';
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
    <div className="w-full">
      {isLoading && <ProgressBar className="mb-4" />}

      <form onSubmit={handleSubmit} className="space-y-8">
        {error && <Alert variant="error" message={error} onDismiss={clearError} />}

        <div className="space-y-6">
          <Input
            label="Email"
            type="email"
            icon={<Mail size={18} />}
            error={errors.email?.message}
            registration={register('email')}
          />

          <Input
            label="Password"
            type="password"
            icon={<Lock size={18} />}
            error={errors.password?.message}
            registration={register('password')}
          />
        </div>

        <div className="text-left">
          <a href="/forgot-password" className="text-xs text-accent hover:underline transition">
            Forgot password?
          </a>
        </div>

        <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
          {isLoading ? 'Signing in...' : 'Sign in'}
        </Button>
      </form>
    </div>
  );
}