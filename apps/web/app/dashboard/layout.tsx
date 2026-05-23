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
    switch (path) {
      case '/dashboard':
        return 'Overview';
      case '/dashboard/products':
        return 'Products';
      case '/dashboard/orders':
        return 'Orders';
      case '/dashboard/reviews':
        return 'Store Reviews';
      case '/dashboard/settings':
        return 'Settings';
      default:
        return 'Dashboard';
    }
  };

  return (
    <ProtectedRoute allowedRoles={['SELLER', 'ADMIN']}>
      <div className="bg-background min-h-screen">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        <div className="flex min-h-screen flex-col transition-all duration-300 lg:ml-72">
          <DashboardHeader title={getTitle(pathname)} onMenuToggle={() => setIsSidebarOpen(true)} />
          <main className="container mx-auto flex-1 p-4 md:p-8">{children}</main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
