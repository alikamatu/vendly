'use client';

import { useState, useEffect, useCallback } from 'react';
import { VendlyUserService } from '@/services/user.service';
import type { VendlyUser, UserRole } from '@/types/operations';

export function useVendlyUsers() {
  const [users, setUsers] = useState<VendlyUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async (params: Record<string, unknown> = {}) => {
    setLoading(true);
    setError(null);
    try {
      const result = await VendlyUserService.getUsers(params);
      if (Array.isArray(result)) {
        setUsers(result);
      } else if (result?.data) {
        setUsers(result.data);
      } else {
        setUsers([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  const updateRole = async (userId: string, role: UserRole) => {
    const res = await VendlyUserService.updateRole(userId, role);
    await fetchUsers();
    return res;
  };

  const toggleSuspension = async (userId: string, reason?: string) => {
    const res = await VendlyUserService.toggleSuspension(userId, reason);
    await fetchUsers();
    return res;
  };

  const warnUser = async (userId: string, reason: string) => {
    const res = await VendlyUserService.warnUser(userId, reason);
    await fetchUsers();
    return res;
  };

  const deleteUser = async (userId: string) => {
    const res = await VendlyUserService.deleteUser(userId);
    await fetchUsers();
    return res;
  };

  const forceDisable2fa = async (userId: string) => {
    const res = await VendlyUserService.forceDisable2fa(userId);
    await fetchUsers();
    return res;
  };

  const setProStatus = async (
    userId: string,
    body: { is_pro: boolean; duration_days?: number },
  ) => {
    const res = await VendlyUserService.setProStatus(userId, body);
    await fetchUsers();
    return res;
  };

  return {
    users,
    loading,
    error,
    refresh: fetchUsers,
    updateRole,
    toggleSuspension,
    warnUser,
    deleteUser,
    forceDisable2fa,
    setProStatus,
  };
}
