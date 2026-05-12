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
      const isApprovedSeller = user.role === 'SELLER';
      const hasNoStore = !user.seller_profile;
      const isOnboardingPage = pathname === '/onboarding';
      const isCreateStorePage = pathname === '/create-store';

      // 1. Approved seller with no store → must create store first
      if (isApprovedSeller && hasNoStore && !isCreateStorePage) {
        router.push('/create-store');
        return;
      }

      // 2. Approved seller with store, but onboarding not complete → must finish onboarding
      if (
        isApprovedSeller &&
        !hasNoStore &&
        !user.seller_profile?.onboarding_completed &&
        !isOnboardingPage
      ) {
        router.push('/onboarding');
        return;
      }

      // 3. Prevent sellers with completed onboarding from visiting /create-store or /onboarding
      if (isApprovedSeller && !hasNoStore && user.seller_profile?.onboarding_completed) {
        if (isCreateStorePage || isOnboardingPage) {
          router.push('/dashboard');
          return;
        }
      }
    }
  }, [user, isAuthenticated, isLoading, pathname, router]);

  return <>{children}</>;
}
