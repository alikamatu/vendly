import { api } from './index';

export interface WhatsAppPreviewItem {
  tempId: string;
  externalId?: string;
  title: string;
  description: string;
  price: number | null;
  original_price: number | null;
  currency: string;
  category: string;
  condition: 'new' | 'used' | 'refurbished';
  quantity_available: number;
  brand: string;
  tags: string[];
  image_urls: string[];
  status: 'active' | 'draft';
  source_url?: string;
  source_screenshot_index?: number;
  image_box_2d?: [number, number, number, number] | null;
}

export interface WhatsAppPreviewResponse {
  source: 'whatsapp_link' | 'whatsapp_screenshots' | 'whatsapp_csv' | 'meta_api';
  items: WhatsAppPreviewItem[];
  warnings: string[];
  catalogUrl?: string;
}

export interface WhatsAppCommitItemInput {
  title: string;
  description?: string;
  price: number | string;
  original_price?: number | string | null;
  currency?: string;
  category: string;
  condition?: 'new' | 'used' | 'refurbished';
  quantity_available?: number | string;
  brand?: string;
  tags?: string[];
  image_urls?: string[];
  status?: 'active' | 'draft';
}

export interface WhatsAppCommitResult {
  summary: {
    created: number;
    failed: number;
    total: number;
  };
  results: Array<{
    index: number;
    ok: boolean;
    productId?: string;
    title?: string;
    mirroredImages?: number;
    error?: string;
  }>;
}

export const whatsappImportApi = {
  async previewLinks(token: string, input: string): Promise<WhatsAppPreviewResponse> {
    const res = await api.post<WhatsAppPreviewResponse>(
      '/products/whatsapp-import/preview-links',
      { input },
      { token },
    );
    return res.data;
  },

  async previewScreenshots(token: string, files: File[]): Promise<WhatsAppPreviewResponse> {
    const formData = new FormData();
    files.forEach((f) => formData.append('images', f));
    const res = await api.post<WhatsAppPreviewResponse>(
      '/products/whatsapp-import/preview-screenshots',
      formData,
      { token },
    );
    return res.data;
  },

  async previewCsv(token: string, file: File): Promise<WhatsAppPreviewResponse> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post<WhatsAppPreviewResponse>(
      '/products/whatsapp-import/preview-csv',
      formData,
      { token },
    );
    return res.data;
  },

  async previewMeta(
    token: string,
    catalogId: string,
    accessToken: string,
  ): Promise<WhatsAppPreviewResponse> {
    const res = await api.post<WhatsAppPreviewResponse>(
      '/products/whatsapp-import/preview-meta',
      { catalogId, accessToken },
      { token },
    );
    return res.data;
  },

  async commit(token: string, items: WhatsAppCommitItemInput[]): Promise<WhatsAppCommitResult> {
    const res = await api.post<WhatsAppCommitResult>(
      '/products/whatsapp-import/commit',
      { items },
      { token },
    );
    return res.data;
  },
};
