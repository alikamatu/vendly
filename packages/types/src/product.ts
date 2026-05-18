export type ProductCondition = 'new' | 'used' | 'refurbished';
export type ProductStatus = 'draft' | 'active' | 'sold' | 'archived';

export type Product = {
  id: string;
  seller_id: string;
  title: string;
  description?: string;
  price: number;
  currency: string;
  condition: ProductCondition;
  quantity_available: number;
  status: ProductStatus;
  is_featured: boolean;
  views_count: number;
  category: string;
  tags: string[];
  image_urls: string[];
  attributes?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type ProductFilters = {
  category?: string;
  condition?: ProductCondition;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  tags?: string[];
  status?: ProductStatus;
};
