import { VENDLY_API_BASE_URL, getVendlyHeaders, qs, unwrap } from './config';

export type SmsRecipientSegment =
  | 'all'
  | 'sellers'
  | 'sellers_verified'
  | 'sellers_unverified'
  | 'sellers_incomplete_onboarding'
  | 'sellers_no_payout'
  | 'pro_sellers'
  | 'buyers';

export interface AdminSmsStatus {
  configured: boolean;
  sandbox: boolean;
  senderId: string;
  provider: 'arkesel';
  stats: {
    usersWithPhone: number;
    sellersWithPhone: number;
    totalCampaigns: number;
    totalSent: number;
    totalFailed: number;
  };
}

export interface AdminSmsRecipient {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_verified: boolean;
  is_suspended: boolean;
  is_pro: boolean;
  raw_phone: string | null;
  formatted_phone: string | null;
  phone_source: 'account' | 'whatsapp' | 'address' | null;
  phone_valid: boolean;
  store_name: string | null;
  store_link: string | null;
  is_seller_verified: boolean;
  onboarding_completed: boolean;
  payment_setup_completed: boolean;
  created_at: string;
}

export interface AdminSmsRecipientsResponse {
  data: AdminSmsRecipient[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AdminSmsDeliveryRow {
  userId: string | null;
  name: string;
  rawPhone: string;
  formattedPhone: string | null;
  status: 'sent' | 'failed' | 'invalid';
  providerId?: string;
  error?: string;
  messagePreview?: string;
}

export interface SendAdminSmsResponse {
  sentCount: number;
  failedCount: number;
  invalidCount: number;
  totalTargeted: number;
  sandbox: boolean;
  configured: boolean;
  senderId: string;
  results: AdminSmsDeliveryRow[];
}

export interface AdminSmsHistoryItem {
  id: string;
  created_at: string;
  actor: { id: string; full_name: string; email: string } | null;
  templateId: string | null;
  senderId: string;
  sandbox: boolean;
  message: string;
  personalized: boolean;
  totalTargeted: number;
  sentCount: number;
  failedCount: number;
  invalidCount: number;
  recipients: Array<{
    name: string;
    formattedPhone: string | null;
    rawPhone: string;
    status: 'sent' | 'failed' | 'invalid';
    error: string | null;
    providerId: string | null;
  }>;
}

export interface AdminSmsHistoryResponse {
  data: AdminSmsHistoryItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class VendlySmsService {
  private static headers() {
    return getVendlyHeaders();
  }

  static async getStatus(): Promise<AdminSmsStatus> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/admin/sms/status`, {
      headers: this.headers(),
      cache: 'no-store',
    });
    return unwrap<AdminSmsStatus>(res);
  }

  static async listRecipients(params: {
    search?: string;
    segment?: SmsRecipientSegment;
    onlyWithPhone?: boolean;
    page?: number;
    limit?: number;
  }): Promise<AdminSmsRecipientsResponse> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/admin/sms/recipients${qs(params)}`, {
      headers: this.headers(),
      cache: 'no-store',
    });
    return unwrap<AdminSmsRecipientsResponse>(res);
  }

  static async send(payload: {
    message: string;
    userIds?: string[];
    customNumbers?: string[];
    templateId?: string;
    senderId?: string;
  }): Promise<SendAdminSmsResponse> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/admin/sms/send`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(payload),
    });
    return unwrap<SendAdminSmsResponse>(res);
  }

  static async getHistory(page = 1, limit = 25): Promise<AdminSmsHistoryResponse> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/admin/sms/history${qs({ page, limit })}`, {
      headers: this.headers(),
      cache: 'no-store',
    });
    return unwrap<AdminSmsHistoryResponse>(res);
  }
}
