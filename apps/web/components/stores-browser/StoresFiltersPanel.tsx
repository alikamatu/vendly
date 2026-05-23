'use client';

import React, { useEffect, useState } from 'react';
import { Crown, MapPin, SlidersHorizontal, RefreshCw } from 'lucide-react';
import { onboardingApi } from '@/lib/api/onboarding';
import type { StoresBrowserState } from '@/hooks/useStoresBrowser';

interface StoresFiltersPanelProps {
  state: StoresBrowserState;
}

export default function StoresFiltersPanel({ state }: StoresFiltersPanelProps) {
  const [regions, setRegions] = useState<string[]>([]);
  const [loadingRegions, setLoadingRegions] = useState(true);

  useEffect(() => {
    onboardingApi
      .getRegions()
      .then((data) => {
        setRegions(data || []);
      })
      .catch((err) => {
        console.error('Failed to load regions:', err);
      })
      .finally(() => {
        setLoadingRegions(false);
      });
  }, []);

  const hasActiveFilters = state.location !== null || state.isProOnly;

  return (
    <div className="space-y-6">
      {/* Title block with Reset Option */}
      <div className="border-[var(--color-border)]/40 flex items-center justify-between border-b pb-3">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-foreground)]">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filter Settings
        </div>
        {hasActiveFilters && (
          <button
            onClick={state.clearAll}
            className="flex items-center gap-1 text-[11px] font-medium text-[var(--color-accent)] transition-all hover:underline active:scale-95"
            type="button"
          >
            <RefreshCw className="animate-spin-reverse h-3 w-3" />
            Reset
          </button>
        )}
      </div>

      {/* Region/Location Selector */}
      <div className="space-y-2">
        <label className="block flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted)]">
          <MapPin className="h-3.5 w-3.5" />
          Browse by Region
        </label>
        <div className="relative">
          <select
            value={state.location || ''}
            onChange={(e) => state.setLocation(e.target.value || null)}
            disabled={loadingRegions}
            className="focus:ring-[var(--color-accent)]/10 h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-xs text-[var(--color-foreground)] transition-all duration-200 focus:border-[var(--color-accent)] focus:outline-none focus:ring-4 disabled:opacity-50"
          >
            <option value="">All Regions / Everywhere</option>
            {regions.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>
          {loadingRegions && (
            <div className="absolute right-3 top-3.5">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent" />
            </div>
          )}
        </div>
      </div>

      {/* iOS-Style PRO Toggle */}
      <div className="shadow-xs flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 transition-colors duration-200">
        <div className="flex items-center gap-2">
          <div className="bg-[var(--color-accent)]/10 flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-accent)]">
            <Crown className="h-4 w-4" />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] font-semibold text-[var(--color-foreground)]">
              PRO Vendors Only
            </span>
            <span className="text-[9px] text-[var(--color-muted)]">
              Show certified store profiles
            </span>
          </div>
        </div>

        {/* Apple iOS Style switch */}
        <button
          type="button"
          onClick={() => state.setIsProOnly(!state.isProOnly)}
          className={`focus:ring-[var(--color-accent)]/10 relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 ${
            state.isProOnly ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-border)]'
          }`}
          aria-label="Toggle PRO Vendors filter"
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ${
              state.isProOnly ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
    </div>
  );
}
