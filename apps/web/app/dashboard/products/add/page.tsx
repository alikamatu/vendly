'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Sparkles, Layers, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/contexts/auth-context';
import { productApi } from '@/lib/api/product';
import ProductForm, { ProductFormData } from '@/components/products/ProductForm';
import BatchProductNotesForm from '@/components/products/BatchProductNotesForm';

export default function AddProductPage() {
  const router = useRouter();
  const { token, isAuthenticated, isLoading: authLoading } = useAuth();
  const [mode, setMode] = useState<'batch-notes' | 'classic'>('batch-notes');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Single-product classic submission handler
  const handleClassicSubmit = async ({
    data,
    images,
    video,
  }: {
    data: ProductFormData;
    images: File[];
    video: File | null;
    existingImages: string[];
  }) => {
    if (!token) {
      toast.error('You must be logged in to create a product');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await productApi.createProduct(
        token,
        {
          title: data.title.trim(),
          description: data.description.trim(),
          price: data.price,
          original_price: data.original_price || undefined,
          currency: data.currency || 'GHS',
          condition: data.condition || 'new',
          quantity_available: data.quantity_available || '1',
          status: data.status || 'active',
          category: data.category || 'General',
          brand: data.brand || undefined,
          tags: data.tags,
          attributes: data.attributes,
        },
        images,
        video,
      );

      const productId = created?.product?.id;

      if (data.is_featured && productId) {
        try {
          const init = await productApi.initializeHotSalesPayment(token, productId);
          if (init?.checkout_url) {
            toast.success('Product created! Redirecting to boost checkout...');
            window.location.href = init.checkout_url;
            return;
          }
        } catch (paymentErr: any) {
          console.error('Hot sales payment initialization error:', paymentErr);
          toast.warning(
            'Product created, but Hot Sales checkout failed to start. You can boost it later from the product page.',
          );
        }
      }

      toast.success('Product published successfully!');
      if (productId) {
        router.push(`/dashboard/products/${productId}`);
      } else {
        router.push('/dashboard/products');
      }
    } catch (err: any) {
      console.error('Error creating product:', err);
      toast.error(err?.message || 'Failed to create product. Please check your inputs.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Default: Mobile-first Apple Notes Multiple Product Creator
  if (mode === 'batch-notes') {
    return (
      <div className="min-h-screen bg-zinc-50/70 dark:bg-[#121214]">
        {/* Subtle Mode Switcher Ribbon */}
        <div className="mx-auto flex max-w-4xl items-center justify-end px-4 pt-2 sm:px-6">
          <button
            type="button"
            onClick={() => setMode('classic')}
            className="text-[11px] font-medium text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
          >
            Switch to classic detailed form →
          </button>
        </div>

        <BatchProductNotesForm
          onCancel={() => router.push('/dashboard/products')}
          onSuccess={(ids) => {
            if (ids.length === 1) {
              router.push(`/dashboard/products/${ids[0]}`);
            } else {
              router.push('/dashboard/products');
            }
          }}
        />
      </div>
    );
  }

  // Fallback: Classic Detailed Form
  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
      {/* Header & Navigation */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard/products"
            className="group mb-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] transition-colors hover:text-[var(--color-foreground)]"
          >
            <div className="group-hover:border-[var(--color-foreground)]/30 flex h-7 w-7 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] transition-all">
              <ArrowLeft className="h-3.5 w-3.5" />
            </div>
            Back to products
          </Link>

          <button
            type="button"
            onClick={() => setMode('batch-notes')}
            className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-600 transition-colors hover:bg-amber-500/20 dark:text-amber-400"
          >
            Switch to Apple Notes Batch Mode
          </button>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="bg-[var(--color-accent)]/10 mb-2 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[var(--color-accent)]">
              <Sparkles className="h-3 w-3" />
              Classic Single Listing
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--color-foreground)] sm:text-3xl">
              Add Single Product
            </h1>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              Provide accurate media, specs, and pricing to reach verified buyers across Ghana.
            </p>
          </div>
        </div>
      </div>

      <ProductForm
        onSubmit={handleClassicSubmit}
        isLoading={isSubmitting || authLoading}
        onCancel={() => router.push('/dashboard/products')}
      />
    </div>
  );
}
