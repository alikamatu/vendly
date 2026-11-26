'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Flag,
  Search,
  Package,
  Store,
  Eye,
  AlertTriangle,
  ShieldBan,
  CheckCircle2,
  XCircle,
  Clock,
  Archive,
  Ban,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { AdminShell } from '@/components/layout/AdminShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Spinner } from '@/components/ui/spinner';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableEmpty,
} from '@/components/ui/table';
import { dateTime, formatCurrency, shortId } from '@/lib/format';
import { VendlyReportService } from '@/services/report.service';
import type {
  AdminReport,
  ReportReason,
  ReportResolutionAction,
  ReportStats,
  ReportStatus,
  ReportTargetType,
} from '@/types/operations';
import { useToast } from '@/contexts/ToastContext';
import { useConfirm } from '@/contexts/ConfirmContext';
import { useOperations } from '@/contexts/OperationsContext';

const REASON_LABELS: Record<ReportReason, string> = {
  COUNTERFEIT: 'Counterfeit / Fake',
  MISLEADING: 'Misleading Info',
  PROHIBITED_ITEM: 'Prohibited Item',
  SCAM_FRAUD: 'Scam / Fraud',
  HARASSMENT: 'Harassment',
  SPAM: 'Spam',
  OFFENSIVE_CONTENT: 'Offensive Content',
  INACCURATE_PRICING: 'Bait / Fake Pricing',
  OTHER: 'Other',
};

const ACTION_LABELS: Record<ReportResolutionAction, string> = {
  NONE: 'No Penalty',
  WARNING_ISSUED: 'Seller Warned',
  PRODUCT_REJECTED: 'Product Taken Down',
  PRODUCT_ARCHIVED: 'Product Archived',
  SELLER_SUSPENDED: 'Seller Suspended',
  DISMISSED: 'Dismissed',
};

const STOREFRONT_BASE_URL = process.env.NEXT_PUBLIC_WEB_URL || 'https://verndly.com';

function statusBadgeVariant(status: ReportStatus): 'danger' | 'warning' | 'success' | 'default' {
  switch (status) {
    case 'OPEN':
      return 'danger';
    case 'UNDER_REVIEW':
      return 'warning';
    case 'RESOLVED':
      return 'success';
    case 'DISMISSED':
    default:
      return 'default';
  }
}

export default function ReportsPage() {
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [stats, setStats] = useState<ReportStats>({
    open: 0,
    under_review: 0,
    resolved: 0,
    dismissed: 0,
    active_product_reports: 0,
    active_seller_reports: 0,
  });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'ALL'>('ALL');
  const [typeFilter, setTypeFilter] = useState<ReportTargetType | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [selectedReport, setSelectedReport] = useState<AdminReport | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const { success, error: toastError } = useToast();
  const { confirm } = useConfirm();
  const { refreshBadges } = useOperations();

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await VendlyReportService.list({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        target_type: typeFilter === 'ALL' ? undefined : typeFilter,
        search: search.trim() || undefined,
        limit: 50,
      });
      setReports(res.data || []);
      if (res.stats) setStats(res.stats);
    } catch (err) {
      setReports([]);
      toastError(err instanceof Error ? err.message : 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, search, toastError]);

  useEffect(() => {
    const t = setTimeout(() => {
      void fetchReports();
    }, 180);
    return () => clearTimeout(t);
  }, [fetchReports]);

  const openReportDetail = useCallback(
    async (reportOrId: AdminReport | string) => {
      const id = typeof reportOrId === 'string' ? reportOrId : reportOrId.id;
      if (typeof reportOrId !== 'string') {
        setSelectedReport(reportOrId);
        setAdminNotes(reportOrId.admin_notes || '');
      }
      setModalOpen(true);
      setDetailLoading(true);
      try {
        const full = await VendlyReportService.getById(id);
        setSelectedReport(full);
        setAdminNotes(full.admin_notes || '');
      } catch (err) {
        toastError(err instanceof Error ? err.message : 'Failed to load report details');
      } finally {
        setDetailLoading(false);
      }
    },
    [toastError],
  );

  // Support deep-link ?highlight=<reportId> from notifications
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const highlight = new URLSearchParams(window.location.search).get('highlight');
    if (highlight) {
      void openReportDetail(highlight);
    }
  }, [openReportDetail]);

  const handleResolve = async (
    status: ReportStatus,
    action: ReportResolutionAction,
    confirmOpts?: {
      title: string;
      description: string;
      confirmText: string;
      variant: 'danger' | 'warning';
    },
  ) => {
    if (!selectedReport) return;

    if (confirmOpts) {
      const ok = await confirm(confirmOpts);
      if (!ok) return;
    }

    setActionLoading(true);
    try {
      const res = await VendlyReportService.resolve(selectedReport.id, {
        status,
        action,
        admin_notes: adminNotes.trim() || undefined,
      });
      success(
        action !== 'NONE' && action !== 'DISMISSED'
          ? `Report resolved — ${ACTION_LABELS[action]}`
          : `Report marked as ${status.replace('_', ' ').toLowerCase()}`,
      );
      setSelectedReport(res.report);
      setModalOpen(false);
      await Promise.all([fetchReports(), refreshBadges()]);
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to update report');
    } finally {
      setActionLoading(false);
    }
  };

  const targetSeller = selectedReport?.seller || selectedReport?.product?.seller || null;

  return (
    <AdminShell>
      <div className="space-y-6 pb-12">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-foreground text-xl font-bold tracking-tight sm:text-2xl">
              Reports &amp; Trust Queue
            </h2>
            <p className="text-muted-foreground mt-0.5 text-xs sm:text-sm">
              Investigate buyer reports on products and sellers, take down infringing listings, warn
              or suspend merchants.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void fetchReports()}
            className="gap-1.5 self-start text-xs sm:self-auto"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>

        {/* Summary KPI Strip */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="bg-card border-border rounded-2xl border p-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs font-medium">Open Reports</span>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500/10 text-rose-500">
                <Flag className="h-3.5 w-3.5" />
              </span>
            </div>
            <p className="text-foreground mt-2 text-2xl font-bold">{stats.open}</p>
            <p className="text-muted-foreground mt-0.5 text-[11px]">
              {stats.active_product_reports} products • {stats.active_seller_reports} sellers
            </p>
          </div>

          <div className="bg-card border-border rounded-2xl border p-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs font-medium">Under Review</span>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                <Clock className="h-3.5 w-3.5" />
              </span>
            </div>
            <p className="text-foreground mt-2 text-2xl font-bold">{stats.under_review}</p>
            <p className="text-muted-foreground mt-0.5 text-[11px]">Active investigations</p>
          </div>

          <div className="bg-card border-border rounded-2xl border p-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs font-medium">Resolved</span>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                <CheckCircle2 className="h-3.5 w-3.5" />
              </span>
            </div>
            <p className="text-foreground mt-2 text-2xl font-bold">{stats.resolved}</p>
            <p className="text-muted-foreground mt-0.5 text-[11px]">Action taken</p>
          </div>

          <div className="bg-card border-border rounded-2xl border p-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs font-medium">Dismissed</span>
              <span className="bg-muted text-muted-foreground flex h-7 w-7 items-center justify-center rounded-lg">
                <XCircle className="h-3.5 w-3.5" />
              </span>
            </div>
            <p className="text-foreground mt-2 text-2xl font-bold">{stats.dismissed}</p>
            <p className="text-muted-foreground mt-0.5 text-[11px]">No violation found</p>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {(['ALL', 'OPEN', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                  statusFilter === s
                    ? 'bg-foreground text-background'
                    : 'bg-card border-border text-muted-foreground hover:text-foreground border'
                }`}
              >
                {s === 'ALL' ? 'All Statuses' : s.replace('_', ' ')}
              </button>
            ))}

            <div className="bg-border mx-1 hidden h-5 w-px sm:block" />

            {(['ALL', 'PRODUCT', 'SELLER'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTypeFilter(t)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                  typeFilter === t
                    ? 'bg-brand text-white'
                    : 'bg-card border-border text-muted-foreground hover:text-foreground border'
                }`}
              >
                {t === 'PRODUCT' && <Package className="h-3 w-3" />}
                {t === 'SELLER' && <Store className="h-3 w-3" />}
                {t === 'ALL' ? 'All Targets' : t === 'PRODUCT' ? 'Products' : 'Sellers'}
              </button>
            ))}
          </div>

          <div className="relative w-full lg:w-72">
            <Search className="text-muted-foreground absolute left-3 top-2.5 h-4 w-4" />
            <Input
              placeholder="Search reporter, store, product..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-9 text-xs"
            />
          </div>
        </div>

        {/* Reports Table */}
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-2 py-20">
            <Spinner size="lg" className="text-brand" />
            <p className="text-muted-foreground text-xs">Loading reports queue...</p>
          </div>
        ) : reports.length === 0 ? (
          <TableEmpty
            icon={Flag}
            title="No reports found"
            description="No buyer reports match your current filter."
          />
        ) : (
          <Table>
            <TableHeader>
              <tr>
                <TableHead>Target</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Reporter</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="text-right">Manage</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {reports.map((report) => {
                const sellerInfo = report.seller || report.product?.seller;
                return (
                  <TableRow key={report.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="bg-muted flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl">
                          {report.target_type === 'PRODUCT' && report.product?.image_urls?.[0] ? (
                            <img
                              src={report.product.image_urls[0]}
                              alt={report.product.title}
                              className="h-full w-full object-cover"
                            />
                          ) : report.target_type === 'SELLER' && report.seller?.logo_url ? (
                            <img
                              src={report.seller.logo_url}
                              alt={report.seller.store_name}
                              className="h-full w-full object-cover"
                            />
                          ) : report.target_type === 'PRODUCT' ? (
                            <Package className="text-muted-foreground h-4 w-4" />
                          ) : (
                            <Store className="text-muted-foreground h-4 w-4" />
                          )}
                        </div>
                        <div className="min-w-0 max-w-[220px]">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                                report.target_type === 'PRODUCT'
                                  ? 'bg-blue-500/10 text-blue-500'
                                  : 'bg-purple-500/10 text-purple-500'
                              }`}
                            >
                              {report.target_type}
                            </span>
                            <p className="text-foreground truncate text-xs font-semibold">
                              {report.target_type === 'PRODUCT'
                                ? report.product?.title || 'Deleted Product'
                                : report.seller?.store_name || 'Deleted Seller'}
                            </p>
                          </div>
                          {sellerInfo && (
                            <p className="text-muted-foreground mt-0.5 truncate text-[11px]">
                              @{sellerInfo.store_link}
                              {sellerInfo.user?.is_suspended && (
                                <span className="ml-1.5 font-semibold text-rose-500">
                                  • Suspended
                                </span>
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <p className="text-foreground text-xs font-medium">
                        {REASON_LABELS[report.reason] || report.reason}
                      </p>
                      {report.details && (
                        <p className="text-muted-foreground mt-0.5 max-w-[220px] truncate text-[11px]">
                          {report.details}
                        </p>
                      )}
                    </TableCell>

                    <TableCell>
                      <p className="text-foreground text-xs font-medium">
                        {report.reporter?.full_name || 'Buyer'}
                      </p>
                      <p className="text-muted-foreground text-[11px]">
                        {report.reporter?.email || shortId(report.reporter_id)}
                      </p>
                    </TableCell>

                    <TableCell>
                      <Badge variant={statusBadgeVariant(report.status)} dot>
                        {report.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <span className="text-muted-foreground text-xs">
                        {report.resolution_action ? ACTION_LABELS[report.resolution_action] : '—'}
                      </span>
                    </TableCell>

                    <TableCell className="text-muted-foreground text-xs">
                      {dateTime(report.created_at)}
                    </TableCell>

                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void openReportDetail(report)}
                        className="h-7 gap-1 px-2.5 text-xs"
                      >
                        <Eye className="h-3 w-3" />
                        Inspect
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Report Inspection & Enforcement Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          selectedReport
            ? `Report #${shortId(selectedReport.id)} — ${selectedReport.target_type === 'PRODUCT' ? 'Product' : 'Seller'}`
            : 'Report Details'
        }
        description={
          selectedReport
            ? `Submitted ${dateTime(selectedReport.created_at)} by ${selectedReport.reporter?.full_name || 'Buyer'}`
            : undefined
        }
      >
        {detailLoading && !selectedReport ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" className="text-brand" />
          </div>
        ) : selectedReport ? (
          <div className="space-y-5">
            {/* Top Status & Repeat Count */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={statusBadgeVariant(selectedReport.status)} dot>
                  {selectedReport.status.replace('_', ' ')}
                </Badge>
                <Badge variant="warning">
                  {REASON_LABELS[selectedReport.reason] || selectedReport.reason}
                </Badge>
                {selectedReport.resolution_action && (
                  <Badge variant="default">{ACTION_LABELS[selectedReport.resolution_action]}</Badge>
                )}
              </div>
              {selectedReport.related_counts && (
                <div className="text-muted-foreground flex items-center gap-3 text-[11px]">
                  {selectedReport.product_id && (
                    <span>
                      Product reports:{' '}
                      <strong className="text-foreground">
                        {selectedReport.related_counts.product_reports}
                      </strong>
                    </span>
                  )}
                  {selectedReport.seller_id && (
                    <span>
                      Seller total reports:{' '}
                      <strong className="text-foreground">
                        {selectedReport.related_counts.seller_reports}
                      </strong>
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Target Card (Product and/or Seller) */}
            <div className="bg-muted/30 border-border space-y-3 rounded-xl border p-4">
              {selectedReport.product && (
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    {selectedReport.product.image_urls?.[0] ? (
                      <img
                        src={selectedReport.product.image_urls[0]}
                        alt={selectedReport.product.title}
                        className="h-14 w-14 shrink-0 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="bg-muted flex h-14 w-14 shrink-0 items-center justify-center rounded-xl">
                        <Package className="text-muted-foreground h-5 w-5" />
                      </div>
                    )}
                    <div>
                      <p className="text-foreground text-sm font-semibold">
                        {selectedReport.product.title}
                      </p>
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        {formatCurrency(selectedReport.product.price)} •{' '}
                        {selectedReport.product.category} • Status:{' '}
                        <span className="text-foreground font-semibold uppercase">
                          {selectedReport.product.status}
                        </span>
                      </p>
                    </div>
                  </div>
                  <a
                    href={`${STOREFRONT_BASE_URL}/product/${selectedReport.product.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand inline-flex shrink-0 items-center gap-1 text-xs font-medium hover:underline"
                  >
                    View <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}

              {targetSeller && (
                <div
                  className={`flex items-center justify-between gap-3 ${
                    selectedReport.product ? 'border-border border-t pt-3' : ''
                  }`}
                >
                  <div>
                    <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
                      Seller Store
                    </p>
                    <p className="text-foreground text-xs font-semibold">
                      {targetSeller.store_name}{' '}
                      <span className="text-muted-foreground font-normal">
                        (@{targetSeller.store_link})
                      </span>
                    </p>
                    <p className="text-muted-foreground mt-0.5 text-[11px]">
                      Owner: {targetSeller.user?.full_name || '—'} (
                      {targetSeller.user?.email || '—'}) • Warnings:{' '}
                      <strong className="text-foreground">
                        {targetSeller.user?.warnings ?? 0}
                      </strong>
                      {targetSeller.user?.is_suspended && (
                        <span className="ml-2 font-semibold text-rose-500">SUSPENDED</span>
                      )}
                    </p>
                  </div>
                  <a
                    href={`${STOREFRONT_BASE_URL}/s/${targetSeller.store_link}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand inline-flex shrink-0 items-center gap-1 text-xs font-medium hover:underline"
                  >
                    Store <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </div>

            {/* Buyer Details */}
            <div className="space-y-1.5">
              <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider">
                Buyer Report Details
              </p>
              <div className="bg-muted/20 border-border rounded-xl border p-3.5 text-xs leading-relaxed">
                {selectedReport.details ? (
                  <p className="text-foreground whitespace-pre-wrap">{selectedReport.details}</p>
                ) : (
                  <p className="text-muted-foreground italic">
                    No additional written details provided by the buyer.
                  </p>
                )}
              </div>
              <p className="text-muted-foreground text-[11px]">
                Filed by{' '}
                <strong className="text-foreground">{selectedReport.reporter?.full_name}</strong> (
                {selectedReport.reporter?.email})
              </p>
            </div>

            {/* Moderator Notes */}
            <div className="space-y-1.5">
              <label
                htmlFor="admin-report-notes"
                className="text-muted-foreground block text-[11px] font-semibold uppercase tracking-wider"
              >
                Moderator Notes (stored in audit log &amp; included in seller notice if enforced)
              </label>
              <textarea
                id="admin-report-notes"
                rows={3}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Explain the review outcome or policy violation..."
                className="bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-brand w-full resize-none rounded-xl border p-3 text-xs focus:outline-none"
              />
            </div>

            {/* Enforcement Actions */}
            <div className="border-border space-y-3 border-t pt-4">
              <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider">
                Trust &amp; Safety Actions
              </p>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {selectedReport.status === 'OPEN' && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={actionLoading}
                    onClick={() => void handleResolve('UNDER_REVIEW', 'NONE')}
                    className="justify-start gap-2 text-xs"
                  >
                    <Clock className="h-3.5 w-3.5 text-amber-500" />
                    Mark Under Review
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  disabled={actionLoading}
                  onClick={() =>
                    void handleResolve('DISMISSED', 'DISMISSED', {
                      title: 'Dismiss Report',
                      description:
                        'Dismiss this report with no penalty to the seller? The buyer will be notified that no policy violation was found.',
                      confirmText: 'Dismiss Report',
                      variant: 'warning',
                    })
                  }
                  className="justify-start gap-2 text-xs"
                >
                  <XCircle className="text-muted-foreground h-3.5 w-3.5" />
                  Dismiss Report (No Violation)
                </Button>

                {selectedReport.product_id && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={actionLoading}
                      onClick={() =>
                        void handleResolve('RESOLVED', 'PRODUCT_REJECTED', {
                          title: 'Take Down Reported Product',
                          description:
                            'Reject this listing immediately? It will be hidden from the marketplace, search, and storefront, and the seller will be notified.',
                          confirmText: 'Take Down Product',
                          variant: 'danger',
                        })
                      }
                      className="justify-start gap-2 border-rose-500/30 text-xs text-rose-500 hover:bg-rose-500/10"
                    >
                      <Ban className="h-3.5 w-3.5" />
                      Take Down Product (Reject)
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      disabled={actionLoading}
                      onClick={() =>
                        void handleResolve('RESOLVED', 'PRODUCT_ARCHIVED', {
                          title: 'Archive Reported Product',
                          description:
                            'Archive this listing so it is removed from public view while preserving seller access to edit it?',
                          confirmText: 'Archive Product',
                          variant: 'warning',
                        })
                      }
                      className="justify-start gap-2 text-xs text-amber-500 hover:bg-amber-500/10"
                    >
                      <Archive className="h-3.5 w-3.5" />
                      Archive Product
                    </Button>
                  </>
                )}

                {targetSeller?.user_id && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={actionLoading}
                      onClick={() =>
                        void handleResolve('RESOLVED', 'WARNING_ISSUED', {
                          title: 'Issue Formal Seller Warning',
                          description: `Increment warnings on ${targetSeller.store_name} and send them a Trust & Safety warning notification?`,
                          confirmText: 'Issue Warning',
                          variant: 'warning',
                        })
                      }
                      className="justify-start gap-2 text-xs text-amber-600 hover:bg-amber-500/10 dark:text-amber-400"
                    >
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Warn Seller (+1 Warning)
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      disabled={actionLoading || Boolean(targetSeller.user?.is_suspended)}
                      onClick={() =>
                        void handleResolve('RESOLVED', 'SELLER_SUSPENDED', {
                          title: 'Suspend Seller Store',
                          description: `Suspend ${targetSeller.store_name}? Their storefront and all listings will be immediately hidden from buyers across Verndly.`,
                          confirmText: 'Suspend Seller',
                          variant: 'danger',
                        })
                      }
                      className="justify-start gap-2 border-rose-500/30 text-xs text-rose-600 hover:bg-rose-500/10 dark:text-rose-400"
                    >
                      <ShieldBan className="h-3.5 w-3.5" />
                      {targetSeller.user?.is_suspended
                        ? 'Seller Already Suspended'
                        : 'Suspend Seller'}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </AdminShell>
  );
}
