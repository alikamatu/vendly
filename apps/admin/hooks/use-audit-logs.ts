'use client';

import { useState, useEffect, useCallback } from 'react';
import { VendlyAuditLogService } from '@/services/audit-log.service';
import type { AuditLogEntry, AuditLogListParams } from '@/types/operations';

export function useVendlyAuditLogs(initialParams: AuditLogListParams = {}) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [meta, setMeta] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async (params: AuditLogListParams = initialParams) => {
    setLoading(true);
    setError(null);
    try {
      const res = await VendlyAuditLogService.list(params);
      setLogs(res.items || []);
      setMeta(res.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchLogs(initialParams);
  }, [fetchLogs]);

  return {
    logs,
    meta,
    loading,
    error,
    refresh: fetchLogs,
  };
}
