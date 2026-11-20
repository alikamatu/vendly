import { api } from './index';

export interface Variant {
  id: string;
  sku?: string | null;
  attributes: Record<string, string>;
  price?: string | null;
  quantity_available: number;
  image_url?: string | null;
  is_active: boolean;
}

export interface VariantInput {
  id?: string;
  sku?: string | null;
  attributes: Record<string, string>;
  price?: string | null;
  quantity_available: number;
  image_url?: string | null;
  is_active?: boolean;
}

export const variantApi = {
  list: async (productId: string) => {
    const res = await api.get<Variant[]>(`/products/${productId}/variants`);
    return res.data;
  },

  replaceAll: async (token: string, productId: string, variants: VariantInput[]) => {
    const res = await api.post<Variant[]>(
      `/products/${productId}/variants/bulk`,
      { variants },
      { token },
    );
    return res.data;
  },
};
