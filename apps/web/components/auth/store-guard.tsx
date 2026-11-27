'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/contexts/auth-context';

export function StoreGuard({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;

    if (isAuthenticated && user) {
      const canAccessSellerFlow =
        user.approval_status === 'APPROVED' || user.role === 'SELLER' || user.role === 'ADMIN';
      const isCreateStorePage = pathname === '/create-store';
      const isOnboardingPage = pathname === '/onboarding';

      // 1. Sellers with incomplete store setup are directed to /create-store
      if (
        canAccessSellerFlow &&
        (!user.seller_profile || !user.seller_profile?.onboarding_completed) &&
        !isCreateStorePage
      ) {
        router.push('/create-store');
        return;
      }

      // 2. Prevent sellers with completed onboarding from revisiting /create-store or /onboarding
      if (canAccessSellerFlow && user.seller_profile?.onboarding_completed) {
        if (isCreateStorePage || isOnboardingPage) {
          router.push('/dashboard');
          return;
        }
      }
    }
  }, [user, isAuthenticated, isLoading, pathname, router]);

  return <>{children}</>;
}
