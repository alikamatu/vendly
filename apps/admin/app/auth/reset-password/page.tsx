'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { authService } from '@/services/auth.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { Logo } from '@/components/ui/logo';
import { Spinner } from '@/components/ui/spinner';

// ─── Password strength indicator ─────────────────────────────────
function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;

  const checks = [
    { label: '8+ characters', pass: password.length >= 8 },
    { label: 'Uppercase letter (A-Z)', pass: /[A-Z]/.test(password) },
    { label: 'Lowercase letter (a-z)', pass: /[a-z]/.test(password) },
    { label: 'Number or symbol (0-9, #$%)', pass: /[\d\W]/.test(password) },
  ];

  const passed = checks.filter((c) => c.pass).length;
  const strengthColors = ['bg-destructive', 'bg-warning', 'bg-warning', 'bg-success'];

  return (
    <div className="space-y-2">
      {/* Strength bars */}
      <div className="flex gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors duration-200 ${
              i < passed ? strengthColors[passed - 1] : 'bg-muted'
            }`}
          />
        ))}
      </div>

      {/* Checklist */}
      <div className="grid grid-cols-2 gap-1 pt-1">
        {checks.map((check) => (
          <span
            key={check.label}
            className={`text-[11px] font-medium transition-colors ${
              check.pass ? 'text-success' : 'text-muted-foreground/60'
            }`}
          >
            {check.pass ? '✓' : '○'} {check.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Reset Password Form (needs searchParams) ────────────────────
function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isTokenExpired, setIsTokenExpired] = useState(false);
  const [countdown, setCountdown] = useState(3);

  const isInvalidToken = !token || isTokenExpired;

  // Auto redirect countdown on success
  useEffect(() => {
    if (!isSuccess) return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.replace('/auth/login');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isSuccess, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    setErrors({});

    // Client-side validation against backend constraints
    const newErrors: { password?: string; confirm?: string } = {};

    if (!password) {
      newErrors.password = 'New password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (password.length > 32) {
      newErrors.password = 'Password cannot exceed 32 characters';
    } else if (!/[A-Z]/.test(password)) {
      newErrors.password = 'Must contain at least 1 uppercase letter';
    } else if (!/[a-z]/.test(password)) {
      newErrors.password = 'Must contain at least 1 lowercase letter';
    } else if (!/[\d\W]/.test(password)) {
      newErrors.password = 'Must contain at least 1 number or special character';
    }

    if (!confirmPassword) {
      newErrors.confirm = 'Please confirm your new password';
    } else if (password !== confirmPassword) {
      newErrors.confirm = 'Passwords do not match';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);

    try {
      await authService.resetPassword(token!, password);
      setIsSuccess(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Password reset failed';
      if (
        message.toLowerCase().includes('expired') ||
        message.toLowerCase().includes('invalid') ||
        message.toLowerCase().includes('jwt')
      ) {
        setIsTokenExpired(true);
      } else {
        setApiError(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Invalid or Missing Token State ─────────────────────────
  if (isInvalidToken) {
    return (
      <div className="space-y-8">
        <div className="space-y-3 text-center">
          <div className="flex justify-center">
            <Logo size="lg" />
          </div>
          <div className="space-y-1">
            <div className="bg-destructive/10 border-destructive/20 text-destructive inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide">
              Security Notice
            </div>
            <h1 className="text-foreground text-2xl font-bold tracking-tight">
              Invalid or Expired Link
            </h1>
            <p className="text-muted-foreground mx-auto max-w-[280px] text-[13px]">
              This password reset link is invalid or has already expired.
            </p>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25 }}
          className="space-y-6"
        >
          <div className="flex justify-center">
            <div className="bg-destructive/10 border-destructive/20 flex h-16 w-16 items-center justify-center rounded-2xl border">
              <AlertCircle className="text-destructive h-8 w-8" />
            </div>
          </div>

          <div className="text-muted-foreground space-y-2 text-center text-[13px]">
            <p>Password reset links expire after 60 minutes for security reasons.</p>
          </div>

          <Link href="/auth/forgot-password">
            <Button fullWidth size="lg" className="font-semibold">
              Request a New Reset Link
            </Button>
          </Link>

          <Link
            href="/auth/login"
            className="text-muted-foreground hover:text-brand flex items-center justify-center gap-1.5 pt-1 text-[13px] font-medium transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Return to sign in
          </Link>
        </motion.div>
      </div>
    );
  }

  // ─── Success State ──────────────────────────────────────────
  if (isSuccess) {
    return (
      <div className="space-y-8">
        <div className="space-y-3 text-center">
          <div className="flex justify-center">
            <Logo size="lg" />
          </div>
          <div className="space-y-1">
            <div className="bg-success/10 border-success/20 text-success inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide">
              Password Changed
            </div>
            <h1 className="text-foreground text-2xl font-bold tracking-tight">
              Password Updated Successfully
            </h1>
            <p className="text-muted-foreground text-[13px]">
              Your administrator credentials have been secured.
            </p>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25 }}
          className="space-y-6"
        >
          <div className="flex justify-center">
            <div className="bg-success/10 border-success/20 flex h-16 w-16 items-center justify-center rounded-2xl border">
              <CheckCircle2 className="text-success h-8 w-8" />
            </div>
          </div>

          <p className="text-muted-foreground text-center text-[13px]">
            Redirecting to administrator sign in in{' '}
            <strong className="text-foreground">{countdown}s</strong>...
          </p>

          <Link href="/auth/login">
            <Button fullWidth size="lg" className="font-semibold">
              Sign In Now
            </Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  // ─── Reset Password Form ────────────────────────────────────
  return (
    <div className="space-y-8">
      <div className="space-y-3 text-center">
        <div className="flex justify-center">
          <Logo size="lg" />
        </div>
        <div className="space-y-1">
          <div className="bg-brand/10 border-brand/20 text-brand inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide">
            New Credentials
          </div>
          <h1 className="text-foreground text-2xl font-bold tracking-tight">Set New Password</h1>
          <p className="text-muted-foreground mx-auto max-w-[280px] text-[13px]">
            Choose a strong, unique password for your administrator account.
          </p>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="space-y-6"
      >
        {apiError && (
          <Alert variant="error">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{apiError}</span>
            </div>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-3">
            <Input
              label="New Password"
              type="password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                if (apiError) setApiError(null);
              }}
              error={errors.password}
              autoComplete="new-password"
              autoFocus
            />

            <PasswordStrength password={password} />
          </div>

          <Input
            label="Confirm New Password"
            type="password"
            placeholder="••••••••••••"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (errors.confirm) setErrors((prev) => ({ ...prev, confirm: undefined }));
              if (apiError) setApiError(null);
            }}
            error={errors.confirm}
            autoComplete="new-password"
          />

          <Button type="submit" fullWidth size="lg" isLoading={isLoading} className="font-semibold">
            Reset Password
          </Button>
        </form>

        <Link
          href="/auth/login"
          className="text-muted-foreground hover:text-brand flex items-center justify-center gap-1.5 pt-1 text-[13px] font-medium transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Return to sign in
        </Link>
      </motion.div>
    </div>
  );
}

// ─── Page with Suspense boundary ─────────────────────────────────
export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Spinner size="lg" className="text-brand" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
