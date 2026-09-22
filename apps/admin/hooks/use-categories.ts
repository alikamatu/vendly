'use client';

import { useState, useEffect, useCallback } from 'react';
import { VendlyCategoryService } from '@/services/category.service';
import type { Category, CreateCategoryInput, UpdateCategoryInput } from '@/types/operations';

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await VendlyCategoryService.list();
      const list = Array.isArray(res)
        ? res
        : Array.isArray((res as any)?.data)
          ? (res as any).data
          : [];
      setCategories(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch categories');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchCategories();
  }, [fetchCategories]);

  const createCategory = async (dto: CreateCategoryInput) => {
    const created = await VendlyCategoryService.create(dto);
    await fetchCategories();
    return created;
  };

  const updateCategory = async (id: string, dto: UpdateCategoryInput) => {
    const updated = await VendlyCategoryService.update(id, dto);
    await fetchCategories();
    return updated;
  };

  const deleteCategory = async (id: string) => {
    const res = await VendlyCategoryService.delete(id);
    await fetchCategories();
    return res;
  };

  return {
    categories,
    loading,
    error,
    refresh: fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
  };
}
