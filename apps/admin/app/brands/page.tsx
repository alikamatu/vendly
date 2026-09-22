'use client';

import React, { useState, useMemo } from 'react';
import {
  Tag,
  Plus,
  Search,
  Trash2,
  Edit2,
  FolderTree,
  Sparkles,
  Award,
  ImagePlus,
  Loader2,
} from 'lucide-react';
import { resizeImageToWebpDataUrl } from '@/lib/image-utils';
import { AdminShell } from '@/components/layout/AdminShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Modal } from '@/components/ui/modal';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableEmpty,
} from '@/components/ui/table';
import { useToast } from '@/contexts/ToastContext';
import { useConfirm } from '@/contexts/ConfirmContext';
import { useBrands } from '@/hooks/use-brands';
import { useCategories } from '@/hooks/use-categories';
import { dateShort } from '@/lib/format';
import type { Brand } from '@/types/operations';

export default function BrandsPage() {
  const {
    brands,
    loading,
    selectedCategoryId,
    setSelectedCategoryId,
    createBrand,
    updateBrand,
    deleteBrand,
  } = useBrands();
  const { categories } = useCategories();
  const { success: toastSuccess, error: toastError } = useToast();
  const { confirm } = useConfirm();

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  async function handleImageFile(file: File) {
    if (!file.type.startsWith('image/')) {
      setImageError('Please choose an image file (PNG, JPG, SVG, WEBP, etc.)');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setImageError('Image must be under 10MB');
      return;
    }
    setImageError(null);
    setUploadingImage(true);
    try {
      const optimized = await resizeImageToWebpDataUrl(file, 800, 0.85);
      const res = await fetch('/api/upload/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: optimized, folder: 'durabel/vendly/brands' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Upload failed');
      setImageUrl(data.imageUrl);
      toastSuccess('Brand logo uploaded successfully');
    } catch (e: any) {
      setImageError(e?.message || 'Upload failed');
      toastError(e?.message || 'Failed to upload brand logo');
    } finally {
      setUploadingImage(false);
    }
  }

  // Filtered brands
  const filteredBrands = useMemo(() => {
    let list = brands;
    if (selectedCategoryId) {
      list = list.filter((b) => b.category_id === selectedCategoryId);
    }
    if (search.trim()) {
      const term = search.trim().toLowerCase();
      list = list.filter(
        (b) =>
          b.name.toLowerCase().includes(term) ||
          (b.category?.name && b.category.name.toLowerCase().includes(term)),
      );
    }
    return list;
  }, [brands, selectedCategoryId, search]);

  const openCreateModal = () => {
    setSelectedBrand(null);
    setName('');
    setCategoryId(categories[0]?.id || '');
    setImageUrl('');
    setUploadingImage(false);
    setImageError(null);
    setModalOpen(true);
  };

  const openEditModal = (brand: Brand) => {
    setSelectedBrand(brand);
    setName(brand.name);
    setCategoryId(brand.category_id);
    setImageUrl(brand.image_url || brand.logo_url || '');
    setUploadingImage(false);
    setImageError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toastError('Brand name is required.');
      return;
    }
    if (!categoryId) {
      toastError('Please select a category for this brand.');
      return;
    }

    setSubmitting(true);
    try {
      if (selectedBrand) {
        await updateBrand(selectedBrand.id, {
          name: name.trim(),
          category_id: categoryId,
          image_url: imageUrl.trim() || undefined,
        });
        toastSuccess('Brand updated successfully.');
      } else {
        await createBrand({
          name: name.trim(),
          category_id: categoryId,
          image_url: imageUrl.trim() || undefined,
        });
        toastSuccess('Brand created successfully.');
      }
      setModalOpen(false);
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (brand: Brand) => {
    const ok = await confirm({
      title: 'Delete Brand',
      description: `Deleting "${brand.name}" will remove it from brand selectors across product creation forms.`,
      details: `Brand: ${brand.name} (ID: ${brand.id})`,
      confirmText: 'Delete Brand',
      variant: 'danger',
      icon: 'trash',
    });
    if (!ok) return;

    setSubmitting(true);
    try {
      await deleteBrand(brand.id);
      toastSuccess(`Brand "${brand.name}" deleted.`);
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to delete brand');
    } finally {
      setSubmitting(false);
    }
  };

  // Metrics
  const totalBrands = brands.length;
  const uniqueCategories = new Set(brands.map((b) => b.category_id)).size;
  const brandsWithLogos = brands.filter((b) => b.image_url || b.logo_url).length;

  return (
    <AdminShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-foreground text-xl font-bold tracking-tight sm:text-2xl">
              Brands Management
            </h2>
            <p className="text-muted-foreground mt-0.5 text-xs sm:text-sm">
              Manage recognized manufacturers, campus stores, labels, and product brands.
            </p>
          </div>
          <Button onClick={openCreateModal} className="shrink-0 gap-2">
            <Plus className="h-4 w-4" />
            Add Brand
          </Button>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="bg-card border-border flex items-center justify-between rounded-2xl border p-4">
            <div>
              <p className="text-muted-foreground text-xs font-medium">Total Brands</p>
              <p className="text-foreground mt-1 text-2xl font-bold">{totalBrands}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500">
              <Tag className="h-5 w-5" />
            </div>
          </div>

          <div className="bg-card border-border flex items-center justify-between rounded-2xl border p-4">
            <div>
              <p className="text-muted-foreground text-xs font-medium">Active Categories</p>
              <p className="text-foreground mt-1 text-2xl font-bold">{uniqueCategories}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
              <FolderTree className="h-5 w-5" />
            </div>
          </div>

          <div className="bg-card border-border flex items-center justify-between rounded-2xl border p-4">
            <div>
              <p className="text-muted-foreground text-xs font-medium">Verified Logos</p>
              <p className="text-foreground mt-1 text-2xl font-bold">{brandsWithLogos}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
              <Award className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <div className="relative w-full sm:w-80">
            <Search className="text-muted-foreground absolute left-3 top-2.5 h-4 w-4" />
            <Input
              placeholder="Search brand name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-9 text-xs"
            />
          </div>

          <div className="w-full sm:w-auto">
            <select
              value={selectedCategoryId || ''}
              onChange={(e) => setSelectedCategoryId(e.target.value || undefined)}
              className="border-border bg-input-bg text-foreground focus:ring-brand h-9 w-full rounded-xl border px-3 text-xs focus:outline-none focus:ring-1 sm:w-56"
            >
              <option value="">All Categories ({categories.length})</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-2 py-20">
            <Spinner size="lg" className="text-brand" />
            <p className="text-muted-foreground text-xs">Loading brands...</p>
          </div>
        ) : filteredBrands.length === 0 ? (
          <TableEmpty
            icon={Tag}
            title="No brands found"
            description={
              search || selectedCategoryId
                ? 'No brands match your filter criteria. Try clearing search filters.'
                : 'No brands registered yet. Click "Add Brand" to create one.'
            }
            action={
              !search && !selectedCategoryId ? (
                <Button size="sm" onClick={openCreateModal}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  Create First Brand
                </Button>
              ) : undefined
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Brand</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBrands.map((brand) => {
                const logo = brand.image_url || brand.logo_url;
                return (
                  <TableRow key={brand.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {logo ? (
                          <img
                            src={logo}
                            alt={brand.name}
                            className="border-border/80 bg-muted/60 h-9 w-9 shrink-0 rounded-xl border object-contain p-1"
                          />
                        ) : (
                          <div className="bg-muted/80 text-muted-foreground flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
                            <Tag className="h-4 w-4" />
                          </div>
                        )}
                        <div>
                          <p className="text-foreground text-sm font-semibold leading-tight">
                            {brand.name}
                          </p>
                          <p className="text-muted-foreground mt-0.5 font-mono text-[11px]">
                            ID: {brand.id.slice(0, 8)}...
                          </p>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge variant="default" className="text-[11px] font-medium">
                        {brand.category?.name || 'Category'}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-muted-foreground text-xs">
                      {brand.created_at ? dateShort(brand.created_at) : '—'}
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(brand)}
                          className="h-8 w-8 p-0"
                          title="Edit Brand"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(brand)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                          title="Delete Brand"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        {/* Create / Edit Brand Modal */}
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={selectedBrand ? 'Edit Brand' : 'Create Brand'}
          description="Register a verified brand and associate it with a catalog category."
          maxWidth="md"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-foreground mb-1.5 block text-xs font-semibold">
                Brand Name <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="e.g. Apple, Nike, Samsung, Oxford University Press"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-9 text-xs"
              />
            </div>

            <div>
              <label className="text-foreground mb-1.5 block text-xs font-semibold">
                Category <span className="text-destructive">*</span>
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
                className="border-border bg-input-bg text-foreground focus:ring-brand h-9 w-full rounded-xl border px-3 text-xs focus:outline-none focus:ring-1"
              >
                <option value="" disabled>
                  Select Category
                </option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <span className="text-foreground mb-1.5 block text-xs font-semibold">Brand Logo</span>
              {imageError && (
                <p className="text-destructive mb-1.5 text-[11px] font-medium">{imageError}</p>
              )}
              <div className="flex items-center gap-3">
                <div className="bg-muted/30 border-border/80 text-muted-foreground/50 flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border p-1">
                  {uploadingImage ? (
                    <Loader2 className="text-brand h-5 w-5 animate-spin" />
                  ) : imageUrl ? (
                    <img
                      src={imageUrl}
                      alt="Logo Preview"
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <ImagePlus className="h-5 w-5" />
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="border-border/80 hover:bg-muted/50 text-foreground inline-flex h-7 cursor-pointer select-none items-center rounded-lg border px-3 text-xs font-medium transition-colors">
                    {uploadingImage ? 'Uploading...' : imageUrl ? 'Replace logo' : 'Upload logo'}
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploadingImage}
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageFile(file);
                        e.target.value = '';
                      }}
                    />
                  </label>
                  {imageUrl && !uploadingImage && (
                    <button
                      type="button"
                      onClick={() => setImageUrl('')}
                      className="text-muted-foreground hover:text-destructive text-left text-[11px] transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="border-border/80 flex items-center justify-end gap-2 border-t pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Saving...
                  </>
                ) : selectedBrand ? (
                  'Update Brand'
                ) : (
                  'Create Brand'
                )}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </AdminShell>
  );
}
