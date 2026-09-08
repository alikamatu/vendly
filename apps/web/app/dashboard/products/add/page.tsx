'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/contexts/auth-context';
import { productApi } from '@/lib/api/product';
import ProductForm, { ProductFormData } from '@/components/products/ProductForm';

export default function AddProductPage() {
  const router = useRouter();
  const { token, isAuthenticated, isLoading: authLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async ({
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
          currency: data.currency,
          condition: data.condition,
          quantity_available: data.quantity_available,
          status: data.status,
          category: data.category,
          brand: data.brand || undefined,
          tags: data.tags,
          attributes: data.attributes,
        },
        images,
        video
      );

      const productId = created?.product?.id;

      // If Hot Sales was selected, proceed to checkout
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
            'Product created, but Hot Sales checkout failed to start. You can boost it later from the product page.'
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

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      {/* Header & Navigation */}
      <div className="mb-8">
        <Link
          href="/dashboard/products"
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors mb-4 group"
        >
          <div className="w-7 h-7 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center group-hover:border-[var(--color-foreground)]/30 transition-all">
            <ArrowLeft className="w-3.5 h-3.5" />
          </div>
          Back to products
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)] text-xs font-semibold uppercase tracking-wider mb-2">
              <Sparkles className="w-3 h-3" />
              New Listing
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-foreground)]">
              Add New Product
            </h1>
            <p className="text-sm text-[var(--color-muted)] mt-1">
              Provide accurate media, specs, and pricing to reach verified buyers across Ghana.
            </p>
          </div>
        </div>
      </div>

      {/* Unified Product Form */}
      <ProductForm
        onSubmit={handleSubmit}
        isLoading={isSubmitting || authLoading}
        onCancel={() => router.push('/dashboard/products')}
      />
    </div>
  );
}
