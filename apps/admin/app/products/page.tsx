'use client';

import React, { useState } from 'react';
import {
  Package,
  Search,
  Star,
  Eye,
  CheckCircle2,
  XCircle,
  Archive,
  Store,
  ExternalLink,
} from 'lucide-react';
import { AdminShell } from '@/components/layout/AdminShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Spinner } from '@/components/ui/spinner';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableEmpty,
} from '@/components/ui/table';
import { formatCurrency, dateShort, shortId } from '@/lib/format';
import type { VendlyProduct, ProductStatus } from '@/types/operations';
import { useVendlyProducts } from '@/hooks/use-products';
import { useToast } from '@/contexts/ToastContext';
import { useConfirm } from '@/contexts/ConfirmContext';

export default function ProductsPage() {
  const { products, loading, updateStatus, toggleFeatured } = useVendlyProducts();
  const { success, error: toastError } = useToast();
  const { confirm } = useConfirm();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedProduct, setSelectedProduct] = useState<VendlyProduct | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const filteredProducts = products.filter((p) => {
    const matchesStatus =
      statusFilter === 'ALL' || p.status.toLowerCase() === statusFilter.toLowerCase();
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      p.title.toLowerCase().includes(q) ||
      (p.seller?.store_name && p.seller.store_name.toLowerCase().includes(q)) ||
      (p.category && p.category.toLowerCase().includes(q));
    return matchesStatus && matchesSearch;
  });

  const handleStatusUpdate = async (productId: string, newStatus: ProductStatus) => {
    if (newStatus === 'rejected') {
      const ok = await confirm({
        title: 'Reject Product Listing',
        description:
          'Are you sure you want to reject this merchant listing? It will be taken down from the public marketplace.',
        confirmText: 'Reject Listing',
        variant: 'danger',
      });
      if (!ok) return;
    } else if (newStatus === 'archived') {
      const ok = await confirm({
        title: 'Archive Product Listing',
        description:
          'Are you sure you want to archive this product? Archived listings cannot be purchased by customers.',
        confirmText: 'Archive Listing',
        variant: 'warning',
      });
      if (!ok) return;
    }

    setActionLoading(true);
    try {
      await updateStatus(productId, newStatus);
      success(`Product marked as ${newStatus}`);
      if (selectedProduct?.id === productId) {
        setSelectedProduct((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Status update failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleFeatured = async (productId: string) => {
    setActionLoading(true);
    try {
      const updated = await toggleFeatured(productId);
      success(updated.is_featured ? 'Product featured on marketplace' : 'Product unfeatured');
      if (selectedProduct?.id === productId) {
        setSelectedProduct((prev) => (prev ? { ...prev, is_featured: updated.is_featured } : null));
      }
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <AdminShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-foreground text-xl font-bold tracking-tight sm:text-2xl">
              Catalog & Product Moderation
            </h2>
            <p className="text-muted-foreground mt-0.5 text-xs sm:text-sm">
              Inspect merchant listings, enforce quality guidelines, feature top items, and archive
              obsolete stock.
            </p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <div className="relative w-full sm:w-72">
            <Search className="text-muted-foreground absolute left-3 top-2.5 h-4 w-4" />
            <Input
              placeholder="Search product or store..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-9 text-xs"
            />
          </div>

          <div className="flex w-full items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {['ALL', 'active', 'draft', 'archived', 'rejected'].map((s) => (
              <Button
                key={s}
                size="sm"
                variant={statusFilter === s ? 'primary' : 'outline'}
                onClick={() => setStatusFilter(s)}
                className="h-8 whitespace-nowrap px-3 text-xs capitalize"
              >
                {s === 'ALL' ? 'All Catalog' : s}
              </Button>
            ))}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-2 py-20">
            <Spinner size="lg" className="text-brand" />
            <p className="text-muted-foreground text-xs">Loading catalog...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <TableEmpty
            icon={Package}
            title="No products found"
            description="No items match your catalog query."
          />
        ) : (
          <Table>
            <TableHeader>
              <tr>
                <TableHead>Product</TableHead>
                <TableHead>Store / Merchant</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Featured</TableHead>
                <TableHead>Views</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((p) => {
                const statusVariant =
                  p.status.toLowerCase() === 'active'
                    ? 'success'
                    : p.status.toLowerCase() === 'draft'
                      ? 'warning'
                      : p.status.toLowerCase() === 'rejected'
                        ? 'danger'
                        : 'default';

                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {p.image_urls?.[0] ? (
                          <img
                            src={p.image_urls[0]}
                            alt={p.title}
                            className="border-border bg-muted h-9 w-9 shrink-0 rounded-lg border object-cover"
                          />
                        ) : (
                          <div className="bg-muted text-muted-foreground flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
                            <Package className="h-4 w-4" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-foreground max-w-[200px] truncate font-medium">
                            {p.title}
                          </p>
                          <p className="text-muted-foreground font-mono text-[10px]">
                            #{shortId(p.id, 8)}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-foreground flex items-center gap-1.5 text-xs">
                        <Store className="text-muted-foreground h-3 w-3" />
                        <span>{p.seller?.store_name || 'Direct Seller'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {p.category || 'General'}
                    </TableCell>
                    <TableCell className="text-foreground font-semibold">
                      {formatCurrency(p.price, p.currency)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant} dot>
                        {p.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => handleToggleFeatured(p.id)}
                        className="hover:bg-muted text-muted-foreground rounded p-1 transition-colors hover:text-amber-400"
                        title="Toggle featured status"
                      >
                        <Star
                          className={`h-4 w-4 ${
                            p.is_featured
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-muted-foreground'
                          }`}
                        />
                      </button>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {p.views_count || 0}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedProduct(p);
                          setDetailModalOpen(true);
                        }}
                        className="h-7 px-2.5 text-xs"
                      >
                        <Eye className="mr-1 h-3 w-3" />
                        Inspect
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        {/* Product Inspection Modal */}
        <Modal
          isOpen={detailModalOpen}
          onClose={() => setDetailModalOpen(false)}
          title={selectedProduct?.title || 'Product Inspection'}
          description={`Merchant: ${selectedProduct?.seller?.store_name || 'Direct'}`}
          maxWidth="xl"
        >
          {selectedProduct && (
            <div className="space-y-5 text-xs">
              {/* Media gallery */}
              {selectedProduct.image_urls && selectedProduct.image_urls.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-2">
                  {selectedProduct.image_urls.map((url, idx) => (
                    <a
                      key={idx}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0"
                    >
                      <img
                        src={url}
                        alt={`Preview ${idx}`}
                        className="border-border h-20 w-20 rounded-xl border object-cover transition-opacity hover:opacity-80"
                      />
                    </a>
                  ))}
                </div>
              )}

              {/* Details grid */}
              <div className="bg-muted/40 border-border grid grid-cols-2 gap-3 rounded-xl border p-3.5">
                <div>
                  <span className="text-muted-foreground text-[11px]">Price</span>
                  <p className="text-foreground mt-0.5 text-sm font-semibold">
                    {formatCurrency(selectedProduct.price, selectedProduct.currency)}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground text-[11px]">Stock Available</span>
                  <p className="text-foreground mt-0.5 font-semibold">
                    {selectedProduct.quantity_available} units
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground text-[11px]">Condition</span>
                  <p className="text-foreground mt-0.5 font-semibold">
                    {selectedProduct.condition || 'New'}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground text-[11px]">Category</span>
                  <p className="text-foreground mt-0.5 font-semibold">{selectedProduct.category}</p>
                </div>
              </div>

              {selectedProduct.description && (
                <div className="space-y-1">
                  <span className="text-muted-foreground text-[11px]">Description</span>
                  <p className="bg-card border-border text-foreground rounded-xl border p-3 leading-relaxed">
                    {selectedProduct.description}
                  </p>
                </div>
              )}

              {/* Moderation Controls */}
              <div className="border-border space-y-2 border-t pt-3">
                <span className="text-muted-foreground text-[11px]">Moderation Decision:</span>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={actionLoading || selectedProduct.status === 'active'}
                    onClick={() => handleStatusUpdate(selectedProduct.id, 'active')}
                    className="h-8 border-emerald-500/30 text-xs text-emerald-500 hover:bg-emerald-500/10"
                  >
                    <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                    Approve (Active)
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={actionLoading || selectedProduct.status === 'rejected'}
                    onClick={() => handleStatusUpdate(selectedProduct.id, 'rejected')}
                    className="h-8 border-rose-500/30 text-xs text-rose-500 hover:bg-rose-500/10"
                  >
                    <XCircle className="mr-1 h-3.5 w-3.5" />
                    Reject Listing
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={actionLoading || selectedProduct.status === 'archived'}
                    onClick={() => handleStatusUpdate(selectedProduct.id, 'archived')}
                    className="text-muted-foreground h-8 text-xs"
                  >
                    <Archive className="mr-1 h-3.5 w-3.5" />
                    Archive
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </AdminShell>
  );
}
