'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AdminSidebar } from './AdminSidebar';
import { AdminTopbar } from './AdminTopbar';
import { Spinner } from '@/components/ui/spinner';

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  if (loading) {
    return (
      <div className="bg-background flex min-h-screen w-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Spinner size="lg" className="text-brand" />
          <p className="text-muted-foreground animate-pulse text-xs font-medium">
            Authenticating Vendly Administrator...
          </p>
        </div>
      </div>
    );
  }

  // If no authenticated admin user, AuthContext will handle redirecting to /auth/login.
  // Rendering null while redirect happens prevents layout flash.
  if (!user || user.role !== 'ADMIN') {
    return null;
  }

  return (
    <div className="bg-background text-foreground flex min-h-screen">
      {/* Sidebar */}
      <AdminSidebar collapsed={collapsed} onToggleCollapse={() => setCollapsed((prev) => !prev)} />

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopbar />
        <main className="mx-auto w-full max-w-7xl flex-1 overflow-x-hidden p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
