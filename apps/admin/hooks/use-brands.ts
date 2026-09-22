'use client';

import { useState, useEffect, useCallback } from 'react';
import { VendlyBrandService } from '@/services/brand.service';
import type { Brand, CreateBrandInput, UpdateBrandInput } from '@/types/operations';

export function useBrands(initialCategoryId?: string) {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>(
    initialCategoryId,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBrands = useCallback(async (categoryId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = categoryId ? { category_id: categoryId } : {};
      const res = await VendlyBrandService.list(params);
      const list = Array.isArray(res)
        ? res
        : Array.isArray((res as any)?.data)
          ? (res as any).data
          : [];
      setBrands(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch brands');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchBrands(selectedCategoryId);
  }, [fetchBrands, selectedCategoryId]);

  const createBrand = async (dto: CreateBrandInput) => {
    const created = await VendlyBrandService.create(dto);
    await fetchBrands(selectedCategoryId);
    return created;
  };

  const updateBrand = async (id: string, dto: UpdateBrandInput) => {
    const updated = await VendlyBrandService.update(id, dto);
    await fetchBrands(selectedCategoryId);
    return updated;
  };

  const deleteBrand = async (id: string) => {
    const res = await VendlyBrandService.delete(id);
    await fetchBrands(selectedCategoryId);
    return res;
  };

  return {
    brands,
    selectedCategoryId,
    setSelectedCategoryId,
    loading,
    error,
    refresh: () => fetchBrands(selectedCategoryId),
    createBrand,
    updateBrand,
    deleteBrand,
  };
}
