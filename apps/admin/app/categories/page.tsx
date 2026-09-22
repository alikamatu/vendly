'use client';

import React, { useState, useMemo } from 'react';
import {
  FolderTree,
  Plus,
  Search,
  Trash2,
  Edit2,
  Sliders,
  Layers,
  X,
  ExternalLink,
  Tag,
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
import { useCategories } from '@/hooks/use-categories';
import { dateShort } from '@/lib/format';
import type { Category, CategoryField } from '@/types/operations';

export default function CategoriesPage() {
  const { categories, loading, createCategory, updateCategory, deleteCategory } = useCategories();
  const { success: toastSuccess, error: toastError } = useToast();
  const { confirm } = useConfirm();

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [fields, setFields] = useState<CategoryField[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  async function handleImageFile(file: File) {
    if (!file.type.startsWith('image/')) {
      setImageError('Please choose an image file (PNG, JPG, WEBP, etc.)');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setImageError('Image must be under 10MB');
      return;
    }
    setImageError(null);
    setUploadingImage(true);
    try {
      const optimized = await resizeImageToWebpDataUrl(file, 1000, 0.82);
      const res = await fetch('/api/upload/category-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: optimized }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Upload failed');
      setImageUrl(data.imageUrl);
      toastSuccess('Cover photo uploaded successfully');
    } catch (e: any) {
      setImageError(e?.message || 'Upload failed');
      toastError(e?.message || 'Failed to upload cover photo');
    } finally {
      setUploadingImage(false);
    }
  }

  // Filtered categories
  const filteredCategories = useMemo(() => {
    if (!search.trim()) return categories;
    const term = search.trim().toLowerCase();
    return categories.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        (c.description && c.description.toLowerCase().includes(term)),
    );
  }, [categories, search]);

  const openCreateModal = () => {
    setSelectedCategory(null);
    setName('');
    setDescription('');
    setImageUrl('');
    setFields([]);
    setUploadingImage(false);
    setImageError(null);
    setModalOpen(true);
  };

  const openEditModal = (category: Category) => {
    setSelectedCategory(category);
    setName(category.name);
    setDescription(category.description || '');
    setImageUrl(category.image_url || '');
    setFields(category.fields ? [...category.fields] : []);
    setUploadingImage(false);
    setImageError(null);
    setModalOpen(true);
  };

  const handleAddField = () => {
    setFields((prev) => [
      ...prev,
      {
        key: `field_${Date.now()}`,
        label: '',
        type: 'text',
        required: false,
        options: [],
      },
    ]);
  };

  const handleUpdateField = (index: number, updates: Partial<CategoryField>) => {
    setFields((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...updates };
      if (updates.label && (!copy[index].key || copy[index].key.startsWith('field_'))) {
        copy[index].key = updates.label
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_+|_+$/g, '');
      }
      return copy;
    });
  };

  const handleRemoveField = (index: number) => {
    setFields((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toastError('Category name is required.');
      return;
    }

    setSubmitting(true);
    try {
      const validFields = fields
        .filter((f) => f.label.trim())
        .map((f) => ({
          ...f,
          key: f.key.trim() || f.label.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
          label: f.label.trim(),
        }));

      if (selectedCategory) {
        await updateCategory(selectedCategory.id, {
          name: name.trim(),
          description: description.trim() || undefined,
          image_url: imageUrl.trim() || undefined,
          fields: validFields,
        });
        toastSuccess('Category updated successfully.');
      } else {
        await createCategory({
          name: name.trim(),
          description: description.trim() || undefined,
          image_url: imageUrl.trim() || undefined,
          fields: validFields,
        });
        toastSuccess('Category created successfully.');
      }
      setModalOpen(false);
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (cat: Category) => {
    const ok = await confirm({
      title: 'Delete Category',
      description: `Deleting "${cat.name}" will remove it from category selectors. If products are currently listed under this category, deletion will be blocked by the server.`,
      details: `Category: ${cat.name} (Slug: ${cat.slug})`,
      confirmText: 'Delete Category',
      variant: 'danger',
      icon: 'trash',
    });
    if (!ok) return;

    setSubmitting(true);
    try {
      await deleteCategory(cat.id);
      toastSuccess(`Category "${cat.name}" deleted.`);
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to delete category');
    } finally {
      setSubmitting(false);
    }
  };

  // Metrics
  const totalCategories = categories.length;
  const categoriesWithFields = categories.filter((c) => c.fields && c.fields.length > 0).length;

  return (
    <AdminShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-foreground text-xl font-bold tracking-tight sm:text-2xl">
              Categories Management
            </h2>
            <p className="text-muted-foreground mt-0.5 text-xs sm:text-sm">
              Organize marketplace catalog, configure dynamic schema attributes, and manage product
              taxonomy.
            </p>
          </div>
          <Button onClick={openCreateModal} className="shrink-0 gap-2">
            <Plus className="h-4 w-4" />
            Add Category
          </Button>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="bg-card border-border flex items-center justify-between rounded-2xl border p-4">
            <div>
              <p className="text-muted-foreground text-xs font-medium">Total Categories</p>
              <p className="text-foreground mt-1 text-2xl font-bold">{totalCategories}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
              <FolderTree className="h-5 w-5" />
            </div>
          </div>

          <div className="bg-card border-border flex items-center justify-between rounded-2xl border p-4">
            <div>
              <p className="text-muted-foreground text-xs font-medium">Dynamic Schema Categories</p>
              <p className="text-foreground mt-1 text-2xl font-bold">{categoriesWithFields}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
              <Sliders className="h-5 w-5" />
            </div>
          </div>

          <div className="bg-card border-border flex items-center justify-between rounded-2xl border p-4">
            <div>
              <p className="text-muted-foreground text-xs font-medium">Platform Taxonomy</p>
              <p className="text-muted-foreground mt-1.5 text-xs">
                Standardized categories for student listings and search indexing.
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-500">
              <Layers className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="text-muted-foreground absolute left-3 top-2.5 h-4 w-4" />
            <Input
              placeholder="Search category name or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-9 text-xs"
            />
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-2 py-20">
            <Spinner size="lg" className="text-brand" />
            <p className="text-muted-foreground text-xs">Loading categories...</p>
          </div>
        ) : filteredCategories.length === 0 ? (
          <TableEmpty
            icon={FolderTree}
            title="No categories found"
            description={
              search
                ? `No categories match "${search}". Try searching for something else.`
                : 'No categories created yet. Click "Add Category" to get started.'
            }
            action={
              !search ? (
                <Button size="sm" onClick={openCreateModal}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  Create First Category
                </Button>
              ) : undefined
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Custom Attributes</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCategories.map((cat) => (
                <TableRow key={cat.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {cat.image_url ? (
                        <img
                          src={cat.image_url}
                          alt={cat.name}
                          className="border-border/80 bg-muted h-10 w-10 shrink-0 rounded-xl border object-cover"
                        />
                      ) : (
                        <div className="bg-muted/80 text-muted-foreground flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                          <FolderTree className="h-5 w-5" />
                        </div>
                      )}
                      <div>
                        <p className="text-foreground text-sm font-semibold leading-tight">
                          {cat.name}
                        </p>
                        <p className="text-muted-foreground mt-0.5 font-mono text-[11px]">
                          ID: {cat.id.slice(0, 8)}...
                        </p>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <p className="text-muted-foreground line-clamp-2 max-w-sm text-xs">
                      {cat.description || '—'}
                    </p>
                  </TableCell>

                  <TableCell>
                    {cat.fields && cat.fields.length > 0 ? (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant="default" className="text-[10px] font-medium">
                          {cat.fields.length} attribute{cat.fields.length > 1 ? 's' : ''}
                        </Badge>
                        <span className="text-muted-foreground text-[11px]">
                          (
                          {cat.fields
                            .slice(0, 2)
                            .map((f) => f.label)
                            .join(', ')}
                          {cat.fields.length > 2 ? '...' : ''})
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">Default fields</span>
                    )}
                  </TableCell>

                  <TableCell className="text-muted-foreground text-xs">
                    {cat.created_at ? dateShort(cat.created_at) : '—'}
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal(cat)}
                        className="h-8 w-8 p-0"
                        title="Edit Category"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(cat)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                        title="Delete Category"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Create / Edit Category Modal */}
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={selectedCategory ? 'Edit Category' : 'Create Category'}
          description="Configure category name, visual icon/image, and specific attribute schemas."
          maxWidth="xl"
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-4">
              <div>
                <label className="text-foreground mb-1.5 block text-xs font-semibold">
                  Category Name <span className="text-destructive">*</span>
                </label>
                <Input
                  placeholder="e.g. Laptops & Computers, Textbooks, Sneakers"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="h-9 text-xs"
                />
              </div>

              <div>
                <label className="text-foreground mb-1.5 block text-xs font-semibold">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Brief description for category browsing..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="border-border bg-input-bg text-foreground focus:ring-brand w-full rounded-xl border p-2.5 text-xs leading-relaxed focus:outline-none focus:ring-1"
                />
              </div>

              <div>
                <span className="text-foreground mb-1.5 block text-xs font-semibold">
                  Cover Photo
                </span>
                {imageError && (
                  <p className="text-destructive mb-1.5 text-[11px] font-medium">{imageError}</p>
                )}
                <div className="flex items-center gap-3">
                  <div className="bg-muted/30 border-border/80 text-muted-foreground/50 flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border">
                    {uploadingImage ? (
                      <Loader2 className="text-brand h-5 w-5 animate-spin" />
                    ) : imageUrl ? (
                      <img
                        src={imageUrl}
                        alt="Cover Preview"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <ImagePlus className="h-5 w-5" />
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="border-border/80 hover:bg-muted/50 text-foreground inline-flex h-7 cursor-pointer select-none items-center rounded-lg border px-3 text-xs font-medium transition-colors">
                      {uploadingImage
                        ? 'Uploading...'
                        : imageUrl
                          ? 'Replace image'
                          : 'Upload image'}
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

              {/* Dynamic Schema Fields */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-foreground block text-xs font-semibold">
                      Custom Category Attributes
                    </label>
                    <p className="text-muted-foreground text-[11px]">
                      Define schema fields that sellers complete when listing in this category.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddField}
                    className="h-7 px-2.5 text-xs"
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Add Attribute
                  </Button>
                </div>

                {fields.length === 0 ? (
                  <div className="bg-muted/40 border-border text-muted-foreground rounded-xl border border-dashed p-3 text-center text-xs">
                    No custom attributes added. Items in this category will use default marketplace
                    fields.
                  </div>
                ) : (
                  <div className="max-h-60 space-y-2.5 overflow-y-auto pr-1">
                    {fields.map((field, idx) => (
                      <div
                        key={idx}
                        className="bg-card border-border space-y-2 rounded-xl border p-3 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <Input
                            placeholder="Label (e.g. RAM, Storage)"
                            value={field.label}
                            onChange={(e) => handleUpdateField(idx, { label: e.target.value })}
                            className="h-8 flex-1 text-xs"
                          />
                          <select
                            value={field.type}
                            onChange={(e) =>
                              handleUpdateField(idx, {
                                type: e.target.value as CategoryField['type'],
                              })
                            }
                            className="border-border bg-input-bg text-foreground focus:ring-brand h-8 rounded-lg border px-2.5 text-xs focus:outline-none focus:ring-1"
                          >
                            <option value="text">Text</option>
                            <option value="number">Number</option>
                            <option value="select">Dropdown Select</option>
                            <option value="boolean">Yes/No Switch</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => handleRemoveField(idx)}
                            className="text-muted-foreground hover:text-destructive rounded p-1 transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>

                        {field.type === 'select' && (
                          <div>
                            <Input
                              placeholder="Comma-separated options: 64GB, 128GB, 256GB"
                              value={field.options ? field.options.join(', ') : ''}
                              onChange={(e) =>
                                handleUpdateField(idx, {
                                  options: e.target.value
                                    .split(',')
                                    .map((s) => s.trim())
                                    .filter(Boolean),
                                })
                              }
                              className="h-7 text-xs"
                            />
                          </div>
                        )}

                        <div className="text-muted-foreground flex items-center gap-4 text-[11px]">
                          <span>
                            Key: <code className="text-foreground">{field.key}</code>
                          </span>
                          <label className="flex cursor-pointer select-none items-center gap-1.5">
                            <input
                              type="checkbox"
                              checked={field.required || false}
                              onChange={(e) =>
                                handleUpdateField(idx, { required: e.target.checked })
                              }
                              className="border-border text-brand focus:ring-brand h-3.5 w-3.5 rounded"
                            />
                            Required for listing
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
                ) : selectedCategory ? (
                  'Update Category'
                ) : (
                  'Create Category'
                )}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </AdminShell>
  );
}
