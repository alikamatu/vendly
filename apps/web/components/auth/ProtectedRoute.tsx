'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/lib/contexts/auth-context';
import { useRouter } from 'next/navigation';
import Spinner from '@/components/ui/Spinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireVerification?: boolean;
  requireApproval?: boolean;
}

export default function ProtectedRoute({
  children,
  requireVerification = false,
  requireApproval = false,
}: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }

    if (requireVerification && user && !user.is_verified) {
      router.replace('/login');
      return;
    }

    if (requireApproval && user) {
      if (!user.has_verification_doc || user.approval_status !== 'APPROVED') {
        router.replace('/seller-verification');
        return;
      }
    }
  }, [isLoading, isAuthenticated, user, requireVerification, requireApproval, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Spinner size="lg" />
          <p className="text-sm text-foreground/50">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;
  if (requireVerification && user && !user.is_verified) return null;
  if (requireApproval && user && user.approval_status !== 'APPROVED') return null;

  return <>{children}</>;
}
