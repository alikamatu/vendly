'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import Spinner from '@/components/ui/Spinner';

/**
 * Endpoint the API redirects to after a successful Google OAuth handshake.
 * The token is delivered in the URL hash (`#token=...&next=...`) so it never
 * hits server logs. We pull it out, stash it in localStorage, and bounce.
 */
function CallbackInner() {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash.replace(/^#/, '');
    if (!hash) {
      setStatus('error');
      setError('Missing sign-in details. Please try again from the sign-in page.');
      return;
    }
    const params = new URLSearchParams(hash);
    const token = params.get('token');
    const next = params.get('next') || '/';
    if (!token) {
      setStatus('error');
      setError("Couldn't read your sign-in token. Please try again.");
      return;
    }

    localStorage.setItem('vendly_token', token);
    // Strip the hash so the token doesn't linger in the address bar.
    window.history.replaceState(null, '', window.location.pathname);
    setStatus('success');
    // A short delay so the user sees confirmation before the redirect.
    const id = window.setTimeout(() => {
      // Hard reload so the auth-context picks up the new token cleanly.
      window.location.href = next;
    }, 600);
    return () => window.clearTimeout(id);
  }, [router]);

  return (
    <div className="bg-background flex min-h-screen items-center justify-center px-4">
      <div className="border-border bg-card w-full max-w-sm space-y-5 rounded-3xl border p-8 text-center shadow-sm">
        {status === 'loading' && (
          <div className="space-y-4 py-4">
            <Spinner size="lg" className="text-foreground mx-auto" />
            <div>
              <h2 className="text-foreground text-base font-medium">Completing sign-in</h2>
              <p className="text-muted mt-1 text-xs">Securing your session…</p>
            </div>
          </div>
        )}
        {status === 'success' && (
          <div className="space-y-4 py-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-foreground text-base font-medium">Signed in successfully</h2>
              <p className="text-muted mt-1 text-xs">Taking you to your dashboard…</p>
            </div>
          </div>
        )}
        {status === 'error' && (
          <div className="space-y-4 py-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-500">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-foreground text-base font-medium">
                Sign-in couldn't be completed
              </h1>
              <p className="text-muted mt-1.5 text-xs leading-relaxed">{error}</p>
            </div>
            <div className="flex flex-col gap-2.5 pt-2">
              <Link
                href="/login"
                className="bg-foreground text-background inline-flex h-11 w-full items-center justify-center rounded-xl text-xs font-medium transition-opacity hover:opacity-90"
              >
                Back to sign in
              </Link>
              <a
                href="mailto:support@verndly.com?subject=Sign-in%20issue"
                className="text-muted hover:text-foreground text-xs transition-colors"
              >
                Contact support
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={null}>
      <CallbackInner />
    </Suspense>
  );
}
