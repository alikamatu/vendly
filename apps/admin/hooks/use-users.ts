'use client';

import { useState, useCallback } from 'react';
import {
  VendlyUserService,
  type AdminUpdateProfilePayload,
  type AdminUpdateStorePayload,
} from '@/services/user.service';
import type {
  AdminStoreSummary,
  AdminUsersSummary,
  VendlyUser,
  UserRole,
} from '@/types/operations';

export interface UserFilterParams {
  search?: string;
  role?: string;
  accountStatus?: string;
  page?: number;
  limit?: number;
}

export function useVendlyUsers() {
  const [users, setUsers] = useState<VendlyUser[]>([]);
  const [stores, setStores] = useState<AdminStoreSummary[]>([]);
  const [summary, setSummary] = useState<AdminUsersSummary | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [storesTotal, setStoresTotal] = useState(0);
  const [storesTotalPages, setStoresTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [storesLoading, setStoresLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async (params: UserFilterParams = {}) => {
    setLoading(true);
    setError(null);
    try {
      const query: Record<string, unknown> = {
        page: params.page ?? 1,
        limit: params.limit ?? 50,
      };
      if (params.search?.trim()) query.search = params.search.trim();
      if (params.role && params.role !== 'ALL') query.role = params.role;
      if (params.accountStatus && params.accountStatus !== 'ALL') {
        query.accountStatus = params.accountStatus;
      }

      const result = await VendlyUserService.getUsers(query);
      if (Array.isArray(result)) {
        setUsers(result);
        setTotal(result.length);
        setTotalPages(1);
      } else if (result?.data) {
        setUsers(result.data);
        setTotal(result.total ?? result.data.length);
        setTotalPages(result.totalPages ?? 1);
        if (result.summary) setSummary(result.summary);
      } else {
        setUsers([]);
        setTotal(0);
        setTotalPages(1);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStores = useCallback(async (params: UserFilterParams = {}) => {
    setStoresLoading(true);
    setError(null);
    try {
      const query: Record<string, unknown> = {
        page: params.page ?? 1,
        limit: params.limit ?? 50,
      };
      if (params.search?.trim()) query.search = params.search.trim();
      if (params.accountStatus && params.accountStatus !== 'ALL') {
        query.accountStatus = params.accountStatus;
      }
      const result = await VendlyUserService.getStores(query);
      if (Array.isArray(result)) {
        setStores(result);
        setStoresTotal(result.length);
        setStoresTotalPages(1);
      } else if (result?.data) {
        setStores(result.data);
        setStoresTotal(result.total ?? result.data.length);
        setStoresTotalPages(result.totalPages ?? 1);
      } else {
        setStores([]);
        setStoresTotal(0);
        setStoresTotalPages(1);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stores');
    } finally {
      setStoresLoading(false);
    }
  }, []);

  return {
    users,
    stores,
    summary,
    total,
    totalPages,
    storesTotal,
    storesTotalPages,
    loading,
    storesLoading,
    error,
    fetchUsers,
    fetchStores,
    getUserById: (userId: string) => VendlyUserService.getUserById(userId),
    updateRole: (userId: string, role: UserRole, reason?: string) =>
      VendlyUserService.updateRole(userId, role, reason),
    toggleSuspension: (userId: string, reason?: string) =>
      VendlyUserService.toggleSuspension(userId, reason),
    warnUser: (userId: string, reason: string) => VendlyUserService.warnUser(userId, reason),
    resetWarnings: (userId: string, reason?: string) =>
      VendlyUserService.resetWarnings(userId, reason),
    setVerification: (userId: string, isVerified: boolean, reason?: string) =>
      VendlyUserService.setVerification(userId, isVerified, reason),
    updateProfile: (userId: string, payload: AdminUpdateProfilePayload) =>
      VendlyUserService.updateProfile(userId, payload),
    updateStore: (userId: string, payload: AdminUpdateStorePayload) =>
      VendlyUserService.updateStore(userId, payload),
    retryStoreSubaccount: (userId: string) => VendlyUserService.retryStoreSubaccount(userId),
    reactivateUser: (userId: string) => VendlyUserService.reactivateUser(userId),
    cancelDeletion: (userId: string) => VendlyUserService.cancelDeletion(userId),
    executeDeletion: (userId: string, confirmText: string, reason?: string) =>
      VendlyUserService.executeDeletion(userId, confirmText, reason),
    sendPasswordReset: (userId: string) => VendlyUserService.sendPasswordReset(userId),
    notifyUser: (userId: string, body: { title: string; body: string; link?: string }) =>
      VendlyUserService.notifyUser(userId, body),
    deleteUser: (userId: string) => VendlyUserService.deleteUser(userId),
    forceDisable2fa: (userId: string) => VendlyUserService.forceDisable2fa(userId),
    setProStatus: (userId: string, body: { is_pro: boolean; duration_days?: number }) =>
      VendlyUserService.setProStatus(userId, body),
  };
}
