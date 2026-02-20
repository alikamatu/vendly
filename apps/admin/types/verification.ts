export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface ApprovalUser {
  id: string;
  full_name: string;
  email: string;
  school: string;
  verification_doc: string | null;
  created_at: string;
}

export interface ApprovalReviewer {
  id: string;
  full_name: string;
}

export interface ApprovalItem {
  id: string;
  user: ApprovalUser;
  status: ApprovalStatus;
  reviewed_by: ApprovalReviewer | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface ApprovalStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedApprovals {
  data: ApprovalItem[];
  meta: PaginationMeta;
}

export interface ApprovalFilters {
  status: "ALL" | ApprovalStatus;
  search: string;
  page: number;
  limit: number;
}

export interface ApproveRejectPayload {
  status: "APPROVED" | "REJECTED";
  reason?: string;
}
