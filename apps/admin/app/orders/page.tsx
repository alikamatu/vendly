'use client';

import React, { useState } from 'react';
import {
  ShoppingBag,
  Search,
  Filter,
  Eye,
  RotateCcw,
  CheckCircle2,
  Clock,
  Truck,
  PackageCheck,
  AlertCircle,
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
import { formatCurrency, dateTime, shortId } from '@/lib/format';
import { ORDER_STATUSES, type OrderStatus, type VendlyOrder } from '@/types/operations';
import { ORDER_STATUS_COLORS } from '@/lib/constants';
import { useVendlyOrders } from '@/hooks/use-orders';
import { useToast } from '@/contexts/ToastContext';
import { useConfirm } from '@/contexts/ConfirmContext';

export default function OrdersPage() {
  const { orders, summary, loading, updateStatus, refundOrder } = useVendlyOrders();
  const { success, error: toastError } = useToast();
  const { confirm } = useConfirm();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedOrder, setSelectedOrder] = useState<VendlyOrder | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [refundReason, setRefundReason] = useState('');

  // Filter orders client-side for rapid response
  const filteredOrders = orders.filter((order) => {
    const matchesStatus = statusFilter === 'ALL' || order.status === statusFilter;
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      order.id.toLowerCase().includes(q) ||
      (order.customer_name && order.customer_name.toLowerCase().includes(q)) ||
      (order.buyer?.full_name && order.buyer.full_name.toLowerCase().includes(q)) ||
      (order.buyer?.email && order.buyer.email.toLowerCase().includes(q));
    return matchesStatus && matchesSearch;
  });

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    if (newStatus === 'CANCELLED') {
      const ok = await confirm({
        title: 'Cancel Order',
        description:
          'Are you sure you want to cancel this order? This will mark the order as void.',
        details: `Order ID: ${orderId}`,
        confirmText: 'Cancel Order',
        variant: 'danger',
      });
      if (!ok) return;
    }
    setActionLoading(true);
    try {
      await updateStatus(orderId, newStatus);
      success(`Order updated to ${newStatus}`);
      if (selectedOrder?.id === orderId) {
        setSelectedOrder((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Status update failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRefund = async () => {
    if (!selectedOrder) return;
    setActionLoading(true);
    try {
      await refundOrder(selectedOrder.id, {
        amount: Number(selectedOrder.total_amount),
        reason: refundReason || 'Administrative refund initiated from dashboard',
      });
      success('Refund issued successfully');
      setRefundModalOpen(false);
      setRefundReason('');
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Refund failed');
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
              Orders & Escrow Operations
            </h2>
            <p className="text-muted-foreground mt-0.5 text-xs sm:text-sm">
              Monitor customer orders, escrow releases, delivery milestones, and refunds.
            </p>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="bg-card border-border rounded-xl border p-4">
            <p className="text-muted-foreground text-xs">Total Orders</p>
            <p className="text-foreground mt-1 text-lg font-bold">
              {summary?.totalOrders ?? orders.length}
            </p>
          </div>
          <div className="bg-card border-border rounded-xl border p-4">
            <p className="text-muted-foreground text-xs">Settled Revenue</p>
            <p className="mt-1 text-lg font-bold text-emerald-500">
              {formatCurrency(summary?.totalRevenue ?? 0)}
            </p>
          </div>
          <div className="bg-card border-border rounded-xl border p-4">
            <p className="text-muted-foreground text-xs">Pending Processing</p>
            <p className="mt-1 text-lg font-bold text-amber-500">{summary?.pending ?? 0}</p>
          </div>
          <div className="bg-card border-border rounded-xl border p-4">
            <p className="text-muted-foreground text-xs">Delivered / Complete</p>
            <p className="mt-1 text-lg font-bold text-blue-500">
              {summary?.byStatus?.DELIVERED ?? 0}
            </p>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <div className="relative w-full sm:w-72">
            <Search className="text-muted-foreground absolute left-3 top-2.5 h-4 w-4" />
            <Input
              placeholder="Search order ID, buyer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-9 text-xs"
            />
          </div>

          <div className="flex w-full items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <Button
              size="sm"
              variant={statusFilter === 'ALL' ? 'primary' : 'outline'}
              onClick={() => setStatusFilter('ALL')}
              className="h-8 whitespace-nowrap px-3 text-xs"
            >
              All
            </Button>
            {ORDER_STATUSES.map((status) => (
              <Button
                key={status}
                size="sm"
                variant={statusFilter === status ? 'primary' : 'outline'}
                onClick={() => setStatusFilter(status)}
                className="h-8 whitespace-nowrap px-2.5 text-xs"
              >
                {status}
              </Button>
            ))}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-2 py-20">
            <Spinner size="lg" className="text-brand" />
            <p className="text-muted-foreground text-xs">Loading orders...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <TableEmpty
            icon={ShoppingBag}
            title="No orders found"
            description="No orders match your filter criteria."
          />
        ) : (
          <Table>
            <TableHeader>
              <tr>
                <TableHead>Order ID</TableHead>
                <TableHead>Buyer / Customer</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Delivery Method</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => {
                const style = ORDER_STATUS_COLORS[order.status] || {
                  bg: 'bg-muted',
                  text: 'text-muted-foreground',
                  border: 'border-border',
                };

                return (
                  <TableRow key={order.id}>
                    <TableCell className="text-foreground font-mono font-medium">
                      #{shortId(order.id, 8)}
                    </TableCell>
                    <TableCell>
                      <p className="text-foreground font-medium">
                        {order.customer_name || order.buyer?.full_name || 'Customer'}
                      </p>
                      <p className="text-muted-foreground text-[11px]">
                        {order.buyer?.email || order.customer_phone || '—'}
                      </p>
                    </TableCell>
                    <TableCell className="text-foreground font-semibold">
                      {formatCurrency(order.total_amount)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${style.bg} ${style.text} ${style.border}`}
                      >
                        {order.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {order.delivery_method || 'Standard'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {dateTime(order.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedOrder(order);
                          setDetailModalOpen(true);
                        }}
                        className="h-7 px-2.5 text-xs"
                      >
                        <Eye className="mr-1 h-3 w-3" />
                        Inspect
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        {/* Order Detail Modal */}
        <Modal
          isOpen={detailModalOpen}
          onClose={() => setDetailModalOpen(false)}
          title={`Order #${selectedOrder ? shortId(selectedOrder.id, 8) : ''}`}
          description="Detailed order inspection, delivery info, and status management."
          maxWidth="2xl"
        >
          {selectedOrder && (
            <div className="space-y-6 text-xs">
              {/* Top Overview */}
              <div className="bg-muted/40 border-border grid grid-cols-2 gap-3 rounded-xl border p-3.5 sm:grid-cols-3">
                <div>
                  <span className="text-muted-foreground text-[11px]">Status</span>
                  <p className="text-foreground mt-0.5 font-semibold">{selectedOrder.status}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-[11px]">Total Paid</span>
                  <p className="mt-0.5 font-semibold text-emerald-500">
                    {formatCurrency(selectedOrder.total_amount)}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground text-[11px]">Placed On</span>
                  <p className="text-foreground mt-0.5 font-semibold">
                    {dateTime(selectedOrder.created_at)}
                  </p>
                </div>
              </div>

              {/* Customer & Delivery */}
              <div className="space-y-2">
                <h4 className="text-foreground text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                  Customer & Fulfillment
                </h4>
                <div className="bg-card border-border space-y-1.5 rounded-xl border p-3.5">
                  <p className="text-foreground">
                    <strong className="text-muted-foreground">Name:</strong>{' '}
                    {selectedOrder.customer_name || selectedOrder.buyer?.full_name || '—'}
                  </p>
                  <p className="text-foreground">
                    <strong className="text-muted-foreground">Email:</strong>{' '}
                    {selectedOrder.buyer?.email || '—'}
                  </p>
                  <p className="text-foreground">
                    <strong className="text-muted-foreground">Phone:</strong>{' '}
                    {selectedOrder.customer_phone || '—'}
                  </p>
                  <p className="text-foreground">
                    <strong className="text-muted-foreground">Location:</strong>{' '}
                    {selectedOrder.delivery_location || 'Not specified'}
                  </p>
                  {selectedOrder.delivery_notes && (
                    <p className="text-foreground">
                      <strong className="text-muted-foreground">Notes:</strong>{' '}
                      {selectedOrder.delivery_notes}
                    </p>
                  )}
                </div>
              </div>

              {/* Items List */}
              {selectedOrder.items && selectedOrder.items.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-foreground text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                    Items ({selectedOrder.items.length})
                  </h4>
                  <div className="divide-border border-border bg-card divide-y overflow-hidden rounded-xl border">
                    {selectedOrder.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-3 p-3 text-xs"
                      >
                        <div>
                          <p className="text-foreground font-medium">
                            {item.product?.title || 'Product'}
                          </p>
                          <p className="text-muted-foreground text-[11px]">
                            Qty: {item.quantity} • Unit Price: {formatCurrency(item.price)}
                          </p>
                        </div>
                        <span className="text-foreground font-semibold">
                          {formatCurrency(Number(item.price) * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Status Update Actions */}
              <div className="border-border flex flex-wrap items-center justify-between gap-2 border-t pt-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-muted-foreground mr-1 text-[11px]">Update to:</span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={actionLoading || selectedOrder.status === 'PROCESSING'}
                    onClick={() => handleStatusChange(selectedOrder.id, 'PROCESSING')}
                    className="h-7 text-xs"
                  >
                    Processing
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={actionLoading || selectedOrder.status === 'SHIPPED'}
                    onClick={() => handleStatusChange(selectedOrder.id, 'SHIPPED')}
                    className="h-7 text-xs"
                  >
                    <Truck className="mr-1 h-3 w-3" />
                    Shipped
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={actionLoading || selectedOrder.status === 'DELIVERED'}
                    onClick={() => handleStatusChange(selectedOrder.id, 'DELIVERED')}
                    className="h-7 text-xs text-emerald-500"
                  >
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Delivered
                  </Button>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setRefundModalOpen(true)}
                  className="h-7 border-rose-500/30 text-xs text-rose-500 hover:bg-rose-500/10"
                >
                  <RotateCcw className="mr-1 h-3 w-3" />
                  Refund Order
                </Button>
              </div>
            </div>
          )}
        </Modal>

        {/* Refund Confirmation Modal */}
        <Modal
          isOpen={refundModalOpen}
          onClose={() => setRefundModalOpen(false)}
          title="Issue Administrative Refund"
          description="This will execute a refund on Paystack and mark the order as REFUNDED."
          maxWidth="md"
        >
          {selectedOrder && (
            <div className="space-y-4 text-xs">
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-rose-600 dark:text-rose-400">
                Are you sure you want to refund{' '}
                <strong>{formatCurrency(selectedOrder.total_amount)}</strong> for Order #
                {shortId(selectedOrder.id, 8)}?
              </div>
              <div className="space-y-1.5">
                <label className="text-foreground text-xs font-medium">Refund Reason</label>
                <Input
                  placeholder="e.g. Customer return approved / damaged item"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="text-xs"
                />
              </div>
              <div className="border-border flex justify-end gap-2 border-t pt-3">
                <Button variant="outline" size="sm" onClick={() => setRefundModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={actionLoading}
                  onClick={handleRefund}
                  className="bg-rose-600 text-white hover:bg-rose-700"
                >
                  {actionLoading ? 'Processing...' : 'Confirm Refund'}
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </AdminShell>
  );
}
