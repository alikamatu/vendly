"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AdminService } from "@/services/admin.service";
import { SearchInput } from "@/components/ui/SearchInput";
import { FilterTabs } from "@/components/ui/FilterTabs";
import { Pagination } from "@/components/ui/Pagination";
import { Alert } from "@/components/ui/Alert";
import { VerificationStats } from "@/components/verification/VerificationStats";
import { VerificationList } from "@/components/verification/VerificationList";
import { VerificationDetail } from "@/components/verification/VerificationDetail";
import type {
  ApprovalItem,
  ApprovalStats,
  ApprovalFilters,
  PaginationMeta,
} from "@/types/verification";

const STATUS_TABS = [
  { id: "ALL", label: "All" },
  { id: "PENDING", label: "Pending" },
  { id: "APPROVED", label: "Approved" },
  { id: "REJECTED", label: "Rejected" },
];

const ITEMS_PER_PAGE = 10;

export default function ApprovalsTab() {
  // --------------- State ---------------
  const [items, setItems] = useState<ApprovalItem[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({ total: 0, page: 1, limit: ITEMS_PER_PAGE, totalPages: 0 });
  const [stats, setStats] = useState<ApprovalStats | null>(null);
  const [filters, setFilters] = useState<ApprovalFilters>({
    status: "ALL",
    search: "",
    page: 1,
    limit: ITEMS_PER_PAGE,
  });
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<ApprovalItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // --------------- API calls ---------------
  const fetchApprovals = useCallback(async (f: ApprovalFilters) => {
    setLoading(true);
    setError(null);
    try {
      const result = await AdminService.getApprovals(f);
      setItems(result.data);
      setMeta(result.meta);
    } catch (err: any) {
      setError(err.message || "Failed to load approvals");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const result = await AdminService.getStats();
      setStats(result);
    } catch {
      // Non-critical — stats can silently fail
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Initial load + refetch on filter changes
  useEffect(() => {
    fetchApprovals(filters);
  }, [filters, fetchApprovals]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // --------------- Handlers ---------------
  const handleStatusFilter = (status: string) => {
    setFilters((prev) => ({ ...prev, status: status as ApprovalFilters["status"], page: 1 }));
  };

  const handleSearch = (search: string) => {
    setFilters((prev) => ({ ...prev, search, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  const handleView = (item: ApprovalItem) => {
    setSelectedItem(item);
    setDetailOpen(true);
  };

  const handleApprove = async (item: ApprovalItem) => {
    setActionLoading(true);
    try {
      await AdminService.approveUser(item.id);
      setSuccessMsg(`${item.user.full_name} has been approved.`);
      setDetailOpen(false);
      // Refresh data
      fetchApprovals(filters);
      fetchStats();
    } catch (err: any) {
      setError(err.message || "Failed to approve user");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (item: ApprovalItem, reason?: string) => {
    setActionLoading(true);
    try {
      await AdminService.rejectUser(item.id, reason);
      setSuccessMsg(`${item.user.full_name} has been rejected.`);
      setDetailOpen(false);
      fetchApprovals(filters);
      fetchStats();
    } catch (err: any) {
      setError(err.message || "Failed to reject user");
    } finally {
      setActionLoading(false);
    }
  };

  // Build tabs with counts from stats
  const tabsWithCounts = STATUS_TABS.map((tab) => ({
    ...tab,
    count:
      stats && tab.id !== "ALL"
        ? stats[tab.id.toLowerCase() as keyof ApprovalStats]
        : stats?.total,
  }));

  // --------------- Render ---------------
  return (
    <div className="space-y-5">
      {/* Stats */}
      <VerificationStats stats={stats} loading={statsLoading} />

      {/* Success alert */}
      {successMsg && (
        <Alert
          variant="success"
          message={successMsg}
          onDismiss={() => setSuccessMsg(null)}
        />
      )}

      {/* Error alert */}
      {error && (
        <Alert
          variant="error"
          message={error}
          onDismiss={() => setError(null)}
        />
      )}

      {/* Filters row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <FilterTabs
          tabs={tabsWithCounts}
          activeTab={filters.status}
          onTabChange={handleStatusFilter}
          className="flex-1"
        />
        <SearchInput
          value={filters.search}
          onChange={handleSearch}
          placeholder="Search by name or email..."
          className="sm:w-64"
        />
      </div>

      {/* Verification list */}
      <VerificationList
        items={items}
        loading={loading}
        onView={handleView}
        onApprove={handleApprove}
        onReject={handleReject}
      />

      {/* Pagination */}
      <Pagination
        page={meta.page}
        totalPages={meta.totalPages}
        onPageChange={handlePageChange}
        className="pb-4"
      />

      {/* Detail modal */}
      <VerificationDetail
        item={selectedItem}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onApprove={handleApprove}
        onReject={(item, reason) => handleReject(item, reason)}
        loading={actionLoading}
      />
    </div>
  );
}