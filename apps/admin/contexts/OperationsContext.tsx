'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { VendlySettingsService } from '@/services/settings.service';
import { VendlyNotificationService } from '@/services/notification.service';
import { useAuth } from './AuthContext';

interface BadgeCounts {
  pendingApprovals: number;
  pendingOrders: number;
  pendingReturns: number;
  flaggedReviews: number;
  unreadNotifications: number;
}

interface OperationsContextType {
  badges: BadgeCounts;
  refreshBadges: () => Promise<void>;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
}

const OperationsContext = createContext<OperationsContextType | undefined>(undefined);

export function OperationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [badges, setBadges] = useState<BadgeCounts>({
    pendingApprovals: 0,
    pendingOrders: 0,
    pendingReturns: 0,
    flaggedReviews: 0,
    unreadNotifications: 0,
  });

  const refreshBadges = useCallback(async () => {
    if (!user) return;
    try {
      const [overview, notifStats] = await Promise.allSettled([
        VendlySettingsService.getGlobalOverview(),
        VendlyNotificationService.stats(),
      ]);

      const newBadges: BadgeCounts = {
        pendingApprovals: 0,
        pendingOrders: 0,
        pendingReturns: 0,
        flaggedReviews: 0,
        unreadNotifications: 0,
      };

      if (overview.status === 'fulfilled' && overview.value) {
        newBadges.pendingApprovals = overview.value.pendingApprovalsCount || 0;
        newBadges.pendingReturns = overview.value.pendingReturnsCount || 0;
        newBadges.flaggedReviews = overview.value.flaggedReviewsCount || 0;
      }

      if (notifStats.status === 'fulfilled' && notifStats.value) {
        newBadges.unreadNotifications = notifStats.value.unread || 0;
      }

      setBadges(newBadges);
    } catch {
      // Quiet fail — badges are non-critical
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      void refreshBadges();
      // Periodic check every 60 seconds
      const interval = setInterval(refreshBadges, 60000);
      return () => clearInterval(interval);
    }
  }, [user, refreshBadges]);

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);

  return (
    <OperationsContext.Provider
      value={{
        badges,
        refreshBadges,
        sidebarOpen,
        setSidebarOpen,
        toggleSidebar,
      }}
    >
      {children}
    </OperationsContext.Provider>
  );
}

export function useOperations() {
  const context = useContext(OperationsContext);
  if (!context) {
    throw new Error('useOperations must be used within an OperationsProvider');
  }
  return context;
}
