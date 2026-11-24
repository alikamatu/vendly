'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Camera,
  ImagePlus,
  Video,
  Plus,
  Trash2,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowLeft,
  ChevronDown,
  Sparkles,
  UploadCloud,
  ExternalLink,
  Loader2,
  RefreshCw,
  Wand2,
} from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { productApi } from '@/lib/api/product';
import { aiApi, AiConfidence } from '@/lib/api/ai';
import { useAuth } from '@/lib/contexts/auth-context';
import { toast } from 'sonner';

export interface CategoryField {
  name?: string;
  key?: string;
  label: string;
  type: 'text' | 'select' | 'number';
  required?: boolean;
  options?: string[];
  defaultValue?: string;
  placeholder?: string;
}

export interface Category {
  id: string;
  name: string;
  fields?: CategoryField[];
}

export interface ProductNoteItem {
  id: string;
  title: string;
  price: string;
  original_price: string;
  description: string;
  images: File[];
  imagePreviews: string[];
  video: File | null;
  videoPreview: string | null;
  category: string;
  condition: 'new' | 'used' | 'refurbished';
  quantity_available: string;
  brand: string;
  tags: string[];
  status: 'active' | 'draft';
  aiGenerated?: boolean;
  aiConfidence?: AiConfidence;
  aiSuggestedPrice?: number | null;
}

export interface BatchPublishProgress {
  total: number;
  currentStep: 'idle' | 'validating' | 'compressing' | 'uploading' | 'completed' | 'error';
  currentProductIndex: number;
  itemStatuses: {
    id: string;
    title: string;
    status: 'pending' | 'compressing' | 'uploading' | 'success' | 'error';
    error?: string;
    productId?: string;
  }[];
  overallPercent: number;
}

interface BatchProductNotesFormProps {
  onCancel?: () => void;
  onSuccess?: (createdProductIds: string[]) => void;
}

const CONDITIONS = [
  { value: 'new', label: 'Brand New' },
  { value: 'used', label: 'Pre-owned' },
  { value: 'refurbished', label: 'Refurbished' },
] as const;

const MIN_ACTIVE_DESCRIPTION_LENGTH = 20;
const MAX_BULK_PHOTOS = 20;

function createBlankProductNote(initialCategory = 'General'): ProductNoteItem {
  return {
    id:
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `note_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    title: '',
    price: '',
    original_price: '',
    description: '',
    images: [],
    imagePreviews: [],
    video: null,
    videoPreview: null,
    category: initialCategory,
    condition: 'new',
    quantity_available: '1',
    brand: '',
    tags: [],
    status: 'active',
    aiGenerated: false,
    aiSuggestedPrice: null,
  };
}

function formatGhs(value: string | number): string {
  const num = typeof value === 'number' ? value : parseFloat(value);
  if (!Number.isFinite(num) || num <= 0) return '';
  return `GH₵ ${num.toLocaleString('en-GH', { maximumFractionDigits: 2 })}`;
}

function getItemReadiness(item: ProductNoteItem): { ready: boolean; missing: string[] } {
  const missing: string[] = [];
  if (item.images.length === 0) missing.push('Photo');
  if (!item.title.trim() || item.title.trim().length < 2) missing.push('Name');
  const priceNum = parseFloat(item.price);
  if (!item.price || Number.isNaN(priceNum) || priceNum <= 0) missing.push('Price');
  if (item.status === 'active' && item.description.trim().length < MIN_ACTIVE_DESCRIPTION_LENGTH) {
    missing.push('Description');
  }
  return { ready: missing.length === 0, missing };
}

export default function BatchProductNotesForm({ onCancel, onSuccess }: BatchProductNotesFormProps) {
  const { token } = useAuth();

  const [categories, setCategories] = useState<Category[]>([]);
  const [brandsMap, setBrandsMap] = useState<Record<string, { id: string; name: string }[]>>({});

  const [notes, setNotes] = useState<ProductNoteItem[]>([createBlankProductNote()]);
  const [activeNoteIndex, setActiveNoteIndex] = useState<number>(0);
  const [tagInput, setTagInput] = useState<string>('');
  const [showMoreDetails, setShowMoreDetails] = useState<boolean>(false);

  // AI states
  const [aiConfigured, setAiConfigured] = useState<boolean | null>(null);
  const [isBulkAnalyzing, setIsBulkAnalyzing] = useState<boolean>(false);
  const [bulkAnalyzingCount, setBulkAnalyzingCount] = useState<number>(0);
  const [isSingleAnalyzing, setIsSingleAnalyzing] = useState<boolean>(false);
  const [bulkModalOpen, setBulkModalOpen] = useState<boolean>(false);

  const bulkFileInputRef = useRef<HTMLInputElement>(null);
  const activeImageInputRef = useRef<HTMLInputElement>(null);
  const activeCameraInputRef = useRef<HTMLInputElement>(null);
  const activeVideoInputRef = useRef<HTMLInputElement>(null);
  const activeTabRef = useRef<HTMLButtonElement>(null);

  const [publishProgress, setPublishProgress] = useState<BatchPublishProgress>({
    total: 0,
    currentStep: 'idle',
    currentProductIndex: 0,
    itemStatuses: [],
    overallPercent: 0,
  });

  const activeNote = notes[activeNoteIndex] || notes[0];

  // Fetch categories
  useEffect(() => {
    productApi
      .getCategories()
      .then((cats) => {
        if (cats && cats.length > 0) {
          setCategories(cats);
          setNotes((prevNotes) =>
            prevNotes.map((note) =>
              note.category === 'General' ? { ...note, category: cats[0].name } : note,
            ),
          );
        }
      })
      .catch(() => {
        // Fallback stays 'General'
      });
  }, []);

  // Check Gemini AI readiness silently
  useEffect(() => {
    if (!token) return;
    aiApi
      .getStatus(token)
      .then((status) => setAiConfigured(status.configured))
      .catch(() => setAiConfigured(null));
  }, [token]);

  // Fetch brands for active category
  useEffect(() => {
    if (!activeNote?.category) return;
    const matchedCat = categories.find((c) => c.name === activeNote.category);
    if (!matchedCat || brandsMap[matchedCat.id]) return;

    productApi
      .getBrands(undefined, matchedCat.id)
      .then((list) => {
        setBrandsMap((prev) => ({ ...prev, [matchedCat.id]: list }));
      })
      .catch(() => {});
  }, [activeNote?.category, categories, brandsMap]);

  // Keep a ref synced for unmount cleanup without mutating during render
  const notesRef = useRef(notes);
  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);
  useEffect(() => {
    return () => {
      notesRef.current.forEach((n) => {
        n.imagePreviews.forEach((url) => URL.revokeObjectURL(url));
        if (n.videoPreview) URL.revokeObjectURL(n.videoPreview);
      });
    };
  }, []);

  // Scroll active item tab into view on mobile
  useEffect(() => {
    activeTabRef.current?.scrollIntoView({
      behavior: 'smooth',
      inline: 'nearest',
      block: 'nearest',
    });
  }, [activeNoteIndex]);

  const updateActiveNote = useCallback(
    (updater: Partial<ProductNoteItem> | ((prev: ProductNoteItem) => ProductNoteItem)) => {
      setNotes((prev) =>
        prev.map((item, idx) => {
          if (idx !== activeNoteIndex) return item;
          return typeof updater === 'function' ? updater(item) : { ...item, ...updater };
        }),
      );
    },
    [activeNoteIndex],
  );

  const handleAddNote = () => {
    const defaultCat = categories[0]?.name || activeNote?.category || 'General';
    const fresh = createBlankProductNote(defaultCat);
    setNotes((prev) => [...prev, fresh]);
    setActiveNoteIndex(notes.length);
  };

  const handleDuplicateActiveNote = () => {
    const duplicate: ProductNoteItem = {
      ...activeNote,
      id:
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `note_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: activeNote.title ? `${activeNote.title} (Copy)` : '',
      images: [...activeNote.images],
      imagePreviews: activeNote.images.map((f) => URL.createObjectURL(f)),
      video: activeNote.video,
      videoPreview: activeNote.video ? URL.createObjectURL(activeNote.video) : null,
      tags: [...activeNote.tags],
    };
    const nextIdx = activeNoteIndex + 1;
    setNotes((prev) => [...prev.slice(0, nextIdx), duplicate, ...prev.slice(nextIdx)]);
    setActiveNoteIndex(nextIdx);
    toast.success('Item duplicated');
  };

  const handleDeleteNote = (index: number) => {
    if (notes.length <= 1) {
      toast.info('At least one product item is required');
      return;
    }
    const target = notes[index];
    target.imagePreviews.forEach((url) => URL.revokeObjectURL(url));
    if (target.videoPreview) URL.revokeObjectURL(target.videoPreview);

    const updated = notes.filter((_, i) => i !== index);
    setNotes(updated);
    if (activeNoteIndex >= updated.length) {
      setActiveNoteIndex(updated.length - 1);
    } else if (activeNoteIndex > index) {
      setActiveNoteIndex(activeNoteIndex - 1);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter((f) => f.type.startsWith('image/'));
    e.target.value = '';
    if (!files.length) return;

    const remaining = 3 - activeNote.images.length;
    if (remaining <= 0) {
      toast.error('Maximum 3 photos per product');
      return;
    }

    const toAdd = files.slice(0, remaining);
    if (files.length > remaining) {
      toast.info(`Added ${remaining} photo${remaining === 1 ? '' : 's'} (max 3 per item)`);
    }

    const previews = toAdd.map((f) => URL.createObjectURL(f));
    updateActiveNote((prev) => ({
      ...prev,
      images: [...prev.images, ...toAdd],
      imagePreviews: [...prev.imagePreviews, ...previews],
    }));
  };

  const handleRemoveImage = (imgIdx: number) => {
    const previewToRevoke = activeNote.imagePreviews[imgIdx];
    if (previewToRevoke) URL.revokeObjectURL(previewToRevoke);
    updateActiveNote((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== imgIdx),
      imagePreviews: prev.imagePreviews.filter((_, i) => i !== imgIdx),
    }));
  };

  const handleSetCoverImage = (imgIdx: number) => {
    if (imgIdx === 0) return;
    updateActiveNote((prev) => {
      const nextImages = [...prev.images];
      const nextPreviews = [...prev.imagePreviews];
      const [img] = nextImages.splice(imgIdx, 1);
      const [preview] = nextPreviews.splice(imgIdx, 1);
      nextImages.unshift(img);
      nextPreviews.unshift(preview);
      return { ...prev, images: nextImages, imagePreviews: nextPreviews };
    });
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      toast.error('Please select a valid video file');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error('Video must be 15 MB or smaller');
      return;
    }
    if (activeNote.videoPreview) URL.revokeObjectURL(activeNote.videoPreview);
    updateActiveNote({
      video: file,
      videoPreview: URL.createObjectURL(file),
    });
  };

  const handleRemoveVideo = () => {
    if (activeNote.videoPreview) URL.revokeObjectURL(activeNote.videoPreview);
    updateActiveNote({ video: null, videoPreview: null });
  };

  const compressForAi = async (file: File): Promise<File> => {
    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: 0.45,
        maxWidthOrHeight: 1024,
        useWebWorker: true,
      });
      return new File([compressed], file.name, {
        type: compressed.type || file.type || 'image/jpeg',
      });
    } catch {
      return file;
    }
  };

  // Gemini AI: Bulk Add Photos for Multiple Products
  const handleBulkPhotosSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFiles = Array.from(e.target.files || []).filter((f) => f.type.startsWith('image/'));
    e.target.value = '';
    if (!rawFiles.length) return;

    const files = rawFiles.slice(0, MAX_BULK_PHOTOS);
    if (rawFiles.length > MAX_BULK_PHOTOS) {
      toast.info(`Analyzing the first ${MAX_BULK_PHOTOS} photos in this batch`);
    }

    const defaultCat = categories[0]?.name || 'General';
    const isCurrentNoteEmpty =
      notes.length === 1 &&
      !notes[0].title.trim() &&
      !notes[0].price.trim() &&
      notes[0].images.length === 0;

    setBulkModalOpen(false);
    setIsBulkAnalyzing(true);
    setBulkAnalyzingCount(files.length);

    try {
      if (!token) {
        throw new Error('Please sign in to use Verndly AI.');
      }

      // Compress lightweight copies for fast Gemini Vision upload
      const aiFiles = await Promise.all(files.map(compressForAi));
      const analysis = await aiApi.analyzeBulkPhotos(token, aiFiles);

      const createdNotes: ProductNoteItem[] = analysis.products.map((group) => {
        const groupedFiles = group.photo_indices
          .map((idx) => files[idx])
          .filter((f): f is File => Boolean(f));
        return {
          ...createBlankProductNote(group.category || defaultCat),
          title: group.title || '',
          description: group.description || '',
          category: group.category || defaultCat,
          condition: group.condition || 'new',
          brand: group.brand || '',
          tags: group.tags || [],
          images: groupedFiles,
          imagePreviews: groupedFiles.map((f) => URL.createObjectURL(f)),
          aiGenerated: true,
          aiConfidence: group.confidence,
          aiSuggestedPrice: group.suggested_price_ghs,
        };
      });

      if (createdNotes.length === 0) {
        throw new Error('Could not detect any products from the uploaded photos.');
      }

      if (isCurrentNoteEmpty) {
        setNotes(createdNotes);
        setActiveNoteIndex(0);
      } else {
        setNotes((prev) => [...prev, ...createdNotes]);
        setActiveNoteIndex(notes.length);
      }

      if (createdNotes.some((n) => n.brand || n.tags.length > 0)) {
        setShowMoreDetails(true);
      }

      toast.success(
        `Verndly AI grouped ${files.length} photo${files.length === 1 ? '' : 's'} into ${createdNotes.length} distinct product${createdNotes.length === 1 ? '' : 's'}`,
      );
    } catch (err: unknown) {
      const apiErr = err as { status?: number; message?: string };
      const status = apiErr?.status;
      const msg = apiErr?.message || 'Verndly AI could not analyze the photos.';

      // Graceful fallback: 1 photo per product draft so the seller is never blocked
      const fallbackNotes: ProductNoteItem[] = files.map((file) => ({
        ...createBlankProductNote(defaultCat),
        images: [file],
        imagePreviews: [URL.createObjectURL(file)],
      }));

      if (isCurrentNoteEmpty) {
        setNotes(fallbackNotes);
        setActiveNoteIndex(0);
      } else {
        setNotes((prev) => [...prev, ...fallbackNotes]);
        setActiveNoteIndex(notes.length);
      }

      if (status === 503) {
        setAiConfigured(false);
        toast.warning(
          `${msg} Added ${fallbackNotes.length} separate draft${fallbackNotes.length === 1 ? '' : 's'} so you can continue.`,
        );
      } else {
        toast.error(
          `${msg} Added ${fallbackNotes.length} draft${fallbackNotes.length === 1 ? '' : 's'} manually instead.`,
        );
      }
    } finally {
      setIsBulkAnalyzing(false);
      setBulkAnalyzingCount(0);
    }
  };

  // Gemini AI: Auto-fill details for the active product from its photos
  const handleAnalyzeActiveProduct = async () => {
    if (!token) {
      toast.error('Please sign in to use Verndly AI');
      return;
    }
    if (activeNote.images.length === 0) {
      toast.info('Add at least one photo first so Verndly AI can inspect your item');
      return;
    }

    const targetId = activeNote.id;
    setIsSingleAnalyzing(true);
    try {
      const aiFiles = await Promise.all(activeNote.images.map(compressForAi));
      const { product } = await aiApi.analyzeProductPhotos(token, aiFiles);

      setNotes((prev) =>
        prev.map((item) => {
          if (item.id !== targetId) return item;
          return {
            ...item,
            title: product.title || item.title,
            description: product.description || item.description,
            category: product.category || item.category,
            condition: product.condition || item.condition,
            brand: product.brand || item.brand,
            tags: product.tags.length > 0 ? product.tags : item.tags,
            aiGenerated: true,
            aiConfidence: product.confidence,
            aiSuggestedPrice: product.suggested_price_ghs,
          };
        }),
      );

      if (product.brand || product.tags.length > 0) {
        setShowMoreDetails(true);
      }
      toast.success('Product details filled by Verndly AI');
    } catch (err: unknown) {
      const apiErr = err as { status?: number; message?: string };
      if (apiErr?.status === 503) {
        setAiConfigured(false);
      }
      toast.error(apiErr?.message || 'Failed to analyze photos with Verndly AI');
    } finally {
      setIsSingleAnalyzing(false);
    }
  };

  const handleAddTag = () => {
    const clean = tagInput.trim().toLowerCase().replace(/^#+/, '');
    if (!clean) return;
    if (activeNote.tags.includes(clean)) {
      setTagInput('');
      return;
    }
    if (activeNote.tags.length >= 8) {
      toast.info('Up to 8 tags per product');
      return;
    }
    updateActiveNote({ tags: [...activeNote.tags, clean] });
    setTagInput('');
  };

  const handleRemoveTag = (tag: string) => {
    updateActiveNote({ tags: activeNote.tags.filter((t) => t !== tag) });
  };

  // Readiness summary
  const readinessById = useMemo(() => {
    const map: Record<string, { ready: boolean; missing: string[] }> = {};
    notes.forEach((n) => {
      map[n.id] = getItemReadiness(n);
    });
    return map;
  }, [notes]);

  const readyCount = useMemo(
    () => notes.filter((n) => readinessById[n.id]?.ready).length,
    [notes, readinessById],
  );

  const activeCategory = activeNote.category;
  const activePrice = activeNote.price;
  const activeOriginalPrice = activeNote.original_price;

  const activeCategoryBrands = useMemo(() => {
    const matched = categories.find((c) => c.name === activeCategory);
    return matched ? brandsMap[matched.id] || [] : [];
  }, [categories, brandsMap, activeCategory]);

  const discountPercent = useMemo(() => {
    const p = parseFloat(activePrice || '');
    const orig = parseFloat(activeOriginalPrice || '');
    if (!Number.isFinite(p) || !Number.isFinite(orig) || orig <= p || p <= 0) return 0;
    return Math.round(((orig - p) / orig) * 100);
  }, [activePrice, activeOriginalPrice]);

  // Publish all items sequentially
  const publishItems = async (targetNotes: ProductNoteItem[]) => {
    if (!token) {
      toast.error('Please sign in to publish products');
      return;
    }

    const firstIncompleteIndex = notes.findIndex(
      (n) => targetNotes.some((t) => t.id === n.id) && !getItemReadiness(n).ready,
    );
    if (firstIncompleteIndex !== -1) {
      const target = notes[firstIncompleteIndex];
      const { missing } = getItemReadiness(target);
      setActiveNoteIndex(firstIncompleteIndex);
      toast.error(
        `"${target.title.trim() || `Item ${firstIncompleteIndex + 1}`}" needs: ${missing.join(', ')}`,
      );
      return;
    }

    const initialStatuses: BatchPublishProgress['itemStatuses'] = targetNotes.map((n, i) => ({
      id: n.id,
      title: n.title.trim() || `Item ${i + 1}`,
      status: 'pending',
    }));

    setPublishProgress({
      total: targetNotes.length,
      currentStep: 'compressing',
      currentProductIndex: 0,
      itemStatuses: initialStatuses,
      overallPercent: 5,
    });

    const createdIds: string[] = [];
    let hasError = false;

    for (let i = 0; i < targetNotes.length; i++) {
      const item = targetNotes[i];

      setPublishProgress((prev) => ({
        ...prev,
        currentStep: 'compressing',
        currentProductIndex: i,
        overallPercent: Math.round(((i + 0.25) / targetNotes.length) * 100),
        itemStatuses: prev.itemStatuses.map((s, idx) =>
          idx === i ? { ...s, status: 'compressing', error: undefined } : s,
        ),
      }));

      try {
        const compressedImages = await Promise.all(
          item.images.map(async (img) => {
            try {
              const compressed = await imageCompression(img, {
                maxSizeMB: 1,
                maxWidthOrHeight: 1600,
                useWebWorker: true,
              });
              return new File([compressed], img.name, {
                type: compressed.type || img.type,
              });
            } catch {
              return img;
            }
          }),
        );

        setPublishProgress((prev) => ({
          ...prev,
          currentStep: 'uploading',
          overallPercent: Math.round(((i + 0.65) / targetNotes.length) * 100),
          itemStatuses: prev.itemStatuses.map((s, idx) =>
            idx === i ? { ...s, status: 'uploading' } : s,
          ),
        }));

        const created = await productApi.createProduct(
          token,
          {
            title: item.title.trim(),
            description: item.description.trim() || undefined,
            price: item.price.trim(),
            original_price: item.original_price.trim() || undefined,
            currency: 'GHS',
            condition: item.condition,
            quantity_available: item.quantity_available || '1',
            status: item.status,
            category: item.category || categories[0]?.name || 'General',
            brand: item.brand.trim() || undefined,
            tags: item.tags,
          },
          compressedImages,
          item.video,
        );

        const productId = created?.product?.id;
        if (productId) createdIds.push(productId);

        setPublishProgress((prev) => ({
          ...prev,
          overallPercent: Math.round(((i + 1) / targetNotes.length) * 100),
          itemStatuses: prev.itemStatuses.map((s, idx) =>
            idx === i ? { ...s, status: 'success', productId } : s,
          ),
        }));
      } catch (err: unknown) {
        const apiErr = err as { message?: string };
        hasError = true;
        setPublishProgress((prev) => ({
          ...prev,
          itemStatuses: prev.itemStatuses.map((s, idx) =>
            idx === i
              ? {
                  ...s,
                  status: 'error',
                  error: apiErr?.message || 'Failed to upload product',
                }
              : s,
          ),
        }));
      }
    }

    setPublishProgress((prev) => ({
      ...prev,
      currentStep: hasError ? 'error' : 'completed',
      overallPercent: 100,
    }));

    if (!hasError && createdIds.length > 0) {
      toast.success(`Published ${createdIds.length} product${createdIds.length === 1 ? '' : 's'}!`);
    }
  };

  const handleRetryFailed = () => {
    const failedIds = new Set(
      publishProgress.itemStatuses.filter((s) => s.status === 'error').map((s) => s.id),
    );
    const failedNotes = notes.filter((n) => failedIds.has(n.id));
    if (failedNotes.length > 0) {
      publishItems(failedNotes);
    }
  };

  const isPublishing =
    publishProgress.currentStep === 'compressing' || publishProgress.currentStep === 'uploading';
  const activeReadiness = readinessById[activeNote.id] || { ready: false, missing: [] };

  return (
    <div className="w-full space-y-6 pb-32 sm:pb-28">
      {/* Hidden native file inputs */}
      <input
        ref={bulkFileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleBulkPhotosSelected}
      />
      <input
        ref={activeImageInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleImageSelect}
      />
      <input
        ref={activeCameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleImageSelect}
      />
      <input
        ref={activeVideoInputRef}
        type="file"
        accept="video/mp4,video/quicktime,video/webm"
        className="hidden"
        onChange={handleVideoSelect}
      />

      {/* Top inline header — sits naturally below DashboardHeader, zero overlap */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onCancel?.()}
            className="bg-surface text-foreground hover:bg-foreground/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors"
            aria-label="Back to products"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-foreground text-xl font-bold tracking-tight sm:text-2xl">
                Add Products
              </h1>
              <span className="bg-surface text-muted rounded-full px-2.5 py-0.5 text-xs font-semibold">
                {notes.length} {notes.length === 1 ? 'item' : 'items'}
              </span>
            </div>
            <p className="text-muted mt-0.5 text-xs sm:text-sm">
              Upload photos and let Verndly AI sort products and draft details automatically.
            </p>
          </div>
        </div>

        {/* Primary AI bulk entry */}
        <button
          type="button"
          disabled={isBulkAnalyzing}
          onClick={() => setBulkModalOpen(true)}
          className="bg-foreground text-background inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50 sm:w-auto sm:py-2.5"
        >
          {isBulkAnalyzing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Verndly AI analyzing {bulkAnalyzingCount} photos…</span>
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              <span>Verndly AI Bulk Add</span>
            </>
          )}
        </button>
      </div>

      {/* Live Verndly AI bulk analysis banner */}
      {isBulkAnalyzing && (
        <div className="bg-[var(--color-accent)]/10 flex items-center gap-3 rounded-2xl px-4 py-3.5 sm:px-5">
          <Loader2 className="h-5 w-5 shrink-0 animate-spin text-[var(--color-accent)]" />
          <div className="min-w-0 flex-1">
            <p className="text-foreground text-sm font-semibold">
              Verndly AI is sorting {bulkAnalyzingCount} photos into separate products
            </p>
            <p className="text-muted text-xs">
              Matching angles of the same item, picking cover shots, and writing titles, categories,
              and descriptions…
            </p>
          </div>
        </div>
      )}

      {/* Item Count Tabs Strip — shows thumbnail, product name, price & readiness */}
      <section aria-label="Products in this batch" className="w-full space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-muted text-xs font-semibold uppercase tracking-wider">
            Items ({readyCount}/{notes.length} ready)
          </span>
          <button
            type="button"
            onClick={handleAddNote}
            className="text-foreground hover:bg-surface inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            New item
          </button>
        </div>

        <div className="flex items-stretch gap-2.5 overflow-x-auto pb-1">
          {notes.map((item, idx) => {
            const isActive = idx === activeNoteIndex;
            const status = readinessById[item.id] || { ready: false, missing: [] };
            const formattedPrice = formatGhs(item.price);
            const cover = item.imagePreviews[0];

            return (
              <div
                key={item.id}
                className={`group relative flex min-w-[210px] max-w-[260px] shrink-0 items-center rounded-2xl transition-colors ${
                  isActive
                    ? 'bg-foreground text-background'
                    : 'bg-surface text-foreground hover:bg-foreground/[0.06]'
                }`}
              >
                <button
                  ref={isActive ? activeTabRef : undefined}
                  type="button"
                  onClick={() => setActiveNoteIndex(idx)}
                  className="flex min-w-0 flex-1 items-center gap-3 p-2.5 text-left"
                >
                  {/* Thumbnail */}
                  <div
                    className={`relative h-12 w-12 shrink-0 overflow-hidden rounded-xl ${
                      isActive ? 'bg-background/15' : 'bg-background'
                    }`}
                  >
                    {cover ? (
                      <img
                        src={cover}
                        alt={item.title || `Item ${idx + 1}`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-0.5">
                        <Camera
                          className={`h-4 w-4 ${isActive ? 'text-background/60' : 'text-muted'}`}
                        />
                        <span
                          className={`text-[10px] font-semibold ${
                            isActive ? 'text-background/60' : 'text-muted'
                          }`}
                        >
                          #{idx + 1}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Name & Price */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                          status.ready ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                      />
                      <p className="truncate text-sm font-semibold leading-tight">
                        {item.title.trim() || `Item ${idx + 1}`}
                      </p>
                    </div>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span
                        className={`truncate text-xs font-semibold ${
                          isActive
                            ? formattedPrice
                              ? 'text-background/90'
                              : 'text-background/55'
                            : formattedPrice
                              ? 'text-foreground'
                              : 'text-muted'
                        }`}
                      >
                        {formattedPrice || 'Set price'}
                      </span>
                      {item.aiGenerated && (
                        <Sparkles
                          className={`h-3 w-3 shrink-0 ${
                            isActive ? 'text-background/75' : 'text-[var(--color-accent)]'
                          }`}
                        />
                      )}
                    </div>
                  </div>
                </button>

                {notes.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteNote(idx);
                    }}
                    aria-label={`Remove ${item.title || `Item ${idx + 1}`}`}
                    className={`mr-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors ${
                      isActive
                        ? 'text-background/60 hover:bg-background/15 hover:text-background'
                        : 'text-muted hover:bg-foreground/10 hover:text-foreground'
                    }`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            );
          })}

          {/* Add new item tile */}
          <button
            type="button"
            onClick={handleAddNote}
            className="bg-surface text-muted hover:bg-foreground/[0.06] hover:text-foreground flex min-w-[116px] shrink-0 flex-col items-center justify-center gap-1 rounded-2xl px-4 py-2.5 text-xs font-semibold transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Add Item</span>
          </button>
        </div>
      </section>

      {/* Main Mobile-First Responsive Workspace — full width, zero overlap, zero borders */}
      <div className="grid w-full grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
        {/* LEFT COLUMN (Mobile first): Photos & Verndly AI */}
        <section className="bg-surface space-y-5 rounded-3xl p-5 sm:p-6 lg:col-span-5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-foreground text-base font-semibold">Photos & Media</h2>
              <p className="text-muted text-xs">
                {activeNote.images.length}/3 photos · First photo is the cover
              </p>
            </div>

            {activeNote.images.length > 0 && (
              <button
                type="button"
                disabled={isSingleAnalyzing}
                onClick={handleAnalyzeActiveProduct}
                className="bg-[var(--color-accent)]/12 hover:bg-[var(--color-accent)]/20 inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-[var(--color-accent)] transition-colors disabled:opacity-50"
              >
                {isSingleAnalyzing ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Analyzing…</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="h-3.5 w-3.5" />
                    <span>Fill with Verndly AI</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Photo Grid */}
          <div className="grid grid-cols-3 gap-3">
            {activeNote.imagePreviews.map((preview, imgIdx) => (
              <div
                key={`${activeNote.id}-img-${imgIdx}`}
                className="bg-background group relative aspect-square overflow-hidden rounded-2xl"
              >
                <img
                  src={preview}
                  alt={`Product photo ${imgIdx + 1}`}
                  className="h-full w-full object-cover"
                />

                {imgIdx === 0 ? (
                  <span className="bg-foreground text-background absolute bottom-2 left-2 rounded-md px-2 py-0.5 text-[10px] font-semibold">
                    Cover
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSetCoverImage(imgIdx)}
                    className="bg-background/90 text-foreground absolute bottom-2 left-2 rounded-md px-2 py-0.5 text-[10px] font-semibold opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
                  >
                    Set cover
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleRemoveImage(imgIdx)}
                  aria-label="Remove photo"
                  className="bg-foreground/80 text-background hover:bg-foreground absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}

            {activeNote.images.length < 3 && (
              <button
                type="button"
                onClick={() => activeImageInputRef.current?.click()}
                className="bg-background text-muted hover:text-foreground flex aspect-square flex-col items-center justify-center gap-1.5 rounded-2xl p-2 text-center transition-colors"
              >
                <ImagePlus className="h-5 w-5" />
                <span className="text-[11px] font-semibold">Add photo</span>
              </button>
            )}
          </div>

          {/* Quick mobile media actions */}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            <button
              type="button"
              disabled={activeNote.images.length >= 3}
              onClick={() => activeImageInputRef.current?.click()}
              className="bg-background text-foreground hover:bg-foreground/[0.06] inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold transition-colors disabled:opacity-40"
            >
              <ImagePlus className="h-4 w-4" />
              <span>Gallery</span>
            </button>

            <button
              type="button"
              disabled={activeNote.images.length >= 3}
              onClick={() => activeCameraInputRef.current?.click()}
              className="bg-background text-foreground hover:bg-foreground/[0.06] inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold transition-colors disabled:opacity-40"
            >
              <Camera className="h-4 w-4" />
              <span>Camera</span>
            </button>

            <button
              type="button"
              onClick={() => activeVideoInputRef.current?.click()}
              className="bg-background text-foreground hover:bg-foreground/[0.06] col-span-2 inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold transition-colors sm:col-span-1"
            >
              <Video className="h-4 w-4" />
              <span>{activeNote.video ? 'Swap video' : 'Add video'}</span>
            </button>
          </div>

          {/* Attached video preview */}
          {activeNote.videoPreview && (
            <div className="bg-background relative overflow-hidden rounded-2xl">
              <video
                src={activeNote.videoPreview}
                controls
                playsInline
                className="max-h-52 w-full object-cover"
              />
              <button
                type="button"
                onClick={handleRemoveVideo}
                aria-label="Remove video"
                className="bg-foreground/80 text-background hover:bg-foreground absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Contextual AI Bulk helper card when no photos yet */}
          {activeNote.images.length === 0 && (
            <div className="bg-background rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <div className="bg-[var(--color-accent)]/12 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[var(--color-accent)]">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <p className="text-foreground text-sm font-semibold">
                    Listing multiple items at once?
                  </p>
                  <p className="text-muted text-xs leading-relaxed">
                    Select up to {MAX_BULK_PHOTOS} photos together. Verndly AI separates distinct
                    products, groups matching angles, and writes titles and descriptions for you.
                  </p>
                  <button
                    type="button"
                    onClick={() => bulkFileInputRef.current?.click()}
                    className="pt-1 text-xs font-semibold text-[var(--color-accent)] hover:underline"
                  >
                    Select photos for Verndly AI bulk sort →
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* RIGHT COLUMN: Product Details */}
        <section className="bg-surface space-y-5 rounded-3xl p-5 sm:p-6 lg:col-span-7">
          {/* Card Header with Item status & quick actions */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-foreground text-base font-semibold">
                Item {activeNoteIndex + 1} Details
              </span>
              {activeNote.aiGenerated && (
                <span className="bg-[var(--color-accent)]/12 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-[var(--color-accent)]">
                  <Sparkles className="h-3 w-3" />
                  Verndly AI
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {/* Status switch: Live vs Draft */}
              <div className="bg-background inline-flex rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => updateActiveNote({ status: 'active' })}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                    activeNote.status === 'active'
                      ? 'bg-foreground text-background'
                      : 'text-muted hover:text-foreground'
                  }`}
                >
                  Active
                </button>
                <button
                  type="button"
                  onClick={() => updateActiveNote({ status: 'draft' })}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                    activeNote.status === 'draft'
                      ? 'bg-foreground text-background'
                      : 'text-muted hover:text-foreground'
                  }`}
                >
                  Draft
                </button>
              </div>

              <button
                type="button"
                onClick={handleDuplicateActiveNote}
                title="Duplicate item"
                aria-label="Duplicate item"
                className="bg-background text-muted hover:text-foreground flex h-8 w-8 items-center justify-center rounded-xl transition-colors"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>

              {notes.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleDeleteNote(activeNoteIndex)}
                  title="Delete item"
                  aria-label="Delete item"
                  className="bg-background text-muted flex h-8 w-8 items-center justify-center rounded-xl transition-colors hover:text-red-500"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Product Name */}
          <div className="space-y-1.5">
            <label
              htmlFor="product-title"
              className="text-muted block text-xs font-semibold uppercase tracking-wider"
            >
              Product name
            </label>
            <input
              id="product-title"
              type="text"
              value={activeNote.title}
              onChange={(e) => updateActiveNote({ title: e.target.value })}
              placeholder="e.g. Woven Cotton Tote Bag — Cream"
              className="bg-background text-foreground placeholder:text-muted/60 focus:bg-background w-full rounded-2xl px-4 py-3.5 text-base font-semibold outline-none transition-colors"
            />
          </div>

          {/* Price & Category Row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label
                htmlFor="product-price"
                className="text-muted block text-xs font-semibold uppercase tracking-wider"
              >
                Price (GH₵)
              </label>
              <div className="bg-background flex items-center rounded-2xl px-4 py-3">
                <span className="text-muted mr-2 text-sm font-bold">GH₵</span>
                <input
                  id="product-price"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={activeNote.price}
                  onChange={(e) => updateActiveNote({ price: e.target.value })}
                  placeholder="0.00"
                  className="text-foreground placeholder:text-muted/60 w-full bg-transparent text-base font-bold outline-none"
                />
              </div>

              {/* Optional Gemini price estimate pill (never auto-applied) */}
              {activeNote.aiSuggestedPrice && !activeNote.price && (
                <button
                  type="button"
                  onClick={() => updateActiveNote({ price: String(activeNote.aiSuggestedPrice) })}
                  className="bg-[var(--color-accent)]/10 hover:bg-[var(--color-accent)]/20 mt-1.5 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold text-[var(--color-accent)] transition-colors"
                >
                  <Sparkles className="h-3 w-3" />
                  <span>
                    Verndly AI estimate: {formatGhs(activeNote.aiSuggestedPrice)} · Tap to apply
                  </span>
                </button>
              )}
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="product-category"
                className="text-muted block text-xs font-semibold uppercase tracking-wider"
              >
                Category
              </label>
              <select
                id="product-category"
                value={activeNote.category}
                onChange={(e) => updateActiveNote({ category: e.target.value })}
                className="bg-background text-foreground w-full rounded-2xl px-4 py-3.5 text-sm font-semibold outline-none"
              >
                {categories.length === 0 ? (
                  <option value="General">General</option>
                ) : (
                  categories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* Condition selector pills */}
          <div className="space-y-1.5">
            <span className="text-muted block text-xs font-semibold uppercase tracking-wider">
              Condition
            </span>
            <div className="grid grid-cols-3 gap-2">
              {CONDITIONS.map((cond) => {
                const selected = activeNote.condition === cond.value;
                return (
                  <button
                    key={cond.value}
                    type="button"
                    onClick={() => updateActiveNote({ condition: cond.value })}
                    className={`rounded-xl px-3 py-2.5 text-xs font-semibold transition-colors sm:text-sm ${
                      selected
                        ? 'bg-foreground text-background'
                        : 'bg-background text-muted hover:text-foreground'
                    }`}
                  >
                    {cond.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="product-description"
                className="text-muted text-xs font-semibold uppercase tracking-wider"
              >
                Description
              </label>
              <span
                className={`text-[11px] font-medium ${
                  activeNote.status === 'active' &&
                  activeNote.description.trim().length < MIN_ACTIVE_DESCRIPTION_LENGTH
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-muted'
                }`}
              >
                {activeNote.description.trim().length} chars
                {activeNote.status === 'active' &&
                activeNote.description.trim().length < MIN_ACTIVE_DESCRIPTION_LENGTH
                  ? ` (${MIN_ACTIVE_DESCRIPTION_LENGTH - activeNote.description.trim().length} more to publish)`
                  : ''}
              </span>
            </div>
            <textarea
              id="product-description"
              rows={4}
              value={activeNote.description}
              onChange={(e) => updateActiveNote({ description: e.target.value })}
              placeholder="Describe the item clearly — size, color, material, and what’s included."
              className="bg-background text-foreground placeholder:text-muted/60 w-full resize-y rounded-2xl px-4 py-3 text-sm leading-relaxed outline-none"
            />
          </div>

          {/* Optional Details Accordion — keeps mobile UI clean & uncluttered */}
          <div className="bg-background rounded-2xl p-4">
            <button
              type="button"
              onClick={() => setShowMoreDetails((prev) => !prev)}
              className="flex w-full items-center justify-between text-left"
            >
              <div>
                <span className="text-foreground text-sm font-semibold">
                  More details (optional)
                </span>
                <p className="text-muted text-xs">
                  Compare-at price, stock quantity, brand, and search tags
                </p>
              </div>
              <ChevronDown
                className={`text-muted h-4 w-4 shrink-0 transition-transform ${
                  showMoreDetails ? 'rotate-180' : ''
                }`}
              />
            </button>

            {showMoreDetails && (
              <div className="mt-4 space-y-4 pt-2">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {/* Compare-at / original price */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="product-original-price"
                        className="text-muted text-xs font-semibold"
                      >
                        Compare-at (GH₵)
                      </label>
                      {discountPercent > 0 && (
                        <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                          -{discountPercent}%
                        </span>
                      )}
                    </div>
                    <input
                      id="product-original-price"
                      type="number"
                      inputMode="decimal"
                      min="0"
                      value={activeNote.original_price}
                      onChange={(e) => updateActiveNote({ original_price: e.target.value })}
                      placeholder="Optional"
                      className="bg-surface text-foreground placeholder:text-muted/60 w-full rounded-xl px-3.5 py-2.5 text-sm font-medium outline-none"
                    />
                  </div>

                  {/* Stock quantity */}
                  <div className="space-y-1.5">
                    <label htmlFor="product-stock" className="text-muted text-xs font-semibold">
                      Stock quantity
                    </label>
                    <input
                      id="product-stock"
                      type="number"
                      inputMode="numeric"
                      min="1"
                      value={activeNote.quantity_available}
                      onChange={(e) => updateActiveNote({ quantity_available: e.target.value })}
                      className="bg-surface text-foreground w-full rounded-xl px-3.5 py-2.5 text-sm font-medium outline-none"
                    />
                  </div>

                  {/* Brand */}
                  <div className="space-y-1.5">
                    <label htmlFor="product-brand" className="text-muted text-xs font-semibold">
                      Brand
                    </label>
                    <input
                      id="product-brand"
                      type="text"
                      list="verndly-brand-suggestions"
                      value={activeNote.brand}
                      onChange={(e) => updateActiveNote({ brand: e.target.value })}
                      placeholder="Only if branded"
                      className="bg-surface text-foreground placeholder:text-muted/60 w-full rounded-xl px-3.5 py-2.5 text-sm font-medium outline-none"
                    />
                    {activeCategoryBrands.length > 0 && (
                      <datalist id="verndly-brand-suggestions">
                        {activeCategoryBrands.map((b) => (
                          <option key={b.id} value={b.name} />
                        ))}
                      </datalist>
                    )}
                  </div>
                </div>

                {/* Search Tags */}
                <div className="space-y-2">
                  <label htmlFor="product-tags" className="text-muted text-xs font-semibold">
                    Search tags
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="product-tags"
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ',') {
                          e.preventDefault();
                          handleAddTag();
                        }
                      }}
                      placeholder="Type a tag and press Enter"
                      className="bg-surface text-foreground placeholder:text-muted/60 flex-1 rounded-xl px-3.5 py-2.5 text-sm outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddTag}
                      className="bg-surface text-foreground hover:bg-foreground/10 rounded-xl px-4 py-2.5 text-xs font-semibold transition-colors"
                    >
                      Add
                    </button>
                  </div>

                  {activeNote.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {activeNote.tags.map((tag) => (
                        <span
                          key={tag}
                          className="bg-surface text-foreground inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium"
                        >
                          #{tag}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            aria-label={`Remove ${tag}`}
                            className="text-muted hover:text-foreground"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Missing-field hint for current item */}
          {!activeReadiness.ready && (
            <div className="bg-background flex items-center gap-2.5 rounded-2xl px-4 py-3 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-500" />
              <span className="text-muted">
                Still needed for this item:{' '}
                <strong className="text-foreground">{activeReadiness.missing.join(', ')}</strong>
              </span>
            </div>
          )}
        </section>
      </div>

      {/* Bottom Publish Bar — aligned cleanly with lg:ml-64 sidebar, zero border/blur/shadow */}
      <div className="bg-background fixed bottom-0 left-0 right-0 z-30 lg:left-64">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3.5 sm:px-6 md:px-8">
          <div className="min-w-0">
            <p className="text-foreground truncate text-sm font-semibold">
              {readyCount} of {notes.length} {notes.length === 1 ? 'item' : 'items'} ready
            </p>
            <p className="text-muted hidden text-xs sm:block">
              {readyCount === notes.length
                ? 'Everything looks good to publish to your Verndly store.'
                : 'Complete the highlighted fields on each item before publishing.'}
            </p>
          </div>

          <button
            type="button"
            disabled={isPublishing || isBulkAnalyzing || isSingleAnalyzing}
            onClick={() => publishItems(notes)}
            className="bg-foreground text-background inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-40 sm:px-6"
          >
            {isPublishing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Publishing…</span>
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                <span>
                  Publish {notes.length} {notes.length === 1 ? 'Product' : 'Products'}
                </span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Verndly AI Bulk Photo Import Modal — flat tonal, zero borders/shadows/blur */}
      {bulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
          <div className="bg-background w-full max-w-lg rounded-t-3xl p-6 sm:rounded-3xl">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-[var(--color-accent)]/12 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-[var(--color-accent)]">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-foreground text-lg font-bold">Bulk Add with Verndly AI</h3>
                  <p className="text-muted text-xs">Powered by Verndly AI</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBulkModalOpen(false)}
                aria-label="Close modal"
                className="bg-surface text-muted hover:text-foreground flex h-8 w-8 items-center justify-center rounded-xl"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="bg-surface mt-5 space-y-2.5 rounded-2xl p-4 text-xs leading-relaxed">
              <p className="text-foreground font-semibold">How Verndly AI handles your batch:</p>
              <ul className="text-muted space-y-1.5">
                <li>
                  • Groups multiple angles of the same item together (up to 3 photos per product)
                  and selects the best cover shot.
                </li>
                <li>• Separates distinct items or colorways into individual product tabs.</li>
                <li>
                  • Auto-writes factual titles, descriptions, categories, conditions, and tags — you
                  just review and set your final prices.
                </li>
              </ul>
            </div>

            {aiConfigured === false && (
              <div className="mt-3 rounded-2xl bg-amber-500/10 px-4 py-3 text-xs text-amber-700 dark:text-amber-300">
                Verndly AI is currently offline on this server. Selecting photos will still create
                separate drafts so you can keep listing.
              </div>
            )}

            <button
              type="button"
              onClick={() => bulkFileInputRef.current?.click()}
              className="bg-foreground text-background mt-5 flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-semibold transition-opacity hover:opacity-90"
            >
              <UploadCloud className="h-4 w-4" />
              <span>Select up to {MAX_BULK_PHOTOS} photos</span>
            </button>
          </div>
        </div>
      )}

      {/* Batch Publish Progress Modal — flat tonal, zero borders/shadows/blur */}
      {publishProgress.currentStep !== 'idle' && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
          <div className="bg-background w-full max-w-lg rounded-t-3xl p-6 sm:rounded-3xl">
            <div className="flex items-center justify-between">
              <h3 className="text-foreground text-lg font-bold">
                {publishProgress.currentStep === 'completed'
                  ? 'All products published'
                  : publishProgress.currentStep === 'error'
                    ? 'Published with some issues'
                    : 'Publishing your products…'}
              </h3>
              <span className="text-muted text-sm font-semibold">
                {publishProgress.overallPercent}%
              </span>
            </div>

            {/* Progress bar */}
            <div className="bg-surface mt-3 h-2 w-full overflow-hidden rounded-full">
              <div
                className="bg-foreground h-full rounded-full transition-all duration-300"
                style={{ width: `${publishProgress.overallPercent}%` }}
              />
            </div>

            {/* Item list */}
            <div className="mt-5 max-h-64 space-y-2 overflow-y-auto">
              {publishProgress.itemStatuses.map((item) => (
                <div
                  key={item.id}
                  className="bg-surface flex items-center justify-between gap-3 rounded-2xl px-4 py-3"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    {item.status === 'success' && (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                    )}
                    {item.status === 'error' && (
                      <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                    )}
                    {(item.status === 'compressing' || item.status === 'uploading') && (
                      <Loader2 className="text-foreground h-4 w-4 shrink-0 animate-spin" />
                    )}
                    {item.status === 'pending' && (
                      <span className="bg-muted/40 h-2.5 w-2.5 shrink-0 rounded-full" />
                    )}
                    <div className="min-w-0">
                      <p className="text-foreground truncate text-sm font-semibold">{item.title}</p>
                      {item.error && <p className="truncate text-xs text-red-500">{item.error}</p>}
                    </div>
                  </div>

                  {item.productId && (
                    <Link
                      href={`/dashboard/products/${item.productId}`}
                      className="text-muted hover:text-foreground inline-flex shrink-0 items-center gap-1 text-xs font-semibold"
                    >
                      View
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              ))}
            </div>

            {/* Actions after completion */}
            {(publishProgress.currentStep === 'completed' ||
              publishProgress.currentStep === 'error') && (
              <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
                {publishProgress.currentStep === 'error' && (
                  <button
                    type="button"
                    onClick={handleRetryFailed}
                    className="bg-surface text-foreground hover:bg-foreground/10 inline-flex flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition-colors"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Retry failed
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    const createdIds = publishProgress.itemStatuses
                      .map((s) => s.productId)
                      .filter((id): id is string => Boolean(id));
                    setPublishProgress({
                      total: 0,
                      currentStep: 'idle',
                      currentProductIndex: 0,
                      itemStatuses: [],
                      overallPercent: 0,
                    });
                    if (createdIds.length > 0 && publishProgress.currentStep === 'completed') {
                      onSuccess?.(createdIds);
                    }
                  }}
                  className="bg-foreground text-background flex-1 rounded-2xl px-4 py-3 text-sm font-semibold transition-opacity hover:opacity-90"
                >
                  {publishProgress.currentStep === 'completed' ? 'Done' : 'Close'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
