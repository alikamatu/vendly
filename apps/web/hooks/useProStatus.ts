"use client";

import { useCallback, useEffect, useState } from "react";
import { subscriptionApi, ProStatus } from "@/lib/api/subscription";
import { useAuth } from "@/lib/contexts/auth-context";

interface UseProStatus {
  status: ProStatus | null;
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

export function useProStatus(): UseProStatus {
  const { token } = useAuth();
  const [status, setStatus] = useState<ProStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) {
      setStatus(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await subscriptionApi.getMe(token);
      setStatus(data);
    } catch (err: any) {
      setError(err?.message || "Failed to load subscription");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  return { status, isLoading, error, reload: load };
}
