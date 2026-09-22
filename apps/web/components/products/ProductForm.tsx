'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera,
  ShoppingBag,
  DollarSign,
  Layers,
  Tag,
  FileText,
  Plus,
  X,
  Video,
  Loader2,
  ChevronDown,
  Eye,
  EyeOff,
  Flame,
  Package,
  Percent,
  Sparkles,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Select, { SelectOption } from '@/components/ui/Select';
import Alert from '@/components/ui/Alert';
import imageCompression from 'browser-image-compression';
import { productApi } from '@/lib/api/product';
import VariantEditor from '@/components/dashboard/VariantEditor';
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
  fields: CategoryField[];
}

export interface ProductFormData {
  title: string;
  description: string;
  price: string;
  original_price: string;
  currency: string;
  condition: 'new' | 'used' | 'refurbished';
  quantity_available: string;
  status: 'draft' | 'active';
  category: string;
  brand: string;
  tags: string[];
  attributes: Record<string, string>;
  is_featured: boolean;
}

export interface ProductFormProps {
  initialData?: Partial<ProductFormData>;
  isEdit?: boolean;
  productId?: string;
  existingImages?: string[];
  existingVideo?: string | null;
  onSubmit: (payload: {
    data: ProductFormData;
    images: File[];
    video: File | null;
    existingImages: string[];
  }) => Promise<void>;
  isLoading?: boolean;
  onCancel?: () => void;
}

const DISCOUNT_PRESETS = [5, 10, 15, 20, 25, 50];

const getInitialPricing = (data?: Partial<ProductFormData>) => {
  if (!data) return { basePrice: '', discountPercent: '' };
  const orig =
    data.original_price != null && data.original_price !== '' ? Number(data.original_price) : NaN;
  const cur = data.price != null && data.price !== '' ? Number(data.price) : NaN;

  if (Number.isFinite(orig) && Number.isFinite(cur) && orig > cur && orig > 0) {
    const pct = Math.round(((orig - cur) / orig) * 100);
    return {
      basePrice: String(orig),
      discountPercent: pct > 0 ? String(pct) : '',
    };
  }

  return {
    basePrice: data.price != null ? String(data.price) : '',
    discountPercent: '',
  };
};

export default function ProductForm({
  initialData,
  isEdit = false,
  productId,
  existingImages: initialExistingImages = [],
  existingVideo: initialExistingVideo = null,
  onSubmit,
  isLoading = false,
  onCancel,
}: ProductFormProps) {
  const initialPricing = getInitialPricing(initialData);
  const [basePrice, setBasePrice] = useState<string>(initialPricing.basePrice);
  const [discountPercent, setDiscountPercent] = useState<string>(initialPricing.discountPercent);

  const [formData, setFormData] = useState<ProductFormData>({
    title: initialData?.title || '',
    description: initialData?.description || '',
    price: initialData?.price != null ? String(initialData.price) : '',
    original_price: initialData?.original_price != null ? String(initialData.original_price) : '',
    currency: initialData?.currency || 'GHS',
    condition: (initialData?.condition as any) || 'new',
    quantity_available:
      initialData?.quantity_available != null ? String(initialData.quantity_available) : '1',
    status: (initialData?.status as any) === 'draft' ? 'draft' : 'active',
    category: initialData?.category || '',
    brand: initialData?.brand || '',
    tags: initialData?.tags || [],
    attributes: initialData?.attributes || {},
    is_featured: Boolean(initialData?.is_featured),
  });

  const [tagInput, setTagInput] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>(initialExistingImages);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [video, setVideo] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [existingVideo, setExistingVideo] = useState<string | null>(initialExistingVideo);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryBrands, setCategoryBrands] = useState<{ id: string; name: string }[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);

  // Sync existing images/video/formData if initial data changes
  useEffect(() => {
    if (initialData) {
      const pricing = getInitialPricing(initialData);
      setBasePrice(pricing.basePrice);
      setDiscountPercent(pricing.discountPercent);

      setFormData((prev) => ({
        ...prev,
        title: initialData.title ?? prev.title,
        description: initialData.description ?? prev.description,
        price: initialData.price != null ? String(initialData.price) : prev.price,
        original_price:
          initialData.original_price != null
            ? String(initialData.original_price)
            : prev.original_price,
        currency: initialData.currency || prev.currency,
        condition: (initialData.condition as any) || prev.condition,
        quantity_available:
          initialData.quantity_available != null
            ? String(initialData.quantity_available)
            : prev.quantity_available,
        status: (initialData.status as any) === 'draft' ? 'draft' : 'active',
        category: initialData.category ?? prev.category,
        brand: initialData.brand ?? prev.brand,
        tags: initialData.tags ?? prev.tags,
        attributes: initialData.attributes ?? prev.attributes,
        is_featured:
          initialData.is_featured != null ? Boolean(initialData.is_featured) : prev.is_featured,
      }));
    }
    if (initialExistingImages.length > 0) {
      setExistingImages(initialExistingImages);
    }
    if (initialExistingVideo) {
      setExistingVideo(initialExistingVideo);
    }
  }, [initialData, initialExistingImages, initialExistingVideo]);

  // Load categories
  useEffect(() => {
    productApi
      .getCategories()
      .then((cats) => {
        setCategories(cats);
        if (!isEdit && !formData.category && cats.length > 0) {
          const first = cats[0];
          setFormData((prev) => ({
            ...prev,
            category: first.name,
            attributes: (first.fields || []).reduce((acc, f) => {
              const key = f.key || f.name;
              return key ? { ...acc, [key]: f.defaultValue ?? '' } : acc;
            }, {}),
          }));
        }
      })
      .catch(() => toast.error('Failed to load categories'));
  }, [isEdit]);

  // Load brands whenever category changes
  useEffect(() => {
    if (!formData.category) {
      setCategoryBrands([]);
      return;
    }
    const cat = categories.find((c) => c.name === formData.category);
    productApi
      .getBrands(formData.category, cat?.id)
      .then(setCategoryBrands)
      .catch(() => setCategoryBrands([]));
  }, [formData.category, categories]);

  const categoryOptions: SelectOption[] = useMemo(
    () => categories.map((c) => ({ value: c.name, label: c.name })),
    [categories],
  );

  const brandOptions: SelectOption[] = useMemo(
    () => categoryBrands.map((b) => ({ value: b.name, label: b.name })),
    [categoryBrands],
  );

  // Handle category change
  const handleCategoryChange = useCallback(
    (catName: string) => {
      const cat = categories.find((c) => c.name === catName);
      const newAttributes = (cat?.fields || []).reduce(
        (acc: Record<string, string>, field: CategoryField) => {
          const key = field.key || field.name;
          return key ? { ...acc, [key]: field.defaultValue ?? '' } : acc;
        },
        {},
      );
      setFormData((prev) => ({
        ...prev,
        category: catName,
        brand: '',
        attributes: newAttributes,
      }));
    },
    [categories],
  );

  // Dynamic attribute update
  const handleAttributeChange = useCallback((name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      attributes: { ...prev.attributes, [name]: value },
    }));
  }, []);

  // Image processing & compression
  const totalImagesCount = existingImages.length + images.length;

  const handleImageFiles = useCallback(
    async (files: File[]) => {
      if (files.length + totalImagesCount > 3) {
        toast.error('Maximum 3 photos allowed.');
        return;
      }

      setIsCompressing(true);
      const compressedFiles: File[] = [];
      const newPreviews: string[] = [];

      for (const file of files) {
        try {
          let src = file;
          const lower = file.name.toLowerCase();
          if (
            lower.endsWith('.heic') ||
            lower.endsWith('.heif') ||
            file.type === 'image/heic' ||
            file.type === 'image/heif'
          ) {
            const heic2any = (await import('heic2any')).default;
            const blob = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.8 });
            const finalBlob = Array.isArray(blob) ? blob[0] : blob;
            src = new File([finalBlob], file.name.replace(/\.(heic|heif)$/i, '.jpg'), {
              type: 'image/jpeg',
            });
          }

          const compressed = await imageCompression(src, {
            maxSizeMB: 1,
            maxWidthOrHeight: 1920,
            useWebWorker: true,
            fileType: 'image/webp',
          });

          const webpFile = new File([compressed], compressed.name.replace(/\.[^/.]+$/, '.webp'), {
            type: 'image/webp',
          });

          compressedFiles.push(webpFile);

          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(webpFile);
          });
          newPreviews.push(base64);
        } catch {
          toast.error('Failed to process one or more images.');
        }
      }

      if (compressedFiles.length > 0) {
        setImages((prev) => [...prev, ...compressedFiles]);
        setPreviews((prev) => [...prev, ...newPreviews]);
        toast.success(`${compressedFiles.length} photo(s) optimised for web`);
      }
      setIsCompressing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [totalImagesCount],
  );

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
    if (files.length > 0) handleImageFiles(files);
  };

  const removeExistingImage = (url: string) => {
    setExistingImages((prev) => prev.filter((u) => u !== url));
  };

  const removeNewImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
    setPreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  // Video processing
  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      toast.error('Please select a valid video file.');
      return;
    }
    if (file.size > 60 * 1024 * 1024) {
      toast.error('Video must be under 60 MB.');
      e.target.value = '';
      return;
    }

    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideo(file);
    setVideoPreview(URL.createObjectURL(file));
    setExistingVideo(null);
  };

  const removeVideo = () => {
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideo(null);
    setVideoPreview(null);
    setExistingVideo(null);
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  // Tags management
  const addTag = () => {
    const raw = tagInput.trim().replace(/\s+/g, ' ');
    if (!raw) return;
    if (formData.tags.length >= 20) {
      toast.info('Maximum 20 tags allowed.');
      return;
    }
    if (formData.tags.some((t) => t.toLowerCase() === raw.toLowerCase())) {
      toast.info('Tag already added.');
      return;
    }
    setFormData((prev) => ({ ...prev, tags: [...prev.tags, raw] }));
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    setFormData((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }));
  };

  // Auto-calculate selling price and discount savings
  const { calculatedSellingPrice, savingsAmount, hasValidDiscount } = useMemo(() => {
    const base = parseFloat(basePrice);
    const discount = parseFloat(discountPercent);

    if (!Number.isFinite(base) || base <= 0) {
      return { calculatedSellingPrice: '0.00', savingsAmount: '0.00', hasValidDiscount: false };
    }

    if (Number.isFinite(discount) && discount > 0 && discount < 100) {
      const discounted = base * (1 - discount / 100);
      const savings = base - discounted;
      return {
        calculatedSellingPrice: (Math.round(discounted * 100) / 100).toFixed(2),
        savingsAmount: (Math.round(savings * 100) / 100).toFixed(2),
        hasValidDiscount: true,
      };
    }

    return {
      calculatedSellingPrice: (Math.round(base * 100) / 100).toFixed(2),
      savingsAmount: '0.00',
      hasValidDiscount: false,
    };
  }, [basePrice, discountPercent]);

  // Selected category schema
  const selectedCategory = useMemo(
    () => categories.find((c) => c.name === formData.category),
    [categories, formData.category],
  );

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || isCompressing) return;

    // 1. Required: Product Images
    if (existingImages.length === 0 && images.length === 0) {
      toast.error('Please upload at least one product photo.');
      return;
    }

    // 2. Required: Product Name
    if (!formData.title.trim()) {
      toast.error('Please enter a product name.');
      return;
    }

    // 3. Required: Price
    const baseNum = parseFloat(basePrice);
    if (!Number.isFinite(baseNum) || baseNum <= 0) {
      toast.error('Please enter a valid price greater than 0.');
      return;
    }

    // Validate discount percentage if entered
    if (discountPercent.trim()) {
      const disc = parseFloat(discountPercent);
      if (isNaN(disc) || disc < 0 || disc >= 100) {
        toast.error('Discount percentage must be between 0% and 99.99%.');
        return;
      }
    }

    // Quantity (optional, default 1)
    let qtyNum = 1;
    if (formData.quantity_available && formData.quantity_available.trim()) {
      const parsedQty = parseInt(formData.quantity_available, 10);
      if (isNaN(parsedQty) || parsedQty < 0) {
        toast.error('Quantity cannot be negative.');
        return;
      }
      qtyNum = parsedQty;
    }

    const finalSellingPrice = hasValidDiscount ? calculatedSellingPrice : baseNum.toFixed(2);
    const finalOriginalPrice = hasValidDiscount ? baseNum.toFixed(2) : '';

    const payloadData: ProductFormData = {
      ...formData,
      title: formData.title.trim(),
      description: formData.description.trim(),
      price: finalSellingPrice,
      original_price: finalOriginalPrice,
      quantity_available: String(qtyNum),
      category: formData.category || categories[0]?.name || 'General',
      status: formData.status || 'active',
    };

    await onSubmit({
      data: payloadData,
      images,
      video,
      existingImages,
    });
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {isCompressing && (
        <Alert
          variant="info"
          title="Optimizing Media"
          message="Compressing images in the background for fast customer browsing..."
        />
      )}

      {/* ────────────────── 1. Product Media ────────────────── */}
      <Card
        className="space-y-6 rounded-2xl border border-[var(--color-border)] p-6 md:p-8"
        hoverEffect={false}
      >
        <div className="border-[var(--color-border)]/60 flex items-center gap-3 border-b pb-4">
          <div className="bg-[var(--color-accent)]/10 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl">
            <Camera className="h-4 w-4 text-[var(--color-accent)]" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-[var(--color-foreground)]">Product Media</h3>
            <p className="text-[11px] text-[var(--color-muted)]">
              Up to 3 high-res photos · 1 optional video
            </p>
          </div>
        </div>

        {/* Photos grid */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <label className="text-[11px] font-medium uppercase tracking-wider text-[var(--color-muted)]">
              Product Photos ({totalImagesCount}/3){' '}
              <span className="text-[var(--color-accent)]">*</span>
            </label>
            <span className="text-[10px] text-[var(--color-muted)]">
              First photo is your cover image
            </span>
          </div>

          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="grid grid-cols-3 gap-3"
          >
            <AnimatePresence mode="popLayout">
              {/* Existing Images */}
              {existingImages.map((src, idx) => (
                <motion.div
                  key={`exist-${src}`}
                  layout
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  className="group relative aspect-square overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]"
                >
                  <img src={src} alt="Product preview" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeExistingImage(src)}
                    className="absolute right-2 top-2 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition-opacity hover:bg-black group-hover:opacity-100"
                    aria-label="Remove photo"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  {idx === 0 && (
                    <span className="absolute bottom-2 left-2 rounded-full bg-black/85 px-2.5 py-0.5 text-[9px] font-medium text-white">
                      Cover
                    </span>
                  )}
                </motion.div>
              ))}

              {/* Newly Uploaded Images */}
              {previews.map((src, idx) => {
                const isCover = existingImages.length === 0 && idx === 0;
                return (
                  <motion.div
                    key={`new-${idx}`}
                    layout
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    className="border-[var(--color-accent)]/30 group relative aspect-square overflow-hidden rounded-2xl border-2 bg-[var(--color-surface)]"
                  >
                    <img src={src} alt="New upload" className="h-full w-full object-cover" />
                    <span className="absolute left-2 top-2 rounded-full bg-[var(--color-accent)] px-1.5 py-0.5 text-[8px] font-medium uppercase text-white">
                      New
                    </span>
                    <button
                      type="button"
                      onClick={() => removeNewImage(idx)}
                      className="absolute right-2 top-2 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition-opacity hover:bg-black group-hover:opacity-100"
                      aria-label="Remove photo"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    {isCover && (
                      <span className="absolute bottom-2 left-2 rounded-full bg-black/85 px-2.5 py-0.5 text-[9px] font-medium text-white">
                        Cover
                      </span>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Upload Button */}
            {totalImagesCount < 3 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isCompressing}
                className="hover:border-[var(--color-accent)]/50 hover:bg-[var(--color-accent)]/5 flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--color-border)] text-[var(--color-muted)] transition-all hover:text-[var(--color-accent)] active:scale-95 disabled:opacity-60"
              >
                {isCompressing ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin text-[var(--color-accent)]" />
                    <span className="text-[10px] font-medium">Optimising…</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-5 w-5" />
                    <span className="text-[10px] font-medium">Add Photo</span>
                  </>
                )}
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.heic,.heif"
            multiple
            className="hidden"
            onChange={(e) => handleImageFiles(Array.from(e.target.files ?? []))}
          />
        </div>

        {/* Video Upload */}
        <div className="pt-2">
          <label className="mb-2 block text-[11px] font-medium uppercase tracking-wider text-[var(--color-muted)]">
            Product Video (Optional)
          </label>
          {videoPreview || existingVideo ? (
            <div className="relative flex max-h-52 items-center justify-center overflow-hidden rounded-2xl border border-[var(--color-border)] bg-black">
              <video
                src={videoPreview || existingVideo!}
                className="max-h-52 w-full object-contain"
                controls
                playsInline
              />
              <button
                type="button"
                onClick={removeVideo}
                className="absolute right-3 top-3 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-black/70 text-white transition-colors hover:bg-black"
                aria-label="Remove video"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => videoInputRef.current?.click()}
              className="hover:border-[var(--color-accent)]/50 hover:bg-[var(--color-accent)]/5 flex h-16 w-full cursor-pointer items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-[var(--color-border)] text-[var(--color-muted)] transition-all hover:text-[var(--color-accent)]"
            >
              <Video className="h-5 w-5" />
              <span className="text-xs font-normal">Upload short video clip · Max 60 MB</span>
            </button>
          )}
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={handleVideoChange}
          />
        </div>
      </Card>

      {/* ────────────────── 2. Core Information ────────────────── */}
      <Card
        className="space-y-6 rounded-3xl border border-[var(--color-border)] p-6 md:p-8"
        hoverEffect={false}
      >
        <div className="border-[var(--color-border)]/60 flex items-center gap-3 border-b pb-4">
          <div className="bg-[var(--color-accent)]/10 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl">
            <ShoppingBag className="h-4 w-4 text-[var(--color-accent)]" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-[var(--color-foreground)]">Core Information</h3>
            <p className="text-[11px] text-[var(--color-muted)]">
              Title, category classification &amp; brand
            </p>
          </div>
        </div>

        {/* Product Name */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-medium uppercase tracking-wider text-[var(--color-muted)]">
              Product Name <span className="text-[var(--color-accent)]">*</span>
            </label>
            <span className="text-[10px] tabular-nums text-[var(--color-muted)]">
              {formData.title.length}/200
            </span>
          </div>
          <Input
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g. Handmade Leather Tote Bag — Caramel"
            maxLength={200}
            required
            className="h-12 rounded-2xl text-xs font-normal"
          />
        </div>

        {/* Category & Brand Grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Select
            label="Category"
            value={formData.category}
            onChange={(val) => handleCategoryChange(val)}
            options={categoryOptions}
            placeholder={categories.length === 0 ? 'Loading categories…' : 'Select category'}
            searchable
            className="w-full"
          />

          {categoryBrands.length > 0 ? (
            <Select
              label="Brand"
              value={formData.brand}
              onChange={(val) => setFormData({ ...formData, brand: val })}
              options={brandOptions}
              placeholder="Select brand"
              searchable
              className="w-full"
            />
          ) : (
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium uppercase tracking-wider text-[var(--color-muted)]">
                Brand <span className="font-normal text-[var(--color-muted)]">(Optional)</span>
              </label>
              <Input
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                placeholder="Brand or designer name"
                className="h-12 rounded-xl text-xs font-normal"
              />
            </div>
          )}
        </div>

        {/* Dynamic Category Attributes */}
        {selectedCategory?.fields && selectedCategory.fields.length > 0 && (
          <div className="border-[var(--color-border)]/50 space-y-4 border-t pt-2">
            <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--color-muted)]">
              {formData.category} Specifications
            </p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {selectedCategory.fields.map((field, idx) => {
                const fieldKey = field.key || field.name || `field_${idx}`;
                const currentValue =
                  formData.attributes[fieldKey] ??
                  (field.name ? formData.attributes[field.name] : undefined) ??
                  (field.key ? formData.attributes[field.key] : undefined) ??
                  '';

                return (
                  <div key={fieldKey} className="space-y-1.5">
                    {field.type === 'select' ? (
                      <Select
                        label={field.label}
                        value={currentValue}
                        onChange={(val) => handleAttributeChange(fieldKey, val)}
                        options={Array.from(new Set(field.options || [])).map((opt) => ({
                          value: opt,
                          label: opt,
                        }))}
                        placeholder={`Select ${field.label.toLowerCase()}…`}
                        className="w-full"
                      />
                    ) : (
                      <>
                        <label className="text-[11px] font-medium uppercase tracking-wider text-[var(--color-muted)]">
                          {field.label}
                        </label>
                        <Input
                          type={field.type === 'number' ? 'number' : 'text'}
                          value={currentValue}
                          onChange={(e) => handleAttributeChange(fieldKey, e.target.value)}
                          placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                          className="h-12 rounded-xl text-xs font-normal"
                        />
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Card>

      {/* ────────────────── 3. Pricing & Inventory ────────────────── */}
      <Card
        className="space-y-6 rounded-3xl border border-[var(--color-border)] p-6 md:p-8"
        hoverEffect={false}
      >
        <div className="border-[var(--color-border)]/60 flex items-center gap-3 border-b pb-4">
          <div className="bg-[var(--color-accent)]/10 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl">
            <DollarSign className="h-4 w-4 text-[var(--color-accent)]" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-[var(--color-foreground)]">
              Pricing &amp; Inventory
            </h3>
            <p className="text-[11px] text-[var(--color-muted)]">
              Selling price, discounts &amp; available stock
            </p>
          </div>
        </div>

        {/* Pricing inputs: Base Price & Percentage Discount */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Price (GH₵) */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium uppercase tracking-wider text-[var(--color-muted)]">
              Price (GH₵) <span className="text-[var(--color-accent)]">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-[var(--color-muted)]">
                ₵
              </span>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                placeholder="0.00"
                required
                className="h-12 rounded-2xl pl-8 text-xs font-normal"
              />
            </div>
            <p className="text-[10px] text-[var(--color-muted)]">
              Base retail price of the product
            </p>
          </div>

          {/* Discount (%) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-medium uppercase tracking-wider text-[var(--color-muted)]">
                Discount (%){' '}
                <span className="font-normal text-[var(--color-muted)]">(Optional)</span>
              </label>
              {hasValidDiscount && (
                <span className="text-[10px] font-semibold text-emerald-600">
                  Save GH₵{savingsAmount}
                </span>
              )}
            </div>
            <div className="relative">
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-[var(--color-muted)]">
                %
              </span>
              <Input
                type="number"
                step="any"
                min="0"
                max="99.99"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(e.target.value)}
                placeholder="0"
                className="h-12 rounded-2xl pr-8 text-xs font-normal"
              />
            </div>
            {/* Quick preset pills */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="mr-0.5 text-[10px] text-[var(--color-muted)]">Quick:</span>
              {DISCOUNT_PRESETS.map((pct) => {
                const isSelected = discountPercent === String(pct);
                return (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setDiscountPercent(isSelected ? '' : String(pct))}
                    className={`cursor-pointer rounded-lg px-2 py-0.5 text-[10px] font-medium transition-all ${
                      isSelected
                        ? 'shadow-xs bg-[var(--color-accent)] text-white'
                        : 'hover:border-[var(--color-accent)]/40 border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)] hover:text-[var(--color-foreground)]'
                    }`}
                  >
                    {pct}%
                  </button>
                );
              })}
              {discountPercent && (
                <button
                  type="button"
                  onClick={() => setDiscountPercent('')}
                  className="cursor-pointer rounded-lg px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-muted)] transition-colors hover:text-red-500"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Auto-Calculated Selling Price Banner */}
        <div
          className={`rounded-2xl border p-4 transition-all md:p-5 ${
            hasValidDiscount
              ? 'border-emerald-500/30 bg-emerald-500/5'
              : 'bg-[var(--color-surface)]/60 border-[var(--color-border)]'
          }`}
        >
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <div className="mb-1.5 flex items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                  Selling Price (Auto-Calculated)
                </span>
                {hasValidDiscount ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                    −{discountPercent}% OFF
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-border)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-muted)]">
                    Standard Price
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-2.5">
                <span className="text-2xl font-bold tabular-nums tracking-tight text-[var(--color-foreground)] sm:text-3xl">
                  GH₵{calculatedSellingPrice}
                </span>
                {hasValidDiscount && Number(basePrice) > 0 && (
                  <span className="text-sm tabular-nums text-[var(--color-muted)] line-through">
                    GH₵{Number(basePrice).toFixed(2)}
                  </span>
                )}
              </div>
            </div>

            <div className="text-xs text-[var(--color-muted)] sm:text-right">
              {hasValidDiscount ? (
                <p className="text-xs font-medium text-emerald-600">
                  Buyers save GH₵{savingsAmount} ({discountPercent}% discount)
                </p>
              ) : (
                <p className="text-xs text-[var(--color-muted)]">
                  {Number(basePrice) > 0
                    ? 'Buyers pay full price (no discount applied)'
                    : 'Enter a price above to view selling price'}
                </p>
              )}
              <p className="mt-0.5 text-[10px] text-[var(--color-muted)]">
                System automatically calculates customer checkout price
              </p>
            </div>
          </div>
        </div>

        {/* Stock & Condition */}
        <div className="grid grid-cols-1 gap-4 pt-1 md:grid-cols-2">
          {/* Quantity in stock */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium uppercase tracking-wider text-[var(--color-muted)]">
              Quantity Available{' '}
              <span className="font-normal text-[var(--color-muted)]">(Optional)</span>
            </label>
            <Input
              type="number"
              min="0"
              step="1"
              value={formData.quantity_available}
              onChange={(e) => setFormData({ ...formData, quantity_available: e.target.value })}
              placeholder="1"
              className="h-12 rounded-2xl text-xs font-normal"
            />
            <p className="text-[10px] text-[var(--color-muted)]">Defaults to 1 unit in stock</p>
          </div>

          {/* Condition */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium uppercase tracking-wider text-[var(--color-muted)]">
              Item Condition
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { value: 'new', label: 'New' },
                  { value: 'used', label: 'Used' },
                  { value: 'refurbished', label: 'Refurbished' },
                ] as const
              ).map(({ value, label }) => {
                const active = formData.condition === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFormData({ ...formData, condition: value })}
                    className={`h-12 cursor-pointer rounded-2xl border text-xs font-medium transition-all duration-150 ${
                      active
                        ? 'bg-[var(--color-accent)]/10 border-[var(--color-accent)] text-[var(--color-accent)]'
                        : 'hover:border-[var(--color-accent)]/40 border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-muted)]'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      {/* ────────────────── 4. Narrative & Tags ────────────────── */}
      <Card
        className="space-y-6 rounded-3xl border border-[var(--color-border)] p-6 md:p-8"
        hoverEffect={false}
      >
        <div className="border-[var(--color-border)]/60 flex items-center gap-3 border-b pb-4">
          <div className="bg-[var(--color-accent)]/10 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl">
            <Tag className="h-4 w-4 text-[var(--color-accent)]" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-[var(--color-foreground)]">
              Story &amp; Discoverability
            </h3>
            <p className="text-[11px] text-[var(--color-muted)]">
              Detailed description and marketplace search tags
            </p>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-medium uppercase tracking-wider text-[var(--color-muted)]">
              Description
            </label>
            <span className="text-[10px] tabular-nums text-[var(--color-muted)]">
              {formData.description.length}/2000
            </span>
          </div>
          <Textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Highlight unique features, dimensions, craftsmanship, or care instructions…"
            maxLength={2000}
            rows={4}
            className="rounded-2xl text-xs font-normal"
          />
        </div>

        {/* Tags input */}
        <div className="space-y-3">
          <label className="text-[11px] font-medium uppercase tracking-wider text-[var(--color-muted)]">
            Search Tags (Max 20)
          </label>
          <div className="flex gap-2">
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTag();
                }
              }}
              placeholder="Type tag and press Enter (e.g. vintage, cotton, handmade)"
              maxLength={50}
              className="h-12 flex-1 rounded-2xl text-xs font-normal"
            />
            <button
              type="button"
              onClick={addTag}
              className="hover:border-[var(--color-accent)]/50 h-12 cursor-pointer rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-5 text-xs font-medium text-[var(--color-foreground)] transition-all hover:text-[var(--color-accent)]"
            >
              Add
            </button>
          </div>

          {/* Added tags pills */}
          {formData.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {formData.tags.map((tag) => (
                <span
                  key={tag}
                  className="bg-[var(--color-accent)]/10 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-[var(--color-accent)]"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="cursor-pointer transition-opacity hover:opacity-75"
                    aria-label={`Remove tag ${tag}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* ────────────────── 5. Visibility & Promotion ────────────────── */}
      <Card
        className="space-y-6 rounded-3xl border border-[var(--color-border)] p-6 md:p-8"
        hoverEffect={false}
      >
        <div className="border-[var(--color-border)]/60 flex items-center gap-3 border-b pb-4">
          <div className="bg-[var(--color-accent)]/10 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl">
            <FileText className="h-4 w-4 text-[var(--color-accent)]" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-[var(--color-foreground)]">
              Publishing &amp; Growth
            </h3>
            <p className="text-[11px] text-[var(--color-muted)]">
              Control visibility and Hot Sales marketplace boost
            </p>
          </div>
        </div>

        {/* Status */}
        <div className="space-y-2">
          <label className="text-[11px] font-medium uppercase tracking-wider text-[var(--color-muted)]">
            Listing Visibility
          </label>
          <div className="grid grid-cols-2 gap-3">
            {[
              {
                value: 'active',
                label: 'Active',
                desc: 'Visible in marketplace & shop',
                icon: Eye,
              },
              {
                value: 'draft',
                label: 'Draft',
                desc: 'Hidden from public searches',
                icon: EyeOff,
              },
            ].map(({ value, label, desc, icon: Icon }) => {
              const active = formData.status === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFormData({ ...formData, status: value as any })}
                  className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 text-left transition-all ${
                    active
                      ? 'bg-[var(--color-accent)]/8 border-[var(--color-accent)]'
                      : 'hover:border-[var(--color-accent)]/30 border-[var(--color-border)] bg-[var(--color-background)]'
                  }`}
                >
                  <Icon
                    className={`mt-0.5 h-4 w-4 flex-shrink-0 ${
                      active ? 'text-[var(--color-accent)]' : 'text-[var(--color-muted)]'
                    }`}
                  />
                  <div>
                    <p
                      className={`text-xs font-semibold ${
                        active ? 'text-[var(--color-foreground)]' : 'text-[var(--color-muted)]'
                      }`}
                    >
                      {label}
                    </p>
                    <p className="mt-0.5 text-[10px] text-[var(--color-muted)]">{desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Hot Sales Booster */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setFormData({ ...formData, is_featured: !formData.is_featured })}
            className={`flex w-full cursor-pointer items-center justify-between rounded-2xl border p-4 transition-all ${
              formData.is_featured
                ? 'border-amber-400/60 bg-amber-500/10'
                : 'border-[var(--color-border)] bg-[var(--color-background)] hover:border-amber-400/40'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                  formData.is_featured ? 'bg-amber-500/20 text-amber-600' : 'bg-surface text-muted'
                }`}
              >
                <Flame className="h-5 w-5" />
              </div>
              <div className="text-left">
                <p className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-foreground)]">
                  Hot Sales Homepage Boost
                  <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[9px] font-medium uppercase text-amber-600">
                    GH₵7 / week
                  </span>
                </p>
                <p className="text-[10px] text-[var(--color-muted)]">
                  Pin your listing to the verified Hot Sales rotation to boost traffic
                </p>
              </div>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wider ${
                formData.is_featured
                  ? 'bg-amber-500 text-white'
                  : 'bg-[var(--color-border)] text-[var(--color-muted)]'
              }`}
            >
              {formData.is_featured ? 'Enabled' : 'Disabled'}
            </span>
          </button>
        </div>
      </Card>

      {/* ────────────────── 6. Variants (Edit Mode) ────────────────── */}
      {isEdit && productId && (
        <Card
          className="space-y-6 rounded-3xl border border-[var(--color-border)] p-6 md:p-8"
          hoverEffect={false}
        >
          <div className="border-[var(--color-border)]/60 flex items-center gap-3 border-b pb-4">
            <div className="bg-[var(--color-accent)]/10 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl">
              <Layers className="h-4 w-4 text-[var(--color-accent)]" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-[var(--color-foreground)]">
                Product Variants
              </h3>
              <p className="text-[11px] text-[var(--color-muted)]">
                Manage size, colour, SKU, and price overrides
              </p>
            </div>
          </div>
          <VariantEditor productId={productId} />
        </Card>
      )}

      {/* ────────────────── Form Action Buttons ────────────────── */}
      <div className="flex items-center gap-3 pt-2">
        {onCancel && (
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={isLoading}
            className="h-14 flex-1 cursor-pointer rounded-2xl text-xs font-medium"
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={isLoading || isCompressing}
          className={`${onCancel ? 'flex-[2]' : 'w-full'} h-14 cursor-pointer rounded-2xl text-xs font-medium shadow-lg shadow-black/5`}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {isEdit ? 'Saving Changes…' : 'Publishing Product…'}
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              {isEdit ? 'Save Product Changes' : 'Publish Product'}
            </span>
          )}
        </Button>
      </div>
    </form>
  );
}
