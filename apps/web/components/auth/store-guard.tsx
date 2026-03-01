'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export function StoreGuard({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;

    if (isAuthenticated && user) {
      // Check if user is an approved seller but has no store
      const isApprovedSeller = user.role === 'SELLER';
      const hasNoStore = !user.seller_profile;

      if (isApprovedSeller && hasNoStore && pathname !== '/create-store') {
        router.push('/create-store');
      }

      // Prevent approved sellers with stores from visiting /create-store
      if (isApprovedSeller && !hasNoStore && pathname === '/create-store') {
        router.push('/dashboard');
      }
    }
  }, [user, isAuthenticated, isLoading, pathname, router]);

  return <>{children}</>;
}
