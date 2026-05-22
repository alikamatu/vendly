'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { authApi } from '@/lib/api/auth';
import { Container } from '@/components';
import Spinner from '@/components/ui/Spinner';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import PageTransition from '@/components/common/PageTransition';
import { CheckCircle, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token provided.');
      return;
    }

    authApi
      .verifyEmail(token)
      .then((res) => {
        setStatus('success');
        setMessage(res.message);
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err.message || 'Verification failed. The token may be invalid or expired.');
      });
  }, [token]);

  return (
    <Container className="flex min-h-screen items-center justify-center py-8">
      <PageTransition>
        <div className="mx-auto max-w-md text-center">
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
              className="flex flex-col items-center gap-4"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, delay: 0.15 }}
                className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
              >
                <CheckCircle size={40} />
              </motion.div>
              <h1 className="text-2xl font-normal">Email Verified!</h1>
              <Alert variant="success" message={message} />
              <a href="/register?mode=login">
                <Button variant="primary" size="lg" className="mt-4">
                  Sign in to your account
                </Button>
              </a>
            </motion.div>
          )}

          {status === 'error' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-4"
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
              <a href="/register">
                <Button variant="secondary" size="lg" className="mt-4">
                  Back to sign in
                </Button>
              </a>
            </motion.div>
          )}
        </div>
      </PageTransition>
    </Container>
  );
}
