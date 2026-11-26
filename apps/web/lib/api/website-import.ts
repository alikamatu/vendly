import { API_URL, api } from './index';
import type {
  WhatsAppCommitItemInput,
  WhatsAppCommitResult,
  WhatsAppPreviewItem,
} from './whatsapp-import';

export type WebsiteImportMode = 'auto' | 'single' | 'catalog';

export interface WebsitePreviewResponse {
  source: 'shopify' | 'woocommerce' | 'html' | 'verndly_ai';
  siteUrl: string;
  items: WhatsAppPreviewItem[];
  warnings: string[];
}

export const websiteImportApi = {
  async preview(
    token: string,
    url: string,
    mode: WebsiteImportMode = 'auto',
  ): Promise<WebsitePreviewResponse> {
    const res = await api.post<WebsitePreviewResponse>(
      '/products/website-import/preview',
      { url, mode },
      { token },
    );
    return res.data;
  },

  async fetchProxiedImageBlob(token: string, imageUrl: string): Promise<Blob> {
    const endpoint = `${API_URL}/products/website-import/image-proxy?url=${encodeURIComponent(imageUrl)}`;
    const res = await fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) {
      throw new Error(`Image proxy returned ${res.status}`);
    }
    return res.blob();
  },

  async commit(token: string, items: WhatsAppCommitItemInput[]): Promise<WhatsAppCommitResult> {
    const res = await api.post<WhatsAppCommitResult>(
      '/products/website-import/commit',
      { items },
      { token },
    );
    return res.data;
  },
};
