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

export const aiApi = {
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
