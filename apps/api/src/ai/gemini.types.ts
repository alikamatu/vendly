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
