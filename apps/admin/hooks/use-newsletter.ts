'use client';

import { useState, useEffect, useCallback } from 'react';
import { VendlyNewsletterService } from '@/services/newsletter.service';
import type { NewsletterSubscriber, NewsletterStats } from '@/types/operations';

export function useNewsletter() {
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [stats, setStats] = useState<NewsletterStats>({
    total: 0,
    active: 0,
    unsubscribed: 0,
  });
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscribers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [res, statsRes] = await Promise.allSettled([
        VendlyNewsletterService.getSubscribers({
          page,
          limit,
          search: search || undefined,
          status,
        }),
        VendlyNewsletterService.getStats(),
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
        setSubscribers(list);
        setTotal(typeof val?.total === 'number' ? val.total : list.length);
      } else {
        setError(res.reason?.message || 'Failed to fetch subscribers');
      }

      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading subscribers');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, status]);

  useEffect(() => {
    void fetchSubscribers();
  }, [fetchSubscribers]);

  const addSubscriber = async (email: string) => {
    const res = await VendlyNewsletterService.addSubscriber(email);
    await fetchSubscribers();
    return res;
  };

  const toggleStatus = async (id: string) => {
    const res = await VendlyNewsletterService.toggleStatus(id);
    await fetchSubscribers();
    return res;
  };

  const deleteSubscriber = async (id: string) => {
    const res = await VendlyNewsletterService.delete(id);
    await fetchSubscribers();
    return res;
  };

  return {
    subscribers,
    stats,
    total,
    page,
    setPage,
    limit,
    search,
    setSearch,
    status,
    setStatus,
    loading,
    error,
    refresh: fetchSubscribers,
    addSubscriber,
    toggleStatus,
    deleteSubscriber,
  };
}
