import { api } from './index';
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

  async commit(token: string, items: WhatsAppCommitItemInput[]): Promise<WhatsAppCommitResult> {
    const res = await api.post<WhatsAppCommitResult>(
      '/products/website-import/commit',
      { items },
      { token },
    );
    return res.data;
  },
};
