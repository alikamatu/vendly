import { VENDLY_API_BASE_URL, getVendlyHeaders, qs, unwrap } from './config';
import type { AdminEmailTemplate } from '@/lib/admin-email-templates';

export interface SendAdminEmailResponse {
  configured: boolean;
  fromAddress: string;
  sentCount: number;
  failedCount: number;
  invalidCount: number;
  totalTargeted: number;
  results: Array<{
    userId: string;
    name: string;
    email: string | null;
    status: 'sent' | 'failed' | 'invalid';
    providerId?: string;
    error?: string;
  }>;
}

export interface AdminEmailStatus {
  configured: boolean;
  provider: string;
  fromAddress: string;
}

export interface AdminEmailHistoryItem {
  id: string;
  created_at: string;
  actor: { id: string; full_name: string; email: string } | null;
  templateId: string | null;
  subject: string;
  headline: string;
  sentCount: number;
  failedCount: number;
  invalidCount: number;
}

export class VendlyEmailCampaignService {
  private static headers() {
    return getVendlyHeaders();
  }

  static async getStatus(): Promise<AdminEmailStatus> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/admin/email/status`, {
      headers: this.headers(),
      cache: 'no-store',
    });
    return unwrap<AdminEmailStatus>(res);
  }

  static async send(
    template: Pick<
      AdminEmailTemplate,
      | 'id'
      | 'subject'
      | 'preheader'
      | 'eyebrow'
      | 'statusLabel'
      | 'statusVariant'
      | 'headline'
      | 'paragraphs'
      | 'ctaLabel'
      | 'ctaPath'
    >,
    userIds: string[],
  ): Promise<SendAdminEmailResponse> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/admin/email/send`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        subject: template.subject,
        preheader: template.preheader,
        eyebrow: template.eyebrow,
        headline: template.headline,
        paragraphs: template.paragraphs,
        statusLabel: template.statusLabel,
        statusVariant: template.statusVariant,
        ctaLabel: template.ctaLabel,
        ctaPath: template.ctaPath,
        userIds,
        templateId: template.id,
      }),
    });
    return unwrap<SendAdminEmailResponse>(res);
  }

  static async getHistory(page = 1, limit = 25) {
    const res = await fetch(`${VENDLY_API_BASE_URL}/admin/email/history${qs({ page, limit })}`, {
      headers: this.headers(),
      cache: 'no-store',
    });
    return unwrap<{
      data: AdminEmailHistoryItem[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>(res);
  }
}
