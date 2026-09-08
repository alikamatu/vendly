'use client';

import React from 'react';
import Link from 'next/link';
import { useLoginForm } from '@/hooks/useAuth';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import GoogleSignInButton from '@/components/auth/GoogleSignInButton';
import { Mail, Lock, ShieldCheck, KeyRound } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/contexts/auth-context';
import { authApi } from '@/lib/api/auth';

interface LoginFormProps {
  onSuccess?: () => void;
  onSwitchToRegister?: () => void;
}

export default function LoginForm({ onSuccess, onSwitchToRegister }: LoginFormProps) {
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
      ? 'Enter one of your saved single-use backup codes.'
      : isSms
        ? `We texted a 6-digit verification code to ${phoneHint || 'your phone'}.`
        : 'Enter the 6-digit code from your authenticator app.';

    return (
      <div className="w-full">
        <form onSubmit={handleCodeSubmit} className="space-y-5">
          {error && <Alert variant="error" message={error} onDismiss={clearError} />}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-surface/80 border border-border">
            <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent shrink-0">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Two-factor authentication</h2>
              <p className="text-xs text-foreground/60 leading-tight mt-0.5">{prompt}</p>
            </div>
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
            icon={<KeyRound size={16} />}
            value={code}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setCode(e.target.value)
            }
          />

          <Button
            type="submit"
            variant="primary"
            size="md"
            className="w-full h-11"
            isLoading={isLoading}
            loadingText="Verifying..."
          >
            Verify and continue
          </Button>

          <div className="flex items-center justify-between text-xs text-foreground/60 pt-1">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setCode('');
                  setUseBackupCode(!useBackupCode);
                }}
                className="text-accent hover:underline font-medium"
              >
                {useBackupCode
                  ? isSms
                    ? 'Use SMS code instead'
                    : 'Use authenticator app'
                  : 'Use a backup code'}
              </button>
              {isSms && (
                <button
                  type="button"
                  onClick={resendSms}
                  disabled={resending}
                  className="hover:underline disabled:opacity-60 text-foreground/80 font-medium"
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
              className="text-foreground/50 hover:text-foreground"
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
      {oauthError && (
        <Alert
          variant="error"
          message={oauthError}
          className="mb-4"
          onDismiss={() => {
            const url = new URL(window.location.href);
            url.searchParams.delete('oauth_error');
            window.history.replaceState(null, '', url.toString());
          }}
        />
      )}

      {error && <Alert variant="error" message={error} className="mb-4" onDismiss={clearError} />}

      {isUnverified && (
        <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3.5 text-xs space-y-2">
          <p className="text-foreground/80 font-medium">
            We sent a verification link to your email. Didn&apos;t get it?
          </p>
          <button
            type="button"
            onClick={handleResend}
            disabled={resendingVerify}
            className="text-accent hover:underline font-semibold disabled:opacity-60 inline-flex items-center gap-1.5"
          >
            {resendingVerify ? 'Sending verification link…' : 'Resend verification email'}
          </button>
          {resendStatus && (
            <p className={resendStatus.kind === 'ok' ? 'text-emerald-600 font-medium' : 'text-red-600 font-medium'}>
              {resendStatus.msg}
            </p>
          )}
        </div>
      )}

      <GoogleSignInButton next={next || '/'} label="Continue with Google" />

      <div className="my-5 flex items-center gap-3 text-[11px] font-medium uppercase tracking-wider text-foreground/40">
        <div className="h-px flex-1 bg-border/80" />
        <span>or sign in with email</span>
        <div className="h-px flex-1 bg-border/80" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email address"
          type="email"
          autoComplete="username"
          inputMode="email"
          placeholder="name@example.com"
          icon={<Mail size={16} />}
          error={errors.email?.message}
          registration={register('email')}
        />

        <Input
          label="Password"
          labelRight={
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-foreground/60 hover:text-foreground transition-colors hover:underline"
            >
              Forgot password?
            </Link>
          }
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          icon={<Lock size={16} />}
          error={errors.password?.message}
          registration={register('password')}
        />

        <div className="pt-2">
          <Button
            type="submit"
            variant="primary"
            size="md"
            className="w-full h-11"
            isLoading={isLoading}
            loadingText="Signing in..."
          >
            Sign in
          </Button>
        </div>

        <div className="pt-2 text-center text-xs text-foreground/60 flex items-center justify-between">
          <span>Don&apos;t have an account?</span>
          {onSwitchToRegister ? (
            <button
              type="button"
              onClick={onSwitchToRegister}
              className="font-medium text-accent hover:underline"
            >
              Create an account
            </button>
          ) : (
            <Link href="/register" className="font-medium text-accent hover:underline">
              Create an account
            </Link>
          )}
        </div>

        <p className="pt-2 text-center text-[11px] text-foreground/40">
          Having trouble?{' '}
          <a
            href="mailto:support@verndly.app?subject=Sign-in%20issue"
            className="text-foreground/60 hover:text-foreground underline transition-colors"
          >
            Contact support
          </a>
        </p>
      </form>
    </div>
  );
}
