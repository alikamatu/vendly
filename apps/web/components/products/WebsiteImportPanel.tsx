'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import imageCompression from 'browser-image-compression';
import {
  Globe,
  Check,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ImagePlus,
  Trash2,
  ExternalLink,
  X,
  Link2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/contexts/auth-context';
import { productApi } from '@/lib/api/product';
import { websiteImportApi, WebsiteImportMode } from '@/lib/api/website-import';
import type { WhatsAppCommitResult, WhatsAppPreviewItem } from '@/lib/api/whatsapp-import';
import VerndlyAiIcon from '@/components/ai/VerndlyAiIcon';
import VerndlyAiOverlay from '@/components/ai/VerndlyAiOverlay';
import RemoteProductThumb from '@/components/products/RemoteProductThumb';
import Alert from '@/components/ui/Alert';

interface EditableWebsiteItem extends WhatsAppPreviewItem {
  selected: boolean;
  priceText: string;
  stockText: string;
  localFiles: File[];
  localPreviews: string[];
}

interface CategoryOption {
  id: string;
  name: string;
}

const MODES: Array<{ id: WebsiteImportMode; label: string; hint: string }> = [
  { id: 'auto', label: 'Auto-detect', hint: 'Whole store or single item' },
  { id: 'single', label: 'Single item', hint: 'One or more product URLs' },
  { id: 'catalog', label: 'Owned website', hint: 'Full online storefront' },
];

export default function WebsiteImportPanel() {
  const { token } = useAuth();
  const [urlInput, setUrlInput] = useState('');
  const [mode, setMode] = useState<WebsiteImportMode>('auto');
  const [categories, setCategories] = useState<CategoryOption[]>([]);

  const [isScanning, setIsScanning] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [detectedSource, setDetectedSource] = useState<string | null>(null);

  const [items, setItems] = useState<EditableWebsiteItem[]>([]);
  const [isCommitting, setIsCommitting] = useState(false);
  const [commitResult, setCommitResult] = useState<WhatsAppCommitResult | null>(null);

  const itemFileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    productApi
      .getCategories()
      .then((cats) => {
        if (Array.isArray(cats) && cats.length > 0) {
          setCategories(cats.map((c) => ({ id: c.id, name: c.name })));
        }
      })
      .catch(() => {});
  }, []);

  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);
  useEffect(() => {
    return () => {
      itemsRef.current.forEach((item) => {
        item.localPreviews.forEach((url) => URL.revokeObjectURL(url));
      });
    };
  }, []);

  const handleScanWebsite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast.error('Please sign in first.');
      return;
    }
    if (!urlInput.trim()) {
      toast.error('Paste your website URL or a product link.');
      return;
    }

    setIsScanning(true);
    setWarnings([]);
    setCommitResult(null);

    try {
      const res = await websiteImportApi.preview(token, urlInput, mode);
      setWarnings(res.warnings);
      setDetectedSource(res.source);

      if (res.items.length > 0) {
        const editable: EditableWebsiteItem[] = res.items.map((item) => ({
          ...item,
          selected: true,
          priceText: item.price !== null && item.price > 0 ? String(item.price) : '',
          stockText: String(item.quantity_available ?? 1),
          localFiles: [],
          localPreviews: [],
        }));
        setItems((prev) => {
          const existingKeys = new Set(
            prev.map(
              (p) => `${p.title.trim().toLowerCase()}|${(p.source_url || '').toLowerCase()}`,
            ),
          );
          const fresh = editable.filter(
            (e) =>
              !existingKeys.has(
                `${e.title.trim().toLowerCase()}|${(e.source_url || '').toLowerCase()}`,
              ),
          );
          return fresh.length > 0 ? [...prev, ...fresh] : prev;
        });
        toast.success(
          `Found ${res.items.length} product${res.items.length === 1 ? '' : 's'} — review and import below.`,
        );
      } else if (res.warnings.length === 0) {
        setWarnings([
          'No products were found on that URL. Try pasting a direct product page link.',
        ]);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not import from that website.';
      toast.error(msg);
      setWarnings([msg]);
    } finally {
      setIsScanning(false);
    }
  };

  const updateItem = (tempId: string, patch: Partial<EditableWebsiteItem>) => {
    setItems((prev) => prev.map((item) => (item.tempId === tempId ? { ...item, ...patch } : item)));
  };

  const removeItem = (tempId: string) => {
    setItems((prev) => {
      const target = prev.find((i) => i.tempId === tempId);
      target?.localPreviews.forEach((url) => URL.revokeObjectURL(url));
      return prev.filter((i) => i.tempId !== tempId);
    });
  };

  const handleAttachLocalPhotos = (tempId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter((f) => f.type.startsWith('image/'));
    e.target.value = '';
    if (!files.length) return;

    setItems((prev) =>
      prev.map((item) => {
        if (item.tempId !== tempId) return item;
        const usedSlots = item.image_urls.length + item.localFiles.length;
        const remaining = Math.max(0, 3 - usedSlots);
        const toAdd = files.slice(0, remaining);
        const previews = toAdd.map((f) => URL.createObjectURL(f));
        return {
          ...item,
          localFiles: [...item.localFiles, ...toAdd],
          localPreviews: [...item.localPreviews, ...previews],
        };
      }),
    );
  };

  const handleRemoveRemotePhoto = (tempId: string, idx: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.tempId === tempId
          ? {
              ...item,
              image_urls: item.image_urls.filter((_, i) => i !== idx),
            }
          : item,
      ),
    );
  };

  const handleRemoveLocalPhoto = (tempId: string, idx: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.tempId !== tempId) return item;
        const url = item.localPreviews[idx];
        if (url) URL.revokeObjectURL(url);
        return {
          ...item,
          localFiles: item.localFiles.filter((_, i) => i !== idx),
          localPreviews: item.localPreviews.filter((_, i) => i !== idx),
        };
      }),
    );
  };

  const selectedItems = useMemo(() => items.filter((item) => item.selected), [items]);
  const allSelected = items.length > 0 && selectedItems.length === items.length;

  const toggleAllSelected = () => {
    const next = !allSelected;
    setItems((prev) => prev.map((item) => ({ ...item, selected: next })));
  };

  const setAllStatus = (status: 'active' | 'draft') => {
    setItems((prev) => prev.map((item) => ({ ...item, status })));
  };

  const handleCommitImport = async () => {
    if (!token) {
      toast.error('Please sign in to import products.');
      return;
    }
    if (selectedItems.length === 0) {
      toast.info('Select at least one product to import.');
      return;
    }

    const missingPrice = selectedItems.find((i) => {
      const p = parseFloat(i.priceText);
      return !Number.isFinite(p) || p <= 0;
    });
    if (missingPrice) {
      toast.error(`Please enter a valid price for "${missingPrice.title || 'Untitled item'}".`);
      return;
    }

    setIsCommitting(true);
    setCommitResult(null);

    try {
      const withLocalPhotos = selectedItems.filter((i) => i.localFiles.length > 0);
      const remoteOnly = selectedItems.filter((i) => i.localFiles.length === 0);

      const combinedResults: WhatsAppCommitResult['results'] = [];
      let created = 0;
      let failed = 0;

      if (remoteOnly.length > 0) {
        const res = await websiteImportApi.commit(
          token,
          remoteOnly.map((item) => ({
            title: item.title.trim(),
            description: item.description.trim(),
            price: parseFloat(item.priceText),
            original_price: item.original_price,
            currency: item.currency || 'GHS',
            category: item.category || categories[0]?.name || 'General',
            condition: item.condition,
            quantity_available: parseInt(item.stockText || '1', 10) || 1,
            brand: item.brand.trim() || undefined,
            tags: item.tags,
            image_urls: item.image_urls,
            status: item.status,
          })),
        );
        combinedResults.push(...res.results);
        created += res.summary.created;
        failed += res.summary.failed;
      }

      for (let i = 0; i < withLocalPhotos.length; i++) {
        const item = withLocalPhotos[i];
        try {
          // Preserve any remote website photos alongside newly attached local files (up to 3 total)
          const remoteBlobsAsFiles: File[] = [];
          for (let rIdx = 0; rIdx < item.image_urls.length; rIdx++) {
            if (remoteBlobsAsFiles.length + item.localFiles.length >= 3) break;
            try {
              const blob = await websiteImportApi.fetchProxiedImageBlob(
                token,
                item.image_urls[rIdx],
              );
              const ext = blob.type.includes('png')
                ? 'png'
                : blob.type.includes('webp')
                  ? 'webp'
                  : 'jpg';
              remoteBlobsAsFiles.push(
                new File([blob], `website-photo-${rIdx + 1}.${ext}`, {
                  type: blob.type || 'image/jpeg',
                }),
              );
            } catch {
              // ignore unfetchable remote image when local photo is already attached
            }
          }

          const compressedFiles = await Promise.all(
            [...remoteBlobsAsFiles, ...item.localFiles].slice(0, 3).map(async (f) => {
              try {
                const c = await imageCompression(f, {
                  maxSizeMB: 1,
                  maxWidthOrHeight: 1600,
                  useWebWorker: false,
                });
                return new File([c], f.name, { type: c.type || f.type });
              } catch {
                return f;
              }
            }),
          );
          const safeStatus =
            item.status === 'active' && item.description.trim().length >= 20 ? 'active' : 'draft';

          const res = await productApi.createProduct(
            token,
            {
              title: item.title.trim(),
              description: item.description.trim() || undefined,
              price: item.priceText.trim(),
              original_price: item.original_price ? String(item.original_price) : undefined,
              currency: item.currency || 'GHS',
              condition: item.condition,
              quantity_available: item.stockText || '1',
              status: safeStatus,
              category: item.category || categories[0]?.name || 'General',
              brand: item.brand.trim() || undefined,
              tags: item.tags,
            },
            compressedFiles,
          );
          combinedResults.push({
            index: remoteOnly.length + i,
            ok: true,
            productId: res?.product?.id,
            title: item.title,
            mirroredImages: compressedFiles.length,
          });
          created++;
        } catch (err: unknown) {
          combinedResults.push({
            index: remoteOnly.length + i,
            ok: false,
            title: item.title,
            error: err instanceof Error ? err.message : 'Failed to create product',
          });
          failed++;
        }
      }

      setCommitResult({
        summary: { created, failed, total: selectedItems.length },
        results: combinedResults,
      });

      if (created > 0) {
        toast.success(
          `Imported ${created} product${created === 1 ? '' : 's'} into your Verndly store!`,
        );
        const succeededTitles = new Set(
          combinedResults.filter((r) => r.ok && r.title).map((r) => r.title!.toLowerCase()),
        );
        setItems((prev) =>
          prev.filter((it) => !(it.selected && succeededTitles.has(it.title.trim().toLowerCase()))),
        );
      } else {
        toast.warning('No products were imported. Check the summary below.');
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to import products.');
    } finally {
      setIsCommitting(false);
    }
  };

  return (
    <div className="w-full space-y-6 pb-10">
      <VerndlyAiOverlay
        isOpen={isScanning}
        messages={[
          'Connecting to your website…',
          'Reading product titles, prices, descriptions, and photos…',
          'Matching Verndly categories and preparing your review queue…',
        ]}
        subtitle="Works with Shopify, WooCommerce, Paystack Storefront, and custom websites."
      />

      {/* Website URL Input Card — flat tonal, borderless */}
      <section className="bg-surface space-y-5 rounded-3xl p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <VerndlyAiIcon size={36} mood={isScanning ? 'working' : 'idle'} />
            <div className="space-y-1">
              <h2 className="text-foreground text-base font-semibold sm:text-lg">
                Import from your website or a single product URL
              </h2>
              <p className="text-muted text-xs leading-relaxed sm:text-sm">
                Paste your online store homepage (e.g. Shopify, WooCommerce, Paystack Storefront, or
                custom site) to pull your catalog, or paste one or more individual product links.
              </p>
            </div>
          </div>

          {/* Mode Toggle */}
          <div className="bg-background inline-flex shrink-0 rounded-xl p-1">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id)}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                  mode === m.id
                    ? 'bg-foreground text-background'
                    : 'text-muted hover:text-foreground'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleScanWebsite} className="space-y-3">
          <textarea
            rows={3}
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder={
              mode === 'single'
                ? 'https://yourstore.com/products/leather-bag\nPaste one or more product links (one per line)'
                : 'https://yourstore.com\nor paste a specific product page link'
            }
            className="bg-background text-foreground placeholder:text-muted/60 w-full resize-none rounded-2xl px-4 py-3.5 text-sm outline-none"
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-muted text-xs">
              Photos are automatically saved to Verndly&apos;s fast CDN so your listings never lose
              images.
            </p>
            <button
              type="submit"
              disabled={isScanning || !urlInput.trim()}
              className="bg-foreground text-background inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-5 text-xs font-semibold transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {isScanning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Scanning…</span>
                </>
              ) : (
                <>
                  <Globe className="h-4 w-4" />
                  <span>Fetch Products</span>
                </>
              )}
            </button>
          </div>
        </form>

        {detectedSource && items.length > 0 && (
          <div className="bg-background text-muted inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-[11px] font-medium">
            <Link2 className="h-3.5 w-3.5 text-emerald-500" />
            <span>
              Extracted via{' '}
              <strong className="text-foreground">
                {detectedSource === 'shopify'
                  ? 'Shopify Storefront API'
                  : detectedSource === 'woocommerce'
                    ? 'WooCommerce Store API'
                    : detectedSource === 'verndly_ai'
                      ? 'Verndly AI Page Reader'
                      : 'Structured Product Metadata'}
              </strong>
            </span>
          </div>
        )}

        {warnings.length > 0 && (
          <Alert variant="warning" message={warnings.join(' ')} onDismiss={() => setWarnings([])} />
        )}
      </section>

      {/* Review & Edit Queue */}
      {items.length > 0 && (
        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={toggleAllSelected}
                className="bg-surface text-foreground hover:bg-foreground/[0.06] inline-flex h-9 items-center gap-2 rounded-xl px-3 text-xs font-semibold transition-colors"
              >
                <span
                  className={`flex h-4 w-4 items-center justify-center rounded ${
                    allSelected ? 'bg-foreground text-background' : 'bg-background'
                  }`}
                >
                  {allSelected && <Check className="h-3 w-3" />}
                </span>
                <span>
                  {selectedItems.length} of {items.length} selected
                </span>
              </button>

              <div className="bg-surface inline-flex rounded-xl p-1 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setAllStatus('draft')}
                  className="text-muted hover:text-foreground rounded-lg px-2.5 py-1 transition-colors"
                >
                  All Draft
                </button>
                <button
                  type="button"
                  onClick={() => setAllStatus('active')}
                  className="text-muted hover:text-foreground rounded-lg px-2.5 py-1 transition-colors"
                >
                  All Active
                </button>
              </div>
            </div>

            <button
              type="button"
              disabled={isCommitting || selectedItems.length === 0}
              onClick={handleCommitImport}
              className="bg-foreground text-background inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-xs font-semibold transition-opacity hover:opacity-90 disabled:opacity-40 sm:text-sm"
            >
              {isCommitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Importing to Verndly…</span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  <span>
                    Import {selectedItems.length}{' '}
                    {selectedItems.length === 1 ? 'Product' : 'Products'}
                  </span>
                </>
              )}
            </button>
          </div>

          <div className="space-y-3">
            {items.map((item) => {
              const totalPhotos = item.image_urls.length + item.localPreviews.length;

              return (
                <div
                  key={item.tempId}
                  className={`bg-surface rounded-3xl p-4 transition-opacity sm:p-5 ${
                    item.selected ? 'opacity-100' : 'opacity-50'
                  }`}
                >
                  <input
                    ref={(el) => {
                      itemFileInputRefs.current[item.tempId] = el;
                    }}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => handleAttachLocalPhotos(item.tempId, e)}
                  />

                  <div className="flex flex-col gap-4 lg:flex-row">
                    {/* Select + Thumbnails */}
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => updateItem(item.tempId, { selected: !item.selected })}
                        aria-label={`Select ${item.title}`}
                        className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-md transition-colors ${
                          item.selected ? 'bg-foreground text-background' : 'bg-background'
                        }`}
                      >
                        {item.selected && <Check className="h-3.5 w-3.5" />}
                      </button>

                      <div className="flex flex-wrap items-center gap-2">
                        {item.image_urls.slice(0, 3).map((src, i) => (
                          <div
                            key={`${item.tempId}-remote-${src}-${i}`}
                            className="bg-background relative h-16 w-16 overflow-hidden rounded-2xl"
                          >
                            <RemoteProductThumb src={src} alt={item.title} token={token} />
                            <button
                              type="button"
                              onClick={() => handleRemoveRemotePhoto(item.tempId, i)}
                              aria-label="Remove website photo"
                              className="bg-foreground/80 text-background absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}

                        {item.localPreviews
                          .slice(0, Math.max(0, 3 - item.image_urls.length))
                          .map((src, i) => (
                            <div
                              key={`${item.tempId}-local-${i}`}
                              className="bg-background relative h-16 w-16 overflow-hidden rounded-2xl"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={src}
                                alt={item.title}
                                className="h-full w-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveLocalPhoto(item.tempId, i)}
                                aria-label="Remove uploaded photo"
                                className="bg-foreground/80 text-background absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}

                        {totalPhotos < 3 && (
                          <button
                            type="button"
                            onClick={() => itemFileInputRefs.current[item.tempId]?.click()}
                            className="bg-background text-muted hover:text-foreground flex h-16 w-16 flex-col items-center justify-center gap-1 rounded-2xl text-[10px] font-semibold transition-colors"
                          >
                            <ImagePlus className="h-4 w-4" />
                            <span>Photo</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Inline Editable Fields */}
                    <div className="min-w-0 flex-1 space-y-3">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
                        <div className="sm:col-span-6">
                          <div className="mb-1 flex items-center justify-between gap-2">
                            <label className="text-muted block text-[11px] font-semibold">
                              Product Name
                            </label>
                            {item.source_url && (
                              <a
                                href={item.source_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted hover:text-foreground inline-flex max-w-[180px] items-center gap-1 truncate text-[10px] font-medium transition-colors"
                                title={item.source_url}
                              >
                                <span className="truncate">
                                  {item.source_url.replace(/^https?:\/\/(www\.)?/, '')}
                                </span>
                                <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                              </a>
                            )}
                          </div>
                          <input
                            type="text"
                            value={item.title}
                            onChange={(e) => updateItem(item.tempId, { title: e.target.value })}
                            className="bg-background text-foreground h-10 w-full rounded-xl px-3 text-sm font-semibold outline-none"
                          />
                        </div>

                        <div className="sm:col-span-3">
                          <label className="text-muted mb-1 block text-[11px] font-semibold">
                            Price (GH₵)
                          </label>
                          <input
                            type="number"
                            inputMode="decimal"
                            min="0"
                            step="0.01"
                            value={item.priceText}
                            onChange={(e) => updateItem(item.tempId, { priceText: e.target.value })}
                            placeholder="0.00"
                            className="bg-background text-foreground h-10 w-full rounded-xl px-3 text-sm font-bold outline-none"
                          />
                        </div>

                        <div className="sm:col-span-3">
                          <label className="text-muted mb-1 block text-[11px] font-semibold">
                            Category
                          </label>
                          <select
                            value={item.category}
                            onChange={(e) => updateItem(item.tempId, { category: e.target.value })}
                            className="bg-background text-foreground h-10 w-full rounded-xl px-3 text-xs font-semibold outline-none"
                          >
                            {categories.length === 0 ? (
                              <option value={item.category}>{item.category}</option>
                            ) : (
                              <>
                                {!categories.some((c) => c.name === item.category) &&
                                  item.category && (
                                    <option value={item.category}>{item.category}</option>
                                  )}
                                {categories.map((c) => (
                                  <option key={c.id} value={c.name}>
                                    {c.name}
                                  </option>
                                ))}
                              </>
                            )}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
                        <div className="sm:col-span-7">
                          <label className="text-muted mb-1 block text-[11px] font-semibold">
                            Description
                          </label>
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) =>
                              updateItem(item.tempId, {
                                description: e.target.value,
                              })
                            }
                            placeholder="Short factual description (20+ chars to publish live)"
                            className="bg-background text-foreground placeholder:text-muted/60 h-10 w-full rounded-xl px-3 text-xs outline-none"
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-2 sm:col-span-5">
                          <div>
                            <label className="text-muted mb-1 block text-[11px] font-semibold">
                              Stock
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={item.stockText}
                              onChange={(e) =>
                                updateItem(item.tempId, { stockText: e.target.value })
                              }
                              className="bg-background text-foreground h-10 w-full rounded-xl px-2.5 text-xs font-semibold outline-none"
                            />
                          </div>

                          <div>
                            <label className="text-muted mb-1 block text-[11px] font-semibold">
                              Status
                            </label>
                            <select
                              value={item.status}
                              onChange={(e) =>
                                updateItem(item.tempId, {
                                  status: e.target.value as 'active' | 'draft',
                                })
                              }
                              className="bg-background text-foreground h-10 w-full rounded-xl px-2 text-xs font-semibold outline-none"
                            >
                              <option value="draft">Draft</option>
                              <option value="active">Active</option>
                            </select>
                          </div>

                          <div className="flex items-end justify-end">
                            <button
                              type="button"
                              onClick={() => removeItem(item.tempId)}
                              aria-label="Remove item"
                              className="bg-background text-muted flex h-10 w-10 items-center justify-center rounded-xl transition-colors hover:text-red-500"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Commit Summary */}
      {commitResult && (
        <section className="bg-surface space-y-4 rounded-3xl p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-foreground text-base font-semibold">Import Summary</h3>
              <p className="text-muted text-xs">
                {commitResult.summary.created} created · {commitResult.summary.failed} failed out of{' '}
                {commitResult.summary.total} selected
              </p>
            </div>
            {commitResult.summary.created > 0 && (
              <Link
                href="/dashboard/products"
                className="bg-foreground text-background inline-flex h-9 items-center justify-center rounded-xl px-4 text-xs font-semibold transition-opacity hover:opacity-90"
              >
                View My Products
              </Link>
            )}
          </div>

          <div className="space-y-2">
            {commitResult.results.map((r, i) => (
              <div
                key={i}
                className="bg-background flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-xs"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  {r.ok ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                  )}
                  <div className="min-w-0">
                    <p className="text-foreground truncate font-semibold">
                      {r.title || `Item #${r.index + 1}`}
                    </p>
                    <p className={`truncate text-[11px] ${r.ok ? 'text-muted' : 'text-red-500'}`}>
                      {r.ok
                        ? `Imported${r.mirroredImages ? ` · ${r.mirroredImages} photo${r.mirroredImages === 1 ? '' : 's'} saved` : ''}`
                        : r.error || 'Failed'}
                    </p>
                  </div>
                </div>
                {r.productId && (
                  <Link
                    href={`/dashboard/products/${r.productId}`}
                    className="text-muted hover:text-foreground inline-flex shrink-0 items-center gap-1 font-semibold"
                  >
                    <span>Open</span>
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
