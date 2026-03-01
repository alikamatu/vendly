"use client";

import React, { useState, useRef, useEffect } from "react";
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
  ShoppingBag
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import { useAuth } from "@/lib/auth-context";
import { productApi } from "@/lib/api/product";

export default function AddProductPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    category: "",
    tagInput: "",
    tags: [] as string[],
  });

  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [categories, setCategories] = useState<{id: string, name: string}[]>([]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const cats = await productApi.getCategories();
        setCategories(cats);
        if (cats.length > 0) setFormData(prev => ({ ...prev, category: cats[0].name }));
      } catch (err) {
        console.error("Failed to fetch categories", err);
      }
    };
    fetchCategories();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + images.length > 3) {
      setMessage({ type: "error", text: "Maximum 3 images allowed" });
      return;
    }

    const newImages = [...images, ...files];
    setImages(newImages);

    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
    setPreviews(previews.filter((_, i) => i !== index));
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
    if (images.length === 0) {
      setMessage({ type: "error", text: "Please add at least one product image" });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      await productApi.createProduct(token, {
        title: formData.title,
        description: formData.description,
        price: formData.price,
        category: formData.category,
        tags: formData.tags
      }, images);
      
      setMessage({ type: "success", text: "Product added successfully!" });
      setTimeout(() => router.push("/dashboard"), 2000);
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to add product" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20">
      <Link 
        href="/dashboard"
        className="inline-flex items-center gap-2 text-xs font-bold text-muted hover:text-foreground transition-colors group mb-2"
      >
        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
        Back to Dashboard
      </Link>

      <div className="px-2">
        <h2 className="text-md font-black tracking-tight uppercase">Add New Product</h2>
        <p className="text-xs text-muted font-medium mt-1">Get your item ready for sale</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Images */}
        <div className="space-y-3">
          <label className="text-[10px] font-bold text-muted uppercase tracking-widest px-4">Product Images (Max 3)</label>
          <div className="grid grid-cols-3 gap-3 px-2">
            <AnimatePresence>
              {previews.map((src, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="relative group aspect-square rounded-2xl overflow-hidden border border-border"
                >
                  <img src={src} alt="Product" className="w-full h-full object-cover" />
                  <button 
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </motion.div>
              ))}
              {previews.length < 3 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="aspect-square"
                >
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-full rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 text-muted hover:border-primary/50 hover:text-primary transition-all"
                  >
                    <Plus className="w-5 h-5" />
                    <span className="text-[10px] font-bold">Add Image</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
            accept="image/*" 
            multiple
          />
        </div>

        <Card className="p-6 md:p-8 space-y-6 border-none shadow-sm" hoverEffect={false}>
          {/* Title & Price */}
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

          {/* Category & Tags */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-muted uppercase tracking-widest px-1">Category</label>
              <div className="relative">
                <LayoutGrid className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <select 
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="w-full h-12 pl-12 pr-4 bg-background/50 border border-border/50 rounded-2xl text-xs font-bold outline-none focus:border-primary/50 appearance-none"
                  required
                >
                  {categories.length > 0 ? (
                    categories.map(cat => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))
                  ) : (
                    <>
                      <option value="Electronics">Electronics</option>
                      <option value="Fashion">Fashion</option>
                      <option value="Home">Home</option>
                    </>
                  )}
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
            <label className="text-[10px] font-bold text-muted uppercase tracking-widest px-1">Description (Optional)</label>
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
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-2xl flex items-center gap-3 ${
              message.type === "success" ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
            }`}
          >
            <div className={`p-1 rounded-full ${message.type === "success" ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
               {message.type === "success" ? <Check className="w-4 h-4" /> : <Info className="w-4 h-4" />}
            </div>
            <p className="text-xs font-bold">{message.text}</p>
          </motion.div>
        )}

        <Button 
          type="submit" 
          disabled={isLoading}
          className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-xs"
        >
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "List Product"}
        </Button>
      </form>
    </div>
  );
}
