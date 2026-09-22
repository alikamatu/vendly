'use client';

import { useState, useEffect, useCallback } from 'react';
import { VendlyUserService } from '@/services/user.service';
import type { VerificationRequest, VerificationStatus } from '@/types/operations';

export function useVendlyVerifications() {
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = useCallback(async (params: Record<string, unknown> = {}) => {
    setLoading(true);
    setError(null);
    try {
      const result = await VendlyUserService.getApprovals(params);
      if (Array.isArray(result)) {
        setRequests(result);
      } else if (result?.data) {
        setRequests(result.data);
      } else {
        setRequests([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch verification requests');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchRequests();
  }, [fetchRequests]);

  const approveOrReject = async (
    approvalId: string,
    status: VerificationStatus,
    reason?: string,
  ) => {
    const result = await VendlyUserService.approveOrReject(approvalId, status, reason);
    await fetchRequests();
    return result;
  };

  return {
    requests,
    loading,
    error,
    refresh: fetchRequests,
    approveOrReject,
  };
}
