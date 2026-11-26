import { VENDLY_API_BASE_URL, getVendlyHeaders, qs, unwrap } from './config';
import type {
  AdminReport,
  ReportReason,
  ReportResolutionAction,
  ReportStats,
  ReportStatus,
  ReportTargetType,
} from '@/types/operations';

export interface ReportListResponse {
  data: AdminReport[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  stats: ReportStats;
}

export interface ReportListParams {
  status?: ReportStatus;
  target_type?: ReportTargetType;
  reason?: ReportReason;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ResolveReportInput {
  status: ReportStatus;
  action?: ReportResolutionAction;
  admin_notes?: string;
}

export class VendlyReportService {
  private static headers() {
    return getVendlyHeaders();
  }

  static async list(params: ReportListParams = {}): Promise<ReportListResponse> {
    const res = await fetch(
      `${VENDLY_API_BASE_URL}/admin/reports${qs(params as Record<string, unknown>)}`,
      {
        headers: this.headers(),
        cache: 'no-store',
      },
    );
    return unwrap<ReportListResponse>(res);
  }

  static async getById(id: string): Promise<AdminReport> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/admin/reports/${id}`, {
      headers: this.headers(),
      cache: 'no-store',
    });
    return unwrap<AdminReport>(res);
  }

  static async resolve(
    id: string,
    body: ResolveReportInput,
  ): Promise<{ message: string; report: AdminReport }> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/admin/reports/${id}/resolve`, {
      method: 'PATCH',
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    return unwrap<{ message: string; report: AdminReport }>(res);
  }
}
