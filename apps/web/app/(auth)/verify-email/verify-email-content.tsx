'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { authApi } from '@/lib/api/auth';
import { Container } from '@/components';
import Spinner from '@/components/ui/Spinner';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import PageTransition from '@/components/common/PageTransition';
import { CheckCircle, XCircle, ShoppingBag, Store } from 'lucide-react';
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
    <Container className="flex min-h-screen items-center justify-center py-8">
      <PageTransition>
        <div className="mx-auto w-full max-w-2xl text-center">
          {status === 'loading' && (
            <div className="flex flex-col items-center gap-4">
              <Spinner size="lg" />
              <p className="text-foreground/60">Verifying your email...</p>
            </div>
          )}

          {status === 'success' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex w-full flex-col items-center gap-6"
            >
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, delay: 0.15 }}
                  className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                >
                  <CheckCircle size={40} />
                </motion.div>
                <h1 className="text-3xl font-normal">Email Verified!</h1>
                <p className="text-foreground/60 mt-3">{message}</p>
              </div>

              <div className="mt-6 w-full">
                <h3 className="mb-6 text-xl font-medium tracking-tight">
                  What would you like to do next?
                </h3>
                <div className="grid w-full grid-cols-1 gap-6 sm:grid-cols-2">
                  <Link
                    href="/"
                    className="border-foreground/5 bg-background/50 hover:border-accent dark:bg-background/20 group flex h-full flex-col items-center gap-4 rounded-3xl border p-8 shadow-sm backdrop-blur-sm transition-all hover:-translate-y-1 hover:shadow-xl"
                  >
                    <div className="bg-accent/10 text-accent flex h-16 w-16 items-center justify-center rounded-full transition-colors">
                      <ShoppingBag size={28} className="text-primary" />
                    </div>
                    <div className="text-center">
                      <h4 className="text-lg font-medium">I want to buy</h4>
                      <p className="text-foreground/60 mt-2 text-sm leading-relaxed">
                        Discover and shop from verified student sellers on campus.
                      </p>
                    </div>
                    <Button variant="secondary" className="mt-6 w-full transition-colors">
                      Start Shopping
                    </Button>
                  </Link>

                  <Link
                    href="/seller-verification"
                    className="border-foreground/5 bg-background/50 hover:border-accent dark:bg-background/20 group flex h-full flex-col items-center gap-4 rounded-3xl border p-8 shadow-sm backdrop-blur-sm transition-all hover:-translate-y-1 hover:shadow-xl"
                  >
                    <div className="bg-accent/10 text-accent flex h-16 w-16 items-center justify-center rounded-full transition-colors">
                      <Store size={28} className="text-primary" />
                    </div>
                    <div className="text-center">
                      <h4 className="text-lg font-medium">I want to sell</h4>
                      <p className="text-foreground/60 mt-2 text-sm leading-relaxed">
                        Open your own store, list products, and reach buyers today.
                      </p>
                    </div>
                    <Button variant="primary" className="mt-6 w-full shadow-md">
                      Become a Seller
                    </Button>
                  </Link>
                </div>
              </div>
            </motion.div>
          )}

          {status === 'error' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mx-auto flex max-w-md flex-col items-center gap-4"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, delay: 0.15 }}
                className="flex h-20 w-20 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
              >
                <XCircle size={40} />
              </motion.div>
              <h1 className="text-2xl font-normal">Verification Failed</h1>
              <Alert variant="error" message={message} />
              <Link href="/register">
                <Button variant="secondary" size="lg" className="mt-4">
                  Back to sign in
                </Button>
              </Link>
            </motion.div>
          )}
        </div>
      </PageTransition>
    </Container>
  );
}
