'use client';

import { useState, useEffect, useCallback } from 'react';
import { VendlyProductService } from '@/services/product.service';
import type { VendlyProduct, ProductStatus, ProductListParams } from '@/types/operations';

export function useVendlyProducts(initialParams: ProductListParams = {}) {
  const [products, setProducts] = useState<VendlyProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async (params: ProductListParams = initialParams) => {
    setLoading(true);
    setError(null);
    try {
      const res = await VendlyProductService.list(params);
      const list = Array.isArray(res)
        ? res
        : Array.isArray(res?.data)
          ? res.data
          : Array.isArray((res as any)?.data?.data)
            ? (res as any).data.data
            : [];
      setProducts(list);
      setTotal(typeof res?.total === 'number' ? res.total : list.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchProducts(initialParams);
  }, [fetchProducts]);

  const updateStatus = async (id: string, status: ProductStatus) => {
    const updated = await VendlyProductService.setStatus(id, status);
    await fetchProducts();
    return updated;
  };

  const toggleFeatured = async (id: string) => {
    const updated = await VendlyProductService.toggleFeatured(id);
    await fetchProducts();
    return updated;
  };

  return {
    products,
    total,
    loading,
    error,
    refresh: fetchProducts,
    updateStatus,
    toggleFeatured,
  };
}
