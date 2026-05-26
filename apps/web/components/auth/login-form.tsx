'use client';

import React from 'react';
import { useLoginForm } from '@/hooks/useAuth';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import ProgressBar from '@/components/ui/ProgressBar';
import GoogleSignInButton from '@/components/auth/GoogleSignInButton';
import { Mail, Lock } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/contexts/auth-context';
import { authApi } from '@/lib/api/auth';

interface LoginFormProps {
  onSuccess?: () => void;
}

export default function LoginForm({ onSuccess }: LoginFormProps) {
  const {
    form,
    onSubmit,
    isLoading,
    error,
    clearError,
    totpRequired,
    useBackupCode,
    setUseBackupCode,
    submitWithCode,
    resetTotpChallenge,
    method,
    phoneHint,
    resendSms,
    resending,
  } = useLoginForm();
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next');
  const [code, setCode] = React.useState('');
  const [resendStatus, setResendStatus] = React.useState<null | { kind: 'ok' | 'err'; msg: string }>(null);
  const [resendingVerify, setResendingVerify] = React.useState(false);
  const oauthError = searchParams.get('oauth_error');
  const isUnverified = !!error && /verify your email/i.test(error);

  const handleResend = async () => {
    setResendStatus(null);
    setResendingVerify(true);
    try {
      const email = (form.getValues('email') || '').trim();
      if (!email) {
        setResendStatus({ kind: 'err', msg: 'Enter your email above first.' });
        return;
      }
      const res = await authApi.resendVerification(email);
      setResendStatus({ kind: 'ok', msg: res.message });
    } catch (e: any) {
      setResendStatus({ kind: 'err', msg: e?.message || 'Could not send link.' });
    } finally {
      setResendingVerify(false);
    }
  };
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

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await submitWithCode(code);
    } catch {
      // surfaced by error
    }
  };

  // Redirect after successful login
  React.useEffect(() => {
    if (user && !isLoading) {
      if (onSuccess) {
        onSuccess();
      } else {
        router.push(next || '/');
      }
    }
  }, [user, isLoading, router, onSuccess, next]);

  if (totpRequired) {
    const isSms = method === 'SMS' && !useBackupCode;
    const prompt = useBackupCode
      ? 'Enter one of your saved backup codes.'
      : isSms
        ? `We texted a 6-digit code to ${phoneHint || 'your phone'}.`
        : 'Enter the 6-digit code from your authenticator app.';
    return (
      <div className="w-full">
        {isLoading && <ProgressBar className="mb-4" />}
        <form onSubmit={handleCodeSubmit} className="space-y-6">
          {error && <Alert variant="error" message={error} onDismiss={clearError} />}
          <div>
            <h2 className="text-lg font-medium">Two-factor authentication</h2>
            <p className="text-foreground/60 text-sm mt-1">{prompt}</p>
          </div>
          <Input
            label={
              useBackupCode
                ? 'Backup code'
                : isSms
                  ? 'SMS code'
                  : 'Authenticator code'
            }
            type="text"
            autoComplete="one-time-code"
            inputMode={useBackupCode ? 'text' : 'numeric'}
            placeholder={useBackupCode ? 'XXXX-XXXX' : '123456'}
            value={code}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setCode(e.target.value)
            }
          />
          <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
            Verify and sign in
          </Button>
          <div className="flex items-center justify-between text-xs text-foreground/60">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setCode('');
                  setUseBackupCode(!useBackupCode);
                }}
                className="text-accent hover:underline"
              >
                {useBackupCode
                  ? isSms
                    ? 'Use SMS code instead'
                    : 'Use authenticator app instead'
                  : 'Use a backup code'}
              </button>
              {isSms && (
                <button
                  type="button"
                  onClick={resendSms}
                  disabled={resending}
                  className="hover:underline disabled:opacity-60"
                >
                  {resending ? 'Sending…' : 'Resend SMS'}
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setCode('');
                resetTotpChallenge();
              }}
              className="hover:underline"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="w-full">
      {isLoading && <ProgressBar className="mb-4" />}

      {oauthError && (
        <Alert
          variant="error"
          message={oauthError}
          onDismiss={() => {
            const url = new URL(window.location.href);
            url.searchParams.delete('oauth_error');
            window.history.replaceState(null, '', url.toString());
          }}
        />
      )}

      <GoogleSignInButton next={next || '/'} />
      <div className="my-6 flex items-center gap-3 text-[10px] uppercase tracking-wider text-foreground/40">
        <div className="h-px flex-1 bg-border" />
        or sign in with email
        <div className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {error && <Alert variant="error" message={error} onDismiss={clearError} />}
        {isUnverified && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs space-y-2">
            <p>
              We sent a verification link to your email. Didn&apos;t get it?
            </p>
            <button
              type="button"
              onClick={handleResend}
              disabled={resendingVerify}
              className="text-accent hover:underline font-medium disabled:opacity-60"
            >
              {resendingVerify ? 'Sending…' : 'Resend verification email'}
            </button>
            {resendStatus && (
              <p className={resendStatus.kind === 'ok' ? 'text-emerald-600' : 'text-red-600'}>
                {resendStatus.msg}
              </p>
            )}
          </div>
        )}

        <div className="space-y-6">
          <Input
            label="Email"
            type="email"
            autoComplete="username"
            inputMode="email"
            icon={<Mail size={18} />}
            error={errors.email?.message}
            registration={register('email')}
          />

          <Input
            label="Password"
            type="password"
            autoComplete="current-password"
            icon={<Lock size={18} />}
            error={errors.password?.message}
            registration={register('password')}
          />
        </div>

        <div className="flex items-center justify-between text-xs">
          <a href="/forgot-password" className="text-accent transition hover:underline">
            Forgot password?
          </a>
          <a href="/help/find-account" className="text-foreground/60 hover:text-foreground">
            Forgot which email you used?
          </a>
        </div>

        <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
          {isLoading ? 'Signing in...' : 'Sign in'}
        </Button>

        <p className="text-center text-[11px] text-foreground/50">
          Need help?{' '}
          <a
            href="mailto:support@vendly.app?subject=Sign-in%20issue"
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
