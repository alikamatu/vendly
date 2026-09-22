'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  Search,
  CheckCircle2,
  XCircle,
  FileText,
  ExternalLink,
  GraduationCap,
  Clock,
  Eye,
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
import { dateTime } from '@/lib/format';
import type { VerificationRequest } from '@/types/operations';
import { useVendlyVerifications } from '@/hooks/use-verifications';
import { useToast } from '@/contexts/ToastContext';
import { useConfirm } from '@/contexts/ConfirmContext';

export default function VerificationsPage() {
  const { requests, loading, approveOrReject } = useVendlyVerifications();
  const { success, error: toastError } = useToast();
  const { confirm } = useConfirm();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>(
    'PENDING',
  );
  const [selectedReq, setSelectedReq] = useState<VerificationRequest | null>(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const filteredRequests = requests.filter((r) => {
    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      r.user?.full_name?.toLowerCase().includes(q) ||
      r.user?.email?.toLowerCase().includes(q) ||
      r.user?.school?.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const handleApprove = async (req: VerificationRequest) => {
    const ok = await confirm({
      title: 'Approve Merchant Verification',
      description: `Are you sure you want to approve seller verification for ${req.user?.full_name || req.user?.email || 'this applicant'}? This will grant verified merchant privileges and enable live storefront selling.`,
      details: `Applicant: ${req.user?.full_name || 'N/A'} • School: ${req.user?.school || 'N/A'} • Role: MERCHANT`,
      confirmText: 'Approve & Verify',
      variant: 'success',
      icon: 'check',
    });
    if (!ok) return;

    setActionLoading(true);
    try {
      await approveOrReject(req.id, 'APPROVED');
      success('Seller verification approved! Merchant role granted.');
      setSelectedReq(null);
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Approval failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedReq) return;
    setActionLoading(true);
    try {
      await approveOrReject(
        selectedReq.id,
        'REJECTED',
        rejectReason || 'Document could not be verified',
      );
      success('Verification request rejected');
      setRejectModalOpen(false);
      setRejectReason('');
      setSelectedReq(null);
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Rejection failed');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <AdminShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-foreground text-xl font-bold tracking-tight sm:text-2xl">
              Seller Verification Queue
            </h2>
            <p className="text-muted-foreground mt-0.5 text-xs sm:text-sm">
              Review student merchant IDs and business documentation to grant verified seller
              status.
            </p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <div className="relative w-full sm:w-72">
            <Search className="text-muted-foreground absolute left-3 top-2.5 h-4 w-4" />
            <Input
              placeholder="Search applicant or school..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-9 text-xs"
            />
          </div>

          <div className="flex w-full items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map((s) => (
              <Button
                key={s}
                size="sm"
                variant={statusFilter === s ? 'primary' : 'outline'}
                onClick={() => setStatusFilter(s)}
                className="h-8 whitespace-nowrap px-3 text-xs"
              >
                {s === 'ALL' ? 'All Requests' : s}
              </Button>
            ))}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-2 py-20">
            <Spinner size="lg" className="text-brand" />
            <p className="text-muted-foreground text-xs">Loading verification queue...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <TableEmpty
            icon={ShieldCheck}
            title="Queue is clear"
            description="No verification requests currently require review under this filter."
          />
        ) : (
          <Table>
            <TableHeader>
              <tr>
                <TableHead>Applicant</TableHead>
                <TableHead>Institution / School</TableHead>
                <TableHead>Verification Type</TableHead>
                <TableHead>Document</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {filteredRequests.map((req) => (
                <TableRow key={req.id}>
                  <TableCell>
                    <p className="text-foreground font-medium">
                      {req.user?.full_name || 'Anonymous'}
                    </p>
                    <p className="text-muted-foreground text-[11px]">{req.user?.email}</p>
                  </TableCell>
                  <TableCell>
                    <div className="text-foreground flex items-center gap-1.5 text-xs">
                      <GraduationCap className="text-muted-foreground h-3.5 w-3.5" />
                      <span>{req.user?.school || 'Independent'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{req.type || 'FILES'}</Badge>
                  </TableCell>
                  <TableCell>
                    {req.user?.verification_doc ? (
                      <a
                        href={req.user.verification_doc}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand inline-flex items-center gap-1 text-xs font-medium hover:underline"
                      >
                        <FileText className="h-3 w-3" />
                        <span>View Document</span>
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {req.status === 'APPROVED' && (
                      <Badge variant="success" dot>
                        Approved
                      </Badge>
                    )}
                    {req.status === 'PENDING' && (
                      <Badge variant="warning" dot>
                        Pending Review
                      </Badge>
                    )}
                    {req.status === 'REJECTED' && (
                      <Badge variant="danger" dot>
                        Rejected
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {dateTime(req.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    {req.status === 'PENDING' ? (
                      <div className="inline-flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={actionLoading}
                          onClick={() => handleApprove(req)}
                          className="h-7 border-emerald-500/30 px-2 text-xs text-emerald-500 hover:bg-emerald-500/10"
                        >
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={actionLoading}
                          onClick={() => {
                            setSelectedReq(req);
                            setRejectModalOpen(true);
                          }}
                          className="h-7 border-rose-500/30 px-2 text-xs text-rose-500 hover:bg-rose-500/10"
                        >
                          <XCircle className="mr-1 h-3 w-3" />
                          Reject
                        </Button>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">Processed</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Reject Modal */}
        <Modal
          isOpen={rejectModalOpen}
          onClose={() => setRejectModalOpen(false)}
          title="Reject Verification Application"
          description="Provide a clear reason so the student seller can correct and re-apply."
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="text-foreground text-xs font-medium">Rejection Reason</label>
              <Input
                placeholder="e.g. Student ID expired / illegible photo"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="text-xs"
              />
            </div>
            <div className="border-border flex justify-end gap-2 border-t pt-3">
              <Button variant="outline" size="sm" onClick={() => setRejectModalOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={actionLoading}
                onClick={handleReject}
                className="bg-rose-600 text-white hover:bg-rose-700"
              >
                Confirm Rejection
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </AdminShell>
  );
}
