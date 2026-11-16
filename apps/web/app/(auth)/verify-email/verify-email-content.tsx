'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { authApi } from '@/lib/api/auth';
import Spinner from '@/components/ui/Spinner';
import Button from '@/components/ui/Button';
import AuthPageShell from '@/components/auth/AuthPageShell';
import { Check, X, ShoppingBag, Store } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/contexts/auth-context';
import Link from 'next/link';

export default function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    token ? 'loading' : 'error',
  );
  const [message, setMessage] = useState(token ? '' : 'No verification token provided.');
  const { setAuthData } = useAuth();

  useEffect(() => {
    if (!token) return;

    authApi
      .verifyEmail(token)
      .then((res) => {
        setStatus('success');
        setMessage(res.message);
        if (res.access_token && res.user) {
          setAuthData(res.access_token, res.user);
        }
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err.message || 'Verification failed. The token may be invalid or expired.');
      });
  }, [token, setAuthData]);

  return (
    <AuthPageShell>
      {status === 'loading' && (
        <div className="flex flex-col items-center gap-4 py-12 text-center">
          <Spinner size="lg" />
          <p className="text-foreground/60 text-sm">Verifying your email…</p>
        </div>
      )}

      {status === 'success' && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center text-center"
        >
          <div className="bg-foreground text-background mb-8 grid h-14 w-14 place-items-center rounded-full">
            <Check size={26} strokeWidth={2.5} />
          </div>
          <h1 className="text-foreground text-[28px] font-semibold leading-tight tracking-[-0.02em] sm:text-[32px]">
            Email verified
          </h1>
          <p className="text-foreground/55 mt-2 text-sm">{message || 'Your account is ready.'}</p>

          <div className="mt-8 w-full space-y-3 text-left">
            <Link
              href="/create-store"
              className="border-border/70 bg-surface/60 hover:border-foreground/30 hover:bg-surface group flex items-center gap-3.5 rounded-2xl border p-4 transition-colors"
            >
              <div className="bg-foreground/5 text-foreground grid h-10 w-10 shrink-0 place-items-center rounded-xl">
                <Store size={18} />
              </div>
              <div className="min-w-0">
                <h3 className="text-foreground text-sm font-medium">Open a storefront</h3>
                <p className="text-foreground/50 text-xs">Start selling and accept Mobile Money</p>
              </div>
            </Link>

            <Link
              href="/"
              className="border-border/70 bg-surface/60 hover:border-foreground/30 hover:bg-surface group flex items-center gap-3.5 rounded-2xl border p-4 transition-colors"
            >
              <div className="bg-foreground/5 text-foreground grid h-10 w-10 shrink-0 place-items-center rounded-xl">
                <ShoppingBag size={18} />
              </div>
              <div className="min-w-0">
                <h3 className="text-foreground text-sm font-medium">Browse marketplace</h3>
                <p className="text-foreground/50 text-xs">Shop verified stores across Ghana</p>
              </div>
            </Link>
          </div>
        </motion.div>
      )}

      {status === 'error' && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center text-center"
        >
          <div className="mb-8 grid h-14 w-14 place-items-center rounded-full bg-red-500/10 text-red-500">
            <X size={26} strokeWidth={2.5} />
          </div>
          <h1 className="text-foreground text-[28px] font-semibold leading-tight tracking-[-0.02em] sm:text-[32px]">
            Verification failed
          </h1>
          <p className="text-foreground/55 mt-2 text-sm">{message}</p>

          <div className="mt-10 w-full">
            <Link href="/login" className="block w-full">
              <Button variant="primary" size="md" className="h-11 w-full">
                Back to sign in
              </Button>
            </Link>
          </div>
        </motion.div>
      )}
    </AuthPageShell>
  );
}
