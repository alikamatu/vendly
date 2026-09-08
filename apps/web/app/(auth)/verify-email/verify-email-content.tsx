'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { authApi } from '@/lib/api/auth';
import Spinner from '@/components/ui/Spinner';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import AuthShowcase from '@/components/auth/AuthShowcase';
import { CheckCircle, XCircle, ShoppingBag, Store, ShieldCheck } from 'lucide-react';
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
    <div className="flex flex-col lg:flex-row min-h-screen w-full">
      {/* Left Column: Form / Verification Section (~30%) */}
      <div className="w-full lg:w-[32%] xl:w-[30%] min-h-screen lg:h-screen flex flex-col justify-between p-6 sm:p-10 xl:p-12 overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden bg-background z-10">
        <div>
          {/* Brand Logo */}
          <Link href="/" className="inline-flex items-center gap-2.5 mb-8 group">
            <img
              src="/logos/verndly.png"
              alt="Verndly"
              className="h-8 w-8 object-contain transition-transform group-hover:scale-105"
            />
            <span className="font-semibold text-lg tracking-tight text-foreground">
              Verndly
            </span>
          </Link>

          {/* Loading State */}
          {status === 'loading' && (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
              <Spinner size="lg" />
              <div className="space-y-1">
                <h2 className="text-lg font-semibold tracking-tight text-foreground">
                  Verifying your email
                </h2>
                <p className="text-xs text-foreground/60 leading-relaxed">
                  Confirming your account with Verndly secure rails...
                </p>
              </div>
            </div>
          )}

          {/* Success State */}
          {status === 'success' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shadow-xs">
                  <CheckCircle size={24} />
                </div>
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
                  Email verified!
                </h1>
                <p className="text-xs sm:text-sm text-foreground/60 leading-relaxed">
                  {message || 'Your account is active. Choose your path to begin.'}
                </p>
              </div>

              {/* Cardless Next Steps */}
              <div className="space-y-3 pt-2">
                <Link
                  href="/create-store"
                  className="group flex items-start gap-3.5 p-4 rounded-2xl bg-surface/70 hover:bg-surface border-0 shadow-xs transition-all"
                >
                  <div className="w-10 h-10 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center shrink-0">
                    <Store size={20} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs sm:text-sm font-semibold text-foreground group-hover:text-secondary transition-colors">
                      Start selling on Verndly
                    </h3>
                    <p className="text-[11px] text-foreground/50 leading-relaxed mt-0.5">
                      Open your verified store and receive payouts directly to Mobile Money.
                    </p>
                  </div>
                </Link>

                <Link
                  href="/"
                  className="group flex items-start gap-3.5 p-4 rounded-2xl bg-surface/70 hover:bg-surface border-0 shadow-xs transition-all"
                >
                  <div className="w-10 h-10 rounded-xl bg-foreground/5 text-foreground/80 flex items-center justify-center shrink-0">
                    <ShoppingBag size={20} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs sm:text-sm font-semibold text-foreground transition-colors">
                      Explore the marketplace
                    </h3>
                    <p className="text-[11px] text-foreground/50 leading-relaxed mt-0.5">
                      Shop from top-rated entrepreneurs with delivery right to your doorstep.
                    </p>
                  </div>
                </Link>
              </div>
            </motion.div>
          )}

          {/* Error State */}
          {status === 'error' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center shadow-xs">
                  <XCircle size={24} />
                </div>
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
                  Verification failed
                </h1>
                <p className="text-xs sm:text-sm text-foreground/60 leading-relaxed">
                  {message}
                </p>
              </div>

              <div className="pt-2">
                <Link href="/login" className="block w-full">
                  <Button variant="primary" size="md" className="w-full h-11">
                    Return to sign in
                  </Button>
                </Link>
              </div>
            </motion.div>
          )}
        </div>

        {/* Minimal Footer */}
        <div className="pt-8 mt-6 border-t border-border/40 flex items-center justify-between text-[11px] text-foreground/40">
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={13} className="text-emerald-500 shrink-0" />
            <span>256-bit SSL • Verified Platform</span>
          </div>
          <span className="font-mono text-foreground/30">v1.0</span>
        </div>
      </div>

      {/* Right Column: Full-Height Showcase Area (70%) */}
      <AuthShowcase
        headline="Welcome to the new standard"
        highlightWords="of entreprenurs commerce."
        description="Discover verified sellers, checkout instantly with Mobile Money, and experience fraud-free local shopping."
        testimonial={{
          quote:
            "Buying and selling on Verndly feels like Apple-grade software built specifically for Ghana. It is night and day compared to social media DMs.",
          author: "Selorm Kofi",
          role: "CEO of Glow_Up Aesthetics",
          avatarText: "SK",
          metric: "Instant MoMo checkout",
        }}
      />
    </div>
  );
}
