"use client";

import React, { useEffect, useState } from "react";
import { Plus, Trash2, Save } from "lucide-react";
import Button from "@/components/ui/Button";
import { variantApi, type Variant, type VariantInput } from "@/lib/api/variant";
import { useAuth } from "@/lib/contexts/auth-context";

interface Row extends VariantInput {
  _localId: string;
}

interface Props {
  productId: string;
  /** Optional: prefill axis hints to scaffold rows for first-time use. */
  defaultAxes?: string[];
}

let localId = 0;
const nextId = () => `local-${++localId}`;

function emptyRow(axes: string[]): Row {
  const attrs: Record<string, string> = {};
  axes.forEach((a) => (attrs[a] = ""));
  return {
    _localId: nextId(),
    attributes: attrs,
    quantity_available: 0,
    is_active: true,
    price: "",
    sku: "",
  };
}

export default function VariantEditor({
  productId,
  defaultAxes = ["size", "color"],
}: Props) {
  const { token } = useAuth();
  const [axes, setAxes] = useState<string[]>(defaultAxes);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const existing = await variantApi.list(productId);
        if (cancelled) return;
        if (existing.length) {
          // Derive axes from existing variants.
          const axisSet = new Set<string>();
          existing.forEach((v: Variant) =>
            Object.keys(v.attributes).forEach((k) => axisSet.add(k)),
          );
          const derivedAxes = Array.from(axisSet);
          setAxes(derivedAxes);
          setRows(
            existing.map((v: Variant) => ({
              _localId: nextId(),
              id: v.id,
              sku: v.sku ?? "",
              attributes: { ...v.attributes },
              price: v.price ?? "",
              quantity_available: v.quantity_available,
              image_url: v.image_url ?? "",
              is_active: v.is_active,
            })),
          );
        }
      } catch (e: any) {
        setError(e?.message || "Failed to load variants");
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [productId]);

  const addRow = () => setRows((r) => [...r, emptyRow(axes)]);
  const removeRow = (id: string) =>
    setRows((r) => r.filter((x) => x._localId !== id));
  const updateRow = (id: string, patch: Partial<Row>) =>
    setRows((r) => r.map((x) => (x._localId === id ? { ...x, ...patch } : x)));
  const updateAttr = (id: string, axis: string, val: string) =>
    setRows((r) =>
      r.map((x) =>
        x._localId === id
          ? { ...x, attributes: { ...x.attributes, [axis]: val } }
          : x,
      ),
    );

  const addAxis = () => {
    const name = window.prompt("New attribute name (e.g. material):");
    if (!name) return;
    const key = name.trim().toLowerCase();
    if (!key || axes.includes(key)) return;
    setAxes((a) => [...a, key]);
    setRows((r) =>
      r.map((x) => ({ ...x, attributes: { ...x.attributes, [key]: "" } })),
    );
  };

  const removeAxis = (axis: string) => {
    setAxes((a) => a.filter((x) => x !== axis));
    setRows((r) =>
      r.map((x) => {
        const next = { ...x.attributes };
        delete next[axis];
        return { ...x, attributes: next };
      }),
    );
  };

  const save = async () => {
    if (!token) return;
    setSaving(true);
    setError(null);
    setFlash(null);
    try {
      const payload: VariantInput[] = rows.map((r) => ({
        id: r.id,
        sku: r.sku?.trim() || null,
        attributes: Object.fromEntries(
          Object.entries(r.attributes).filter(([, v]) => v && v.trim()),
        ),
        price: r.price?.toString().trim() || null,
        quantity_available: Math.max(0, Number(r.quantity_available) || 0),
        image_url: r.image_url?.trim() || null,
        is_active: r.is_active ?? true,
      }));
      const result = await variantApi.replaceAll(token, productId, payload);
      setRows(
        result.map((v) => ({
          _localId: nextId(),
          id: v.id,
          sku: v.sku ?? "",
          attributes: { ...v.attributes },
          price: v.price ?? "",
          quantity_available: v.quantity_available,
          image_url: v.image_url ?? "",
          is_active: v.is_active,
        })),
      );
      setFlash(`Saved ${result.length} variant${result.length === 1 ? "" : "s"}`);
    } catch (e: any) {
      setError(e?.message || "Failed to save variants");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-sm text-muted">Loading variants…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium">Variants</div>
          <div className="text-xs text-muted">
            Add size, colour, or any attribute. Each variant tracks its own stock.
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={addAxis}>
            + Attribute
          </Button>
          <Button variant="secondary" size="sm" onClick={addRow}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Variant
          </Button>
        </div>
      </div>

      {axes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {axes.map((a) => (
            <span
              key={a}
              className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wider px-2 py-1 rounded bg-surface border border-border/60"
            >
              {a}
              <button
                onClick={() => removeAxis(a)}
                className="text-muted hover:text-red-500"
                aria-label={`Remove ${a}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted">
          No variants yet. Click <strong>+ Variant</strong> to add one.
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div
              key={r._localId}
              className="grid grid-cols-12 gap-2 items-center rounded-xl border border-border/60 p-3"
            >
              {axes.map((a) => (
                <div key={a} className="col-span-2">
                  <label className="text-[10px] uppercase tracking-wider text-muted">
                    {a}
                  </label>
                  <input
                    value={r.attributes[a] || ""}
                    onChange={(e) => updateAttr(r._localId, a, e.target.value)}
                    placeholder={a === "size" ? "M" : a === "color" ? "Red" : "—"}
                    className="w-full h-8 px-2 rounded border bg-transparent text-sm"
                  />
                </div>
              ))}
              <div className="col-span-2">
                <label className="text-[10px] uppercase tracking-wider text-muted">
                  Stock
                </label>
                <input
                  type="number"
                  min={0}
                  value={r.quantity_available}
                  onChange={(e) =>
                    updateRow(r._localId, {
                      quantity_available: parseInt(e.target.value || "0", 10),
                    })
                  }
                  className="w-full h-8 px-2 rounded border bg-transparent text-sm"
                />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] uppercase tracking-wider text-muted">
                  Price (opt)
                </label>
                <input
                  value={r.price ?? ""}
                  onChange={(e) =>
                    updateRow(r._localId, { price: e.target.value })
                  }
                  placeholder="—"
                  className="w-full h-8 px-2 rounded border bg-transparent text-sm"
                />
              </div>
              <div
                className="col-span-1 flex justify-end"
                style={{
                  marginLeft: `auto`,
                  gridColumn: `span ${Math.max(1, 12 - axes.length * 2 - 4)}`,
                }}
              >
                <button
                  onClick={() => removeRow(r._localId)}
                  className="p-2 rounded-lg text-muted hover:text-red-500 hover:bg-red-500/10"
                  aria-label="Remove variant"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {(error || flash) && (
        <div
          className={`text-xs rounded-lg px-3 py-2 border ${
            error
              ? "border-red-500/30 bg-red-500/5 text-red-600"
              : "border-emerald-500/30 bg-emerald-500/5 text-emerald-600"
          }`}
        >
          {error || flash}
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} className="gap-2">
          <Save className="w-4 h-4" />{" "}
          {saving ? "Saving…" : "Save variants"}
        </Button>
      </div>
    </div>
  );
}
