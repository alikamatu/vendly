'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Mail, CheckCircle2, RotateCw, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { authService } from '@/services/auth.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { Logo } from '@/components/ui/logo';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  // Resend cooldown timer
  const [cooldown, setCooldown] = useState(0);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    setEmailError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setEmailError('Email is required');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setEmailError('Enter a valid email address');
      return;
    }

    setIsLoading(true);

    try {
      await authService.forgotPassword(trimmedEmail);
      setIsSent(true);
      setCooldown(60);
      setResendStatus(null);
    } catch (err: unknown) {
      if (err instanceof Error && err.message.toLowerCase().includes('fetch')) {
        setApiError('Unable to connect to the server. Please check your internet connection.');
      } else {
        // For privacy & security, proceed to confirmation
        setIsSent(true);
        setCooldown(60);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || isLoading) return;
    setIsLoading(true);
    setResendStatus(null);

    try {
      await authService.forgotPassword(email.trim());
      setCooldown(60);
      setResendStatus('A new reset link has been dispatched to your email.');
    } catch {
      setResendStatus('A new reset link has been dispatched to your email.');
      setCooldown(60);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Logo + Header */}
      <div className="space-y-3 text-center">
        <div className="flex justify-center">
          <Logo size="lg" />
        </div>
        <div className="space-y-1">
          <div className="bg-brand/10 border-brand/20 text-brand inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide">
            Account Recovery
          </div>
          <h1 className="text-foreground text-2xl font-bold tracking-tight">
            {isSent ? 'Check your inbox' : 'Reset your password'}
          </h1>
          <p className="text-muted-foreground mx-auto max-w-[290px] text-[13px]">
            {isSent
              ? `We sent password reset instructions to ${email}`
              : 'Enter your administrator email to receive a password reset link'}
          </p>
        </div>
      </div>

      {/* Content */}
      {isSent ? (
        /* ─── Success State ────────────────────────────────── */
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="space-y-6"
        >
          {/* Check icon */}
          <div className="flex justify-center">
            <div className="bg-success/10 border-success/20 flex h-16 w-16 items-center justify-center rounded-2xl border">
              <CheckCircle2 className="text-success h-8 w-8" />
            </div>
          </div>

          <div className="space-y-2 text-center">
            <p className="text-muted-foreground text-[13px] leading-relaxed">
              If an administrator account with <strong className="text-foreground">{email}</strong>{' '}
              exists, you will receive a secure reset link valid for 60 minutes.
            </p>
            <p className="text-muted-foreground/60 text-[12px]">
              Be sure to inspect your spam or junk folder if it does not appear within 2 minutes.
            </p>
          </div>

          {resendStatus && <Alert variant="info">{resendStatus}</Alert>}

          <div className="space-y-2.5">
            <Button
              variant="secondary"
              fullWidth
              size="lg"
              onClick={handleResend}
              disabled={cooldown > 0 || isLoading}
              isLoading={isLoading}
              className="font-medium"
            >
              <RotateCw className={`mr-1.5 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              {cooldown > 0 ? `Resend link in ${cooldown}s` : 'Resend reset link'}
            </Button>

            <Button
              variant="ghost"
              fullWidth
              size="md"
              onClick={() => {
                setIsSent(false);
                setEmail('');
                setResendStatus(null);
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              <Mail className="mr-1.5 h-4 w-4" />
              Try a different email address
            </Button>
          </div>

          <Link
            href="/auth/login"
            className="text-muted-foreground hover:text-brand flex items-center justify-center gap-1.5 pt-2 text-[13px] font-medium transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Return to sign in
          </Link>
        </motion.div>
      ) : (
        /* ─── Request Form ──────────────────────────────────── */
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
            <Input
              label="Administrator Email address"
              type="email"
              placeholder="admin@verndly.app"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) setEmailError(null);
                if (apiError) setApiError(null);
              }}
              error={emailError || undefined}
              autoComplete="email"
              autoFocus
            />

            <Button
              type="submit"
              fullWidth
              size="lg"
              isLoading={isLoading}
              className="font-semibold"
            >
              Send Password Reset Link
            </Button>
          </form>

          <Link
            href="/auth/login"
            className="text-muted-foreground hover:text-brand flex items-center justify-center gap-1.5 text-[13px] font-medium transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Return to sign in
          </Link>
        </motion.div>
      )}
    </div>
  );
}
