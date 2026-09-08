'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { ArrowLeft, Edit3, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/contexts/auth-context';
import { productApi } from '@/lib/api/product';
import ProductForm, { ProductFormData } from '@/components/products/ProductForm';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

export default function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { token, isLoading: authLoading } = useAuth();

  const [product, setProduct] = useState<any>(null);
  const [isFetching, setIsFetching] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch product data
  useEffect(() => {
    let isMounted = true;

    async function loadProduct() {
      setIsFetching(true);
      setFetchError(null);
      try {
        const prod = await productApi.getProductById(id);
        if (isMounted) {
          setProduct(prod);
        }
      } catch (err: any) {
        if (isMounted) {
          setFetchError(err?.message || 'Failed to load product details.');
        }
      } finally {
        if (isMounted) {
          setIsFetching(false);
        }
      }
    }

    if (id) {
      loadProduct();
    }

    return () => {
      isMounted = false;
    };
  }, [id]);

  // Verify Hot Sales boost payment callback if present in URL
  useEffect(() => {
    const verifyHotSale = async () => {
      const isHotSale = searchParams.get('hot_sale_payment');
      const reference = searchParams.get('reference');
      const paramProductId = searchParams.get('product_id');

      if (!token || isHotSale !== '1' || !reference || !paramProductId) return;
      if (String(paramProductId) !== String(id)) return;

      toast.info('Verifying your Hot Sales boost payment...');
      try {
        const result = await productApi.verifyHotSalesPayment(token, reference, paramProductId);
        if (result.verified) {
          toast.success('Payment confirmed! Hot Sales boost is now active.');
          setProduct((prev: any) => (prev ? { ...prev, is_featured: true } : prev));
        } else {
          toast.warning('Payment verification is still processing.');
        }
      } catch (verifyErr: any) {
        toast.error(verifyErr?.message || 'Failed to verify boost payment.');
      } finally {
        router.replace(pathname);
      }
    };

    verifyHotSale();
  }, [searchParams, token, id, pathname, router]);

  const handleSubmit = async ({
    data,
    images,
    video,
    existingImages,
  }: {
    data: ProductFormData;
    images: File[];
    video: File | null;
    existingImages: string[];
  }) => {
    if (!token) {
      toast.error('You must be logged in to update a product');
      return;
    }

    setIsSubmitting(true);
    try {
      await productApi.updateProduct(
        token,
        id,
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
        video,
        existingImages
      );

      // Check if user turned on Hot Sales and it wasn't already featured
      if (data.is_featured && !product?.is_featured) {
        try {
          const init = await productApi.initializeHotSalesPayment(token, id);
          if (init?.checkout_url) {
            toast.success('Product updated! Redirecting to boost checkout...');
            window.location.href = init.checkout_url;
            return;
          }
        } catch (paymentErr: any) {
          console.error('Hot sales payment initialization error:', paymentErr);
          toast.warning(
            'Product updated, but boost payment could not be started. You can activate it from the product hub.'
          );
        }
      }

      toast.success('Product updated successfully!');
      router.push(`/dashboard/products/${id}`);
    } catch (err: any) {
      console.error('Error updating product:', err);
      toast.error(err?.message || 'Failed to update product.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading skeleton
  if (isFetching || authLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-8 h-8 rounded-xl bg-[var(--color-surface)] animate-pulse" />
          <div className="h-6 w-48 bg-[var(--color-surface)] rounded-lg animate-pulse" />
        </div>
        <div className="space-y-6">
          <Card className="p-8 space-y-4">
            <div className="h-7 w-64 bg-[var(--color-surface)] rounded-lg animate-pulse" />
            <div className="h-4 w-96 bg-[var(--color-surface)] rounded-lg animate-pulse" />
            <div className="grid grid-cols-3 gap-4 pt-4">
              <div className="aspect-square bg-[var(--color-surface)] rounded-2xl animate-pulse" />
              <div className="aspect-square bg-[var(--color-surface)] rounded-2xl animate-pulse" />
              <div className="aspect-square bg-[var(--color-surface)] rounded-2xl animate-pulse" />
            </div>
          </Card>
          <Card className="p-8 space-y-4">
            <div className="h-6 w-40 bg-[var(--color-surface)] rounded-lg animate-pulse" />
            <div className="h-10 w-full bg-[var(--color-surface)] rounded-xl animate-pulse" />
            <div className="h-24 w-full bg-[var(--color-surface)] rounded-xl animate-pulse" />
          </Card>
        </div>
      </div>
    );
  }

  // Error state
  if (fetchError || !product) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="w-14 h-14 rounded-3xl bg-[var(--color-danger)]/10 text-[var(--color-danger)] flex items-center justify-center mx-auto mb-4 border border-[var(--color-danger)]/20">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-[var(--color-foreground)] mb-2">Product Not Found</h2>
        <p className="text-sm text-[var(--color-muted)] mb-6">
          {fetchError || "The product you're trying to edit does not exist or has been removed."}
        </p>
        <Link href="/dashboard/products">
          <Button variant="secondary" className="rounded-xl">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Products
          </Button>
        </Link>
      </div>
    );
  }

  // Prepare initial data
  const initialData: Partial<ProductFormData> = {
    title: product.title || '',
    description: product.description || '',
    price: product.price != null ? String(product.price) : '',
    original_price: product.original_price != null ? String(product.original_price) : '',
    currency: product.currency || 'GHS',
    condition: product.condition || 'new',
    quantity_available:
      product.quantity_available != null ? String(product.quantity_available) : '1',
    status: product.status === 'active' ? 'active' : 'draft',
    category: product.category || '',
    brand: product.brand || '',
    tags: Array.isArray(product.tags) ? product.tags : [],
    attributes: product.attributes || {},
    is_featured: Boolean(product.is_featured),
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/dashboard/products/${id}`}
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors mb-4 group"
        >
          <div className="w-7 h-7 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center group-hover:border-[var(--color-foreground)]/30 transition-all">
            <ArrowLeft className="w-3.5 h-3.5" />
          </div>
          Back to product hub
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-muted)] text-xs font-semibold uppercase tracking-wider mb-2">
              <Edit3 className="w-3 h-3 text-[var(--color-accent)]" />
              Editing Product #{id.slice(0, 8)}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-foreground)]">
              {product.title}
            </h1>
            <p className="text-sm text-[var(--color-muted)] mt-1">
              Update photos, pricing, stock levels, and technical attributes.
            </p>
          </div>
        </div>
      </div>

      {/* Unified Product Form with Variants */}
      <ProductForm
        initialData={initialData}
        isEdit={true}
        productId={id}
        existingImages={product.image_urls || []}
        existingVideo={product.video_url || null}
        onSubmit={handleSubmit}
        isLoading={isSubmitting}
        onCancel={() => router.push(`/dashboard/products/${id}`)}
      />
    </div>
  );
}
