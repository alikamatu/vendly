"use client";

import React, { useEffect, useState, useMemo } from "react";
import Select from "@/components/ui/Select";
import { onboardingApi, LocationCity } from "@/lib/api/onboarding";
import { MapPin } from "lucide-react";

interface RegionCityPickerProps {
  initialRegion?: string;
  initialCityId?: string;
  onChange: (v: { region: string; cityId: string; cityLabel: string | null }) => void;
  onError?: (message: string) => void;
}

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

  const regionOptions = useMemo(
    () => regions.map((r) => ({ value: r, label: r })),
    [regions]
  );

  const cityOptions = useMemo(
    () => cities.map((c) => ({ value: c.id, label: c.city })),
    [cities]
  );

  return (
    <div className="space-y-4">
      <Select
        id="region-select"
        label="Region"
        icon={<MapPin className="w-4 h-4" />}
        value={region}
        onChange={(val) => {
          setRegion(val);
          setCityId("");
        }}
        options={regionOptions}
        placeholder={loadingRegions ? "Loading regions..." : "Select your region"}
        searchable
        disabled={loadingRegions}
      />

      <Select
        id="city-select"
        label="City / Town"
        icon={<MapPin className="w-4 h-4" />}
        value={cityId}
        onChange={(val) => setCityId(val)}
        options={cityOptions}
        placeholder={
          !region
            ? "Select a region first"
            : loadingCities
            ? "Loading cities..."
            : "Select your city"
        }
        searchable
        disabled={!region || loadingCities}
      />
    </div>
  );
}
