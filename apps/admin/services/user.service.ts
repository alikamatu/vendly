import { VENDLY_API_BASE_URL, getVendlyHeaders, qs, unwrap } from './config';
import type {
  VendlyUser,
  VerificationRequest,
  VerificationStatus,
  UserRole,
} from '@/types/operations';

export class VendlyUserService {
  private static headers() {
    return getVendlyHeaders();
  }

  static async getUsers(
    params: Record<string, unknown> = {},
  ): Promise<{ data: VendlyUser[]; total?: number }> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/admin/users${qs(params)}`, {
      headers: this.headers(),
      cache: 'no-store',
    });
    return unwrap<{ data: VendlyUser[]; total?: number }>(res);
  }

  static async getUserById(userId: string): Promise<VendlyUser> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/admin/users/${userId}`, {
      headers: this.headers(),
      cache: 'no-store',
    });
    return unwrap<VendlyUser>(res);
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

  static async getApprovalById(id: string): Promise<VerificationRequest> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/admin/approvals/${id}`, {
      headers: this.headers(),
      cache: 'no-store',
    });
    return unwrap<VerificationRequest>(res);
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

  static async updateRole(userId: string, role: UserRole): Promise<VendlyUser> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/admin/users/${userId}/role`, {
      method: 'PATCH',
      headers: this.headers(),
      body: JSON.stringify({ role }),
    });
    return unwrap<VendlyUser>(res);
  }

  static async toggleSuspension(userId: string, reason?: string): Promise<VendlyUser> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/admin/users/${userId}/toggle-suspension`, {
      method: 'PATCH',
      headers: this.headers(),
      body: JSON.stringify({ reason }),
    });
    return unwrap<VendlyUser>(res);
  }

  static async warnUser(
    userId: string,
    reason: string = 'Administrative warning',
  ): Promise<VendlyUser> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/admin/users/${userId}/warn`, {
      method: 'PATCH',
      headers: this.headers(),
      body: JSON.stringify({ reason }),
    });
    return unwrap<VendlyUser>(res);
  }

  static async deleteUser(userId: string): Promise<{ success: boolean; message?: string }> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/admin/users/${userId}/delete`, {
      method: 'PATCH',
      headers: this.headers(),
    });
    return unwrap<{ success: boolean; message?: string }>(res);
  }

  static async forceDisable2fa(userId: string): Promise<VendlyUser> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/admin/users/${userId}/disable-2fa`, {
      method: 'PATCH',
      headers: this.headers(),
    });
    return unwrap<VendlyUser>(res);
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
