"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Plus,
  X,
  Video,
  Loader2,
  Check,
  AlertCircle,
  Info,
  Tag,
  ShoppingBag,
  Flame,
  Camera,
  Package,
  DollarSign,
  FileText,
  Layers,
  Sparkles,
  ChevronDown,
  Eye,
  EyeOff,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Button from "@/components/ui/Button";
import { useAuth } from "@/lib/contexts/auth-context";
import { productApi } from "@/lib/api/product";
import imageCompression from "browser-image-compression";
import { createProductSchema } from "@/lib/validations/product";
import { sanitizeProductInputs } from "@/lib/utils/sanitize";

// ─── Types ────────────────────────────────────────────────────────────────────

type MessageType = "success" | "error" | "info";

interface StatusMessage {
  type: MessageType;
  text: string;
}

interface CategoryField {
  name: string;
  label: string;
  type: "text" | "select" | "number";
  required?: boolean;
  options?: string[];
  defaultValue?: string;
  placeholder?: string;
}

interface Category {
  id: string;
  name: string;
  fields: CategoryField[];
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[var(--color-surface)] rounded-3xl overflow-hidden border border-[var(--color-border)]">
      <div className="px-5 py-4 border-b border-[var(--color-border)]/60 flex items-center gap-3">
        <div className="w-9 h-9 rounded-2xl bg-[var(--color-accent)]/10 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-[var(--color-accent)]" />
        </div>
        <div>
          <p className="text-sm font-bold text-[var(--color-foreground)]">{title}</p>
          {subtitle && (
            <p className="text-[11px] text-[var(--color-muted)] mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

// ─── Field label ──────────────────────────────────────────────────────────────

function FieldLabel({
  children,
  required,
  hint,
}: {
  children: React.ReactNode;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div className="flex items-center justify-between mb-1.5">
      <label className="text-[11px] font-bold text-[var(--color-muted)] uppercase tracking-wider">
        {children}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {hint && <span className="text-[10px] text-[var(--color-muted)]">{hint}</span>}
    </div>
  );
}

// ─── Native-style input (font-size pinned to 16px on mobile via globals.css) ──

function FormInput({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={[
        "w-full px-4 h-12 rounded-2xl border border-[var(--color-border)]",
        "bg-[var(--color-background)] text-[var(--color-foreground)]",
        "text-base placeholder:text-[var(--color-muted)]/60",
        "outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/15",
        "transition-all duration-150",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    />
  );
}

function FormSelect({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        {...props}
        className={[
          "w-full px-4 h-12 rounded-2xl border border-[var(--color-border)] appearance-none",
          "bg-[var(--color-background)] text-[var(--color-foreground)]",
          "text-base",
          "outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/15",
          "transition-all duration-150 cursor-pointer",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          className ?? "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-muted)]" />
    </div>
  );
}

function FormTextarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={[
        "w-full px-4 py-3 rounded-2xl border border-[var(--color-border)]",
        "bg-[var(--color-background)] text-[var(--color-foreground)]",
        "text-base placeholder:text-[var(--color-muted)]/60",
        "outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/15",
        "transition-all duration-150 resize-none",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    />
  );
}

// ─── Character counter ────────────────────────────────────────────────────────

function CharCounter({ value, max }: { value: string; max: number }) {
  const len = value.length;
  const pct = len / max;
  const color =
    pct >= 0.95
      ? "text-red-500"
      : pct >= 0.8
        ? "text-amber-500"
        : "text-[var(--color-muted)]";
  return (
    <span className={`text-[10px] font-medium tabular-nums ${color}`}>
      {len}/{max}
    </span>
  );
}

// ─── Alert banner ─────────────────────────────────────────────────────────────

function Alert({ message }: { message: StatusMessage | null }) {
  if (!message) return null;
  const styles = {
    success: {
      wrap: "bg-emerald-500/10 border-emerald-500/30 text-emerald-600",
      icon: Check,
    },
    error: {
      wrap: "bg-red-500/10 border-red-500/30 text-red-600",
      icon: AlertCircle,
    },
    info: {
      wrap: "bg-blue-500/10 border-blue-500/30 text-blue-600",
      icon: Info,
    },
  };
  const { wrap, icon: Icon } = styles[message.type];
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={`flex items-start gap-3 px-4 py-3 rounded-2xl border ${wrap}`}
    >
      <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" />
      <p className="text-sm font-medium leading-snug">{message.text}</p>
    </motion.div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AddProductPage() {
  const { token } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isLoading, setIsLoading] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [message, setMessage] = useState<StatusMessage | null>(null);
  const [verificationState, setVerificationState] = useState<"idle" | "verifying" | "failed">("idle");

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    original_price: "",
    currency: "GHS",
    condition: "new",
    quantity_available: "1",
    status: "draft",
    category: "",
    brand: "",
    tagInput: "",
    tags: [] as string[],
    attributes: {} as Record<string, string>,
    is_featured: false,
  });

  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [video, setVideo] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryBrands, setCategoryBrands] = useState<any[]>([]);
  const [existingTitles, setExistingTitles] = useState<string[]>([]);
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  const [sellerProducts, setSellerProducts] = useState<any[]>([]);

  useEffect(() => {
    if (!formData.category) {
      setCategoryBrands([]);
      return;
    }
    const cat = categories.find((c) => c.name === formData.category);
    if (!cat) {
      productApi.getBrands(formData.category)
        .then((brs) => {
          setCategoryBrands(brs);
        })
        .catch(() => {
          setCategoryBrands([]);
        });
      return;
    }
    productApi.getBrands(undefined, cat.id)
      .then((brs) => {
        setCategoryBrands(brs);
      })
      .catch(() => {
        setCategoryBrands([]);
      });
  }, [formData.category, categories]);

  // ── Data fetching ────────────────────────────────────────────────────────────

  useEffect(() => {
    productApi
      .getCategories()
      .then((cats) => {
        setCategories(cats);
        if (cats.length > 0) {
          setFormData((prev) => ({
            ...prev,
            category: cats[0].name,
            attributes: (cats[0].fields || []).reduce(
              (acc: Record<string, string>, field: CategoryField) => ({
                ...acc,
                [field.name]: field.defaultValue ?? "",
              }),
              {}
            ),
          }));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!token) return;
    productApi
      .getSellerProducts(token)
      .then((products) => {
        setSellerProducts(products);
        const titles = Array.from(
          new Set(
            products
              .map((p: any) => String(p.title ?? "").trim())
              .filter(Boolean)
          )
        );
        const tags = Array.from(
          new Set(
            products
              .flatMap((p: any) =>
                Array.isArray(p.tags) ? p.tags : []
              )
              .map((t: string) => t.trim())
              .filter(Boolean)
          )
        );
        setExistingTitles(titles as string[]);
        setTagSuggestions(tags as string[]);
      })
      .catch(() => {});
  }, [token]);

  // ── Hot Sales payment verification callback ─────────────────────────────────

  useEffect(() => {
    const hotSalePayment = searchParams.get("hot_sale_payment");
    const reference = searchParams.get("reference");
    const productId = searchParams.get("product_id");
    if (!token || hotSalePayment !== "1" || !reference || !productId) return;

    setVerificationState("verifying");
    setMessage({ type: "info", text: "Verifying Hot Sales payment…" });

    productApi
      .verifyHotSalesPayment(token, reference, productId)
      .then((res) => {
        setMessage({
          type: res.verified ? "success" : "info",
          text: res.verified
            ? "Payment verified. Hot Sales enabled!"
            : "Payment is pending. Check back shortly.",
        });
      })
      .catch((err: any) => {
        setVerificationState("failed");
        setMessage({ type: "error", text: err.message ?? "Failed to verify payment." });
      })
      .finally(() => {
        router.replace(pathname);
      });
  }, [searchParams, token, pathname, router]);

  useEffect(() => {
    return () => {
      if (videoPreview) URL.revokeObjectURL(videoPreview);
    };
  }, [videoPreview]);

  // ── Derived values ───────────────────────────────────────────────────────────

  const selectedCategory = useMemo(
    () => categories.find((c) => c.name === formData.category),
    [categories, formData.category]
  );

  const recommendation = useMemo(() => {
    const sameCategory = sellerProducts.filter(
      (p) => p.category === formData.category
    );
    if (sameCategory.length === 0) return null;
    const prices = sameCategory
      .map((p) => Number(p.price))
      .filter(Number.isFinite)
      .sort((a, b) => a - b);
    const quantities = sameCategory
      .map((p) => Number(p.quantity_available))
      .filter(Number.isFinite);
    const medianPrice = prices[Math.floor(prices.length / 2)] ?? 0;
    const avgQuantity = quantities.length
      ? Math.round(quantities.reduce((s, v) => s + v, 0) / quantities.length)
      : 1;
    return { medianPrice, avgQuantity, topTags: tagSuggestions.slice(0, 3) };
  }, [formData.category, sellerProducts, tagSuggestions]);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleCategoryChange = useCallback(
    (catName: string) => {
      const cat = categories.find((c) => c.name === catName);
      const newAttributes = (cat?.fields ?? []).reduce(
        (acc: Record<string, string>, field: CategoryField) => ({
          ...acc,
          [field.name]: field.defaultValue ?? "",
        }),
        {}
      );
      setFormData((prev) => ({ ...prev, category: catName, attributes: newAttributes }));
    },
    [categories]
  );

  const handleAttributeChange = useCallback((name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      attributes: { ...prev.attributes, [name]: value },
    }));
  }, []);

  const handleImageFiles = useCallback(
    async (files: File[]) => {
      if (files.length + images.length > 3) {
        setMessage({ type: "error", text: "Maximum 3 images allowed." });
        return;
      }

      setIsCompressing(true);
      setMessage(null);

      const compressedFiles: File[] = [];
      const newPreviews: string[] = [];

      for (const file of files) {
        try {
          let src = file;
          const lower = file.name.toLowerCase();
          if (
            lower.endsWith(".heic") ||
            lower.endsWith(".heif") ||
            file.type === "image/heic" ||
            file.type === "image/heif"
          ) {
            setMessage({ type: "info", text: "Converting HEIC image…" });
            const heic2any = (await import("heic2any")).default;
            const blob = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.8 });
            const finalBlob = Array.isArray(blob) ? blob[0] : blob;
            src = new File(
              [finalBlob],
              file.name.replace(/\.(heic|heif)$/i, ".jpg"),
              { type: "image/jpeg" }
            );
          }

          const compressed = await imageCompression(src, {
            maxSizeMB: 1,
            maxWidthOrHeight: 1920,
            useWebWorker: true,
            fileType: "image/webp",
          });
          const webp = new File(
            [compressed],
            compressed.name.replace(/\.[^/.]+$/, ".webp"),
            { type: "image/webp" }
          );
          compressedFiles.push(webp);

          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(webp);
          });
          newPreviews.push(base64);
        } catch {
          setMessage({ type: "error", text: "Failed to process one or more images." });
        }
      }

      if (compressedFiles.length > 0) {
        setImages((prev) => [...prev, ...compressedFiles]);
        setPreviews((prev) => [...prev, ...newPreviews]);
        setMessage({ type: "success", text: `${compressedFiles.length} image(s) optimised for web.` });
      }
      setIsCompressing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [images]
  );

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleImageFiles(Array.from(e.target.files ?? []));
  };

  // Drag-and-drop support
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith("image/")
    );
    if (files.length > 0) handleImageFiles(files);
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      setMessage({ type: "error", text: "Please upload a valid video file." });
      return;
    }
    if (file.size > 60 * 1024 * 1024) {
      setMessage({ type: "error", text: "Video must be under 60 MB." });
      e.target.value = "";
      return;
    }
    setVideo(file);
    setVideoPreview(URL.createObjectURL(file));
  };

  const removeVideo = () => {
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideo(null);
    setVideoPreview(null);
    if (videoInputRef.current) videoInputRef.current.value = "";
  };

  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
    setPreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  const addTag = () => {
    const raw = formData.tagInput.trim().replace(/\s+/g, " ");
    if (!raw) return;
    if (formData.tags.length >= 20) {
      setMessage({ type: "info", text: "Maximum 20 tags." });
      return;
    }
    if (formData.tags.some((t) => t.toLowerCase() === raw.toLowerCase())) {
      setMessage({ type: "info", text: "Tag already added." });
      return;
    }
    setFormData((prev) => ({ ...prev, tags: [...prev.tags, raw], tagInput: "" }));
  };

  const removeTag = (tag: string) =>
    setFormData((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }));

  // ── Submission ───────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || isLoading || isCompressing) return;

    if (images.length === 0 && !video) {
      setMessage({ type: "error", text: "Add at least one product image or video." });
      return;
    }

    const normalizedTitle = formData.title.trim().replace(/\s+/g, " ");
    if (
      existingTitles.some(
        (t) => t.toLowerCase() === normalizedTitle.toLowerCase()
      )
    ) {
      setMessage({
        type: "error",
        text: "You already have a product with this title. Use a different title or update the existing one.",
      });
      return;
    }

    // Sanitise before validation
    const sanitized = sanitizeProductInputs({
      title: normalizedTitle,
      description: formData.description,
      tags: formData.tags,
      attributes: formData.attributes,
    });

    const parsed = createProductSchema.safeParse({
      title: sanitized.title,
      price: formData.price,
      quantity_available: formData.quantity_available,
      category: formData.category,
      condition: formData.condition,
      status: formData.status,
      tags: sanitized.tags,
    });

    if (!parsed.success) {
      setMessage({
        type: "error",
        text: parsed.error.issues[0]?.message ?? "Please review the highlighted fields.",
      });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      // Validate discount: original must be greater than price if provided
      if (formData.original_price) {
        const orig = parseFloat(formData.original_price);
        const cur = parseFloat(formData.price);
        if (Number.isFinite(orig) && Number.isFinite(cur) && orig <= cur) {
          setIsLoading(false);
          setMessage({ type: "error", text: "Original price must be greater than the current price." });
          return;
        }
      }

      const created = await productApi.createProduct(
        token,
        {
          title: sanitized.title,
          description: sanitized.description,
          price: formData.price,
          original_price: formData.original_price || undefined,
          currency: formData.currency,
          condition: formData.condition,
          quantity_available: formData.quantity_available,
          status: formData.status,
          category: formData.category,
          brand: formData.brand || undefined,
          tags: sanitized.tags,
          attributes: sanitized.attributes,
        },
        images,
        video
      );

      if (formData.is_featured && created?.product?.id) {
        const init = await productApi.initializeHotSalesPayment(token, created.product.id);
        if (init.checkout_url) {
          window.location.href = init.checkout_url;
          return;
        }
      }

      setMessage({ type: "success", text: "Product listed successfully!" });
      setTimeout(() => router.push("/dashboard"), 1800);
    } catch (err: any) {
      setMessage({ type: "error", text: err.message ?? "Failed to add product. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  const canSubmit = !isLoading && !isCompressing && verificationState !== "verifying";

  return (
    <div className="max-w-xl mx-auto pb-32 px-0 sm:px-2">
      {/* ── Header ── */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/dashboard"
          className="w-10 h-10 flex items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-border)]/30 transition-colors flex-shrink-0"
          aria-label="Back to dashboard"
        >
          <ArrowLeft className="w-4 h-4 text-[var(--color-foreground)]" />
        </Link>
        <div>
          <h1 className="text-lg font-black tracking-tight text-[var(--color-foreground)]">
            Add Product
          </h1>
          <p className="text-[11px] text-[var(--color-muted)] font-medium">
            List a new item for sale
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {/* ══════════════════════════════════════════════════
            Section 1 — Product Media
        ══════════════════════════════════════════════════ */}
        <Section icon={Camera} title="Product Media" subtitle="Up to 3 photos · 1 short video (auto-trimmed to 5s)">
          {/* Image drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="grid grid-cols-3 gap-3"
          >
            <AnimatePresence>
              {previews.map((src, idx) => (
                <motion.div
                  key={`img-${idx}`}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  className="relative aspect-square rounded-2xl overflow-hidden border border-[var(--color-border)] group"
                >
                  <img
                    src={src}
                    alt={`Product photo ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100"
                    aria-label={`Remove photo ${idx + 1}`}
                  >
                    <span className="w-7 h-7 rounded-full bg-black/60 flex items-center justify-center">
                      <X className="w-3.5 h-3.5 text-white" />
                    </span>
                  </button>
                  {idx === 0 && (
                    <span className="absolute bottom-1.5 left-1.5 text-[9px] font-bold bg-black/60 text-white px-2 py-0.5 rounded-full">
                      Cover
                    </span>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {previews.length < 3 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isCompressing}
                className={[
                  "aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-1.5",
                  "transition-all duration-150",
                  isCompressing
                    ? "border-[var(--color-accent)]/40 text-[var(--color-accent)] opacity-70 cursor-wait"
                    : "border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-accent)]/50 hover:text-[var(--color-accent)] active:scale-95",
                ].join(" ")}
                aria-label="Add product photo"
              >
                {isCompressing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-[10px] font-bold">Optimising…</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5" />
                    <span className="text-[10px] font-bold">Add Photo</span>
                  </>
                )}
              </button>
            )}

            {/* Empty slots (visual) */}
            {Array.from({ length: Math.max(0, 2 - previews.length) }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="aspect-square rounded-2xl border border-dashed border-[var(--color-border)]/50 opacity-40"
              />
            ))}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileInputChange}
            aria-hidden="true"
          />

          {/* Video upload */}
          <div>
            <FieldLabel>Short Video (optional)</FieldLabel>
            {videoPreview ? (
              <div className="relative rounded-2xl overflow-hidden border border-[var(--color-border)] bg-black">
                <video
                  src={videoPreview}
                  className="w-full max-h-48 object-contain"
                  controls
                  playsInline
                />
                <button
                  type="button"
                  onClick={removeVideo}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center"
                  aria-label="Remove video"
                >
                  <X className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => videoInputRef.current?.click()}
                className="w-full h-16 rounded-2xl border-2 border-dashed border-[var(--color-border)] flex items-center justify-center gap-3 text-[var(--color-muted)] hover:border-[var(--color-accent)]/50 hover:text-[var(--color-accent)] transition-all active:scale-[0.99]"
              >
                <Video className="w-5 h-5" />
                <span className="text-[11px] font-bold">Upload a short video · max 60 MB</span>
              </button>
            )}
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={handleVideoChange}
              aria-hidden="true"
            />
          </div>
        </Section>

        {/* ══════════════════════════════════════════════════
            Section 2 — Product Details
        ══════════════════════════════════════════════════ */}
        <Section icon={ShoppingBag} title="Product Details">
          {/* Title */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <FieldLabel required>Product Title</FieldLabel>
              <CharCounter value={formData.title} max={200} />
            </div>
            <FormInput
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, title: e.target.value }))
              }
              placeholder="e.g. iPhone 13 Silicone Case – Midnight"
              maxLength={200}
              required
              autoComplete="off"
              list="title-suggestions"
            />
            <datalist id="title-suggestions">
              {existingTitles.slice(0, 8).map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </div>

          {/* Description */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <FieldLabel>Description</FieldLabel>
              <CharCounter value={formData.description} max={2000} />
            </div>
            <FormTextarea
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="Describe your product — what makes it special, dimensions, what's included…"
              rows={4}
              maxLength={2000}
            />
          </div>
        </Section>

        {/* ══════════════════════════════════════════════════
            Section 3 — Pricing & Inventory
        ══════════════════════════════════════════════════ */}
        <Section
          icon={DollarSign}
          title="Pricing & Inventory"
          subtitle="Set a fair price based on market demand"
        >
          {recommendation && (
            <div className="flex items-start gap-3 p-3 rounded-2xl bg-[var(--color-accent)]/8 border border-[var(--color-accent)]/20">
              <Sparkles className="w-4 h-4 text-[var(--color-accent)] flex-shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="text-[11px] font-bold text-[var(--color-foreground)]">
                  Smart suggestion for {formData.category}
                </p>
                <p className="text-[11px] text-[var(--color-muted)]">
                  Price around{" "}
                  <span className="font-bold text-[var(--color-foreground)]">
                    GH₵{recommendation.medianPrice.toFixed(2)}
                  </span>{" "}
                  · Stock around{" "}
                  <span className="font-bold text-[var(--color-foreground)]">
                    {recommendation.avgQuantity}
                  </span>{" "}
                  units
                </p>
                {recommendation.topTags.length > 0 && (
                  <p className="text-[11px] text-[var(--color-muted)]">
                    Popular tags:{" "}
                    <span className="font-bold text-[var(--color-foreground)]">
                      {recommendation.topTags.join(", ")}
                    </span>
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {/* Price */}
            <div>
              <FieldLabel required>Price (GH₵)</FieldLabel>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-muted)] text-sm font-bold select-none">
                  ₵
                </span>
                <FormInput
                  type="number"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, price: e.target.value }))
                  }
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  required
                  className="pl-8"
                  inputMode="decimal"
                />
              </div>
            </div>

            {/* Quantity */}
            <div>
              <FieldLabel required>Qty in Stock</FieldLabel>
              <FormInput
                type="number"
                value={formData.quantity_available}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    quantity_available: e.target.value,
                  }))
                }
                placeholder="1"
                min="1"
                step="1"
                required
                inputMode="numeric"
              />
            </div>
          </div>

          {/* Original Price / Discount */}
          <div>
            <FieldLabel>Original Price (optional, GH₵)</FieldLabel>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-muted)] text-sm font-bold select-none">
                ₵
              </span>
              <FormInput
                type="number"
                value={formData.original_price}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, original_price: e.target.value }))
                }
                placeholder="0.00"
                min="0"
                step="0.01"
                className="pl-8"
                inputMode="decimal"
              />
            </div>
            {(() => {
              const orig = parseFloat(formData.original_price);
              const cur = parseFloat(formData.price);
              if (!Number.isFinite(orig) || !Number.isFinite(cur) || orig <= cur || orig <= 0) {
                return (
                  <p className="text-[11px] text-[var(--color-muted)] mt-1.5">
                    Show buyers a discount by setting an original (pre-sale) price higher than your selling price.
                  </p>
                );
              }
              const pct = Math.round(((orig - cur) / orig) * 100);
              return (
                <p className="text-[11px] mt-1.5 inline-flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 font-bold">
                    −{pct}%
                  </span>
                  <span className="text-[var(--color-muted)]">
                    Buyers save GH₵{(orig - cur).toFixed(2)}
                  </span>
                </p>
              );
            })()}
          </div>

          {/* Condition */}
          <div>
            <FieldLabel required>Condition</FieldLabel>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { value: "new", label: "New" },
                  { value: "used", label: "Used" },
                  { value: "refurbished", label: "Refurb." },
                ] as const
              ).map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({ ...prev, condition: value }))
                  }
                  className={[
                    "h-11 rounded-2xl border text-sm font-bold transition-all duration-150 active:scale-95",
                    formData.condition === value
                      ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                      : "border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-muted)] hover:border-[var(--color-accent)]/40",
                  ].join(" ")}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </Section>

        {/* ══════════════════════════════════════════════════
            Section 4 — Category
        ══════════════════════════════════════════════════ */}
        <Section icon={Layers} title="Category & Attributes">
          <div>
            <FieldLabel required>Category</FieldLabel>
            <FormSelect
              value={formData.category}
              onChange={(e) => handleCategoryChange(e.target.value)}
              required
            >
              {categories.length === 0 && (
                <option value="" disabled>
                  Loading categories…
                </option>
              )}
              {categories.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </FormSelect>
          </div>

          {categoryBrands.length > 0 && (
            <div>
              <FieldLabel>Brand</FieldLabel>
              <FormSelect
                value={formData.brand}
                onChange={(e) => setFormData((prev) => ({ ...prev, brand: e.target.value }))}
              >
                <option value="">Select Brand (Optional)</option>
                {categoryBrands.map((b) => (
                  <option key={b.id} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </FormSelect>
            </div>
          )}

          {/* Dynamic category-specific fields */}
          <AnimatePresence mode="wait">
            {selectedCategory?.fields && selectedCategory.fields.length > 0 && (
              <motion.div
                key={selectedCategory.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="grid grid-cols-2 gap-3"
              >
                {selectedCategory.fields.map((field) => (
                  <div key={field.name}>
                    <FieldLabel required={field.required}>
                      {field.label}
                    </FieldLabel>
                    {field.type === "select" ? (
                      <FormSelect
                        value={formData.attributes[field.name] ?? ""}
                        onChange={(e) =>
                          handleAttributeChange(field.name, e.target.value)
                        }
                        required={field.required}
                      >
                        <option value="">Select…</option>
                        {field.options?.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </FormSelect>
                    ) : (
                      <FormInput
                        type={field.type ?? "text"}
                        value={formData.attributes[field.name] ?? ""}
                        onChange={(e) =>
                          handleAttributeChange(field.name, e.target.value)
                        }
                        placeholder={field.placeholder ?? `Enter ${field.label.toLowerCase()}`}
                        required={field.required}
                        inputMode={field.type === "number" ? "decimal" : "text"}
                      />
                    )}
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </Section>

        {/* ══════════════════════════════════════════════════
            Section 5 — Tags
        ══════════════════════════════════════════════════ */}
        <Section icon={Tag} title="Tags" subtitle="Help buyers find your product · max 20 tags">
          <div>
            <div className="flex gap-2">
              <FormInput
                type="text"
                value={formData.tagInput}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, tagInput: e.target.value }))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
                placeholder="Type a tag and press Enter"
                maxLength={50}
                list="tag-suggestions"
                className="flex-1"
              />
              <button
                type="button"
                onClick={addTag}
                className="w-12 h-12 rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] flex items-center justify-center text-[var(--color-muted)] hover:border-[var(--color-accent)]/50 hover:text-[var(--color-accent)] transition-all active:scale-95 flex-shrink-0"
                aria-label="Add tag"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <datalist id="tag-suggestions">
              {tagSuggestions.slice(0, 16).map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </div>

          {/* Suggestion chips */}
          {tagSuggestions.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tagSuggestions
                .filter((t) => !formData.tags.includes(t))
                .slice(0, 8)
                .map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        tagInput: t,
                      }))
                    }
                    className="px-2.5 py-1 rounded-full border border-[var(--color-border)] text-[10px] font-bold text-[var(--color-muted)] hover:border-[var(--color-accent)]/40 hover:text-[var(--color-accent)] transition-all"
                  >
                    + {t}
                  </button>
                ))}
            </div>
          )}

          {/* Added tags */}
          {formData.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {formData.tags.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-accent)]/10 text-[var(--color-accent)] text-[11px] font-bold rounded-full"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    aria-label={`Remove tag ${tag}`}
                    className="hover:opacity-70 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </Section>

        {/* ══════════════════════════════════════════════════
            Section 6 — Publishing
        ══════════════════════════════════════════════════ */}
        <Section icon={FileText} title="Publishing">
          {/* Visibility */}
          <div>
            <FieldLabel required>Visibility</FieldLabel>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { value: "draft", label: "Draft", desc: "Hidden from buyers", icon: EyeOff },
                  { value: "active", label: "Active", desc: "Visible immediately", icon: Eye },
                ] as const
              ).map(({ value, label, desc, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({ ...prev, status: value }))
                  }
                  className={[
                    "flex items-center gap-3 p-3 rounded-2xl border text-left transition-all duration-150 active:scale-[0.98]",
                    formData.status === value
                      ? "border-[var(--color-accent)] bg-[var(--color-accent)]/8"
                      : "border-[var(--color-border)] bg-[var(--color-background)] hover:border-[var(--color-accent)]/30",
                  ].join(" ")}
                >
                  <Icon
                    className={[
                      "w-4 h-4 flex-shrink-0",
                      formData.status === value
                        ? "text-[var(--color-accent)]"
                        : "text-[var(--color-muted)]",
                    ].join(" ")}
                  />
                  <div>
                    <p
                      className={[
                        "text-[11px] font-bold",
                        formData.status === value
                          ? "text-[var(--color-foreground)]"
                          : "text-[var(--color-muted)]",
                      ].join(" ")}
                    >
                      {label}
                    </p>
                    <p className="text-[10px] text-[var(--color-muted)]">{desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Hot Sales promo */}
          <div>
            <button
              type="button"
              onClick={() =>
                setFormData((prev) => ({ ...prev, is_featured: !prev.is_featured }))
              }
              className={[
                "w-full flex items-center justify-between gap-3 px-4 h-14 rounded-2xl border transition-all duration-150 active:scale-[0.99]",
                formData.is_featured
                  ? "border-amber-400/50 bg-amber-500/10"
                  : "border-[var(--color-border)] bg-[var(--color-background)]",
              ].join(" ")}
            >
              <span className="flex items-center gap-2.5">
                <Flame
                  className={[
                    "w-4 h-4",
                    formData.is_featured ? "text-amber-500" : "text-[var(--color-muted)]",
                  ].join(" ")}
                />
                <span
                  className={[
                    "text-sm font-bold",
                    formData.is_featured
                      ? "text-amber-600"
                      : "text-[var(--color-foreground)]",
                  ].join(" ")}
                >
                  Hot Sales Promotion
                </span>
                <span className="text-[10px] font-bold text-[var(--color-muted)]">
                  (GH₵7)
                </span>
              </span>
              <span
                className={[
                  "text-[11px] font-bold px-2.5 py-1 rounded-full",
                  formData.is_featured
                    ? "bg-amber-500/20 text-amber-600"
                    : "bg-[var(--color-border)] text-[var(--color-muted)]",
                ].join(" ")}
              >
                {formData.is_featured ? "On" : "Off"}
              </span>
            </button>
            <p className="text-[10px] text-[var(--color-muted)] mt-1.5 px-1">
              Feature this product in Hot Sales to boost visibility. Payment processed after listing.
            </p>
          </div>
        </Section>

        {/* ── Alert ── */}
        <AnimatePresence>{message && <Alert message={message} />}</AnimatePresence>

        {/* ── Sticky submit button ── */}
        <div className="fixed bottom-0 left-0 right-0 z-20 px-4 pb-6 pt-3 bg-gradient-to-t from-[var(--color-background)] via-[var(--color-background)]/95 to-transparent pointer-events-none">
          <div className="max-w-xl mx-auto pointer-events-auto">
            <Button
              type="submit"
              disabled={!canSubmit}
              className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-sm shadow-lg shadow-black/10"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Listing product…
                </span>
              ) : isCompressing ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Optimising images…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  List Product
                </span>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
