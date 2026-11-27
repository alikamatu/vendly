'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { VendlyProductService } from '@/services/product.service';
import type {
  VendlyProduct,
  ProductStatus,
  ProductListParams,
  AdminProductSummary,
  AdminProductWriteInput,
} from '@/types/operations';

const DEFAULT_SUMMARY: AdminProductSummary = {
  total: 0,
  active: 0,
  draft: 0,
  archived: 0,
  rejected: 0,
  featured: 0,
  out_of_stock: 0,
  low_stock: 0,
};

export function useVendlyProducts(initialParams: ProductListParams = { page: 1, limit: 50 }) {
  const [params, setParamsState] = useState<ProductListParams>({
    page: 1,
    limit: 50,
    sort: 'newest',
    ...initialParams,
  });
  const [products, setProducts] = useState<VendlyProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [summary, setSummary] = useState<AdminProductSummary>(DEFAULT_SUMMARY);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const paramsRef = useRef(params);
  useEffect(() => {
    paramsRef.current = params;
  }, [params]);

  const fetchProducts = useCallback(async (overrideParams?: ProductListParams) => {
    const activeParams = overrideParams ?? paramsRef.current;
    setLoading(true);
    setError(null);
    try {
      const res = await VendlyProductService.list(activeParams);
      const list = Array.isArray(res)
        ? res
        : Array.isArray(res?.data)
          ? res.data
          : Array.isArray((res as any)?.data?.data)
            ? (res as any).data.data
            : [];
      setProducts(list);
      const resolvedTotal = typeof res?.total === 'number' ? res.total : list.length;
      setTotal(resolvedTotal);
      const resolvedLimit = activeParams.limit || 50;
      setTotalPages(
        typeof res?.totalPages === 'number'
          ? res.totalPages
          : Math.max(1, Math.ceil(resolvedTotal / resolvedLimit)),
      );
      if (res?.summary) {
        setSummary(res.summary);
      }
      if (Array.isArray(res?.categories)) {
        setCategories(res.categories);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchProducts(params);
  }, [params, fetchProducts]);

  const setParams = useCallback(
    (updater: Partial<ProductListParams> | ((prev: ProductListParams) => ProductListParams)) => {
      setParamsState((prev) =>
        typeof updater === 'function' ? updater(prev) : { ...prev, ...updater },
      );
    },
    [],
  );

  const createProduct = async (
    payload: AdminProductWriteInput & {
      seller_id: string;
      title: string;
      price: string;
      category: string;
    },
  ) => {
    const created = await VendlyProductService.create(payload);
    await fetchProducts();
    return created;
  };

  const updateProduct = async (id: string, payload: AdminProductWriteInput) => {
    const updated = await VendlyProductService.update(id, payload);
    await fetchProducts();
    return updated;
  };

  const uploadMedia = async (id: string, files: File[]) => {
    const updated = await VendlyProductService.uploadMedia(id, files);
    await fetchProducts();
    return updated;
  };

  const duplicateProduct = async (id: string, sellerId?: string) => {
    const cloned = await VendlyProductService.duplicate(id, sellerId);
    await fetchProducts();
    return cloned;
  };

  const updateStock = async (id: string, qty: number, reason?: string) => {
    const updated = await VendlyProductService.updateStock(id, qty, reason);
    await fetchProducts();
    return updated;
  };

  const updateStatus = async (id: string, status: ProductStatus, reason?: string) => {
    const updated = await VendlyProductService.setStatus(id, status, reason);
    await fetchProducts();
    return updated;
  };

  const toggleFeatured = async (id: string, currentFeatured?: boolean) => {
    const next = typeof currentFeatured === 'boolean' ? !currentFeatured : undefined;
    const updated = await VendlyProductService.toggleFeatured(id, next);
    await fetchProducts();
    return updated;
  };

  const deleteProduct = async (id: string, force = false) => {
    const res = await VendlyProductService.remove(id, force);
    await fetchProducts();
    return res;
  };

  const bulkAction = async (payload: {
    ids: string[];
    action: 'delete' | 'status' | 'feature' | 'category';
    value?: unknown;
    force?: boolean;
    reason?: string;
  }) => {
    const res = await VendlyProductService.bulk(payload);
    await fetchProducts();
    return res;
  };

  return {
    products,
    total,
    totalPages,
    summary,
    categories,
    params,
    setParams,
    loading,
    error,
    refresh: fetchProducts,
    createProduct,
    updateProduct,
    uploadMedia,
    duplicateProduct,
    updateStock,
    updateStatus,
    toggleFeatured,
    deleteProduct,
    bulkAction,
  };
}
