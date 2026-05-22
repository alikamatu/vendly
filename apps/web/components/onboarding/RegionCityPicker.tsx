"use client";

import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { onboardingApi, LocationCity } from "@/lib/api/onboarding";

interface RegionCityPickerProps {
  initialRegion?: string;
  initialCityId?: string;
  onChange: (v: { region: string; cityId: string; cityLabel: string | null }) => void;
  onError?: (message: string) => void;
}

const baseField =
  "w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl px-4 py-3 text-sm text-[var(--color-foreground)] focus:ring-2 focus:ring-[var(--color-accent)]/30 focus:border-[var(--color-accent)]/50 outline-none transition-all";

export default function RegionCityPicker({
  initialRegion = "",
  initialCityId = "",
  onChange,
  onError,
}: RegionCityPickerProps) {
  const [regions, setRegions] = useState<string[]>([]);
  const [cities, setCities] = useState<LocationCity[]>([]);
  const [region, setRegion] = useState(initialRegion);
  const [cityId, setCityId] = useState(initialCityId);
  const [loadingRegions, setLoadingRegions] = useState(true);
  const [loadingCities, setLoadingCities] = useState(false);

  useEffect(() => {
    onboardingApi
      .getRegions()
      .then(setRegions)
      .catch(() => onError?.("Failed to load regions"))
      .finally(() => setLoadingRegions(false));
  }, [onError]);

  useEffect(() => {
    if (!region) {
      setCities([]);
      if (cityId) setCityId("");
      return;
    }
    setLoadingCities(true);
    onboardingApi
      .getCitiesByRegion(region)
      .then(setCities)
      .catch(() => onError?.("Failed to load cities"))
      .finally(() => setLoadingCities(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region]);

  useEffect(() => {
    const cityLabel = cities.find((c) => c.id === cityId)?.city ?? null;
    onChange({ region, cityId, cityLabel });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region, cityId, cities]);

  return (
    <div className="space-y-4 md:space-y-5">
      <Field label="Region">
        {loadingRegions ? (
          <LoadingShell text="Loading regions..." />
        ) : (
          <select
            value={region}
            onChange={(e) => {
              setRegion(e.target.value);
              setCityId("");
            }}
            className={`${baseField} appearance-none cursor-pointer`}
          >
            <option value="">Select your region</option>
            {regions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        )}
      </Field>

      <Field label="City / Town">
        {loadingCities ? (
          <LoadingShell text="Loading cities..." />
        ) : (
          <select
            value={cityId}
            onChange={(e) => setCityId(e.target.value)}
            disabled={!region}
            className={`${baseField} appearance-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            <option value="">
              {region ? "Select your city" : "Select a region first"}
            </option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.city}
              </option>
            ))}
          </select>
        )}
      </Field>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-[11px] font-normal text-[var(--color-muted)] uppercase tracking-wider pl-1">
        {label}
      </label>
      {children}
    </div>
  );
}

function LoadingShell({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 py-3 px-4 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)]">
      <Loader2 className="w-4 h-4 animate-spin text-[var(--color-muted)]" />
      <span className="text-xs text-[var(--color-muted)]">{text}</span>
    </div>
  );
}
