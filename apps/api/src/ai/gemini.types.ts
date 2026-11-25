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

export interface AiWhatsAppCatalogItem {
  title: string;
  description: string;
  price: number | null;
  original_price: number | null;
  currency: string;
  category: string;
  condition: AiProductCondition;
  brand: string;
  tags: string[];
  in_stock: boolean;
  source_screenshot_index: number;
}

export interface AiWhatsAppScreenshotsResult {
  products: AiWhatsAppCatalogItem[];
  model: string;
  totalScreenshots: number;
}

export type AiBuyerSearchSort =
  | 'newest'
  | 'price_asc'
  | 'price_desc'
  | 'popular'
  | 'discount_desc';

export interface AiBuyerSearchFilters {
  keywords: string[];
  category: string | null;
  min_price: number | null;
  max_price: number | null;
  condition: AiProductCondition | null;
  sort: AiBuyerSearchSort;
  in_stock_only: boolean;
}

export interface AiBuyerSearchPlan {
  summary: string;
  filters: AiBuyerSearchFilters;
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

export type AiServiceArea = 'SAME_CITY' | 'NEARBY_STATES' | 'NATIONWIDE';
export type AiDeliveryTime =
  | 'SAME_DAY'
  | 'NEXT_DAY'
  | 'TWO_TO_THREE_DAYS'
  | 'FOUR_TO_SEVEN_DAYS'
  | 'MORE_THAN_ONE_WEEK';

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
  service_area: AiServiceArea | null;
  avg_delivery_time: AiDeliveryTime | null;
  model: string;
}
