'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useAuth, type User } from '@/lib/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { Lock, ArrowLeft } from 'lucide-react';
import Spinner from '@/components/ui/Spinner';

type Role = User['role'];

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireVerification?: boolean;
  requireApproval?: boolean;
  /**
   * Restricts the route to users whose role is in this list.
   * When provided and the current user's role is not included, an
   * access-denied screen is shown (the user is not redirected).
   */
  allowedRoles?: Role[];
  /** Optional path to redirect unauthenticated users to. Default `/login`. */
  loginPath?: string;
}

export default function ProtectedRoute({
  children,
  requireVerification = false,
  requireApproval = false,
  allowedRoles,
  loginPath = '/login',
}: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const roleAllowed =
    !allowedRoles || (user ? allowedRoles.includes(user.role) : false);

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.replace(loginPath);
      return;
    }

    if (requireVerification && user && !user.is_verified) {
      router.replace(loginPath);
      return;
    }

    if (requireApproval && user) {
      if (!user.has_verification_doc || user.approval_status !== 'APPROVED') {
        router.replace('/seller-verification');
        return;
      }
    }
  }, [
    isLoading,
    isAuthenticated,
    user,
    requireVerification,
    requireApproval,
    loginPath,
    router,
  ]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-background)]">
        <div className="flex flex-col items-center gap-3">
          <Spinner size="lg" />
          <p className="text-sm text-[var(--color-muted)]">Checking access…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;
  if (requireVerification && user && !user.is_verified) return null;
  if (requireApproval && user && user.approval_status !== 'APPROVED') return null;
  if (!roleAllowed) return <AccessDenied />;

  return <>{children}</>;
}

function AccessDenied() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)] px-4">
      <div className="w-full max-w-md text-center space-y-6 p-8 rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[var(--color-accent)]/10 text-[var(--color-accent)] mx-auto">
          <Lock className="w-6 h-6" />
        </div>
        <div className="space-y-2">
          <h1 className="text-lg font-medium tracking-tight text-[var(--color-foreground)]">
            Seller access only
          </h1>
          <p className="text-sm text-[var(--color-muted)] leading-relaxed">
            This area is for verified sellers and administrators. Open a store on
            Verndly to unlock the seller dashboard.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-5 h-11 rounded-2xl bg-[var(--color-foreground)] text-[var(--color-background)] text-sm font-normal hover:opacity-90 transition-opacity"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to shop
          </Link>
          <Link
            href="/create-store"
            className="inline-flex items-center justify-center px-5 h-11 rounded-2xl border border-[var(--color-border)] text-sm font-normal text-[var(--color-foreground)] hover:bg-[var(--color-border)]/40 transition-colors"
          >
            Become a seller
          </Link>
        </div>
      </div>
    </div>
  );
}
