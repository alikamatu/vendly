'use client';

import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Save, Layers, AlertCircle, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import Alert from '@/components/ui/Alert';
import { variantApi, type Variant, type VariantInput } from '@/lib/api/variant';
import { useAuth } from '@/lib/contexts/auth-context';

interface Row extends VariantInput {
  _localId: string;
}

interface Props {
  productId: string;
  defaultAxes?: string[];
  onSaveSuccess?: () => void;
}

let localId = 0;
const nextId = () => `local-${++localId}`;

function emptyRow(axes: string[]): Row {
  const attrs: Record<string, string> = {};
  axes.forEach((a) => (attrs[a] = ''));
  return {
    _localId: nextId(),
    attributes: attrs,
    quantity_available: 0,
    is_active: true,
    price: '',
    sku: '',
  };
}

const SUGGESTED_ATTRIBUTES = [
  'size',
  'color',
  'material',
  'storage',
  'style',
  'flavor',
  'weight',
];

export default function VariantEditor({
  productId,
  defaultAxes = ['size', 'color'],
  onSaveSuccess,
}: Props) {
  const { token } = useAuth();
  const [axes, setAxes] = useState<string[]>(defaultAxes);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Custom Modal state for adding an attribute (replacing window.prompt)
  const [isAddAttrModalOpen, setIsAddAttrModalOpen] = useState(false);
  const [newAttrName, setNewAttrName] = useState('');
  const [attrError, setAttrError] = useState<string | null>(null);

  // Custom ConfirmModal states (replacing window.confirm / unconfirmed destructive actions)
  const [axisToDelete, setAxisToDelete] = useState<string | null>(null);
  const [rowToDelete, setRowToDelete] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const existing = await variantApi.list(productId);
        if (cancelled) return;
        if (existing.length) {
          const axisSet = new Set<string>();
          existing.forEach((v: Variant) =>
            Object.keys(v.attributes).forEach((k) => axisSet.add(k))
          );
          const derivedAxes = Array.from(axisSet);
          setAxes(derivedAxes.length ? derivedAxes : defaultAxes);
          setRows(
            existing.map((v: Variant) => ({
              _localId: nextId(),
              id: v.id,
              sku: v.sku ?? '',
              attributes: { ...v.attributes },
              price: v.price ?? '',
              quantity_available: v.quantity_available,
              image_url: v.image_url ?? '',
              is_active: v.is_active,
            }))
          );
        }
      } catch (e: any) {
        setError(e?.message || 'Failed to load variants');
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [productId, defaultAxes]);

  const addRow = () => setRows((r) => [...r, emptyRow(axes)]);

  const handleConfirmRemoveRow = () => {
    if (!rowToDelete) return;
    setRows((r) => r.filter((x) => x._localId !== rowToDelete));
    setRowToDelete(null);
  };

  const handleRequestRemoveRow = (id: string) => {
    const target = rows.find((r) => r._localId === id);
    const hasValues =
      target &&
      (Number(target.quantity_available) > 0 ||
        target.price ||
        target.sku ||
        Object.values(target.attributes).some((v) => Boolean(v?.trim())));

    if (hasValues) {
      setRowToDelete(id);
    } else {
      setRows((r) => r.filter((x) => x._localId !== id));
    }
  };

  const updateRow = (id: string, patch: Partial<Row>) =>
    setRows((r) => r.map((x) => (x._localId === id ? { ...x, ...patch } : x)));

  const updateAttr = (id: string, axis: string, val: string) =>
    setRows((r) =>
      r.map((x) =>
        x._localId === id
          ? { ...x, attributes: { ...x.attributes, [axis]: val } }
          : x
      )
    );

  const handleAddAttribute = (nameToAdd?: string) => {
    const raw = (nameToAdd ?? newAttrName).trim().toLowerCase();
    if (!raw) {
      setAttrError('Attribute name cannot be empty.');
      return;
    }
    if (axes.includes(raw)) {
      setAttrError(`Attribute "${raw}" already exists.`);
      return;
    }

    setAxes((a) => [...a, raw]);
    setRows((r) =>
      r.map((x) => ({ ...x, attributes: { ...x.attributes, [raw]: '' } }))
    );
    setNewAttrName('');
    setAttrError(null);
    setIsAddAttrModalOpen(false);
    toast.success(`Added "${raw}" attribute.`);
  };

  const handleConfirmRemoveAxis = () => {
    if (!axisToDelete) return;
    const axis = axisToDelete;
    setAxes((a) => a.filter((x) => x !== axis));
    setRows((r) =>
      r.map((x) => {
        const next = { ...x.attributes };
        delete next[axis];
        return { ...x, attributes: next };
      })
    );
    toast.success(`Removed "${axis}" attribute.`);
    setAxisToDelete(null);
  };

  const save = async () => {
    if (!token) {
      toast.error('You must be logged in to save variants.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload: VariantInput[] = rows.map((r) => ({
        id: r.id,
        sku: r.sku?.trim() || null,
        attributes: Object.fromEntries(
          Object.entries(r.attributes).filter(([, v]) => v && v.trim())
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
          sku: v.sku ?? '',
          attributes: { ...v.attributes },
          price: v.price ?? '',
          quantity_available: v.quantity_available,
          image_url: v.image_url ?? '',
          is_active: v.is_active,
        }))
      );
      toast.success(
        `Saved ${result.length} variant${result.length === 1 ? '' : 's'}`
      );
      onSaveSuccess?.();
    } catch (e: any) {
      const msg = e?.message || 'Failed to save variants';
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-8 flex flex-col items-center justify-center gap-2 text-xs text-muted">
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span>Loading product variants…</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/50">
        <div>
          <div className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <Layers className="w-4 h-4 text-accent" />
            <span>Variant Matrix</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-surface border border-border/80 text-muted">
              {rows.length} {rows.length === 1 ? 'item' : 'items'}
            </span>
          </div>
          <div className="text-xs text-muted mt-0.5">
            Configure options (size, color, etc.) with individual stock and price overrides.
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              setNewAttrName('');
              setAttrError(null);
              setIsAddAttrModalOpen(true);
            }}
            className="rounded-xl text-xs h-9"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Attribute
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={addRow}
            className="rounded-xl text-xs h-9"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Variant
          </Button>
        </div>
      </div>

      {/* Active Attributes Badges */}
      {axes.length > 0 ? (
        <div className="flex items-center flex-wrap gap-2 pt-1">
          <span className="text-[11px] font-medium text-muted mr-1">
            Attributes:
          </span>
          {axes.map((a) => (
            <span
              key={a}
              className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider pl-2.5 pr-1.5 py-1 rounded-xl bg-surface border border-border/70 text-foreground"
            >
              <span>{a}</span>
              <button
                type="button"
                onClick={() => setAxisToDelete(a)}
                className="w-4 h-4 rounded-md flex items-center justify-center text-muted hover:text-red-500 hover:bg-red-500/10 transition-colors"
                title={`Remove ${a} attribute`}
                aria-label={`Remove ${a}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <div className="text-xs text-muted italic">
          No attributes defined. Click &ldquo;+ Attribute&rdquo; to add dimensions like Size or Color.
        </div>
      )}

      {/* Rows Table / List */}
      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/80 bg-surface/30 p-8 text-center space-y-2">
          <div className="w-10 h-10 rounded-2xl bg-surface border border-border flex items-center justify-center mx-auto text-muted">
            <Layers className="w-5 h-5" />
          </div>
          <p className="text-xs font-medium text-foreground">
            No variants configured yet
          </p>
          <p className="text-[11px] text-muted max-w-sm mx-auto">
            Click <strong>+ Variant</strong> to add your first variant row, or <strong>+ Attribute</strong> to define options like Size or Color.
          </p>
          <div className="pt-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={addRow}
              className="rounded-xl text-xs"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Add First Variant
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {rows.map((r, idx) => (
            <div
              key={r._localId}
              className="group rounded-2xl border border-border/80 bg-surface/40 hover:bg-surface/70 hover:border-border transition-colors p-3.5 space-y-3"
            >
              <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2">
                <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">
                  Variant #{idx + 1}
                </span>

                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center gap-1.5 text-xs text-muted cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={r.is_active ?? true}
                      onChange={(e) =>
                        updateRow(r._localId, { is_active: e.target.checked })
                      }
                      className="rounded accent-accent h-3.5 w-3.5"
                    />
                    <span>Active</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => handleRequestRemoveRow(r._localId)}
                    className="p-1.5 rounded-lg text-muted hover:text-red-500 hover:bg-red-500/10 transition-colors"
                    title="Delete variant"
                    aria-label="Delete variant"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 items-end">
                {/* Attribute inputs */}
                {axes.map((a) => (
                  <div key={a} className="space-y-1">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted block truncate">
                      {a}
                    </label>
                    <input
                      value={r.attributes[a] || ''}
                      onChange={(e) => updateAttr(r._localId, a, e.target.value)}
                      placeholder={a === 'size' ? 'M' : a === 'color' ? 'Black' : 'Value'}
                      className="w-full h-9 px-3 rounded-xl border border-input-border bg-input-bg text-foreground text-xs placeholder:text-muted/60 focus:outline-none focus:border-foreground/40 transition-colors"
                    />
                  </div>
                ))}

                {/* Stock available */}
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-muted block truncate">
                    Stock
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={r.quantity_available}
                    onChange={(e) =>
                      updateRow(r._localId, {
                        quantity_available: parseInt(e.target.value || '0', 10),
                      })
                    }
                    className="w-full h-9 px-3 rounded-xl border border-input-border bg-input-bg text-foreground text-xs font-semibold tabular-nums focus:outline-none focus:border-foreground/40 transition-colors"
                  />
                </div>

                {/* Price override (optional) */}
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-muted block truncate">
                    Price GH₵ (opt)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    value={r.price ?? ''}
                    onChange={(e) => updateRow(r._localId, { price: e.target.value })}
                    placeholder="Inherit"
                    className="w-full h-9 px-3 rounded-xl border border-input-border bg-input-bg text-foreground text-xs tabular-nums focus:outline-none focus:border-foreground/40 transition-colors"
                  />
                </div>

                {/* SKU (optional) */}
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-muted block truncate">
                    SKU (opt)
                  </label>
                  <input
                    value={r.sku ?? ''}
                    onChange={(e) => updateRow(r._localId, { sku: e.target.value })}
                    placeholder="SKU-001"
                    className="w-full h-9 px-3 rounded-xl border border-input-border bg-input-bg text-foreground text-xs font-mono uppercase focus:outline-none focus:border-foreground/40 transition-colors"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error display */}
      {error && (
        <Alert
          variant="error"
          title="Failed to Save Variants"
          message={error}
          onDismiss={() => setError(null)}
        />
      )}

      {/* Save Action */}
      <div className="flex items-center justify-between pt-2">
        <span className="text-xs text-muted">
          {rows.length > 0
            ? `${rows.length} variant${rows.length === 1 ? '' : 's'} configured`
            : 'No variants configured'}
        </span>

        <Button
          type="button"
          onClick={save}
          disabled={saving}
          className="gap-2 rounded-xl text-xs h-10 px-5"
        >
          <Save className="w-3.5 h-3.5" />
          {saving ? 'Saving changes…' : 'Save Variants'}
        </Button>
      </div>

      {/* ────────────────── Custom Modal: Add Attribute ────────────────── */}
      <Modal
        isOpen={isAddAttrModalOpen}
        onClose={() => setIsAddAttrModalOpen(false)}
        title="Add Attribute"
        description="Define a new variant specification dimension (e.g. Size, Color, Material)."
        className="sm:max-w-[440px]"
        actions={
          <div className="flex items-center justify-end gap-2 w-full pt-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsAddAttrModalOpen(false)}
              className="rounded-xl text-xs h-10 px-4"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => handleAddAttribute()}
              className="rounded-xl text-xs h-10 px-5"
            >
              Add Attribute
            </Button>
          </div>
        }
      >
        <div className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">
              Attribute Name
            </label>
            <input
              type="text"
              autoFocus
              value={newAttrName}
              onChange={(e) => {
                setNewAttrName(e.target.value);
                setAttrError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddAttribute();
                }
              }}
              placeholder="e.g. Material, Storage, Flavor"
              className="w-full h-11 px-3.5 rounded-xl border border-input-border bg-input-bg text-foreground text-sm focus:outline-none focus:border-foreground/40 transition-colors"
            />
            {attrError && (
              <p className="text-xs text-red-500 font-medium">{attrError}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted block">
              Suggested Attributes
            </label>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTED_ATTRIBUTES.filter((s) => !axes.includes(s)).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleAddAttribute(s)}
                  className="text-xs px-2.5 py-1 rounded-xl bg-surface border border-border/80 text-foreground/80 hover:text-foreground hover:bg-surface/80 hover:border-foreground/30 transition-colors capitalize inline-flex items-center gap-1"
                >
                  <Plus className="w-3 h-3 text-muted" /> {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {/* ────────────────── Custom ConfirmModal: Remove Attribute ────────────────── */}
      <ConfirmModal
        isOpen={Boolean(axisToDelete)}
        onClose={() => setAxisToDelete(null)}
        onConfirm={handleConfirmRemoveAxis}
        title="Remove Attribute"
        description={`Are you sure you want to remove "${axisToDelete}"? This will delete this specification from all configured variants.`}
        confirmText="Remove Attribute"
        variant="danger"
      />

      {/* ────────────────── Custom ConfirmModal: Delete Variant Row ────────────────── */}
      <ConfirmModal
        isOpen={Boolean(rowToDelete)}
        onClose={() => setRowToDelete(null)}
        onConfirm={handleConfirmRemoveRow}
        title="Delete Variant"
        description="Are you sure you want to delete this variant? Any unique SKU or stock allocation will be discarded upon saving."
        confirmText="Delete Variant"
        variant="danger"
      />
    </div>
  );
}
