'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
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
  Layers,
  Tag,
  DollarSign,
  Package,
  Percent,
  Flame,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Sparkles,
  UploadCloud,
  FileCheck2,
  ExternalLink,
  Loader2,
  RefreshCw,
  Eye,
  SlidersHorizontal,
} from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { productApi } from '@/lib/api/product';
import { useAuth } from '@/lib/contexts/auth-context';
import { toast } from 'sonner';

// ─── Interfaces & Types ────────────────────────────────────────────────────────

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
  is_featured: boolean;
  status: 'active' | 'draft';
  // On-demand expanded drawers
  showCategory: boolean;
  showCondition: boolean;
  showStock: boolean;
  showDiscount: boolean;
  showBrand: boolean;
  showTags: boolean;
  showBoost: boolean;
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
  { value: 'new', label: 'Brand New', desc: 'Sealed or never opened' },
  { value: 'used', label: 'Used / Pre-owned', desc: 'Good condition with minor wear' },
  { value: 'refurbished', label: 'Refurbished', desc: 'Professionally restored & tested' },
] as const;

const DISCOUNT_PRESETS = [5, 10, 15, 20, 25, 30, 50];

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
    is_featured: false,
    status: 'active',
    showCategory: false,
    showCondition: false,
    showStock: false,
    showDiscount: false,
    showBrand: false,
    showTags: false,
    showBoost: false,
  };
}

export default function BatchProductNotesForm({ onCancel, onSuccess }: BatchProductNotesFormProps) {
  const router = useRouter();
  const { token } = useAuth();

  // Categories & Brands lookup
  const [categories, setCategories] = useState<Category[]>([]);
  const [brandsMap, setBrandsMap] = useState<Record<string, { id: string; name: string }[]>>({});

  // Product notes list
  const [notes, setNotes] = useState<ProductNoteItem[]>([createBlankProductNote()]);
  const [activeNoteIndex, setActiveNoteIndex] = useState<number>(0);
  const [tagInput, setTagInput] = useState<string>('');

  // Bulk Media Import Sheet
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const bulkFileInputRef = useRef<HTMLInputElement>(null);

  // Hidden file inputs for current active card
  const activeImageInputRef = useRef<HTMLInputElement>(null);
  const activeCameraInputRef = useRef<HTMLInputElement>(null);
  const activeVideoInputRef = useRef<HTMLInputElement>(null);

  // Publishing / Processing State
  const [publishProgress, setPublishProgress] = useState<BatchPublishProgress>({
    total: 0,
    currentStep: 'idle',
    currentProductIndex: 0,
    itemStatuses: [],
    overallPercent: 0,
  });

  const activeNote = notes[activeNoteIndex] || notes[0];

  // ─── Load Categories ─────────────────────────────────────────────────────────
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
      .catch((err) => {
        console.warn('Could not load categories:', err);
      });
  }, []);

  // Load brands for active note category on demand
  useEffect(() => {
    const currentCatName = activeNote?.category;
    if (!currentCatName || brandsMap[currentCatName]) return;

    const matchedCat = categories.find((c) => c.name === currentCatName);
    productApi
      .getBrands(currentCatName, matchedCat?.id)
      .then((brandsList) => {
        setBrandsMap((prev) => ({
          ...prev,
          [currentCatName]: brandsList || [],
        }));
      })
      .catch(() => {});
  }, [activeNote?.category, categories, brandsMap]);

  // ─── Note Mutation Helpers ──────────────────────────────────────────────────

  const updateActiveNote = useCallback(
    (updater: Partial<ProductNoteItem> | ((prev: ProductNoteItem) => ProductNoteItem)) => {
      setNotes((prev) => {
        const next = [...prev];
        const current = next[activeNoteIndex];
        if (!current) return prev;
        next[activeNoteIndex] =
          typeof updater === 'function' ? updater(current) : { ...current, ...updater };
        return next;
      });
    },
    [activeNoteIndex],
  );

  const addNewNote = useCallback(() => {
    const defaultCat = categories[0]?.name || 'General';
    const newNote = createBlankProductNote(defaultCat);
    setNotes((prev) => [...prev, newNote]);
    setActiveNoteIndex(notes.length);
    toast.success(`Product #${notes.length + 1} added`);
  }, [categories, notes.length]);

  const duplicateActiveNote = useCallback(() => {
    if (!activeNote) return;
    const duplicated: ProductNoteItem = {
      ...activeNote,
      id:
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `note_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: `${activeNote.title} (Copy)`.trim(),
      images: [...activeNote.images],
      imagePreviews: [...activeNote.imagePreviews],
      video: activeNote.video,
      videoPreview: activeNote.videoPreview,
      tags: [...activeNote.tags],
    };
    setNotes((prev) => [...prev, duplicated]);
    setActiveNoteIndex(notes.length);
    toast.success('Product duplicated');
  }, [activeNote, notes.length]);

  const removeNote = useCallback(
    (indexToRemove: number) => {
      if (notes.length <= 1) {
        toast.info('At least one product card is required');
        return;
      }
      setNotes((prev) => prev.filter((_, idx) => idx !== indexToRemove));
      if (activeNoteIndex >= indexToRemove && activeNoteIndex > 0) {
        setActiveNoteIndex(activeNoteIndex - 1);
      }
      toast.info('Product note removed');
    },
    [activeNoteIndex, notes.length],
  );

  // ─── Image & Video Handling ─────────────────────────────────────────────────

  const processAndCompressImages = async (files: File[]): Promise<File[]> => {
    const compressedList: File[] = [];
    for (const file of files) {
      let src = file;
      const lower = file.name.toLowerCase();
      if (
        lower.endsWith('.heic') ||
        lower.endsWith('.heif') ||
        file.type === 'image/heic' ||
        file.type === 'image/heif'
      ) {
        try {
          const heic2any = (await import('heic2any')).default;
          const blob = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.85 });
          const finalBlob = Array.isArray(blob) ? blob[0] : blob;
          src = new File([finalBlob], file.name.replace(/\.(heic|heif)$/i, '.jpg'), {
            type: 'image/jpeg',
          });
        } catch (e) {
          console.warn('HEIC preview conversion fallback:', e);
        }
      }

      try {
        const compressed = await imageCompression(src, {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
          fileType: 'image/webp',
        });
        compressedList.push(compressed);
      } catch (compErr) {
        console.warn('Compression fallback to original file:', compErr);
        compressedList.push(src);
      }
    }
    return compressedList;
  };

  const handleAddImagesToActive = async (files: FileList | File[] | null) => {
    if (!files || files.length === 0) return;
    const incoming = Array.from(files);
    const currentCount = activeNote.images.length;
    if (currentCount + incoming.length > 3) {
      toast.error('Maximum 3 photos allowed per product');
      return;
    }

    const toastId = toast.loading('Optimizing photos...');
    try {
      const compressed = await processAndCompressImages(incoming);
      const newPreviews = compressed.map((file) => URL.createObjectURL(file));

      updateActiveNote((prev) => ({
        ...prev,
        images: [...prev.images, ...compressed],
        imagePreviews: [...prev.imagePreviews, ...newPreviews],
      }));
      toast.success(`${compressed.length} photo${compressed.length > 1 ? 's' : ''} attached`, {
        id: toastId,
      });
    } catch {
      toast.error('Failed to process photos', { id: toastId });
    }
  };

  const handleAddVideoToActive = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const MAX_VIDEO_BYTES = 60 * 1024 * 1024;
    if (file.size > MAX_VIDEO_BYTES) {
      toast.error('Product video must be under 60MB');
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    updateActiveNote({
      video: file,
      videoPreview: previewUrl,
    });
    toast.success('Video attached');
  };

  const removeImageFromActive = (index: number) => {
    updateActiveNote((prev) => {
      const updatedImages = prev.images.filter((_, idx) => idx !== index);
      const updatedPreviews = prev.imagePreviews.filter((_, idx) => idx !== index);
      return {
        ...prev,
        images: updatedImages,
        imagePreviews: updatedPreviews,
      };
    });
  };

  const removeVideoFromActive = () => {
    updateActiveNote({
      video: null,
      videoPreview: null,
    });
  };

  // ─── Bulk Photo Import Workflow ─────────────────────────────────────────────

  const handleBulkPhotosSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const list = Array.from(files);
    setBulkImportOpen(false);

    const toastId = toast.loading(`Preparing ${list.length} photos for multiple products...`);
    try {
      const compressed = await processAndCompressImages(list);

      // Create product cards automatically: 2 photos per card (or 1 card if <= 3)
      const PHOTOS_PER_CARD = 2;
      const chunks: File[][] = [];
      for (let i = 0; i < compressed.length; i += PHOTOS_PER_CARD) {
        chunks.push(compressed.slice(i, i + PHOTOS_PER_CARD));
      }

      const defaultCat = categories[0]?.name || 'General';
      const createdNotes: ProductNoteItem[] = chunks.map((chunk, index) => {
        const previews = chunk.map((f) => URL.createObjectURL(f));
        return {
          ...createBlankProductNote(defaultCat),
          images: chunk,
          imagePreviews: previews,
          title: '',
        };
      });

      // Replace or merge into notes list
      setNotes((prevNotes) => {
        // If current note is blank, replace it; otherwise append
        const firstNoteIsBlank =
          prevNotes.length === 1 &&
          !prevNotes[0].title &&
          !prevNotes[0].price &&
          prevNotes[0].images.length === 0;

        if (firstNoteIsBlank) {
          return createdNotes;
        }
        return [...prevNotes, ...createdNotes];
      });

      setActiveNoteIndex(0);
      toast.success(
        `Created ${createdNotes.length} product drafts! Now enter name & price for each.`,
        { id: toastId, duration: 4500 },
      );
    } catch (err: any) {
      toast.error('Bulk photo import failed: ' + (err?.message || 'Unknown error'), {
        id: toastId,
      });
    }
  };

  // ─── Validation Helpers ─────────────────────────────────────────────────────

  const checkNoteValidation = (note: ProductNoteItem) => {
    const hasTitle = Boolean(note.title && note.title.trim().length > 0);
    const numPrice = Number(note.price);
    const hasValidPrice = Boolean(note.price && Number.isFinite(numPrice) && numPrice > 0);
    const hasMedia = Boolean(note.images.length > 0 || note.video);

    const missingFields: string[] = [];
    if (!hasTitle) missingFields.push('Name');
    if (!hasValidPrice) missingFields.push('Price');
    if (!hasMedia) missingFields.push('Photo or Video');

    return {
      isValid: hasTitle && hasValidPrice && hasMedia,
      missingFields,
    };
  };

  const validationSummary = useMemo(() => {
    let validCount = 0;
    const items = notes.map((note, index) => {
      const v = checkNoteValidation(note);
      if (v.isValid) validCount++;
      return { index, id: note.id, ...v };
    });
    return {
      total: notes.length,
      validCount,
      allValid: validCount === notes.length,
      items,
    };
  }, [notes]);

  const totalBatchValue = useMemo(() => {
    return notes.reduce((sum, n) => {
      const p = parseFloat(n.price);
      return sum + (Number.isFinite(p) ? p : 0);
    }, 0);
  }, [notes]);

  // ─── Publishing Process ─────────────────────────────────────────────────────

  const handleStartPublishing = async () => {
    if (!token) {
      toast.error('You must be logged in as a seller to publish products');
      return;
    }

    // Pre-flight check
    const firstInvalid = validationSummary.items.find((item) => !item.isValid);
    if (firstInvalid) {
      setActiveNoteIndex(firstInvalid.index);
      toast.error(
        `Product #${firstInvalid.index + 1} is incomplete: Please provide ${firstInvalid.missingFields.join(', ')}`,
      );
      return;
    }

    // Initialize progress tracking
    const initialItemStatuses = notes.map((n) => ({
      id: n.id,
      title: n.title.trim() || 'Untitled Item',
      status: 'pending' as const,
    }));

    setPublishProgress({
      total: notes.length,
      currentStep: 'validating',
      currentProductIndex: 0,
      itemStatuses: initialItemStatuses,
      overallPercent: 5,
    });

    const createdProductIds: string[] = [];

    // Publish each note sequentially with live progress indication
    for (let i = 0; i < notes.length; i++) {
      const note = notes[i];
      const progressBase = Math.round((i / notes.length) * 90);

      // Update item to compressing/uploading state
      setPublishProgress((prev) => ({
        ...prev,
        currentStep: 'uploading',
        currentProductIndex: i,
        overallPercent: progressBase + 10,
        itemStatuses: prev.itemStatuses.map((st, idx) =>
          idx === i ? { ...st, status: 'uploading' } : st,
        ),
      }));

      try {
        const created = await productApi.createProduct(
          token,
          {
            title: note.title.trim(),
            description: note.description.trim() || undefined,
            price: note.price.trim(),
            original_price: note.original_price?.trim() || undefined,
            currency: 'GHS',
            condition: note.condition || 'new',
            quantity_available: note.quantity_available?.trim() || '1',
            status: note.status || 'active',
            category: note.category || 'General',
            brand: note.brand?.trim() || undefined,
            tags: note.tags,
            attributes: {},
          },
          note.images,
          note.video,
        );

        const prodId = created?.product?.id;
        if (prodId) {
          createdProductIds.push(prodId);
        }

        // Mark as success
        setPublishProgress((prev) => ({
          ...prev,
          itemStatuses: prev.itemStatuses.map((st, idx) =>
            idx === i ? { ...st, status: 'success', productId: prodId } : st,
          ),
        }));
      } catch (err: any) {
        console.error(`Error uploading item #${i + 1}:`, err);
        const errMsg = err?.message || 'Upload failed';

        setPublishProgress((prev) => ({
          ...prev,
          itemStatuses: prev.itemStatuses.map((st, idx) =>
            idx === i ? { ...st, status: 'error', error: errMsg } : st,
          ),
        }));
      }
    }

    // Complete state
    setPublishProgress((prev) => ({
      ...prev,
      currentStep: 'completed',
      overallPercent: 100,
    }));

    if (createdProductIds.length === notes.length) {
      toast.success(`All ${notes.length} products published successfully!`);
      if (onSuccess) onSuccess(createdProductIds);
    } else if (createdProductIds.length > 0) {
      toast.warning(
        `${createdProductIds.length} of ${notes.length} products were published. Review errors below.`,
      );
    } else {
      toast.error('Failed to publish products. Please check the errors below.');
    }
  };

  const handleRetryFailed = async () => {
    if (!token) return;
    const failedIndices = publishProgress.itemStatuses
      .map((st, idx) => (st.status === 'error' ? idx : -1))
      .filter((idx) => idx !== -1);

    if (failedIndices.length === 0) return;

    setPublishProgress((prev) => ({
      ...prev,
      currentStep: 'uploading',
      overallPercent: 50,
      itemStatuses: prev.itemStatuses.map((st) =>
        st.status === 'error' ? { ...st, status: 'pending', error: undefined } : st,
      ),
    }));

    for (const i of failedIndices) {
      const note = notes[i];
      setPublishProgress((prev) => ({
        ...prev,
        currentProductIndex: i,
        itemStatuses: prev.itemStatuses.map((st, idx) =>
          idx === i ? { ...st, status: 'uploading' } : st,
        ),
      }));

      try {
        const created = await productApi.createProduct(
          token,
          {
            title: note.title.trim(),
            description: note.description.trim() || undefined,
            price: note.price.trim(),
            original_price: note.original_price?.trim() || undefined,
            currency: 'GHS',
            condition: note.condition || 'new',
            quantity_available: note.quantity_available?.trim() || '1',
            status: note.status || 'active',
            category: note.category || 'General',
            brand: note.brand?.trim() || undefined,
            tags: note.tags,
            attributes: {},
          },
          note.images,
          note.video,
        );

        const prodId = created?.product?.id;
        setPublishProgress((prev) => ({
          ...prev,
          itemStatuses: prev.itemStatuses.map((st, idx) =>
            idx === i ? { ...st, status: 'success', productId: prodId } : st,
          ),
        }));
      } catch (err: any) {
        const errMsg = err?.message || 'Upload failed';
        setPublishProgress((prev) => ({
          ...prev,
          itemStatuses: prev.itemStatuses.map((st, idx) =>
            idx === i ? { ...st, status: 'error', error: errMsg } : st,
          ),
        }));
      }
    }

    setPublishProgress((prev) => ({
      ...prev,
      currentStep: 'completed',
      overallPercent: 100,
    }));
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div
      className="min-h-screen pb-32 font-sans text-zinc-900 dark:text-zinc-100 [&_button]:font-sans [&_input]:font-sans [&_select]:font-sans [&_textarea]:font-sans"
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "SF Pro", "San Francisco", system-ui, sans-serif',
      }}
    >
      {/* ─── Top Header (Mobile & Desktop) ─────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-zinc-200/80 bg-white/80 backdrop-blur-xl dark:border-zinc-800/80 dark:bg-[#121214]/80">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            {onCancel ? (
              <button
                type="button"
                onClick={onCancel}
                className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            ) : (
              <Link
                href="/dashboard/products"
                className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  Quick Add Notes
                </span>
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                  {notes.length} {notes.length === 1 ? 'item' : 'items'}
                </span>
              </div>
              <h1 className="text-base font-bold tracking-tight text-zinc-900 sm:text-lg dark:text-zinc-100">
                Add Products
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setBulkImportOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-700 transition-all hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-200 dark:hover:bg-zinc-700"
            >
              <ImagePlus className="h-3.5 w-3.5 text-amber-500" />
              <span className="hidden sm:inline">Bulk Add</span> Photos
            </button>

            <button
              type="button"
              onClick={addNewNote}
              className="inline-flex items-center gap-1.5 rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Note</span>
            </button>
          </div>
        </div>

        {/* ─── Apple Notes Item Selector Strip ───────────────────────────── */}
        <div className="border-t border-zinc-100 bg-zinc-50/60 px-4 py-2 dark:border-zinc-800/60 dark:bg-zinc-900/40">
          <div className="no-scrollbar mx-auto flex max-w-4xl items-center gap-2 overflow-x-auto py-0.5">
            {notes.map((note, idx) => {
              const check = checkNoteValidation(note);
              const isActive = idx === activeNoteIndex;
              const displayTitle = note.title.trim() || `Item ${idx + 1}`;
              const displayPrice = note.price ? `GH₵ ${note.price}` : '';

              return (
                <button
                  key={note.id}
                  type="button"
                  onClick={() => setActiveNoteIndex(idx)}
                  className={`group relative flex shrink-0 items-center gap-2 rounded-2xl px-3.5 py-2 text-left transition-all ${
                    isActive
                      ? 'bg-white shadow-sm ring-1 ring-zinc-300 dark:bg-[#1c1c1e] dark:ring-zinc-700'
                      : 'bg-transparent text-zinc-600 hover:bg-zinc-200/50 dark:text-zinc-400 dark:hover:bg-zinc-800/50'
                  }`}
                >
                  {/* Thumbnail indicator */}
                  <div className="relative flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
                    {note.imagePreviews[0] ? (
                      <img
                        src={note.imagePreviews[0]}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : note.videoPreview ? (
                      <Video className="h-3.5 w-3.5 text-zinc-400" />
                    ) : (
                      <span className="text-xs font-semibold text-zinc-400">{idx + 1}</span>
                    )}

                    {/* Status Dot */}
                    <span
                      className={`absolute bottom-0 right-0 h-2 w-2 rounded-full border border-white dark:border-zinc-900 ${
                        check.isValid ? 'bg-emerald-500' : 'bg-amber-400'
                      }`}
                    />
                  </div>

                  <div className="min-w-0 pr-1">
                    <p
                      className={`max-w-[110px] truncate text-xs font-semibold sm:max-w-[140px] ${
                        isActive
                          ? 'text-zinc-900 dark:text-zinc-100'
                          : 'text-zinc-600 dark:text-zinc-400'
                      }`}
                    >
                      {displayTitle}
                    </p>
                    <p className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500">
                      {displayPrice || 'No price'}
                    </p>
                  </div>

                  {notes.length > 1 && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        removeNote(idx);
                      }}
                      className="ml-1 flex h-5 w-5 items-center justify-center rounded-full text-zinc-400 opacity-60 transition-opacity hover:bg-zinc-200 hover:text-zinc-700 group-hover:opacity-100 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
                    >
                      <X className="h-3 w-3" />
                    </span>
                  )}
                </button>
              );
            })}

            <button
              type="button"
              onClick={addNewNote}
              className="flex shrink-0 items-center gap-1.5 rounded-2xl border border-dashed border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-500 transition-colors hover:border-zinc-400 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-zinc-200"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add</span>
            </button>
          </div>
        </div>
      </header>

      {/* ─── Main Content Canvas (Apple Notes Layout) ────────────────────── */}
      <main className="mx-auto max-w-4xl px-4 pt-6 sm:px-6">
        <div className="relative rounded-3xl border border-zinc-200/80 bg-white p-5 shadow-sm transition-all sm:p-8 dark:border-zinc-800 dark:bg-[#1c1c1e]">
          {/* Note Card Header / Card Index Tool */}
          <div className="mb-4 flex items-center justify-between border-b border-zinc-100 pb-3 text-xs text-zinc-400 dark:border-zinc-800/80">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-amber-600 dark:text-amber-400">
                PRODUCT {activeNoteIndex + 1} OF {notes.length}
              </span>
              <span className="text-zinc-300 dark:text-zinc-700">•</span>
              <span className="text-zinc-500">
                {checkNoteValidation(activeNote).isValid ? (
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Ready to publish
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-amber-500">
                    <AlertCircle className="h-3.5 w-3.5" /> Requires{' '}
                    {checkNoteValidation(activeNote).missingFields.join(', ')}
                  </span>
                )}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={duplicateActiveNote}
                title="Duplicate this item"
                className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
              {notes.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeNote(activeNoteIndex)}
                  title="Delete this note"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* ─── REQUIRED FIELD 1: Product Name (Big & Bold Text) ──────────── */}
          <div className="mb-3">
            <input
              type="text"
              value={activeNote.title}
              onChange={(e) => updateActiveNote({ title: e.target.value })}
              placeholder="Name of item..."
              className="w-full border-none bg-transparent p-0 text-2xl font-bold tracking-tight text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:ring-0 sm:text-3xl dark:text-zinc-50 dark:placeholder:text-zinc-600"
              autoFocus={activeNoteIndex === 0}
            />
          </div>

          {/* ─── REQUIRED FIELD 2: Price (Inline with Currency & Discount) ─── */}
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-2xl bg-zinc-100/80 px-3 py-1.5 dark:bg-zinc-800/70">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                GH₵
              </span>
              <input
                type="number"
                min="0"
                step="any"
                inputMode="decimal"
                value={activeNote.price}
                onChange={(e) => updateActiveNote({ price: e.target.value })}
                placeholder="0.00"
                className="w-28 border-none bg-transparent p-0 text-xl font-bold tracking-tight text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-0 sm:w-36 sm:text-2xl dark:text-zinc-100 dark:placeholder:text-zinc-600"
              />
            </div>

            {/* Optional Original / Slashed price */}
            {activeNote.showDiscount ? (
              <div className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-3 py-1.5 dark:border-zinc-700 dark:bg-zinc-800">
                <span className="text-xs text-zinc-400 line-through">GH₵</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  inputMode="decimal"
                  value={activeNote.original_price}
                  onChange={(e) => updateActiveNote({ original_price: e.target.value })}
                  placeholder="Original price"
                  className="w-24 border-none bg-transparent p-0 text-sm font-semibold text-zinc-500 focus:outline-none focus:ring-0 dark:text-zinc-400"
                />
                <button
                  type="button"
                  onClick={() => updateActiveNote({ original_price: '', showDiscount: false })}
                  className="text-zinc-400 hover:text-zinc-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => updateActiveNote({ showDiscount: true })}
                className="inline-flex items-center gap-1 rounded-full border border-zinc-200/80 px-2.5 py-1 text-xs font-medium text-zinc-500 transition-colors hover:border-zinc-300 hover:text-zinc-800 dark:border-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
              >
                <Percent className="h-3 w-3 text-amber-500" />
                <span>+ Original price</span>
              </button>
            )}

            {/* Live Discount pill if original price is valid */}
            {activeNote.original_price &&
              Number(activeNote.original_price) > Number(activeNote.price) && (
                <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
                  {Math.round(
                    ((Number(activeNote.original_price) - Number(activeNote.price)) /
                      Number(activeNote.original_price)) *
                      100,
                  )}
                  % OFF
                </span>
              )}
          </div>

          {/* ─── Description Section (Flows seamless like Apple Notes body) ── */}
          <div className="mb-6">
            <textarea
              rows={3}
              value={activeNote.description}
              onChange={(e) => updateActiveNote({ description: e.target.value })}
              placeholder="Describe condition, features, sizing, or pickup details..."
              className="w-full resize-none border-none bg-transparent p-0 text-base leading-relaxed text-zinc-700 placeholder:text-zinc-400/60 focus:outline-none focus:ring-0 sm:text-lg dark:text-zinc-300 dark:placeholder:text-zinc-600"
            />
          </div>

          {/* ─── REQUIRED FIELD 3: Images & Video (Attachment Gallery) ─────── */}
          <div className="mb-6 rounded-2xl bg-zinc-50/70 p-4 dark:bg-zinc-900/50">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Photos & Video
                </span>
                <span className="text-[11px] text-zinc-400">(Up to 3 photos + 1 short video)</span>
              </div>
              <span className="text-xs font-semibold text-zinc-400">
                {activeNote.images.length}/3 photos
              </span>
            </div>

            {/* Attached Thumbnails Ribbon */}
            <div className="flex flex-wrap items-center gap-3">
              {activeNote.imagePreviews.map((preview, imgIdx) => (
                <div
                  key={imgIdx}
                  className="group relative h-24 w-24 overflow-hidden rounded-2xl border border-zinc-200/80 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800"
                >
                  <img
                    src={preview}
                    alt={`Product attachment ${imgIdx + 1}`}
                    className="h-full w-full object-cover"
                  />
                  {imgIdx === 0 && (
                    <span className="absolute bottom-1.5 left-1.5 rounded-md bg-zinc-900/80 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white backdrop-blur-sm">
                      Cover
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeImageFromActive(imgIdx)}
                    className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900/80 text-white opacity-90 transition-all hover:scale-110 hover:bg-rose-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}

              {/* Video Thumbnail if present */}
              {activeNote.videoPreview && (
                <div className="group relative h-24 w-24 overflow-hidden rounded-2xl border border-purple-200 bg-purple-50 dark:border-purple-900 dark:bg-purple-950/40">
                  <video
                    src={activeNote.videoPreview}
                    className="h-full w-full object-cover"
                    muted
                    loop
                  />
                  <span className="absolute bottom-1.5 left-1.5 rounded-md bg-purple-900/80 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white backdrop-blur-sm">
                    Video
                  </span>
                  <button
                    type="button"
                    onClick={removeVideoFromActive}
                    className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900/80 text-white opacity-90 transition-all hover:scale-110 hover:bg-rose-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}

              {/* Add Media Buttons */}
              {activeNote.images.length < 3 && (
                <>
                  {/* Photo picker */}
                  <button
                    type="button"
                    onClick={() => activeImageInputRef.current?.click()}
                    className="flex h-24 w-24 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-200 bg-white text-zinc-500 transition-all hover:border-amber-500 hover:text-amber-600 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-amber-400 dark:hover:text-amber-400"
                  >
                    <ImagePlus className="h-5 w-5" />
                    <span className="mt-1 text-[11px] font-semibold">Add Photo</span>
                  </button>

                  {/* Camera on mobile */}
                  <button
                    type="button"
                    onClick={() => activeCameraInputRef.current?.click()}
                    className="flex h-24 w-24 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-200 bg-white text-zinc-500 transition-all hover:border-zinc-400 hover:text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700 dark:hover:text-zinc-300"
                  >
                    <Camera className="h-5 w-5" />
                    <span className="mt-1 text-[11px] font-semibold">Take Photo</span>
                  </button>
                </>
              )}

              {/* Video button if none uploaded */}
              {!activeNote.video && (
                <button
                  type="button"
                  onClick={() => activeVideoInputRef.current?.click()}
                  className="flex h-24 w-24 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-200 bg-white text-zinc-500 transition-all hover:border-purple-400 hover:text-purple-600 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-purple-500 dark:hover:text-purple-400"
                >
                  <Video className="h-5 w-5" />
                  <span className="mt-1 text-[11px] font-semibold">+ 5s Video</span>
                </button>
              )}
            </div>

            {/* Hidden native inputs */}
            <input
              ref={activeImageInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleAddImagesToActive(e.target.files)}
            />
            <input
              ref={activeCameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => handleAddImagesToActive(e.target.files)}
            />
            <input
              ref={activeVideoInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => handleAddVideoToActive(e.target.files)}
            />
          </div>

          {/* ─── ON-DEMAND OPTIONAL FIELDS TOOLBAR ──────────────────────────── */}
          <div className="border-t border-zinc-100 pt-4 dark:border-zinc-800/80">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                Optional Details (Tap to add)
              </span>
            </div>

            {/* Pill chips toolbar */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Category Pill */}
              <button
                type="button"
                onClick={() =>
                  updateActiveNote((prev) => ({ ...prev, showCategory: !prev.showCategory }))
                }
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                  activeNote.showCategory || activeNote.category !== 'General'
                    ? 'bg-amber-500/15 text-amber-700 ring-1 ring-amber-500/30 dark:bg-amber-400/15 dark:text-amber-300 dark:ring-amber-400/30'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200/70 dark:bg-zinc-800 dark:text-zinc-300'
                }`}
              >
                <Layers className="h-3 w-3" />
                <span>Category: {activeNote.category || 'General'}</span>
              </button>

              {/* Condition Pill */}
              <button
                type="button"
                onClick={() =>
                  updateActiveNote((prev) => ({ ...prev, showCondition: !prev.showCondition }))
                }
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                  activeNote.showCondition || activeNote.condition !== 'new'
                    ? 'bg-blue-500/15 text-blue-700 ring-1 ring-blue-500/30 dark:bg-blue-400/15 dark:text-blue-300 dark:ring-blue-400/30'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200/70 dark:bg-zinc-800 dark:text-zinc-300'
                }`}
              >
                <Package className="h-3 w-3" />
                <span className="capitalize">{activeNote.condition}</span>
              </button>

              {/* Stock Quantity Pill */}
              <button
                type="button"
                onClick={() =>
                  updateActiveNote((prev) => ({ ...prev, showStock: !prev.showStock }))
                }
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                  activeNote.showStock || Number(activeNote.quantity_available) > 1
                    ? 'bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-500/30 dark:bg-emerald-400/15 dark:text-emerald-300 dark:ring-emerald-400/30'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200/70 dark:bg-zinc-800 dark:text-zinc-300'
                }`}
              >
                <span>Stock: {activeNote.quantity_available || '1'}</span>
              </button>

              {/* Brand Pill */}
              <button
                type="button"
                onClick={() =>
                  updateActiveNote((prev) => ({ ...prev, showBrand: !prev.showBrand }))
                }
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                  activeNote.showBrand || Boolean(activeNote.brand)
                    ? 'bg-purple-500/15 text-purple-700 ring-1 ring-purple-500/30 dark:bg-purple-400/15 dark:text-purple-300 dark:ring-purple-400/30'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200/70 dark:bg-zinc-800 dark:text-zinc-300'
                }`}
              >
                <span>Brand {activeNote.brand ? `: ${activeNote.brand}` : ''}</span>
              </button>

              {/* Tags Pill */}
              <button
                type="button"
                onClick={() => updateActiveNote((prev) => ({ ...prev, showTags: !prev.showTags }))}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                  activeNote.showTags || activeNote.tags.length > 0
                    ? 'bg-zinc-800 text-zinc-100 dark:bg-zinc-200 dark:text-zinc-900'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200/70 dark:bg-zinc-800 dark:text-zinc-300'
                }`}
              >
                <Tag className="h-3 w-3" />
                <span>Tags {activeNote.tags.length > 0 ? `(${activeNote.tags.length})` : ''}</span>
              </button>

              {/* Hot Sales Boost Pill */}
              <button
                type="button"
                onClick={() =>
                  updateActiveNote((prev) => ({ ...prev, is_featured: !prev.is_featured }))
                }
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                  activeNote.is_featured
                    ? 'bg-rose-500 text-white shadow-sm'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200/70 dark:bg-zinc-800 dark:text-zinc-300'
                }`}
              >
                <Flame
                  className={`h-3 w-3 ${activeNote.is_featured ? 'text-white' : 'text-rose-500'}`}
                />
                <span>{activeNote.is_featured ? 'Boosted' : '+ Hot Sales Boost'}</span>
              </button>
            </div>

            {/* ─── ON-DEMAND EXPANDABLE SECTIONS ───────────────────────────── */}
            <div className="mt-4 space-y-3">
              {/* Category Selector */}
              {activeNote.showCategory && (
                <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                      Select Category
                    </span>
                    <button
                      type="button"
                      onClick={() => updateActiveNote({ showCategory: false })}
                      className="text-xs text-zinc-400 hover:text-zinc-600"
                    >
                      Done
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() =>
                          updateActiveNote({
                            category: cat.name,
                            brand: '',
                          })
                        }
                        className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                          activeNote.category === cat.name
                            ? 'bg-amber-500 text-white shadow-sm'
                            : 'bg-white text-zinc-700 hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-300'
                        }`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Condition Selector */}
              {activeNote.showCondition && (
                <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                      Item Condition
                    </span>
                    <button
                      type="button"
                      onClick={() => updateActiveNote({ showCondition: false })}
                      className="text-xs text-zinc-400 hover:text-zinc-600"
                    >
                      Done
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {CONDITIONS.map((cond) => (
                      <button
                        key={cond.value}
                        type="button"
                        onClick={() => updateActiveNote({ condition: cond.value })}
                        className={`rounded-xl p-3 text-left transition-all ${
                          activeNote.condition === cond.value
                            ? 'bg-white shadow-sm ring-2 ring-blue-500 dark:bg-zinc-800'
                            : 'bg-white/60 hover:bg-white dark:bg-zinc-800/40 dark:hover:bg-zinc-800'
                        }`}
                      >
                        <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                          {cond.label}
                        </p>
                        <p className="mt-0.5 text-[11px] text-zinc-500">{cond.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Stock Selector */}
              {activeNote.showStock && (
                <div className="flex items-center gap-4 rounded-2xl border border-zinc-200/80 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                      Units Available in Stock
                    </span>
                    <p className="text-[11px] text-zinc-400">
                      Total inventory available for checkout
                    </p>
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const current = parseInt(activeNote.quantity_available || '1', 10);
                        if (current > 1) {
                          updateActiveNote({ quantity_available: String(current - 1) });
                        }
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-xl border border-zinc-200 bg-white font-bold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={activeNote.quantity_available}
                      onChange={(e) => updateActiveNote({ quantity_available: e.target.value })}
                      className="w-16 rounded-xl border border-zinc-200 bg-white py-1 text-center text-sm font-bold text-zinc-900 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const current = parseInt(activeNote.quantity_available || '1', 10);
                        updateActiveNote({ quantity_available: String(current + 1) });
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-xl border border-zinc-200 bg-white font-bold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}

              {/* Brand Selector */}
              {activeNote.showBrand && (
                <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                      Brand / Manufacturer
                    </span>
                    <button
                      type="button"
                      onClick={() => updateActiveNote({ showBrand: false })}
                      className="text-xs text-zinc-400 hover:text-zinc-600"
                    >
                      Done
                    </button>
                  </div>
                  <div className="mb-3">
                    <input
                      type="text"
                      value={activeNote.brand}
                      onChange={(e) => updateActiveNote({ brand: e.target.value })}
                      placeholder="e.g. Apple, Nike, Samsung, Zara..."
                      className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-purple-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                  </div>
                  {brandsMap[activeNote.category] && brandsMap[activeNote.category].length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {brandsMap[activeNote.category].map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => updateActiveNote({ brand: b.name })}
                          className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors ${
                            activeNote.brand === b.name
                              ? 'bg-purple-600 text-white'
                              : 'bg-white text-zinc-600 hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-300'
                          }`}
                        >
                          {b.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tags Input */}
              {activeNote.showTags && (
                <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                      Search Tags & Keywords
                    </span>
                    <button
                      type="button"
                      onClick={() => updateActiveNote({ showTags: false })}
                      className="text-xs text-zinc-400 hover:text-zinc-600"
                    >
                      Done
                    </button>
                  </div>
                  <div className="mb-2 flex gap-2">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const val = tagInput.trim();
                          if (val && !activeNote.tags.includes(val)) {
                            updateActiveNote({ tags: [...activeNote.tags, val] });
                            setTagInput('');
                          }
                        }
                      }}
                      placeholder="Add tag and press Enter..."
                      className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const val = tagInput.trim();
                        if (val && !activeNote.tags.includes(val)) {
                          updateActiveNote({ tags: [...activeNote.tags, val] });
                          setTagInput('');
                        }
                      }}
                      className="rounded-xl bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {activeNote.tags.map((t, tIdx) => (
                      <span
                        key={tIdx}
                        className="inline-flex items-center gap-1 rounded-full bg-zinc-200/80 px-2.5 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200"
                      >
                        #{t}
                        <button
                          type="button"
                          onClick={() =>
                            updateActiveNote({
                              tags: activeNote.tags.filter((_, idx) => idx !== tIdx),
                            })
                          }
                          className="hover:text-rose-500"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ─── Navigation Buttons below card (Next / Previous item) ─────── */}
        <div className="mt-4 flex items-center justify-between px-1">
          <button
            type="button"
            disabled={activeNoteIndex === 0}
            onClick={() => setActiveNoteIndex((i) => Math.max(0, i - 1))}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-900 disabled:opacity-30 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Previous Product
          </button>

          <span className="text-xs text-zinc-400">
            {activeNoteIndex + 1} of {notes.length}
          </span>

          {activeNoteIndex < notes.length - 1 ? (
            <button
              type="button"
              onClick={() => setActiveNoteIndex((i) => Math.min(notes.length - 1, i + 1))}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-800 hover:text-zinc-900 dark:text-zinc-200 dark:hover:text-white"
            >
              Next Product
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={addNewNote}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 hover:text-amber-700 dark:text-amber-400"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Another Product
            </button>
          )}
        </div>
      </main>

      {/* ─── Mobile-First Fixed Bottom Action Bar ──────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-200/80 bg-white/90 p-3 backdrop-blur-xl sm:p-4 dark:border-zinc-800 dark:bg-[#121214]/90">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
          {/* Summary info */}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-zinc-900 sm:text-sm dark:text-zinc-100">
                {notes.length} {notes.length === 1 ? 'Product' : 'Products'}
              </span>
              <span className="text-zinc-300 dark:text-zinc-700">•</span>
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                {validationSummary.validCount}/{notes.length} Ready
              </span>
            </div>
            <p className="truncate text-[11px] text-zinc-500 dark:text-zinc-400">
              {totalBatchValue > 0
                ? `Total batch value: GH₵ ${totalBatchValue.toLocaleString()}`
                : 'Fill required: Name, Price, Photos'}
            </p>
          </div>

          {/* Action CTAs */}
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={addNewNote}
              className="hidden items-center gap-1.5 rounded-2xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 sm:inline-flex dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
            >
              <Plus className="h-4 w-4" />
              <span>Add Another</span>
            </button>

            <button
              type="button"
              onClick={handleStartPublishing}
              disabled={
                publishProgress.currentStep !== 'idle' &&
                publishProgress.currentStep !== 'completed'
              }
              className="inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-5 py-3 text-xs font-bold text-white shadow-md transition-all hover:bg-zinc-800 active:scale-95 disabled:opacity-50 sm:text-sm dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
            >
              <UploadCloud className="h-4 w-4 text-amber-400" />
              <span>
                Publish {notes.length} {notes.length === 1 ? 'Product' : 'Products'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── Bulk Photo Import Dialog ──────────────────────────────────────── */}
      <AnimatePresence>
        {bulkImportOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              onClick={() => setBulkImportOpen(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-[#1c1c1e]"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
                  <ImagePlus className="h-5 w-5" />
                </div>
                <button
                  type="button"
                  onClick={() => setBulkImportOpen(false)}
                  className="rounded-full p-1 text-zinc-400 hover:text-zinc-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <h2 className="mt-4 text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Bulk Add Photos for Multiple Products
              </h2>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Select photos from your gallery. We will automatically create product drafts for
                you, ready to fill in the item name and price.
              </p>

              <div className="mt-6 flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => bulkFileInputRef.current?.click()}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-zinc-900 py-3 text-xs font-bold text-white shadow-sm hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
                >
                  <ImagePlus className="h-4 w-4" />
                  Select Photos from Device
                </button>
                <input
                  ref={bulkFileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleBulkPhotosSelected(e.target.files)}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── Publishing Process Modal (No Toy UI, Indicate Process) ────────── */}
      <AnimatePresence>
        {publishProgress.currentStep !== 'idle' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-[#1a1a1c]"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
                    {publishProgress.currentStep === 'completed' ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    ) : (
                      <UploadCloud className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                      {publishProgress.currentStep === 'completed'
                        ? 'Publishing Completed'
                        : `Publishing ${publishProgress.total} Products...`}
                    </h3>
                    <p className="text-xs text-zinc-500">
                      {publishProgress.currentStep === 'completed'
                        ? 'All items have been processed and synced with your store.'
                        : 'Compressing media and creating store catalog listings.'}
                    </p>
                  </div>
                </div>

                {publishProgress.currentStep === 'completed' && (
                  <button
                    type="button"
                    onClick={() => {
                      setPublishProgress({
                        total: 0,
                        currentStep: 'idle',
                        currentProductIndex: 0,
                        itemStatuses: [],
                        overallPercent: 0,
                      });
                      router.push('/dashboard/products');
                    }}
                    className="rounded-full p-1 text-zinc-400 hover:text-zinc-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Overall Progress Bar */}
              <div className="my-3">
                <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-zinc-500">
                  <span>Batch Process</span>
                  <span>{publishProgress.overallPercent}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-600 transition-all duration-300"
                    style={{ width: `${publishProgress.overallPercent}%` }}
                  />
                </div>
              </div>

              {/* Items checklist */}
              <div className="no-scrollbar my-4 max-h-60 space-y-2 overflow-y-auto pr-1">
                {publishProgress.itemStatuses.map((item, idx) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-1 rounded-2xl border border-zinc-100 bg-zinc-50/70 p-3 text-xs dark:border-zinc-800/80 dark:bg-zinc-900/40"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex min-w-0 items-center gap-2.5 pr-2">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-[10px] font-bold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                          {idx + 1}
                        </span>
                        <span className="truncate font-semibold text-zinc-900 dark:text-zinc-100">
                          {item.title}
                        </span>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        {item.status === 'success' && (
                          <>
                            <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                              <Check className="h-3.5 w-3.5" /> Published
                            </span>
                            {item.productId && (
                              <Link
                                href={`/dashboard/products/${item.productId}`}
                                target="_blank"
                                className="inline-flex items-center gap-0.5 text-[11px] font-medium text-amber-600 hover:underline dark:text-amber-400"
                              >
                                View <ExternalLink className="h-3 w-3" />
                              </Link>
                            )}
                          </>
                        )}
                        {item.status === 'uploading' && (
                          <span className="inline-flex items-center gap-1.5 font-semibold text-amber-500">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading...
                          </span>
                        )}
                        {item.status === 'pending' && <span className="text-zinc-400">Queued</span>}
                        {item.status === 'error' && (
                          <span className="inline-flex items-center gap-1 font-semibold text-rose-500">
                            <AlertCircle className="h-3.5 w-3.5" /> Failed
                          </span>
                        )}
                      </div>
                    </div>

                    {item.status === 'error' && item.error && (
                      <p className="pl-7 text-[11px] font-medium text-rose-500/90">{item.error}</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Completion CTA */}
              {publishProgress.currentStep === 'completed' && (
                <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-end">
                  {publishProgress.itemStatuses.some((st) => st.status === 'error') && (
                    <button
                      type="button"
                      onClick={handleRetryFailed}
                      className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-amber-600 active:scale-95"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Retry Failed Items
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setPublishProgress({
                        total: 0,
                        currentStep: 'idle',
                        currentProductIndex: 0,
                        itemStatuses: [],
                        overallPercent: 0,
                      });
                      setNotes([createBlankProductNote(categories[0]?.name || 'General')]);
                      setActiveNoteIndex(0);
                    }}
                    className="rounded-2xl border border-zinc-200 px-4 py-2.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    Add More Products
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push('/dashboard/products')}
                    className="rounded-2xl bg-zinc-900 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
                  >
                    Go to Products Dashboard →
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
