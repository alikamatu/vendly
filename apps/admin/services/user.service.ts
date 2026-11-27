import { VENDLY_API_BASE_URL, getVendlyHeaders, qs, unwrap } from './config';
import type {
  AdminStoreSummary,
  AdminUserDetail,
  AdminUsersSummary,
  VendlyUser,
  VerificationRequest,
  VerificationStatus,
  UserRole,
} from '@/types/operations';

export interface AdminUsersListResponse {
  data: VendlyUser[];
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
  summary?: AdminUsersSummary;
}

export interface AdminStoresListResponse {
  data: AdminStoreSummary[];
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}

export interface AdminUpdateProfilePayload {
  full_name?: string;
  email?: string;
  school?: string;
  phone_e164?: string | null;
  reason?: string;
}

export interface AdminUpdateStorePayload {
  store_name?: string;
  store_link?: string;
  bio?: string | null;
  whatsapp_number?: string | null;
  location?: string | null;
  area?: string | null;
  payment_timing?: string;
  service_area?: string;
  avg_delivery_time?: string;
  onboarding_completed?: boolean;
  reason?: string;
}

export class VendlyUserService {
  private static headers() {
    return getVendlyHeaders();
  }

  static async getUsers(params: Record<string, unknown> = {}): Promise<AdminUsersListResponse> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/admin/users${qs(params)}`, {
      headers: this.headers(),
      cache: 'no-store',
    });
    return unwrap<AdminUsersListResponse>(res);
  }

  static async getStores(params: Record<string, unknown> = {}): Promise<AdminStoresListResponse> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/admin/stores${qs(params)}`, {
      headers: this.headers(),
      cache: 'no-store',
    });
    return unwrap<AdminStoresListResponse>(res);
  }

  static async getUserById(userId: string): Promise<AdminUserDetail> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/admin/users/${userId}`, {
      headers: this.headers(),
      cache: 'no-store',
    });
    return unwrap<AdminUserDetail>(res);
  }

  static async getApprovals(
    params: Record<string, unknown> = {},
  ): Promise<{ data: VerificationRequest[]; total?: number }> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/admin/approvals${qs(params)}`, {
      headers: this.headers(),
      cache: 'no-store',
    });
    return unwrap<{ data: VerificationRequest[]; total?: number }>(res);
  }

  static async approveOrReject(
    approvalId: string,
    status: VerificationStatus,
    reason?: string,
  ): Promise<VerificationRequest> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/admin/approve/${approvalId}`, {
      method: 'PATCH',
      headers: this.headers(),
      body: JSON.stringify({ status, reason }),
    });
    return unwrap<VerificationRequest>(res);
  }

  static async updateRole(
    userId: string,
    role: UserRole,
    reason?: string,
  ): Promise<{ message: string }> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/admin/users/${userId}/role`, {
      method: 'PATCH',
      headers: this.headers(),
      body: JSON.stringify({ role, reason }),
    });
    return unwrap<{ message: string }>(res);
  }

  static async toggleSuspension(
    userId: string,
    reason?: string,
  ): Promise<{ message: string; is_suspended: boolean }> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/admin/users/${userId}/toggle-suspension`, {
      method: 'PATCH',
      headers: this.headers(),
      body: JSON.stringify({ reason }),
    });
    return unwrap<{ message: string; is_suspended: boolean }>(res);
  }

  static async warnUser(
    userId: string,
    reason: string = 'Administrative warning',
  ): Promise<{ message: string; warnings: number }> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/admin/users/${userId}/warn`, {
      method: 'PATCH',
      headers: this.headers(),
      body: JSON.stringify({ reason }),
    });
    return unwrap<{ message: string; warnings: number }>(res);
  }

  static async resetWarnings(
    userId: string,
    reason?: string,
  ): Promise<{ message: string; warnings: number }> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/admin/users/${userId}/warnings/reset`, {
      method: 'PATCH',
      headers: this.headers(),
      body: JSON.stringify({ reason }),
    });
    return unwrap<{ message: string; warnings: number }>(res);
  }

  static async setVerification(
    userId: string,
    is_verified: boolean,
    reason?: string,
  ): Promise<{ message: string; is_verified: boolean }> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/admin/users/${userId}/verify`, {
      method: 'PATCH',
      headers: this.headers(),
      body: JSON.stringify({ is_verified, reason }),
    });
    return unwrap<{ message: string; is_verified: boolean }>(res);
  }

  static async updateProfile(
    userId: string,
    payload: AdminUpdateProfilePayload,
  ): Promise<{ message: string }> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/admin/users/${userId}/profile`, {
      method: 'PATCH',
      headers: this.headers(),
      body: JSON.stringify(payload),
    });
    return unwrap<{ message: string }>(res);
  }

  static async updateStore(
    userId: string,
    payload: AdminUpdateStorePayload,
  ): Promise<{ message: string }> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/admin/users/${userId}/store`, {
      method: 'PATCH',
      headers: this.headers(),
      body: JSON.stringify(payload),
    });
    return unwrap<{ message: string }>(res);
  }

  static async retryStoreSubaccount(userId: string): Promise<{ message: string }> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/admin/users/${userId}/store/subaccount`, {
      method: 'POST',
      headers: this.headers(),
    });
    return unwrap<{ message: string }>(res);
  }

  static async reactivateUser(userId: string): Promise<{ message: string }> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/admin/users/${userId}/reactivate`, {
      method: 'PATCH',
      headers: this.headers(),
    });
    return unwrap<{ message: string }>(res);
  }

  static async cancelDeletion(userId: string): Promise<{ message: string }> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/admin/users/${userId}/cancel-deletion`, {
      method: 'PATCH',
      headers: this.headers(),
    });
    return unwrap<{ message: string }>(res);
  }

  static async executeDeletion(
    userId: string,
    confirmText: string,
    reason?: string,
  ): Promise<{ message: string }> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/admin/users/${userId}/execute-deletion`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ confirmText, reason }),
    });
    return unwrap<{ message: string }>(res);
  }

  static async sendPasswordReset(userId: string): Promise<{ message: string }> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/admin/users/${userId}/reset-password`, {
      method: 'POST',
      headers: this.headers(),
    });
    return unwrap<{ message: string }>(res);
  }

  static async notifyUser(
    userId: string,
    body: { title: string; body: string; link?: string },
  ): Promise<{ message: string }> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/admin/users/${userId}/notify`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    return unwrap<{ message: string }>(res);
  }

  static async deleteUser(userId: string): Promise<{ message?: string }> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/admin/users/${userId}/delete`, {
      method: 'PATCH',
      headers: this.headers(),
    });
    return unwrap<{ message?: string }>(res);
  }

  static async forceDisable2fa(userId: string): Promise<{ message: string }> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/admin/users/${userId}/disable-2fa`, {
      method: 'PATCH',
      headers: this.headers(),
    });
    return unwrap<{ message: string }>(res);
  }

  static async setProStatus(
    userId: string,
    body: { is_pro: boolean; duration_days?: number },
  ): Promise<VendlyUser> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/admin/users/${userId}/pro`, {
      method: 'PATCH',
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    return unwrap<VendlyUser>(res);
  }
}
