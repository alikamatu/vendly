'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  RotateCcw,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Eye,
  FileText,
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
import { dateTime, shortId } from '@/lib/format';
import { VendlyReturnsService } from '@/services/returns.service';
import type { ReturnRequest, ReturnStatus } from '@/types/operations';
import { useToast } from '@/contexts/ToastContext';
import { useConfirm } from '@/contexts/ConfirmContext';

export default function ReturnsPage() {
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedReturn, setSelectedReturn] = useState<ReturnRequest | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [adminNote, setAdminNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const { success, error: toastError } = useToast();
  const { confirm } = useConfirm();

  const fetchReturns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await VendlyReturnsService.list();
      setReturns(res.data || []);
    } catch {
      setReturns([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchReturns();
  }, [fetchReturns]);

  const handleUpdateStatus = async (status: ReturnStatus) => {
    if (!selectedReturn) return;
    if (status === 'REJECTED') {
      const ok = await confirm({
        title: 'Reject Return Claim',
        description: 'Are you sure you want to reject this dispute claim submitted by the buyer?',
        confirmText: 'Reject Claim',
        variant: 'danger',
      });
      if (!ok) return;
    }
    setActionLoading(true);
    try {
      const updated = await VendlyReturnsService.update(selectedReturn.id, {
        status,
        admin_note: adminNote,
      });
      success(`Return request marked as ${status}`);
      setReturns((prev) => prev.map((r) => (r.id === selectedReturn.id ? { ...r, status } : r)));
      setSelectedReturn(updated);
      setDetailModalOpen(false);
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRefund = async () => {
    if (!selectedReturn) return;
    const ok = await confirm({
      title: 'Issue Dispute Refund',
      description:
        'Are you sure you want to execute a refund to the buyer? This will debit the seller escrow ledger and resolve this dispute.',
      details: `Return ID: ${selectedReturn.id} • Order: ${selectedReturn.order_id}`,
      confirmText: 'Execute Refund',
      variant: 'warning',
      icon: 'alert',
    });
    if (!ok) return;
    setActionLoading(true);
    try {
      await VendlyReturnsService.refund(selectedReturn.id, {
        admin_note: adminNote || 'Dispute resolved in favor of buyer',
      });
      success('Buyer refunded and dispute closed');
      setReturns((prev) =>
        prev.map((r) => (r.id === selectedReturn.id ? { ...r, status: 'REFUNDED' } : r)),
      );
      setDetailModalOpen(false);
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Refund failed');
    } finally {
      setActionLoading(false);
    }
  };

  const filtered = returns.filter((r) => {
    const q = search.toLowerCase();
    return (
      !q ||
      r.order_id?.toLowerCase().includes(q) ||
      r.reason?.toLowerCase().includes(q) ||
      r.user?.full_name?.toLowerCase().includes(q)
    );
  });

  return (
    <AdminShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-foreground text-xl font-bold tracking-tight sm:text-2xl">
              Returns & Dispute Resolution
            </h2>
            <p className="text-muted-foreground mt-0.5 text-xs sm:text-sm">
              Review buyer return claims, merchant defenses, and issue binding resolutions or
              refunds.
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="text-muted-foreground absolute left-3 top-2.5 h-4 w-4" />
          <Input
            placeholder="Search dispute reason, buyer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-9 text-xs"
          />
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-2 py-20">
            <Spinner size="lg" className="text-brand" />
            <p className="text-muted-foreground text-xs">Loading returns...</p>
          </div>
        ) : filtered.length === 0 ? (
          <TableEmpty
            icon={RotateCcw}
            title="No disputes or returns"
            description="All orders are settled with no open return requests."
          />
        ) : (
          <Table>
            <TableHeader>
              <tr>
                <TableHead>Claim ID</TableHead>
                <TableHead>Buyer</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-foreground font-mono text-xs">
                    #{shortId(r.id, 8)}
                  </TableCell>
                  <TableCell>
                    <p className="text-foreground font-medium">{r.user?.full_name || 'Buyer'}</p>
                    <p className="text-muted-foreground text-[11px]">{r.user?.email}</p>
                  </TableCell>
                  <TableCell className="text-muted-foreground font-mono text-xs">
                    #{shortId(r.order_id, 8)}
                  </TableCell>
                  <TableCell className="text-foreground max-w-[200px] truncate text-xs">
                    {r.reason}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        r.status === 'APPROVED' || r.status === 'REFUNDED'
                          ? 'success'
                          : r.status === 'REJECTED'
                            ? 'danger'
                            : 'warning'
                      }
                      dot
                    >
                      {r.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {dateTime(r.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedReturn(r);
                        setAdminNote(r.admin_note || '');
                        setDetailModalOpen(true);
                      }}
                      className="h-7 px-2.5 text-xs"
                    >
                      <Eye className="mr-1 h-3 w-3" />
                      Arbitrate
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Dispute Arbitration Modal */}
        <Modal
          isOpen={detailModalOpen}
          onClose={() => setDetailModalOpen(false)}
          title={`Dispute Claim #${selectedReturn ? shortId(selectedReturn.id, 8) : ''}`}
          description="Arbitrate return request between buyer and merchant."
          maxWidth="lg"
        >
          {selectedReturn && (
            <div className="space-y-4 text-xs">
              <div className="bg-card border-border space-y-2 rounded-xl border p-3.5">
                <div>
                  <span className="text-muted-foreground text-[11px]">Buyer Claim:</span>
                  <p className="text-foreground mt-0.5 font-semibold">{selectedReturn.reason}</p>
                  {selectedReturn.details && (
                    <p className="text-muted-foreground mt-1 text-[11px]">
                      {selectedReturn.details}
                    </p>
                  )}
                </div>

                {selectedReturn.seller_response && (
                  <div className="border-border border-t pt-2">
                    <span className="text-muted-foreground text-[11px]">Merchant Defense:</span>
                    <p className="text-foreground mt-0.5">{selectedReturn.seller_response}</p>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-foreground text-xs font-medium">Admin Finding / Note</label>
                <Input
                  placeholder="e.g. Buyer provided video proof of damaged goods"
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  className="text-xs"
                />
              </div>

              {/* Action Buttons */}
              <div className="border-border flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={actionLoading}
                    onClick={() => handleUpdateStatus('APPROVED')}
                    className="h-8 border-emerald-500/30 text-xs text-emerald-500 hover:bg-emerald-500/10"
                  >
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Approve Return
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={actionLoading}
                    onClick={() => handleUpdateStatus('REJECTED')}
                    className="h-8 border-rose-500/30 text-xs text-rose-500 hover:bg-rose-500/10"
                  >
                    <XCircle className="mr-1 h-3 w-3" />
                    Reject Claim
                  </Button>
                </div>

                <Button
                  size="sm"
                  disabled={actionLoading}
                  onClick={handleRefund}
                  className="h-8 bg-rose-600 text-xs text-white hover:bg-rose-700"
                >
                  Direct Refund to Buyer
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </AdminShell>
  );
}
