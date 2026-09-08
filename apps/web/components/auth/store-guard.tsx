'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/contexts/auth-context';

// Paths that don't require onboarding
const ONBOARDING_EXEMPT_PATHS = ['/create-store', '/onboarding'];
// Paths that are public (no auth check needed)
const PUBLIC_PATHS = ['/', '/s/', '/product/', '/(auth)'];

export function StoreGuard({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;

    if (isAuthenticated && user) {
      const isSellerVerified =
        user.approval_status === 'APPROVED' ||
        user.role === 'SELLER' ||
        user.role === 'ADMIN';
      const isCreateStorePage = pathname === '/create-store';
      const isOnboardingPage = pathname === '/onboarding';

      // 1. User has to be seller verified before they can create a store
      if (!isSellerVerified && isCreateStorePage) {
        router.replace('/seller-verification?redirect=/create-store');
        return;
      }

      // 2. Approved seller with no store OR onboarding not complete → must complete setup on /create-store
      if (
        isSellerVerified &&
        (!user.seller_profile || !user.seller_profile?.onboarding_completed) &&
        !isCreateStorePage
      ) {
        router.push('/create-store');
        return;
      }

      // 3. Prevent sellers with completed onboarding from visiting /create-store or /onboarding
      if (isSellerVerified && user.seller_profile?.onboarding_completed) {
        if (isCreateStorePage || isOnboardingPage) {
          router.push('/dashboard');
          return;
        }
      }
    }
  }, [user, isAuthenticated, isLoading, pathname, router]);

  return <>{children}</>;
}
