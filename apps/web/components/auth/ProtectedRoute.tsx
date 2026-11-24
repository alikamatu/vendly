'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useAuth, type User } from '@/lib/contexts/auth-context';
import { usePathname, useRouter } from 'next/navigation';
import { Lock, ArrowLeft } from 'lucide-react';
import Spinner from '@/components/ui/Spinner';

type Role = User['role'];

interface ProtectedRouteProps {
  children: React.ReactNode;
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
  allowedRoles,
  loginPath = '/login',
}: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const roleAllowed = !allowedRoles || (user ? allowedRoles.includes(user.role) : false);

  const signedOutPrompt = pathname?.startsWith('/orders')
    ? 'Sign in to view your orders'
    : 'Sign in to continue';

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.replace(loginPath);
    }
  }, [isLoading, isAuthenticated, loginPath, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-background)] px-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <Spinner size="lg" />
          <p className="text-sm text-[var(--color-muted)]">{signedOutPrompt}</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-background)] px-4">
        <div className="w-full max-w-sm space-y-5 rounded-3xl bg-[var(--color-surface)] p-8 text-center">
          <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-background)] text-[var(--color-foreground)]">
            <Lock className="h-5 w-5" />
          </div>
          <div className="space-y-2">
            <h1 className="text-lg font-medium tracking-tight text-[var(--color-foreground)]">
              {signedOutPrompt}
            </h1>
            <p className="text-xs leading-relaxed text-[var(--color-muted)]">
              This page requires a Verndly account. Sign in to access your details.
            </p>
          </div>
          <Link
            href={loginPath}
            className="inline-flex h-11 w-full items-center justify-center rounded-full bg-[var(--color-foreground)] px-5 text-xs font-medium text-[var(--color-background)] transition-opacity hover:opacity-90"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }
  if (!roleAllowed) return <AccessDenied />;

  return <>{children}</>;
}

function AccessDenied() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-background)] px-4">
      <div className="w-full max-w-md space-y-6 rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center">
        <div className="bg-[var(--color-accent)]/10 mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl text-[var(--color-accent)]">
          <Lock className="h-6 w-6" />
        </div>
        <div className="space-y-2">
          <h1 className="text-lg font-medium tracking-tight text-[var(--color-foreground)]">
            Seller access only
          </h1>
          <p className="text-sm leading-relaxed text-[var(--color-muted)]">
            This area is for verified sellers and administrators. Open a store on Verndly to unlock
            the seller dashboard.
          </p>
        </div>
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[var(--color-foreground)] px-5 text-sm font-normal text-[var(--color-background)] transition-opacity hover:opacity-90"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to shop
          </Link>
          <Link
            href="/create-store"
            className="hover:bg-[var(--color-border)]/40 inline-flex h-11 items-center justify-center rounded-2xl border border-[var(--color-border)] px-5 text-sm font-normal text-[var(--color-foreground)] transition-colors"
          >
            Become a seller
          </Link>
        </div>
      </div>
    </div>
  );
}
