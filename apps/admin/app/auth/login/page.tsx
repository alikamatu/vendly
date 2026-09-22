'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ShieldCheck, KeyRound, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { authService } from '@/services/auth.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { Logo } from '@/components/ui/logo';
import { Spinner } from '@/components/ui/spinner';

// ─── Simple Zod-like validation ──────────────────────────────────
function validateEmail(email: string): string | null {
  if (!email.trim()) return 'Email is required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Enter a valid email address';
  return null;
}

function validatePassword(password: string): string | null {
  if (!password) return 'Password is required';
  if (password.length < 1) return 'Password is required';
  return null;
}

// ─── Google Icon SVG ──────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg className="h-4.5 w-4.5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

// ─── 2FA 6-Digit Box Input ─────────────────────────────────────────
function TwoFactorInput({
  onComplete,
  isLoading,
}: {
  onComplete: (code: string) => void;
  isLoading: boolean;
}) {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (digit && index === 5) {
      const code = newDigits.join('');
      if (code.length === 6) {
        onComplete(code);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      const newDigits = pasted.split('');
      setDigits(newDigits);
      onComplete(pasted);
    }
  };

  return (
    <div className="flex justify-center gap-2">
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => {
            inputRefs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          value={digit}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={i === 0 ? handlePaste : undefined}
          disabled={isLoading}
          className="h-13 bg-input-bg border-input-border text-foreground focus:border-brand focus:ring-brand focus:bg-background w-11 rounded-[var(--radius-lg)] border text-center text-xl font-semibold transition-colors focus:outline-none focus:ring-1 disabled:opacity-50"
          aria-label={`Digit ${i + 1}`}
        />
      ))}
    </div>
  );
}

// ─── Login Form Content ───────────────────────────────────────────
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, verify2fa, user, loading: authLoading } = useAuth();

  // URL query notifications
  const queryError = searchParams.get('error');
  const oauthError = searchParams.get('oauth_error');
  const initialEmail = searchParams.get('email') || '';

  // Form state
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 2FA state
  const [show2fa, setShow2fa] = useState(false);
  const [twoFaMethod, setTwoFaMethod] = useState<'TOTP' | 'SMS'>('TOTP');
  const [phoneHint, setPhoneHint] = useState<string | null>(null);
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [backupCode, setBackupCode] = useState('');
  const [twoFaError, setTwoFaError] = useState<string | null>(null);
  const [is2faLoading, setIs2faLoading] = useState(false);

  // Redirect if already logged in as ADMIN
  useEffect(() => {
    if (!authLoading && user && user.role === 'ADMIN') {
      router.replace('/');
    }
  }, [user, authLoading, router]);

  // Map url query errors
  useEffect(() => {
    if (queryError === 'unauthorized') {
      setApiError(
        'Access restricted: Only platform administrators are permitted to access this portal.',
      );
    } else if (queryError === 'session_expired') {
      setApiError('Your session has expired. Please sign in again.');
    } else if (oauthError) {
      setApiError(`Google sign-in error: ${oauthError}`);
    }
  }, [queryError, oauthError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);

    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);
    setErrors({ email: emailError || undefined, password: passwordError || undefined });
    if (emailError || passwordError) return;

    setIsLoading(true);

    const result = await login(email.trim(), password);

    if (result.requires2fa) {
      setTwoFaMethod(result.method || 'TOTP');
      setPhoneHint(result.phoneHint || null);
      setShow2fa(true);
      setIsLoading(false);
      return;
    }

    if (result.success) {
      router.replace('/');
    } else {
      setApiError(result.error || 'Login failed. Please verify your credentials.');
    }

    setIsLoading(false);
  };

  const handle2faCodeComplete = async (code: string) => {
    setTwoFaError(null);
    setIs2faLoading(true);

    const result = await verify2fa(email.trim(), password, code, false);

    if (result.success) {
      router.replace('/');
    } else {
      setTwoFaError(result.error || 'Invalid authentication code. Please try again.');
    }

    setIs2faLoading(false);
  };

  const handleBackupCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!backupCode.trim()) {
      setTwoFaError('Please enter your backup code');
      return;
    }

    setTwoFaError(null);
    setIs2faLoading(true);

    const result = await verify2fa(email.trim(), password, backupCode.trim(), true);

    if (result.success) {
      router.replace('/');
    } else {
      setTwoFaError(result.error || 'Invalid backup code. Please try again.');
    }

    setIs2faLoading(false);
  };

  const handleGoogleLogin = () => {
    const callbackUrl =
      typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined;
    window.location.href = authService.getGoogleOAuthUrl(callbackUrl);
  };

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center space-y-3 py-20">
        <Spinner size="lg" className="text-brand" />
        <p className="text-muted-foreground animate-pulse text-xs">Loading Vendly Admin...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Logo & Header */}
      <div className="space-y-3 text-center">
        <div className="flex justify-center">
          <Logo size="lg" />
        </div>
        <div className="space-y-1">
          <div className="bg-brand/10 border-brand/20 text-brand inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide">
            Platform Operations
          </div>
          <h1 className="text-foreground text-2xl font-bold tracking-tight">
            {show2fa ? 'Two-Factor Verification' : 'Sign in to Admin'}
          </h1>
          <p className="text-muted-foreground text-[13px]">
            {show2fa
              ? twoFaMethod === 'SMS'
                ? `Enter the 6-digit code sent to ${phoneHint || 'your phone'}`
                : 'Enter the 6-digit verification code from your authenticator'
              : 'Authorized platform administrators only'}
          </p>
        </div>
      </div>

      {/* Content views */}
      <AnimatePresence mode="wait">
        {show2fa ? (
          /* ─── 2FA Verification View ─── */
          <motion.div
            key="2fa-view"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="space-y-6"
          >
            <div className="flex justify-center">
              <div className="bg-brand/10 border-brand/20 text-brand flex h-14 w-14 items-center justify-center rounded-2xl border">
                {useBackupCode ? (
                  <KeyRound className="h-6 w-6" />
                ) : (
                  <ShieldCheck className="h-6 w-6" />
                )}
              </div>
            </div>

            {twoFaError && <Alert variant="error">{twoFaError}</Alert>}

            {!useBackupCode ? (
              <div className="space-y-4">
                <TwoFactorInput onComplete={handle2faCodeComplete} isLoading={is2faLoading} />

                {is2faLoading && (
                  <div className="flex justify-center py-1">
                    <Spinner size="md" className="text-brand" />
                  </div>
                )}

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setUseBackupCode(true);
                      setTwoFaError(null);
                    }}
                    className="text-muted-foreground hover:text-foreground cursor-pointer text-xs underline underline-offset-4 transition-colors"
                  >
                    Don&apos;t have access to authenticator? Use backup code
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleBackupCodeSubmit} className="space-y-4">
                <Input
                  label="One-Time Backup Code"
                  type="text"
                  placeholder="e.g. 1A2B-3C4D"
                  value={backupCode}
                  onChange={(e) => {
                    setBackupCode(e.target.value);
                    if (twoFaError) setTwoFaError(null);
                  }}
                  helperText="Enter one of your emergency recovery backup codes."
                  autoFocus
                />

                <Button type="submit" fullWidth size="lg" isLoading={is2faLoading}>
                  Verify Backup Code
                </Button>

                <div className="pt-1 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setUseBackupCode(false);
                      setTwoFaError(null);
                    }}
                    className="text-muted-foreground hover:text-foreground cursor-pointer text-xs underline underline-offset-4 transition-colors"
                  >
                    Use 6-digit authenticator code instead
                  </button>
                </div>
              </form>
            )}

            <button
              type="button"
              onClick={() => {
                setShow2fa(false);
                setUseBackupCode(false);
                setTwoFaError(null);
              }}
              className="text-muted-foreground hover:text-foreground w-full cursor-pointer pt-2 text-center text-[13px] transition-colors"
            >
              ← Back to credentials sign in
            </button>
          </motion.div>
        ) : (
          /* ─── Standard Login Form ─── */
          <motion.div
            key="login-view"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="space-y-6"
          >
            {/* Google OAuth */}
            <Button
              variant="secondary"
              fullWidth
              size="lg"
              onClick={handleGoogleLogin}
              type="button"
              className="flex items-center justify-center gap-2.5 font-medium"
            >
              <GoogleIcon />
              Continue with Google
            </Button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="border-border w-full border-t" />
              </div>
              <div className="relative flex justify-center text-[11px]">
                <span className="bg-background text-muted-foreground px-3 font-semibold uppercase tracking-wider">
                  or email & password
                </span>
              </div>
            </div>

            {/* Error banner */}
            {apiError && (
              <Alert variant="error">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{apiError}</span>
                </div>
              </Alert>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <Input
                label="Administrator Email"
                type="email"
                placeholder="admin@verndly.app"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                  if (apiError) setApiError(null);
                }}
                error={errors.email}
                autoComplete="email"
                autoFocus={!initialEmail}
              />

              <div className="space-y-1.5">
                <Input
                  label="Password"
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                    if (apiError) setApiError(null);
                  }}
                  error={errors.password}
                  autoComplete="current-password"
                  autoFocus={!!initialEmail}
                />
                <div className="flex justify-end">
                  <Link
                    href="/auth/forgot-password"
                    className="text-muted-foreground hover:text-brand text-[12px] font-medium transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
              </div>

              <Button
                type="submit"
                fullWidth
                size="lg"
                isLoading={isLoading}
                className="mt-2 font-semibold"
              >
                Sign in to Dashboard
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Spinner size="lg" className="text-brand" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
