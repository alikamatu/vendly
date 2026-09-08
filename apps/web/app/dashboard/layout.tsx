'use client';

import React, { useState } from 'react';
import Sidebar from '@/components/dashboard/Sidebar';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { usePathname } from 'next/navigation';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const getTitle = (path: string) => {
    if (path === '/dashboard') return 'Overview';
    if (path.startsWith('/dashboard/products')) return 'My Products';
    if (path.startsWith('/dashboard/orders')) return 'Orders';
    if (path.startsWith('/dashboard/analytics')) return 'Analytics';
    if (path.startsWith('/dashboard/reviews')) return 'Store Reviews';
    if (path.startsWith('/dashboard/notifications')) return 'Notifications';
    if (path === '/dashboard/settings/activity') return 'Activity Log';
    if (path === '/dashboard/settings/store') return 'Store Settings';
    if (path === '/dashboard/settings/profile') return 'Personal Info';
    if (path === '/dashboard/settings/security') return 'Security & Password';
    if (path === '/dashboard/settings/personalization') return 'Appearance';
    if (path === '/dashboard/settings/help') return 'Help & FAQ';
    if (path === '/dashboard/settings/terms') return 'Terms & Policies';
    if (path.startsWith('/dashboard/settings')) return 'Settings';
    return 'Dashboard';
  };

  return (
    <ProtectedRoute allowedRoles={['SELLER', 'ADMIN']}>
      <div className="bg-background min-h-screen">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        <div className="flex min-h-screen flex-col transition-all duration-300 lg:ml-72">
          <DashboardHeader title={getTitle(pathname)} onMenuToggle={() => setIsSidebarOpen(true)} />
          <main className="w-full max-w-7xl mx-auto flex-1 px-4 py-5 sm:px-6 sm:py-6 md:px-8 md:py-8">{children}</main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
