'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { authService } from '@/services/auth.service';
import { setToken, clearToken } from '@/lib/api';
import { Logo } from '@/components/ui/logo';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';

function OAuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'unauthorized' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let token: string | null = null;
    let next: string = '/';

    // 1. Check URL hash (standard OAuth pattern: #token=...&next=...)
    const hash = window.location.hash.replace(/^#/, '');
    if (hash) {
      const hashParams = new URLSearchParams(hash);
      token = hashParams.get('token');
      if (hashParams.get('next')) next = hashParams.get('next')!;
    }

    // 2. Fallback to query params (?token=...&next=...)
    if (!token) {
      token = searchParams.get('token');
      if (searchParams.get('next')) next = searchParams.get('next')!;
    }

    if (!token) {
      const err =
        searchParams.get('error') || 'No authentication token was returned from Google sign-in.';
      setStatus('error');
      setErrorMessage(err);
      return;
    }

    // Verify user role before granting access
    const verifySession = async () => {
      try {
        setToken(token!);
        const user = await authService.getMe();

        if (!user || user.role !== 'ADMIN') {
          clearToken();
          setStatus('unauthorized');
          setErrorMessage(
            'Access denied: Your Google account is not registered as a platform administrator.',
          );
          return;
        }

        // Clean URL hash so token isn't stored in history
        window.history.replaceState(null, '', window.location.pathname);
        setStatus('success');

        const timer = setTimeout(() => {
          window.location.href = next;
        }, 600);

        return () => clearTimeout(timer);
      } catch (err: unknown) {
        clearToken();
        setStatus('error');
        setErrorMessage(
          err instanceof Error
            ? err.message
            : 'Unable to verify administrator permissions. Please sign in with email and password.',
        );
      }
    };

    verifySession();
  }, [searchParams, router]);

  return (
    <div className="space-y-8">
      {/* Brand Header */}
      <div className="space-y-3 text-center">
        <div className="flex justify-center">
          <Logo size="lg" />
        </div>
        <div className="space-y-1">
          <h1 className="text-foreground text-2xl font-bold tracking-tight">
            {status === 'loading' && 'Authenticating Session'}
            {status === 'success' && 'Welcome, Administrator'}
            {status === 'unauthorized' && 'Access Denied'}
            {status === 'error' && 'Authentication Error'}
          </h1>
          <p className="text-muted-foreground text-[13px]">
            {status === 'loading' && 'Verifying administrator privileges with security server...'}
            {status === 'success' && 'Redirecting to your command dashboard...'}
            {status === 'unauthorized' && 'This account does not have admin permissions'}
            {status === 'error' && 'Unable to complete Google sign-in'}
          </p>
        </div>
      </div>

      {/* States */}
      <div className="border-border bg-card space-y-5 rounded-2xl border p-6 text-center">
        {status === 'loading' && (
          <div className="space-y-4 py-6">
            <Spinner size="lg" className="text-brand mx-auto" />
            <p className="text-muted-foreground animate-pulse text-xs font-medium">
              Securing administrative session...
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4 py-4">
            <div className="bg-success/10 border-success/20 text-success mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-foreground text-sm font-semibold">Sign-In Verified</h2>
              <p className="text-muted-foreground mt-1 text-xs">Entering operations center...</p>
            </div>
          </div>
        )}

        {status === 'unauthorized' && (
          <div className="space-y-4 py-4">
            <div className="bg-destructive/10 border-destructive/20 text-destructive mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border">
              <ShieldAlert className="h-7 w-7" />
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground text-xs leading-relaxed">{errorMessage}</p>
              <p className="text-muted-foreground/60 text-[11px]">
                Only users with role <strong className="text-foreground">ADMIN</strong> are
                permitted on this portal.
              </p>
            </div>
            <div className="pt-2">
              <Link href="/auth/login">
                <Button fullWidth size="lg">
                  Return to Sign In
                </Button>
              </Link>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4 py-4">
            <div className="bg-destructive/10 border-destructive/20 text-destructive mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border">
              <AlertCircle className="h-7 w-7" />
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground text-xs leading-relaxed">{errorMessage}</p>
            </div>
            <div className="pt-2">
              <Link href="/auth/login">
                <Button fullWidth size="lg">
                  Return to Sign In
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Spinner size="lg" className="text-brand" />
        </div>
      }
    >
      <OAuthCallbackInner />
    </Suspense>
  );
}
