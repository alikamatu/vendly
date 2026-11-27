'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import imageCompression from 'browser-image-compression';
import {
  ArrowLeft,
  Link2,
  FileSpreadsheet,
  Check,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ImagePlus,
  Trash2,
  ExternalLink,
  MessageCircle,
  KeyRound,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/contexts/auth-context';
import { productApi } from '@/lib/api/product';
import {
  whatsappImportApi,
  WhatsAppPreviewItem,
  WhatsAppCommitResult,
} from '@/lib/api/whatsapp-import';
import VerndlyAiIcon from '@/components/ai/VerndlyAiIcon';
import VerndlyAiOverlay from '@/components/ai/VerndlyAiOverlay';
import RemoteProductThumb from '@/components/products/RemoteProductThumb';
import ImportItemSpecsEditor from '@/components/products/ImportItemSpecsEditor';
import Alert from '@/components/ui/Alert';

type ImportMethod = 'screenshots' | 'link' | 'meta';

interface EditableImportItem extends WhatsAppPreviewItem {
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

const SPRING_TAB = { type: 'spring' as const, stiffness: 420, damping: 34 };

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to decode screenshot image'));
    img.src = src;
  });
}

async function cropProductPhotoFromScreenshot(
  screenshotFile: File,
  box: [number, number, number, number] | null | undefined,
  singleItemInScreenshot: boolean,
  title: string,
  idx: number,
): Promise<{ file: File; previewUrl: string } | null> {
  const safeBase =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || `product-${idx + 1}`;

  const hasValidBox =
    Array.isArray(box) &&
    box.length === 4 &&
    box.every((n) => typeof n === 'number' && Number.isFinite(n)) &&
    box[2] - box[0] >= 25 &&
    box[3] - box[1] >= 25;

  if (!hasValidBox) {
    if (!singleItemInScreenshot) return null;
    const copy = new File([screenshotFile], `${safeBase}-whatsapp.jpg`, {
      type: screenshotFile.type || 'image/jpeg',
    });
    return { file: copy, previewUrl: URL.createObjectURL(copy) };
  }

  const tempUrl = URL.createObjectURL(screenshotFile);
  try {
    const img = await loadImageElement(tempUrl);
    const natW = img.naturalWidth;
    const natH = img.naturalHeight;
    if (natW < 16 || natH < 16) return null;

    const [ymin, xmin, ymax, xmax] = box;
    const sx = Math.max(0, Math.floor((xmin / 1000) * natW));
    const sy = Math.max(0, Math.floor((ymin / 1000) * natH));
    const sw = Math.max(16, Math.min(natW - sx, Math.ceil(((xmax - xmin) / 1000) * natW)));
    const sh = Math.max(16, Math.min(natH - sy, Math.ceil(((ymax - ymin) / 1000) * natH)));

    // Keep native crisp resolution, upscale tiny catalog list thumbnails gently to >= 400px, cap at 1400px
    const maxDim = Math.max(sw, sh);
    const scale = maxDim < 400 ? Math.min(2.5, 400 / maxDim) : maxDim > 1400 ? 1400 / maxDim : 1;
    const outW = Math.max(16, Math.round(sw * scale));
    const outH = Math.max(16, Math.round(sh * scale));

    const canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.92),
    );
    if (!blob || blob.size === 0) return null;

    const croppedFile = new File([blob], `${safeBase}-whatsapp.jpg`, {
      type: 'image/jpeg',
    });
    return {
      file: croppedFile,
      previewUrl: URL.createObjectURL(croppedFile),
    };
  } catch {
    if (!singleItemInScreenshot) return null;
    const copy = new File([screenshotFile], `${safeBase}-whatsapp.jpg`, {
      type: screenshotFile.type || 'image/jpeg',
    });
    return { file: copy, previewUrl: URL.createObjectURL(copy) };
  } finally {
    URL.revokeObjectURL(tempUrl);
  }
}

const METHODS: Array<{
  id: ImportMethod;
  label: string;
  badge?: string;
  isAi?: boolean;
  icon?: React.ElementType;
}> = [
  { id: 'screenshots', label: 'Screenshots', badge: 'Verndly AI', isAi: true },
  { id: 'link', label: 'WhatsApp Link', icon: Link2 },
  { id: 'meta', label: 'Meta Catalog', icon: FileSpreadsheet },
];

export default function WhatsAppImportPanel({ embedded = false }: { embedded?: boolean }) {
  const { token } = useAuth();
  const [method, setMethod] = useState<ImportMethod>('screenshots');
  const [categories, setCategories] = useState<CategoryOption[]>([]);

  // Source inputs
  const [linkInput, setLinkInput] = useState('');
  const [metaMode, setMetaMode] = useState<'csv' | 'api'>('csv');
  const [metaCatalogId, setMetaCatalogId] = useState('');
  const [metaAccessToken, setMetaAccessToken] = useState('');

  // Loading & feedback
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractLabel, setExtractLabel] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);

  // Review queue
  const [items, setItems] = useState<EditableImportItem[]>([]);
  const [isCommitting, setIsCommitting] = useState(false);
  const [commitResult, setCommitResult] = useState<WhatsAppCommitResult | null>(null);

  const screenshotInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
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

  // Revoke object URLs on unmount
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

  const toEditableItems = (rawItems: WhatsAppPreviewItem[]): EditableImportItem[] =>
    rawItems.map((item) => ({
      ...item,
      selected: true,
      priceText: item.price !== null && item.price > 0 ? String(item.price) : '',
      stockText: String(item.quantity_available ?? 1),
      localFiles: [],
      localPreviews: [],
    }));

  const appendPreviewItems = (rawItems: WhatsAppPreviewItem[], nextWarnings: string[]) => {
    setWarnings(nextWarnings);
    setCommitResult(null);
    if (rawItems.length === 0) return;

    const editable = toEditableItems(rawItems);
    setItems((prev) => [...prev, ...editable]);
    toast.success(
      `Found ${rawItems.length} product${rawItems.length === 1 ? '' : 's'} — review and import below.`,
    );
  };

  // Method 1: WhatsApp Catalog Screenshots -> Verndly AI
  const handleScreenshotsSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFiles = Array.from(e.target.files || []).filter((f) => f.type.startsWith('image/'));
    e.target.value = '';
    if (!rawFiles.length) return;
    if (!token) {
      toast.error('Please sign in first.');
      return;
    }

    const batch = rawFiles.slice(0, 10);
    setIsExtracting(true);
    setExtractLabel(
      `Verndly AI is reading ${batch.length} WhatsApp catalog screenshot${batch.length === 1 ? '' : 's'}…`,
    );
    setWarnings([]);

    try {
      const compressed = await Promise.all(
        batch.map(async (file) => {
          try {
            const c = await imageCompression(file, {
              maxSizeMB: 0.6,
              maxWidthOrHeight: 1400,
              useWebWorker: false,
            });
            return new File([c], file.name, {
              type: c.type || file.type || 'image/jpeg',
            });
          } catch {
            return file;
          }
        }),
      );

      const res = await whatsappImportApi.previewScreenshots(token, compressed);

      // Count how many extracted products came from each screenshot to guide safe crop fallback
      const countPerScreenshot = new Map<number, number>();
      for (const it of res.items) {
        const idx =
          typeof it.source_screenshot_index === 'number' &&
          it.source_screenshot_index >= 0 &&
          it.source_screenshot_index < batch.length
            ? it.source_screenshot_index
            : 0;
        countPerScreenshot.set(idx, (countPerScreenshot.get(idx) || 0) + 1);
      }

      setWarnings(res.warnings);
      setCommitResult(null);

      if (res.items.length > 0) {
        const editableWithCrops: EditableImportItem[] = await Promise.all(
          res.items.map(async (item, idx) => {
            const ssIdx =
              typeof item.source_screenshot_index === 'number' &&
              item.source_screenshot_index >= 0 &&
              item.source_screenshot_index < batch.length
                ? item.source_screenshot_index
                : 0;
            const sourceFile = batch[ssIdx];
            const cropped = sourceFile
              ? await cropProductPhotoFromScreenshot(
                  sourceFile,
                  item.image_box_2d,
                  (countPerScreenshot.get(ssIdx) || 0) === 1,
                  item.title,
                  idx,
                )
              : null;

            const localFiles = cropped ? [cropped.file] : [];
            const localPreviews = cropped ? [cropped.previewUrl] : [];
            const hasPhoto = localFiles.length > 0 || item.image_urls.length > 0;
            const readyToPublish =
              hasPhoto &&
              item.price !== null &&
              item.price > 0 &&
              item.description.trim().length >= 20;

            return {
              ...item,
              selected: true,
              priceText: item.price !== null && item.price > 0 ? String(item.price) : '',
              stockText: String(item.quantity_available ?? 1),
              status: readyToPublish ? 'active' : item.status,
              localFiles,
              localPreviews,
            };
          }),
        );

        setItems((prev) => [...prev, ...editableWithCrops]);
        toast.success(
          `Found ${editableWithCrops.length} product${editableWithCrops.length === 1 ? '' : 's'} — review and import below.`,
        );
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Verndly AI could not read those screenshots.';
      toast.error(message);
      setWarnings([message]);
    } finally {
      setIsExtracting(false);
      setExtractLabel('');
    }
  };

  // Method 2: WhatsApp Catalog / Product Links or Phone Number
  const handleFetchLinks = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast.error('Please sign in first.');
      return;
    }
    if (!linkInput.trim()) {
      toast.error('Paste a WhatsApp catalog link, product link, or phone number.');
      return;
    }

    setIsExtracting(true);
    setExtractLabel('Checking WhatsApp catalog links…');
    setWarnings([]);

    try {
      const res = await whatsappImportApi.previewLinks(token, linkInput);
      appendPreviewItems(res.items, res.warnings);
      if (res.items.length === 0 && res.warnings.length > 0) {
        toast.info('WhatsApp restricted direct link access — try Screenshots with Verndly AI.');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not read that WhatsApp link.';
      toast.error(message);
      setWarnings([message]);
    } finally {
      setIsExtracting(false);
      setExtractLabel('');
    }
  };

  // Method 3A: Meta Commerce Manager CSV
  const handleCsvSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!token) {
      toast.error('Please sign in first.');
      return;
    }

    setIsExtracting(true);
    setExtractLabel(`Reading ${file.name}…`);
    setWarnings([]);

    try {
      const res = await whatsappImportApi.previewCsv(token, file);
      appendPreviewItems(res.items, res.warnings);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not parse CSV file.';
      toast.error(message);
      setWarnings([message]);
    } finally {
      setIsExtracting(false);
      setExtractLabel('');
    }
  };

  // Method 3B: Meta Commerce Graph API
  const handleMetaSync = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast.error('Please sign in first.');
      return;
    }
    setIsExtracting(true);
    setExtractLabel('Fetching products from Meta Commerce Catalog…');
    setWarnings([]);

    try {
      const res = await whatsappImportApi.previewMeta(token, metaCatalogId, metaAccessToken);
      appendPreviewItems(res.items, res.warnings);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Could not connect to Meta Commerce Catalog.';
      toast.error(message);
      setWarnings([message]);
    } finally {
      setIsExtracting(false);
      setExtractLabel('');
    }
  };

  // Queue editing helpers
  const updateItem = (tempId: string, patch: Partial<EditableImportItem>) => {
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
        const remaining = Math.max(0, 3 - item.localFiles.length);
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

  // Commit selected items to Verndly
  const handleCommitImport = async () => {
    if (!token) {
      toast.error('Please sign in to import products.');
      return;
    }
    if (selectedItems.length === 0) {
      toast.info('Select at least one product to import.');
      return;
    }

    // Validate prices before starting
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

      // 1. Commit remote-URL / draft items through batch WhatsApp endpoint (mirrors CDN images to Cloudinary)
      if (remoteOnly.length > 0) {
        const res = await whatsappImportApi.commit(
          token,
          remoteOnly.map((item) => ({
            title: item.title.trim(),
            description: item.description.trim(),
            price: parseFloat(item.priceText),
            original_price: item.original_price,
            currency: item.currency || 'GHS',
            category: item.category || categories[0]?.name || 'General',
            subcategory: item.subcategory || item.attributes?.subcategory || undefined,
            condition: item.condition,
            quantity_available: parseInt(item.stockText || '1', 10) || 1,
            brand: item.brand.trim() || undefined,
            tags: item.tags,
            attributes: item.attributes,
            image_urls: item.image_urls,
            status: item.status,
          })),
        );
        combinedResults.push(...res.results);
        created += res.summary.created;
        failed += res.summary.failed;
      }

      // 2. Publish items where the seller attached local photos directly via createProduct
      for (let i = 0; i < withLocalPhotos.length; i++) {
        const item = withLocalPhotos[i];
        try {
          const compressedFiles = await Promise.all(
            item.localFiles.map(async (f) => {
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
              attributes: {
                ...(item.attributes || {}),
                ...(item.subcategory ? { subcategory: item.subcategory } : {}),
              },
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
        // Remove successfully imported items from queue
        const succeededTitles = new Set(
          combinedResults.filter((r) => r.ok && r.title).map((r) => r.title!.toLowerCase()),
        );
        setItems((prev) =>
          prev.filter((it) => !(it.selected && succeededTitles.has(it.title.trim().toLowerCase()))),
        );
      } else {
        toast.warning('No products were imported. Check the report below.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to import products.';
      toast.error(msg);
    } finally {
      setIsCommitting(false);
    }
  };

  return (
    <div className="w-full space-y-6 pb-10">
      {/* Centered Verndly AI working state during screenshot extraction */}
      <VerndlyAiOverlay
        isOpen={isExtracting && method === 'screenshots'}
        messages={[
          extractLabel || 'Reading your WhatsApp Business catalog screenshots…',
          'Cropping each product photo and reading GH₵ prices…',
          'Matching Verndly categories and preparing your review queue…',
        ]}
        subtitle="Hang tight — your imported items will appear right below for review."
      />

      {/* Hidden native inputs */}
      <input
        ref={screenshotInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleScreenshotsSelected}
      />
      <input
        ref={csvInputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={handleCsvSelected}
      />

      {/* Page Header (hidden when embedded inside Add Product hub) */}
      {!embedded && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1.5">
            <Link
              href="/dashboard/products"
              className="text-muted hover:text-foreground inline-flex items-center gap-1.5 text-xs font-medium transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Products</span>
            </Link>
            <div className="flex items-center gap-2.5">
              <div className="bg-emerald-500/12 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-emerald-600 dark:text-emerald-400">
                <MessageCircle className="h-5 w-5" />
              </div>
              <h1 className="text-foreground text-xl font-semibold tracking-tight sm:text-2xl">
                Import WhatsApp Catalog
              </h1>
            </div>
            <p className="text-muted text-xs sm:text-sm">
              Bring your WhatsApp Business products straight into Verndly — via screenshots with
              Verndly AI, WhatsApp catalog links, or Meta Commerce Manager.
            </p>
          </div>

          <Link
            href="/dashboard/products/import"
            className="bg-surface text-foreground hover:bg-foreground/[0.06] inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl px-4 text-xs font-semibold transition-colors"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Standard CSV</span>
          </Link>
        </div>
      )}

      {/* Method Selector Tabs — borderless flat tonal with spring indicator */}
      <div className="bg-surface grid grid-cols-3 gap-1.5 rounded-2xl p-1.5">
        {METHODS.map((tab) => {
          const Icon = tab.icon;
          const active = method === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setMethod(tab.id);
                setWarnings([]);
              }}
              className={`relative flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold transition-colors sm:text-sm ${
                active ? 'text-foreground' : 'text-muted hover:text-foreground'
              }`}
            >
              {active && (
                <motion.span
                  layoutId="wa-import-method-pill"
                  transition={SPRING_TAB}
                  className="bg-background absolute inset-0 rounded-xl"
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5 truncate">
                {tab.isAi ? (
                  <VerndlyAiIcon size={17} />
                ) : (
                  Icon && (
                    <Icon
                      className={`h-4 w-4 shrink-0 ${active ? 'text-[var(--color-accent)]' : ''}`}
                    />
                  )
                )}
                <span className="truncate">{tab.label}</span>
                {tab.badge && (
                  <span className="bg-surface text-foreground hidden rounded-full px-2 py-0.5 text-[10px] font-semibold sm:inline-block">
                    {tab.badge}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {/* Method Panels */}
      <section className="bg-surface rounded-3xl p-5 sm:p-6">
        {method === 'screenshots' && (
          <div className="space-y-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1.5">
                <VerndlyAiIcon size={18} showName nameClassName="text-xs text-foreground" />
                <h2 className="text-foreground text-base font-semibold sm:text-lg">
                  Upload WhatsApp Catalog Screenshots
                </h2>
                <p className="text-muted text-xs leading-relaxed sm:text-sm">
                  Open WhatsApp Business → Catalog, take screenshots as you scroll through your
                  items, and drop up to 10 screenshots here. Verndly AI crops each product photo and
                  extracts its name, GH₵ price, description, and category automatically.
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={isExtracting}
              onClick={() => screenshotInputRef.current?.click()}
              className="bg-background hover:bg-foreground/[0.04] flex w-full flex-col items-center justify-center gap-3.5 rounded-2xl px-6 py-10 text-center transition-colors disabled:opacity-50"
            >
              <VerndlyAiIcon size={52} mood={isExtracting ? 'working' : 'idle'} />
              <div className="space-y-1">
                <p className="text-foreground text-sm font-semibold">
                  {isExtracting ? extractLabel : 'Tap to select WhatsApp catalog screenshots'}
                </p>
                <p className="text-muted text-xs">
                  Up to 10 screenshots at once · PNG, JPG, or WebP
                </p>
              </div>
            </button>
          </div>
        )}

        {method === 'link' && (
          <form onSubmit={handleFetchLinks} className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-foreground text-base font-semibold sm:text-lg">
                Import via WhatsApp Business Link or Phone Number
              </h2>
              <p className="text-muted text-xs leading-relaxed sm:text-sm">
                Paste your catalog link (<code className="font-mono">wa.me/c/233...</code>), one or
                more shared product links (<code className="font-mono">wa.me/p/...</code>), or your
                WhatsApp Business phone number.
              </p>
            </div>

            <textarea
              rows={3}
              value={linkInput}
              onChange={(e) => setLinkInput(e.target.value)}
              placeholder={
                'https://wa.me/c/233241234567\nor paste multiple wa.me/p/... product links (one per line)'
              }
              className="bg-background text-foreground placeholder:text-muted/60 w-full resize-none rounded-2xl px-4 py-3.5 text-sm outline-none"
            />

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-muted text-xs">
                Tip: Individual <code className="font-mono">wa.me/p/...</code> product links share
                clean titles, prices, and photos.
              </p>
              <button
                type="submit"
                disabled={isExtracting || !linkInput.trim()}
                className="bg-foreground text-background inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-xs font-semibold transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                {isExtracting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Fetching…</span>
                  </>
                ) : (
                  <>
                    <Link2 className="h-4 w-4" />
                    <span>Fetch Catalog</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {method === 'meta' && (
          <div className="space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <h2 className="text-foreground text-base font-semibold sm:text-lg">
                  Meta Commerce Manager (WhatsApp Catalog)
                </h2>
                <p className="text-muted text-xs sm:text-sm">
                  Best for catalogs with 20–100+ items — imports titles, GH₵ prices, sale prices,
                  stock, and full-resolution images automatically.
                </p>
              </div>

              <div className="bg-background inline-flex shrink-0 rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => setMetaMode('csv')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    metaMode === 'csv'
                      ? 'bg-foreground text-background'
                      : 'text-muted hover:text-foreground'
                  }`}
                >
                  CSV Export
                </button>
                <button
                  type="button"
                  onClick={() => setMetaMode('api')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    metaMode === 'api'
                      ? 'bg-foreground text-background'
                      : 'text-muted hover:text-foreground'
                  }`}
                >
                  Catalog API
                </button>
              </div>
            </div>

            {metaMode === 'csv' ? (
              <button
                type="button"
                disabled={isExtracting}
                onClick={() => csvInputRef.current?.click()}
                className="bg-background hover:bg-foreground/[0.04] flex w-full flex-col items-center justify-center gap-3 rounded-2xl px-6 py-10 text-center transition-colors disabled:opacity-50"
              >
                <div className="bg-surface text-foreground flex h-12 w-12 items-center justify-center rounded-2xl">
                  {isExtracting ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="h-6 w-6" />
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-foreground text-sm font-semibold">
                    {isExtracting ? extractLabel : 'Upload Meta Commerce Manager CSV'}
                  </p>
                  <p className="text-muted text-xs">
                    Supports Meta Data Feed columns (<code className="font-mono">title</code>,{' '}
                    <code className="font-mono">price</code>,{' '}
                    <code className="font-mono">sale_price</code>,{' '}
                    <code className="font-mono">image_link</code>)
                  </p>
                </div>
              </button>
            ) : (
              <form onSubmit={handleMetaSync} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="meta-catalog-id"
                      className="text-muted block text-xs font-semibold"
                    >
                      Meta Catalog ID
                    </label>
                    <input
                      id="meta-catalog-id"
                      type="text"
                      value={metaCatalogId}
                      onChange={(e) => setMetaCatalogId(e.target.value)}
                      placeholder="e.g. 123456789012345"
                      className="bg-background text-foreground placeholder:text-muted/60 h-11 w-full rounded-xl px-3.5 text-sm outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label
                      htmlFor="meta-access-token"
                      className="text-muted block text-xs font-semibold"
                    >
                      Access Token (used once, never stored)
                    </label>
                    <div className="bg-background flex h-11 items-center gap-2 rounded-xl px-3.5">
                      <KeyRound className="text-muted h-4 w-4 shrink-0" />
                      <input
                        id="meta-access-token"
                        type="password"
                        value={metaAccessToken}
                        onChange={(e) => setMetaAccessToken(e.target.value)}
                        placeholder="EAA..."
                        className="text-foreground placeholder:text-muted/60 w-full bg-transparent text-sm outline-none"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isExtracting || !metaCatalogId.trim() || !metaAccessToken.trim()}
                    className="bg-foreground text-background inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-xs font-semibold transition-opacity hover:opacity-90 disabled:opacity-40"
                  >
                    {isExtracting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Syncing…</span>
                      </>
                    ) : (
                      <span>Fetch Catalog Products</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Warnings / fallback guidance */}
        {warnings.length > 0 && (
          <>
            <Alert
              variant="warning"
              message={warnings.join(' ')}
              onDismiss={() => setWarnings([])}
            />
            {method === 'link' && (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setMethod('screenshots');
                    setWarnings([]);
                  }}
                  className="bg-background text-foreground inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold"
                >
                  <VerndlyAiIcon size={16} />
                  <span>Switch to Screenshots (Verndly AI)</span>
                </button>
              </div>
            )}
          </>
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
              const displayThumbs =
                item.localPreviews.length > 0 ? item.localPreviews : item.image_urls;

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
                    {/* Left: Select + Thumbnails */}
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
                        {displayThumbs.slice(0, 3).map((src, i) => (
                          <div
                            key={`${item.tempId}-thumb-${i}`}
                            className="bg-background relative h-16 w-16 overflow-hidden rounded-2xl"
                          >
                            <RemoteProductThumb src={src} alt={item.title} token={token} />
                            {item.localPreviews.length > 0 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveLocalPhoto(item.tempId, i)}
                                aria-label="Remove photo"
                                className="bg-foreground/80 text-background absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        ))}

                        {item.localFiles.length < 3 && (
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

                    {/* Right: Inline Editable Fields */}
                    <div className="min-w-0 flex-1 space-y-3">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
                        <div className="sm:col-span-6">
                          <label className="text-muted mb-1 block text-[11px] font-semibold">
                            Product Name
                          </label>
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

                      <ImportItemSpecsEditor
                        category={item.category}
                        subcategory={item.subcategory}
                        tags={item.tags}
                        attributes={item.attributes}
                        onChange={(patch) => updateItem(item.tempId, patch)}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Commit Report */}
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
