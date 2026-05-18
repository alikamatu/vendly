"use client";

import React, { useEffect, useState } from "react";
import { ChevronDown, RefreshCcw, Loader2 } from "lucide-react";
import type { ProductsBrowserState } from "@/hooks/useProductsBrowser";
import {
  SERVICE_AREA_LABEL,
  DELIVERY_TIME_LABEL,
} from "@/hooks/useProductsBrowser";
import type { HomeCategory } from "@/hooks/useHomeData";
import type { ServiceAreaFilter, DeliveryTimeFilter } from "@/lib/api/product";
import { onboardingApi, type LocationCity } from "@/lib/api/onboarding";

interface FiltersPanelProps {
  state: ProductsBrowserState;
  categories: HomeCategory[];
  brands: string[];
  conditions?: string[];
  /** Compact = used in mobile drawer */
  compact?: boolean;
}

const CONDITION_OPTIONS = ["new", "refurbished", "used_like_new", "used_good", "used_fair"];

export default function FiltersPanel({
  state,
  categories,
  brands,
  conditions = CONDITION_OPTIONS,
  compact = false,
}: FiltersPanelProps) {
  return (
    <div className={`space-y-${compact ? "4" : "5"}`}>
      <Group title="Quick filters">
        <ToggleRow
          label="In stock only"
          checked={state.inStock}
          onChange={state.setInStock}
        />
        <ToggleRow
          label="On sale"
          checked={state.hasDiscount}
          onChange={state.setHasDiscount}
        />
        <ToggleRow
          label="With video"
          checked={state.hasVideo}
          onChange={state.setHasVideo}
        />
      </Group>

      <Group title="Category">
        <select
          value={state.category ?? ""}
          onChange={(e) => state.setCategory(e.target.value || null)}
          className={fieldClass}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id ?? c.name} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
      </Group>

      {brands.length > 0 && (
        <Group title="Brand">
          <select
            value={state.brand ?? ""}
            onChange={(e) => state.setBrand(e.target.value || null)}
            className={fieldClass}
          >
            <option value="">All brands</option>
            {brands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </Group>
      )}

      <Group title="Price (GH₵)">
        <PriceRange
          min={state.minPrice}
          max={state.maxPrice}
          onChange={state.setPrice}
        />
      </Group>

      <Group title="Condition">
        <div className="grid grid-cols-2 gap-1.5">
          {conditions.map((c) => {
            const active = state.condition === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => state.setCondition(active ? null : c)}
                className={`text-left px-3 h-9 rounded-lg border text-[11px] font-bold capitalize transition-colors ${
                  active
                    ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                    : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-foreground)] hover:border-[var(--color-accent)]/40"
                }`}
              >
                {c.replace(/_/g, " ")}
              </button>
            );
          })}
        </div>
      </Group>

      <Group title="Location">
        <LocationFilter state={state} />
      </Group>

      <Group title="Delivery">
        <DeliveryFilter state={state} />
      </Group>

      <button
        type="button"
        onClick={state.clearAll}
        className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors"
      >
        <RefreshCcw className="w-3 h-3" />
        Reset filters
      </button>
    </div>
  );
}

function LocationFilter({ state }: { state: ProductsBrowserState }) {
  const [regions, setRegions] = useState<string[]>([]);
  const [cities, setCities] = useState<LocationCity[]>([]);
  const [loadingRegions, setLoadingRegions] = useState(true);
  const [loadingCities, setLoadingCities] = useState(false);

  useEffect(() => {
    let cancelled = false;
    onboardingApi
      .getRegions()
      .then((rs) => !cancelled && setRegions(rs))
      .catch(() => {})
      .finally(() => !cancelled && setLoadingRegions(false));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!state.region) {
      setCities([]);
      return;
    }
    let cancelled = false;
    setLoadingCities(true);
    onboardingApi
      .getCitiesByRegion(state.region)
      .then((cs) => !cancelled && setCities(cs))
      .catch(() => {})
      .finally(() => !cancelled && setLoadingCities(false));
    return () => {
      cancelled = true;
    };
  }, [state.region]);

  return (
    <div className="space-y-2">
      <div className="relative">
        {loadingRegions && (
          <Loader2 className="w-3.5 h-3.5 animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)] pointer-events-none" />
        )}
        <select
          value={state.region ?? ""}
          onChange={(e) => state.setRegion(e.target.value || null)}
          className={fieldClass}
          disabled={loadingRegions}
          aria-label="Region"
        >
          <option value="">Any region</option>
          {regions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>
      <div className="relative">
        {loadingCities && (
          <Loader2 className="w-3.5 h-3.5 animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)] pointer-events-none" />
        )}
        <select
          value={state.cityId ?? ""}
          onChange={(e) => state.setCityId(e.target.value || null)}
          className={fieldClass}
          disabled={!state.region || loadingCities}
          aria-label="City"
        >
          <option value="">
            {state.region ? "Any city" : "Pick a region first"}
          </option>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.city}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function DeliveryFilter({ state }: { state: ProductsBrowserState }) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <p className="text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-wider px-0.5">
          Service area
        </p>
        <div className="grid grid-cols-1 gap-1.5">
          {(["SAME_CITY", "NEARBY_STATES", "NATIONWIDE"] as ServiceAreaFilter[]).map((sa) => {
            const active = state.serviceArea === sa;
            return (
              <button
                key={sa}
                type="button"
                onClick={() => state.setServiceArea(active ? null : sa)}
                className={`text-left px-3 h-9 rounded-lg border text-[11px] font-bold transition-colors ${
                  active
                    ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                    : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-foreground)] hover:border-[var(--color-accent)]/40"
                }`}
              >
                {SERVICE_AREA_LABEL[sa]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-wider px-0.5">
          Average delivery
        </p>
        <select
          value={state.deliveryTime ?? ""}
          onChange={(e) => state.setDeliveryTime((e.target.value || null) as DeliveryTimeFilter | null)}
          className={fieldClass}
          aria-label="Average delivery time"
        >
          <option value="">Any delivery time</option>
          {(
            [
              "SAME_DAY",
              "NEXT_DAY",
              "TWO_TO_THREE_DAYS",
              "FOUR_TO_SEVEN_DAYS",
              "MORE_THAN_ONE_WEEK",
            ] as DeliveryTimeFilter[]
          ).map((d) => (
            <option key={d} value={d}>
              {DELIVERY_TIME_LABEL[d]}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

const fieldClass =
  "w-full h-10 px-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[12px] text-[var(--color-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30 focus:border-[var(--color-accent)]/50 transition-all appearance-none cursor-pointer";

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details open className="group/details">
      <summary className="list-none cursor-pointer flex items-center justify-between gap-2 pb-2 select-none">
        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--color-muted)]">
          {title}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-[var(--color-muted)] transition-transform group-open/details:rotate-180" />
      </summary>
      <div className="space-y-2 pt-1">{children}</div>
    </details>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 py-1.5 cursor-pointer">
      <span className="text-[12px] text-[var(--color-foreground)]">{label}</span>
      <span
        className={`relative inline-flex w-9 h-5 rounded-full transition-colors ${
          checked ? "bg-[var(--color-accent)]" : "bg-[var(--color-border)]"
        }`}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-[var(--color-background)] transition-transform ${
            checked ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </span>
    </label>
  );
}

function PriceRange({
  min,
  max,
  onChange,
}: {
  min: number | null;
  max: number | null;
  onChange: (min: number | null, max: number | null) => void;
}) {
  const [draftMin, setDraftMin] = useState<string>(min != null ? String(min) : "");
  const [draftMax, setDraftMax] = useState<string>(max != null ? String(max) : "");

  // Reflect external clears
  useEffect(() => {
    setDraftMin(min != null ? String(min) : "");
  }, [min]);
  useEffect(() => {
    setDraftMax(max != null ? String(max) : "");
  }, [max]);

  function commit() {
    const a = draftMin === "" ? null : Number(draftMin);
    const b = draftMax === "" ? null : Number(draftMax);
    onChange(
      Number.isFinite(a as number) ? (a as number) : null,
      Number.isFinite(b as number) ? (b as number) : null,
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        inputMode="numeric"
        placeholder="Min"
        value={draftMin}
        onChange={(e) => setDraftMin(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && commit()}
        className={fieldClass}
      />
      <span className="text-[var(--color-muted)] text-xs">—</span>
      <input
        type="number"
        inputMode="numeric"
        placeholder="Max"
        value={draftMax}
        onChange={(e) => setDraftMax(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && commit()}
        className={fieldClass}
      />
    </div>
  );
}
