'use client';

import React, { useState } from 'react';
import { ChevronDown, Ruler, Tag, X } from 'lucide-react';
import {
  DIMENSION_UNITS,
  WARRANTY_PRESETS,
  WEIGHT_UNITS,
  formatDimensionsLabel,
  formatWeightLabel,
  getSubtabsForCategory,
  type ProductDimensions,
  type ProductWeight,
  type StructuredProductAttributes,
} from '@/lib/catalog-subcategories';

interface ImportItemSpecsEditorProps {
  category: string;
  subcategory?: string;
  tags: string[];
  attributes?: StructuredProductAttributes;
  onChange: (patch: {
    subcategory?: string;
    tags?: string[];
    attributes?: StructuredProductAttributes;
  }) => void;
}

export default function ImportItemSpecsEditor({
  category,
  subcategory,
  tags,
  attributes,
  onChange,
}: ImportItemSpecsEditorProps) {
  const [open, setOpen] = useState(false);
  const [tagDraft, setTagDraft] = useState('');

  const subtabs = getSubtabsForCategory(category);
  const activeSub = subcategory || attributes?.subcategory || '';
  const dims: ProductDimensions = attributes?.dimensions || {};
  const wt: ProductWeight = attributes?.weight || {};

  const dimLabel = formatDimensionsLabel(dims);
  const weightLabel = formatWeightLabel(wt);

  const patchAttributes = (next: Partial<StructuredProductAttributes>) => {
    const merged: StructuredProductAttributes = {
      ...(attributes || {}),
      ...next,
    };
    if (!merged.subcategory) delete merged.subcategory;
    onChange({
      subcategory: merged.subcategory,
      attributes: merged,
    });
  };

  const patchDimensions = (partial: Partial<ProductDimensions>) => {
    const nextDims: ProductDimensions = {
      ...dims,
      unit: dims.unit || 'cm',
      ...partial,
    };
    const hasAny = Boolean(nextDims.length || nextDims.width || nextDims.height);
    patchAttributes({ dimensions: hasAny ? nextDims : undefined });
  };

  const patchWeight = (partial: Partial<ProductWeight>) => {
    const nextWt: ProductWeight = {
      ...wt,
      unit: wt.unit || 'kg',
      ...partial,
    };
    patchAttributes({ weight: nextWt.value ? nextWt : undefined });
  };

  const parseNum = (raw: string): number | null => {
    if (!raw.trim()) return null;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  const addTag = () => {
    const clean = tagDraft.trim().toLowerCase().replace(/^#+/, '').replace(/\s+/g, ' ');
    if (!clean || tags.includes(clean) || tags.length >= 10) {
      setTagDraft('');
      return;
    }
    onChange({ tags: [...tags, clean] });
    setTagDraft('');
  };

  const removeTag = (target: string) => {
    onChange({ tags: tags.filter((t) => t !== target) });
  };

  return (
    <div className="bg-background rounded-2xl px-3.5 py-2.5">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full flex-wrap items-center justify-between gap-2 text-left"
      >
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="text-foreground inline-flex items-center gap-1 font-semibold">
            <Ruler className="text-muted h-3.5 w-3.5" />
            <span>Subcategory, Tags &amp; Dimensions</span>
          </span>

          {activeSub && (
            <span className="bg-surface text-foreground rounded-full px-2 py-0.5 font-semibold">
              {activeSub}
            </span>
          )}
          {tags.length > 0 && (
            <span className="bg-surface text-muted inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium">
              <Tag className="h-2.5 w-2.5" />
              {tags.length} {tags.length === 1 ? 'tag' : 'tags'}
            </span>
          )}
          {dimLabel && (
            <span className="bg-surface text-muted rounded-full px-2 py-0.5 font-medium">
              {dimLabel}
            </span>
          )}
          {weightLabel && (
            <span className="bg-surface text-muted rounded-full px-2 py-0.5 font-medium">
              {weightLabel}
            </span>
          )}
          {attributes?.color && (
            <span className="bg-surface text-muted rounded-full px-2 py-0.5 font-medium">
              {attributes.color}
            </span>
          )}
        </div>

        <ChevronDown
          className={`text-muted h-3.5 w-3.5 shrink-0 transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div className="mt-3 space-y-3 pt-1">
          {/* Row 1: Subcategory + Color + Material + Size */}
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-4">
            <div>
              <label className="text-muted mb-1 block text-[10px] font-semibold uppercase tracking-wider">
                Subcategory
              </label>
              <select
                value={activeSub}
                onChange={(e) => patchAttributes({ subcategory: e.target.value || undefined })}
                className="bg-surface text-foreground h-9 w-full rounded-xl px-2.5 text-xs font-medium outline-none"
              >
                <option value="">Auto / None</option>
                {activeSub && !subtabs.includes(activeSub) && (
                  <option value={activeSub}>{activeSub}</option>
                )}
                {subtabs.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-muted mb-1 block text-[10px] font-semibold uppercase tracking-wider">
                Color
              </label>
              <input
                type="text"
                value={attributes?.color || ''}
                onChange={(e) => patchAttributes({ color: e.target.value || undefined })}
                placeholder="e.g. Matte Black"
                className="bg-surface text-foreground placeholder:text-muted/60 h-9 w-full rounded-xl px-2.5 text-xs outline-none"
              />
            </div>

            <div>
              <label className="text-muted mb-1 block text-[10px] font-semibold uppercase tracking-wider">
                Material
              </label>
              <input
                type="text"
                value={attributes?.material || ''}
                onChange={(e) => patchAttributes({ material: e.target.value || undefined })}
                placeholder="e.g. Leather, Cotton"
                className="bg-surface text-foreground placeholder:text-muted/60 h-9 w-full rounded-xl px-2.5 text-xs outline-none"
              />
            </div>

            <div>
              <label className="text-muted mb-1 block text-[10px] font-semibold uppercase tracking-wider">
                Size / Capacity
              </label>
              <input
                type="text"
                value={attributes?.size || ''}
                onChange={(e) => patchAttributes({ size: e.target.value || undefined })}
                placeholder="e.g. 256GB, EU 42, XL"
                className="bg-surface text-foreground placeholder:text-muted/60 h-9 w-full rounded-xl px-2.5 text-xs outline-none"
              />
            </div>
          </div>

          {/* Row 2: Dimensions (L x W x H + Unit) & Weight */}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-6">
            <div>
              <label className="text-muted mb-1 block text-[10px] font-semibold uppercase tracking-wider">
                Length
              </label>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.1"
                value={dims.length ?? ''}
                onChange={(e) => patchDimensions({ length: parseNum(e.target.value) })}
                placeholder="L"
                className="bg-surface text-foreground placeholder:text-muted/60 h-9 w-full rounded-xl px-2.5 text-xs outline-none"
              />
            </div>

            <div>
              <label className="text-muted mb-1 block text-[10px] font-semibold uppercase tracking-wider">
                Width
              </label>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.1"
                value={dims.width ?? ''}
                onChange={(e) => patchDimensions({ width: parseNum(e.target.value) })}
                placeholder="W"
                className="bg-surface text-foreground placeholder:text-muted/60 h-9 w-full rounded-xl px-2.5 text-xs outline-none"
              />
            </div>

            <div>
              <label className="text-muted mb-1 block text-[10px] font-semibold uppercase tracking-wider">
                Height
              </label>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.1"
                value={dims.height ?? ''}
                onChange={(e) => patchDimensions({ height: parseNum(e.target.value) })}
                placeholder="H"
                className="bg-surface text-foreground placeholder:text-muted/60 h-9 w-full rounded-xl px-2.5 text-xs outline-none"
              />
            </div>

            <div>
              <label className="text-muted mb-1 block text-[10px] font-semibold uppercase tracking-wider">
                Dim. Unit
              </label>
              <select
                value={dims.unit || 'cm'}
                onChange={(e) =>
                  patchDimensions({ unit: e.target.value as ProductDimensions['unit'] })
                }
                className="bg-surface text-foreground h-9 w-full rounded-xl px-2 text-xs font-medium outline-none"
              >
                {DIMENSION_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-muted mb-1 block text-[10px] font-semibold uppercase tracking-wider">
                Weight
              </label>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={wt.value ?? ''}
                onChange={(e) => patchWeight({ value: parseNum(e.target.value) })}
                placeholder="0.0"
                className="bg-surface text-foreground placeholder:text-muted/60 h-9 w-full rounded-xl px-2.5 text-xs outline-none"
              />
            </div>

            <div>
              <label className="text-muted mb-1 block text-[10px] font-semibold uppercase tracking-wider">
                Wt. Unit
              </label>
              <select
                value={wt.unit || 'kg'}
                onChange={(e) => patchWeight({ unit: e.target.value as ProductWeight['unit'] })}
                className="bg-surface text-foreground h-9 w-full rounded-xl px-2 text-xs font-medium outline-none"
              >
                {WEIGHT_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 3: Warranty + SKU + Tags */}
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-12">
            <div className="sm:col-span-4">
              <label className="text-muted mb-1 block text-[10px] font-semibold uppercase tracking-wider">
                Warranty
              </label>
              <select
                value={attributes?.warranty || ''}
                onChange={(e) => patchAttributes({ warranty: e.target.value || undefined })}
                className="bg-surface text-foreground h-9 w-full rounded-xl px-2.5 text-xs font-medium outline-none"
              >
                <option value="">Not specified</option>
                {attributes?.warranty &&
                  !(WARRANTY_PRESETS as readonly string[]).includes(attributes.warranty) && (
                    <option value={attributes.warranty}>{attributes.warranty}</option>
                  )}
                {WARRANTY_PRESETS.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-3">
              <label className="text-muted mb-1 block text-[10px] font-semibold uppercase tracking-wider">
                SKU / Model
              </label>
              <input
                type="text"
                value={attributes?.sku || ''}
                onChange={(e) => patchAttributes({ sku: e.target.value || undefined })}
                placeholder="Optional"
                className="bg-surface text-foreground placeholder:text-muted/60 h-9 w-full rounded-xl px-2.5 text-xs outline-none"
              />
            </div>

            <div className="sm:col-span-5">
              <label className="text-muted mb-1 block text-[10px] font-semibold uppercase tracking-wider">
                Search Tags
              </label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={tagDraft}
                  onChange={(e) => setTagDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  placeholder="Add tag & press Enter"
                  className="bg-surface text-foreground placeholder:text-muted/60 h-9 flex-1 rounded-xl px-2.5 text-xs outline-none"
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="bg-surface text-foreground hover:bg-foreground/10 h-9 rounded-xl px-3 text-[11px] font-semibold transition-colors"
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="bg-surface text-foreground inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    aria-label={`Remove ${tag}`}
                    className="text-muted hover:text-foreground"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
