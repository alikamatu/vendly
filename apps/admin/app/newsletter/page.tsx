'use client';

import React, { useState } from 'react';
import {
  Mail,
  Plus,
  Search,
  Trash2,
  Download,
  CheckCircle2,
  XCircle,
  Users,
  RefreshCw,
} from 'lucide-react';
import { AdminShell } from '@/components/layout/AdminShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Modal } from '@/components/ui/modal';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableEmpty,
  TablePagination,
} from '@/components/ui/table';
import { useToast } from '@/contexts/ToastContext';
import { useConfirm } from '@/contexts/ConfirmContext';
import { useNewsletter } from '@/hooks/use-newsletter';
import { dateTime } from '@/lib/format';
import type { NewsletterSubscriber } from '@/types/operations';

export default function NewsletterPage() {
  const {
    subscribers,
    stats,
    total,
    page,
    setPage,
    limit,
    search,
    setSearch,
    status,
    setStatus,
    loading,
    refresh,
    addSubscriber,
    toggleStatus,
    deleteSubscriber,
  } = useNewsletter();

  const { success: toastSuccess, error: toastError } = useToast();
  const { confirm } = useConfirm();

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const totalPages = Math.ceil(total / limit) || 1;

  const handleAddSubscriber = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = newEmail.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      toastError('Please enter a valid email address.');
      return;
    }

    setSubmitting(true);
    try {
      await addSubscriber(email);
      toastSuccess(`Subscriber "${email}" added successfully.`);
      setNewEmail('');
      setAddModalOpen(false);
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to add subscriber');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (sub: NewsletterSubscriber) => {
    try {
      await toggleStatus(sub.id);
      toastSuccess(`Subscriber is now ${!sub.is_active ? 'Active' : 'Unsubscribed'}.`);
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  const handleDelete = async (sub: NewsletterSubscriber) => {
    const ok = await confirm({
      title: 'Delete Subscriber',
      description:
        'Are you sure you want to delete this subscriber? This will permanently remove them from the newsletter database.',
      details: `Email: ${sub.email}`,
      confirmText: 'Delete Subscriber',
      variant: 'danger',
      icon: 'trash',
    });
    if (!ok) return;

    setSubmitting(true);
    try {
      await deleteSubscriber(sub.id);
      toastSuccess(`Subscriber "${sub.email}" deleted.`);
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportCsv = () => {
    if (subscribers.length === 0) {
      toastError('No subscribers to export.');
      return;
    }

    const headers = ['Email', 'Status', 'Subscribed At'];
    const rows = subscribers.map((s) => [
      `"${s.email}"`,
      `"${s.is_active ? 'Active' : 'Unsubscribed'}"`,
      `"${s.created_at}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `vendly-subscribers-${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toastSuccess(`Exported ${subscribers.length} subscribers.`);
  };

  return (
    <AdminShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-foreground text-xl font-bold tracking-tight sm:text-2xl">
              Newsletter Subscribers
            </h2>
            <p className="text-muted-foreground mt-0.5 text-xs sm:text-sm">
              Track marketing opt-ins, manage lead audiences, and export subscriber lists for
              campaigns.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              disabled={subscribers.length === 0}
              className="h-9 gap-1.5 text-xs"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setNewEmail('');
                setAddModalOpen(true);
              }}
              className="h-9 gap-1.5 text-xs"
            >
              <Plus className="h-4 w-4" />
              Add Subscriber
            </Button>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="bg-card border-border flex items-center justify-between rounded-2xl border p-4">
            <div>
              <p className="text-muted-foreground text-xs font-medium">Total Audience</p>
              <p className="text-foreground mt-1 text-2xl font-bold">{stats.total}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
              <Users className="h-5 w-5" />
            </div>
          </div>

          <div className="bg-card border-border flex items-center justify-between rounded-2xl border p-4">
            <div>
              <p className="text-muted-foreground text-xs font-medium">Active Subscribers</p>
              <p className="mt-1 text-2xl font-bold text-emerald-500">{stats.active}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>

          <div className="bg-card border-border flex items-center justify-between rounded-2xl border p-4">
            <div>
              <p className="text-muted-foreground text-xs font-medium">Unsubscribed / Inactive</p>
              <p className="text-muted-foreground mt-1 text-2xl font-bold">{stats.unsubscribed}</p>
            </div>
            <div className="bg-muted text-muted-foreground flex h-10 w-10 items-center justify-center rounded-xl">
              <XCircle className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <div className="relative w-full sm:w-80">
            <Search className="text-muted-foreground absolute left-3 top-2.5 h-4 w-4" />
            <Input
              placeholder="Search subscriber email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-9 text-xs"
            />
          </div>

          <div className="flex w-full items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((s) => (
              <Button
                key={s}
                size="sm"
                variant={status === s ? 'primary' : 'outline'}
                onClick={() => {
                  setStatus(s);
                  setPage(1);
                }}
                className="h-8 whitespace-nowrap px-3 text-xs capitalize"
              >
                {s === 'ALL' ? 'All Subscribers' : s.toLowerCase()}
              </Button>
            ))}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-2 py-20">
            <Spinner size="lg" className="text-brand" />
            <p className="text-muted-foreground text-xs">Loading subscribers...</p>
          </div>
        ) : subscribers.length === 0 ? (
          <TableEmpty
            icon={Mail}
            title="No subscribers found"
            description={
              search || status !== 'ALL'
                ? 'No subscribers match your search filter.'
                : 'No newsletter subscribers yet. Subscribers will appear here when visitors join.'
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subscriber Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Subscribed Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscribers.map((sub) => (
                <TableRow key={sub.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="bg-brand/10 text-brand flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                        {sub.email.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-foreground font-mono text-sm font-semibold leading-tight">
                          {sub.email}
                        </p>
                        <p className="text-muted-foreground mt-0.5 font-mono text-[11px]">
                          ID: {sub.id.slice(0, 8)}...
                        </p>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    {sub.is_active ? (
                      <Badge variant="success" className="text-[11px] font-medium">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="default" className="text-[11px] font-medium">
                        Unsubscribed
                      </Badge>
                    )}
                  </TableCell>

                  <TableCell className="text-muted-foreground text-xs">
                    {dateTime(sub.created_at)}
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleStatus(sub)}
                        className="h-8 px-2.5 text-xs"
                        title={sub.is_active ? 'Mark Unsubscribed' : 'Reactivate'}
                      >
                        <RefreshCw className="mr-1 h-3.5 w-3.5" />
                        {sub.is_active ? 'Unsubscribe' : 'Activate'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(sub)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                        title="Delete Subscriber"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TablePagination
              page={page}
              totalPages={totalPages}
              total={total}
              limit={limit}
              onPageChange={setPage}
            />
          </Table>
        )}

        {/* Add Subscriber Modal */}
        <Modal
          isOpen={addModalOpen}
          onClose={() => setAddModalOpen(false)}
          title="Add Newsletter Subscriber"
          description="Manually enroll an email address into the newsletter audience."
          maxWidth="sm"
        >
          <form onSubmit={handleAddSubscriber} className="space-y-4">
            <div>
              <label className="text-foreground mb-1.5 block text-xs font-semibold">
                Email Address <span className="text-destructive">*</span>
              </label>
              <Input
                type="email"
                placeholder="name@university.edu"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
                className="h-9 text-xs"
              />
            </div>

            <div className="border-border/80 flex items-center justify-end gap-2 border-t pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddModalOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Enrolling...
                  </>
                ) : (
                  'Add Subscriber'
                )}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </AdminShell>
  );
}
