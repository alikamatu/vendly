import { api } from './index';

export type AiProductCondition = 'new' | 'used' | 'refurbished';
export type AiConfidence = 'high' | 'medium' | 'low';

export interface AiProductGroupDraft {
  photo_indices: number[];
  title: string;
  description: string;
  category: string;
  condition: AiProductCondition;
  brand: string;
  tags: string[];
  suggested_price_ghs: number | null;
  confidence: AiConfidence;
}

export interface AiBulkPhotoAnalysisResult {
  products: AiProductGroupDraft[];
  model: string;
  totalPhotos: number;
}

export interface AiSingleProductDraft {
  title: string;
  description: string;
  category: string;
  condition: AiProductCondition;
  brand: string;
  tags: string[];
  suggested_price_ghs: number | null;
  confidence: AiConfidence;
}

export interface AiSinglePhotoAnalysisResult {
  product: AiSingleProductDraft;
  model: string;
}

export interface AiStatusResult {
  configured: boolean;
  provider: 'gemini';
  model: string;
}

export type AiBuyerSearchSort = 'newest' | 'price_asc' | 'price_desc' | 'popular' | 'discount_desc';

export interface AiBuyerSearchFilters {
  keywords: string[];
  category: string | null;
  min_price: number | null;
  max_price: number | null;
  condition: AiProductCondition | null;
  sort: AiBuyerSearchSort;
  in_stock_only: boolean;
}

export interface AiBuyerSearchProduct {
  id: string;
  slug?: string;
  title: string;
  price: number | string;
  original_price?: number | string | null;
  currency?: string;
  condition?: string;
  category: string;
  image_urls: string[];
  video_url?: string | null;
  seller: {
    store_name: string;
    logo_url?: string | null;
    store_link: string;
  };
}

export interface AiBuyerSearchResponse {
  query: string;
  summary: string;
  filters: AiBuyerSearchFilters;
  browseUrl: string;
  products: AiBuyerSearchProduct[];
  total: number;
  relaxed: boolean;
  usedAi: boolean;
}

export interface AiPolishListingInput {
  title: string;
  description?: string;
  category?: string;
  condition?: string;
  brand?: string;
  tags?: string[];
  price?: string | number;
}

export interface AiPolishListingResult {
  title: string;
  description: string;
  category: string;
  tags: string[];
  improvements: string[];
  model: string;
}

export interface AiDraftStorefrontInput {
  store_name?: string;
  what_you_sell?: string;
  location?: string;
  service_area?: string;
  avg_delivery_time?: string;
  business_hours?: string;
}

export interface AiDraftStorefrontResult {
  bio: string;
  delivery_policies: string;
  business_hours: string;
  service_area: 'SAME_CITY' | 'NEARBY_STATES' | 'NATIONWIDE' | null;
  avg_delivery_time:
    | 'SAME_DAY'
    | 'NEXT_DAY'
    | 'TWO_TO_THREE_DAYS'
    | 'FOUR_TO_SEVEN_DAYS'
    | 'MORE_THAN_ONE_WEEK'
    | null;
  model: string;
}

export const aiApi = {
  async buyerSearch(query: string, limit = 12): Promise<AiBuyerSearchResponse> {
    const res = await api.post<AiBuyerSearchResponse>('/ai/buyer-search', {
      query,
      limit,
    });
    return res.data;
  },

  async polishListing(token: string, input: AiPolishListingInput): Promise<AiPolishListingResult> {
    const res = await api.post<AiPolishListingResult>('/ai/polish-listing', input, {
      token,
    });
    return res.data;
  },

  async draftStorefront(
    token: string,
    input: AiDraftStorefrontInput,
  ): Promise<AiDraftStorefrontResult> {
    const res = await api.post<AiDraftStorefrontResult>('/ai/draft-storefront', input, {
      token,
    });
    return res.data;
  },

  async getStatus(token?: string): Promise<AiStatusResult> {
    const res = await api.get<AiStatusResult>('/ai/status', { token });
    return res.data;
  },

  async analyzeBulkPhotos(token: string, files: File[]): Promise<AiBulkPhotoAnalysisResult> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('images', file);
    });
    const res = await api.post<AiBulkPhotoAnalysisResult>('/ai/analyze-bulk-photos', formData, {
      token,
    });
    return res.data;
  },

  async analyzeProductPhotos(token: string, files: File[]): Promise<AiSinglePhotoAnalysisResult> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('images', file);
    });
    const res = await api.post<AiSinglePhotoAnalysisResult>(
      '/ai/analyze-product-photos',
      formData,
      { token },
    );
    return res.data;
  },
};
