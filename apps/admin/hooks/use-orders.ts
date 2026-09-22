'use client';

import { useState, useEffect, useCallback } from 'react';
import { VendlyOrderService } from '@/services/order.service';
import type {
  VendlyOrder,
  OrderStatus,
  OrderListParams,
  OrderStatsSummary,
} from '@/types/operations';

export function useVendlyOrders(initialParams: OrderListParams = {}) {
  const [orders, setOrders] = useState<VendlyOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<OrderStatsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async (params: OrderListParams = initialParams) => {
    setLoading(true);
    setError(null);
    try {
      const [res, stats] = await Promise.allSettled([
        VendlyOrderService.list(params),
        VendlyOrderService.summary(),
      ]);

      if (res.status === 'fulfilled') {
        const val = res.value;
        const list = Array.isArray(val)
          ? val
          : Array.isArray(val?.data)
            ? val.data
            : Array.isArray((val as any)?.data?.data)
              ? (val as any).data.data
              : [];
        setOrders(list);
        setTotal(typeof val?.total === 'number' ? val.total : list.length);
      } else {
        setError(res.reason?.message || 'Failed to fetch orders');
      }

      if (stats.status === 'fulfilled') {
        setSummary(stats.value);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading orders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchOrders(initialParams);
  }, [fetchOrders]);

  const updateStatus = async (id: string, status: OrderStatus, reason?: string) => {
    const updated = await VendlyOrderService.setStatus(id, status, reason);
    await fetchOrders();
    return updated;
  };

  const refundOrder = async (
    id: string,
    body?: {
      amount?: number;
      reason?: string;
      customer_note?: string;
      merchant_note?: string;
    },
  ) => {
    const res = await VendlyOrderService.refund(id, body);
    await fetchOrders();
    return res;
  };

  return {
    orders,
    total,
    summary,
    loading,
    error,
    refresh: fetchOrders,
    updateStatus,
    refundOrder,
  };
}
