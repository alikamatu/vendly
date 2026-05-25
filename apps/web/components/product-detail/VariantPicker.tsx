"use client";

import React, { useMemo } from "react";

export interface ProductVariant {
  id: string;
  sku?: string | null;
  attributes: Record<string, string>;
  price?: string | null;
  quantity_available: number;
  image_url?: string | null;
  is_active: boolean;
}

interface Props {
  variants: ProductVariant[];
  selected: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
}

/**
 * Renders one row of swatches per attribute (e.g. Size, Color). Disables
 * combinations that don't exist or are out of stock, so the buyer can't pick
 * an invalid variant.
 */
export default function VariantPicker({ variants, selected, onChange }: Props) {
  const { axes, valueMap } = useMemo(() => {
    const axisSet = new Map<string, Set<string>>();
    for (const v of variants) {
      for (const [k, val] of Object.entries(v.attributes || {})) {
        if (!axisSet.has(k)) axisSet.set(k, new Set());
        axisSet.get(k)!.add(val);
      }
    }
    const axes: { key: string; values: string[] }[] = Array.from(
      axisSet.entries(),
    ).map(([key, set]) => ({
      key,
      values: Array.from(set).sort(),
    }));
    const valueMap = new Map<string, ProductVariant[]>();
    for (const v of variants) {
      for (const [k, val] of Object.entries(v.attributes || {})) {
        const key = `${k}:${val}`;
        if (!valueMap.has(key)) valueMap.set(key, []);
        valueMap.get(key)!.push(v);
      }
    }
    return { axes, valueMap };
  }, [variants]);

  if (!variants.length || !axes.length) return null;

  const isAvailable = (axis: string, val: string) => {
    // A value is "available" if at least one variant matching the rest of
    // the current selection (other axes) + this value has stock.
    return variants.some((v) => {
      if (!v.is_active || v.quantity_available <= 0) return false;
      if (v.attributes[axis] !== val) return false;
      for (const a of axes) {
        if (a.key === axis) continue;
        const cur = selected[a.key];
        if (cur && v.attributes[a.key] !== cur) return false;
      }
      return true;
    });
  };

  return (
    <div className="space-y-3">
      {axes.map((axis) => (
        <div key={axis.key}>
          <div className="text-[10px] uppercase tracking-wider text-muted mb-1.5">
            {axis.key}
            {selected[axis.key] && (
              <span className="ml-2 text-foreground/80 normal-case">
                {selected[axis.key]}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {axis.values.map((val) => {
              const active = selected[axis.key] === val;
              const available = isAvailable(axis.key, val);
              return (
                <button
                  key={val}
                  type="button"
                  disabled={!available}
                  onClick={() =>
                    onChange({ ...selected, [axis.key]: val })
                  }
                  className={`px-3 py-1.5 rounded-lg text-xs border transition ${
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : available
                        ? "border-border hover:border-foreground/40"
                        : "border-border/40 text-muted/50 line-through cursor-not-allowed"
                  }`}
                >
                  {val}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Returns the variant matching the current axis selection, or null. */
export function matchVariant(
  variants: ProductVariant[],
  selected: Record<string, string>,
): ProductVariant | null {
  if (!variants.length) return null;
  const axes = Object.keys(selected);
  return (
    variants.find(
      (v) =>
        v.is_active &&
        axes.every((a) => v.attributes[a] === selected[a]) &&
        // require full selection match — every variant axis is chosen
        Object.keys(v.attributes).every((k) => selected[k] !== undefined),
    ) || null
  );
}
