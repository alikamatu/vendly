import type {
  PaginatedApprovals,
  ApprovalStats,
  ApprovalFilters,
  ApproveRejectPayload,
} from "@/types/verification";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:1000";

class AdminServiceClass {
  private getAuthHeaders(): HeadersInit {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("admin_token")
        : null;
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  async getApprovals(filters: Partial<ApprovalFilters>): Promise<PaginatedApprovals> {
    const params = new URLSearchParams();
    if (filters.status && filters.status !== "ALL") params.set("status", filters.status);
    if (filters.search?.trim()) params.set("search", filters.search.trim());
    if (filters.page) params.set("page", String(filters.page));
    if (filters.limit) params.set("limit", String(filters.limit));

    const res = await fetch(`${API_BASE}/admin/approvals?${params}`, {
      headers: this.getAuthHeaders(),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to fetch approvals");
    }

    return res.json();
  }

  async getStats(): Promise<ApprovalStats> {
    const res = await fetch(`${API_BASE}/admin/stats`, {
      headers: this.getAuthHeaders(),
    });

    if (!res.ok) {
      throw new Error("Failed to fetch stats");
    }

    return res.json();
  }

  async approveUser(approvalId: string): Promise<void> {
    const payload: ApproveRejectPayload = { status: "APPROVED" };
    const res = await fetch(`${API_BASE}/admin/approve/${approvalId}`, {
      method: "PATCH",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to approve user");
    }
  }

  async rejectUser(approvalId: string, reason?: string): Promise<void> {
    const payload: ApproveRejectPayload = { status: "REJECTED", reason };
    const res = await fetch(`${API_BASE}/admin/approve/${approvalId}`, {
      method: "PATCH",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to reject user");
    }
  }
}

export const AdminService = new AdminServiceClass();
