"use client";

import React, { useState, useRef, useEffect, use } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, 
  Plus, 
  X, 
  Image as ImageIcon, 
  Loader2, 
  Check, 
  Info,
  Tag,
  LayoutGrid,
  ShoppingBag,
  AlertCircle
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import { useAuth } from "@/lib/auth-context";
import { productApi } from "@/lib/api/product";
import imageCompression from 'browser-image-compression';

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { token } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [isCompressing, setIsCompressing] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    currency: "GHS",
    condition: "new",
    quantity_available: "1",
    status: "draft",
    category: "",
    tagInput: "",
    tags: [] as string[],
    attributes: {} as Record<string, string>,
  });

  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [video, setVideo] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [existingVideo, setExistingVideo] = useState<string | null>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  
  const [categories, setCategories] = useState<{id: string, name: string, fields: any[]}[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [cats, product] = await Promise.all([
          productApi.getCategories(),
          productApi.getProductById(id)
        ]);

        setCategories(cats);
        
        // Populate form
        setFormData({
          title: product.title,
          description: product.description || "",
          price: product.price.toString(),
          currency: product.currency || "GHS",
          condition: product.condition || "new",
          quantity_available: product.quantity_available.toString(),
          status: product.status,
          category: product.category,
          tagInput: "",
          tags: product.tags || [],
          attributes: product.attributes || {},
        });

        setExistingImages(product.image_urls || []);
        if (product.video_url) {
          setExistingVideo(product.video_url);
        }
      } catch (err: any) {
        setError(err.message || "Failed to fetch product data");
      } finally {
        setIsFetching(false);
      }
    };
    
    if (token) fetchData();
  }, [id, token]);

  // optionally render error message on screen
  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 mt-20 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4 opacity-20" />
        <h2 className="text-xl font-black uppercase tracking-tight mb-2">Error Loading Product</h2>
        <p className="text-[10px] text-muted font-bold uppercase tracking-widest mb-8">{error}</p>
        <Link href="/dashboard/products">
           <Button variant="secondary" className="rounded-2xl px-8">Back to products</Button>
        </Link>
      </div>
    );
  }

  const handleCategoryChange = (catName: string) => {
    const selectedCat = categories.find(c => c.name === catName);
    const newAttributes = (selectedCat?.fields || []).reduce((acc: any, field: any) => ({
      ...acc,
      [field.name]: field.defaultValue || ""
    }), {});

    setFormData({
      ...formData,
      category: catName,
      attributes: newAttributes
    });
  };

  const handleAttributeChange = (name: string, value: string) => {
    setFormData({
      ...formData,
      attributes: {
        ...formData.attributes,
        [name]: value
      }
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + images.length + existingImages.length > 3) {
      setMessage({ type: "error", text: "Maximum 3 images allowed" });
      return;
    }

    setIsCompressing(true);
    setMessage(null);

    try {
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        fileType: "image/webp" as string,
      };

      const compressedFiles: File[] = [];
      const newPreviews: string[] = [];

      for (const file of files) {
        try {
          let fileToCompress = file;
          const fileName = file.name.toLowerCase();
          if (
            fileName.endsWith('.heic') || 
            fileName.endsWith('.heif') || 
            file.type === 'image/heic' || 
            file.type === 'image/heif'
          ) {
            setMessage({ type: "info", text: "Converting HEIC image..." });
            const heic2any = (await import('heic2any')).default;
            const convertedBlob = await heic2any({
              blob: file,
              toType: "image/jpeg",
              quality: 0.8,
            });
            const finalBlob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
            fileToCompress = new File([finalBlob], file.name.replace(/\.(heic|heif)$/i, ".jpg"), {
              type: "image/jpeg",
            });
            setMessage({ type: "info", text: "Optimizing..." });
          }

          const compressedFile = await imageCompression(fileToCompress, options);
          const webpFile = new File([compressedFile], compressedFile.name.replace(/\.[^/.]+$/, ".webp"), {
            type: "image/webp",
          });
          compressedFiles.push(webpFile);
          
          const reader = new FileReader();
          const base64 = await new Promise<string>((resolve) => {
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(webpFile);
          });
          newPreviews.push(base64);
        } catch (error) {
          console.error("Error compressing image:", error);
          setMessage({ type: "error", text: "Failed to process one or more images" });
        }
      }

      setImages((prev) => [...prev, ...compressedFiles]);
      setPreviews((prev) => [...prev, ...newPreviews]);
      if (compressedFiles.length > 0) {
        setMessage({ type: "success", text: "Images optimized for web!" });
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "Failed to compress images" });
    } finally {
      setIsCompressing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      setMessage({ type: "error", text: "Please upload a valid video file" });
      return;
    }

    const MAX_VIDEO_BYTES = 60 * 1024 * 1024;
    if (file.size > MAX_VIDEO_BYTES) {
      setMessage({ type: "error", text: "Video is too large. Max 60MB." });
      e.target.value = "";
      return;
    }

    const url = URL.createObjectURL(file);
    const videoEl = document.createElement("video");
    videoEl.preload = "metadata";
    setVideo(file);
    setVideoPreview(url);
    setExistingVideo(null); // Replace existing
    videoEl.src = url;
  };

  const removeVideo = () => {
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview);
    }
    setVideo(null);
    setVideoPreview(null);
    setExistingVideo(null);
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
    setPreviews(previews.filter((_, i) => i !== index));
  };

  const removeExistingImage = (url: string) => {
    setExistingImages(existingImages.filter(u => u !== url));
  };

  const addTag = () => {
    if (formData.tagInput.trim() && !formData.tags.includes(formData.tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, formData.tagInput.trim()],
        tagInput: ""
      });
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToRemove)
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (images.length === 0 && existingImages.length === 0 && !video && !existingVideo) {
      setMessage({ type: "error", text: "Please have at least one product image or video" });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      await productApi.updateProduct(
        token,
        id,
        {
          title: formData.title,
          description: formData.description,
          price: formData.price,
          currency: formData.currency,
          condition: formData.condition,
          quantity_available: formData.quantity_available,
          status: formData.status,
          category: formData.category,
          tags: formData.tags,
          attributes: formData.attributes,
        },
        images,
        video,
        existingImages
      );
      
      setMessage({ type: "success", text: "Product updated successfully!" });
      setTimeout(() => router.push("/dashboard/products"), 2000);
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to update product" });
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20">
      <Link 
        href="/dashboard/products"
        className="inline-flex items-center gap-2 text-xs font-bold text-muted hover:text-foreground transition-colors group mb-2"
      >
        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
        Back to Inventory
      </Link>

      <div className="px-2">
        <h2 className="text-md font-black tracking-tight uppercase">Edit Product</h2>
        <p className="text-xs text-muted font-medium mt-1">Refine your listing details</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Media */}
        <div className="space-y-3">
          <label className="text-[10px] font-bold text-muted uppercase tracking-widest px-4">
            Product Media
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-2">
            {/* Images */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-muted uppercase tracking-widest">Photos (Max 3)</p>
              <div className="grid grid-cols-3 gap-3">
                <AnimatePresence>
                  {existingImages.map((src) => (
                    <motion.div 
                      key={src}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="relative group aspect-square rounded-2xl overflow-hidden border border-border"
                    >
                      <img src={src} alt="Product" className="w-full h-full object-cover" />
                      <button 
                        type="button"
                        onClick={() => removeExistingImage(src)}
                        className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </motion.div>
                  ))}
                  {previews.map((src, idx) => (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="relative group aspect-square rounded-2xl overflow-hidden border border-primary/30"
                    >
                      <img src={src} alt="Product" className="w-full h-full object-cover" />
                      <div className="absolute top-1 left-1 bg-primary text-[6px] font-black px-1 rounded text-white uppercase italic">New</div>
                      <button 
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </motion.div>
                  ))}
                  {(previews.length + existingImages.length) < 3 && (
                    <motion.div className="aspect-square">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isCompressing}
                        className="w-full h-full rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 text-muted hover:border-primary/50 hover:text-primary transition-all disabled:opacity-50"
                      >
                        {isCompressing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" multiple />
            </div>

            {/* Video */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-muted uppercase tracking-widest">Video (Trims to 5s)</p>
              <div>
                {videoPreview || existingVideo ? (
                  <div className="relative rounded-2xl overflow-hidden border border-border aspect-square md:aspect-auto md:h-[106px]">
                    <video
                      src={videoPreview || existingVideo!}
                      className="w-full h-full object-cover"
                      autoPlay muted loop
                    />
                    <button
                      type="button"
                      onClick={removeVideo}
                      className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => videoInputRef.current?.click()}
                    className="w-full h-[106px] rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted hover:border-primary/50 transition-all text-[9px] font-bold uppercase tracking-wider"
                  >
                    <ImageIcon className="w-4 h-4" />
                    <span>Upload Short Clip (Auto-trims to 5s)</span>
                  </button>
                )}
              </div>
              <input type="file" ref={videoInputRef} onChange={handleVideoChange} className="hidden" accept="video/*" />
            </div>
          </div>
        </div>

        <Card className="p-6 md:p-8 space-y-6 border-none shadow-sm" hoverEffect={false}>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-muted uppercase tracking-widest px-1">Product Title</label>
              <div className="relative">
                <ShoppingBag className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <Input 
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="Ex: iPhone 13 Case"
                  required
                  className="h-12 pl-12 bg-background/50 text-xs font-bold"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-muted uppercase tracking-widest px-1">Price (GH₵)</label>
              <Input 
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({...formData, price: e.target.value})}
                placeholder="0.00"
                required
                className="h-12 bg-background/50 text-xs font-bold"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-muted uppercase tracking-widest px-1">Condition</label>
              <select 
                value={formData.condition}
                onChange={(e) => setFormData({...formData, condition: e.target.value})}
                className="w-full h-12 px-4 bg-background/50 border border-border/50 rounded-2xl text-xs font-bold outline-none"
              >
                <option value="new">New</option>
                <option value="used_like_new">Used - Like New</option>
                <option value="used_good">Used - Good</option>
                <option value="used_fair">Used - Fair</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-muted uppercase tracking-widest px-1">Quantity</label>
              <Input 
                type="number"
                min="0"
                value={formData.quantity_available}
                onChange={(e) => setFormData({...formData, quantity_available: e.target.value})}
                className="h-12 bg-background/50 text-xs font-bold"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-muted uppercase tracking-widest px-1">Status</label>
              <select 
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value})}
                className="w-full h-12 px-4 bg-background/50 border border-border/50 rounded-2xl text-xs font-bold outline-none"
              >
                <option value="draft">Draft (Hidden)</option>
                <option value="active">Active (Visible)</option>
                <option value="out_of_stock">Out of Stock</option>
              </select>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-muted uppercase tracking-widest px-1">Category</label>
              <div className="relative">
                <LayoutGrid className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <select 
                  value={formData.category}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full h-12 pl-12 pr-4 bg-background/50 border border-border/50 rounded-2xl text-xs font-bold outline-none appearance-none"
                >
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-muted uppercase tracking-widest px-1">Tags (Press Enter)</label>
              <div className="relative">
                <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <Input 
                  value={formData.tagInput}
                  onChange={(e) => setFormData({...formData, tagInput: e.target.value})}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  placeholder="new, trending..."
                  className="h-12 pl-12 bg-background/50 text-xs font-bold"
                />
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.tags.map(tag => (
                  <span key={tag} className="flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary text-[10px] font-bold rounded-full">
                    {tag}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => removeTag(tag)} />
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-muted uppercase tracking-widest px-1">Description</label>
            <Textarea 
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Tell customers more about this item..."
              className="min-h-[120px] bg-background/50 text-xs font-medium py-4"
            />
          </div>
        </Card>

        {message && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`p-4 rounded-2xl flex items-center gap-3 ${
              message.type === "success" ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
            }`}
          >
            <Info className="w-4 h-4" />
            <p className="text-xs font-bold uppercase tracking-wider">{message.text}</p>
          </motion.div>
        )}

        <div className="flex gap-4">
           <Button 
             type="button" 
             variant="secondary"
             onClick={() => router.back()}
             className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest text-xs border-border/50"
           >
             Cancel
           </Button>
           <Button 
             type="submit" 
             disabled={isLoading}
             className="flex-[2] h-14 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20"
           >
             {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save Changes"}
           </Button>
        </div>
      </form>
    </div>
  );
}
